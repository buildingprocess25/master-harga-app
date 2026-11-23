import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const folderCache = new Map<string, Promise<string>>();

let cachedKey = "";
let cachedDriveClient: drive_v3.Drive | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export interface GoogleDriveEnvConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId?: string;
}

export function getGoogleDriveEnvConfig(): GoogleDriveEnvConfig | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || undefined;
  return { clientId, clientSecret, refreshToken, rootFolderId };
}

/** Mengembalikan true jika kredensial OAuth2 Google Drive lengkap tersedia di environment. */
export function isGoogleDriveConfigured(): boolean {
  return getGoogleDriveEnvConfig() !== null;
}

function getDriveClient(): drive_v3.Drive {
  const cfg = getGoogleDriveEnvConfig();
  if (!cfg) {
    throw new Error(
      "Kredensial Google Drive belum lengkap (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN)."
    );
  }

  const fingerprint = `${cfg.clientId}:${cfg.refreshToken}`;
  if (cachedDriveClient && cachedKey === fingerprint) {
    return cachedDriveClient;
  }

  const auth = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret);
  auth.setCredentials({ refresh_token: cfg.refreshToken });

  cachedKey = fingerprint;
  cachedDriveClient = google.drive({ version: "v3", auth });
  folderCache.clear();
  return cachedDriveClient;
}

/**
 * Mengambil ID subfolder di bawah `parentFolderId` jika sudah ada, atau membuatnya.
 * Hasil di-cache in-memory per instance agar tidak berulang kali memanggil Drive list API.
 */
export async function getOrCreateDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const drive = getDriveClient();
  const cacheKey = `${parentFolderId ?? "root"}:${folderName}`;
  const existing = folderCache.get(cacheKey);
  if (existing) return existing;

  const task = (async () => {
    const escaped = escapeDriveQuery(folderName);
    const parentClause = parentFolderId
      ? `'${escapeDriveQuery(parentFolderId)}' in parents and `
      : "";
    const q = `${parentClause}name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    const res = await drive.files.list({
      q,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const foundId = res.data.files?.[0]?.id;
    if (foundId) return foundId;

    const created = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        ...(parentFolderId ? { parents: [parentFolderId] } : {}),
      },
      fields: "id",
      supportsAllDrives: true,
    });

    if (!created.data.id) {
      throw new Error(`Gagal membuat folder Google Drive "${folderName}".`);
    }
    return created.data.id;
  })().catch((err) => {
    folderCache.delete(cacheKey);
    throw err;
  });

  folderCache.set(cacheKey, task);
  return task;
}

async function resolveUploadFolderId(options: {
  folderId?: string;
  folderEnvKey?: string;
  subFolderName?: string;
}): Promise<string | undefined> {
  if (options.folderId?.trim()) return options.folderId.trim();

  if (options.folderEnvKey) {
    const specific = process.env[options.folderEnvKey]?.trim();
    if (specific) return specific;
  }

  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  if (options.subFolderName) {
    return getOrCreateDriveFolder(options.subFolderName, rootId || undefined);
  }
  return rootId || undefined;
}

async function setPublicReaderPermission(drive: drive_v3.Drive, fileId: string): Promise<void> {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[GoogleDrive] Permission public reader warning untuk ${fileId}:`, message);
  }
}

export interface UploadDriveParams {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  folderId?: string;
  folderEnvKey?: string;
  subFolderName?: string;
  makePublic?: boolean;
  maxRetry?: number;
}

export interface UploadDriveResult {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
}

/**
 * Mengunggah Buffer langsung ke Google Drive API v3 (tanpa menyentuh filesystem lokal).
 */
export async function uploadBufferToDrive({
  buffer,
  fileName,
  mimeType,
  folderId,
  folderEnvKey,
  subFolderName,
  makePublic = true,
  maxRetry = 2,
}: UploadDriveParams): Promise<UploadDriveResult> {
  const drive = getDriveClient();
  const targetFolderId = await resolveUploadFolderId({
    folderId,
    folderEnvKey,
    subFolderName,
  });

  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      const uploaded = await drive.files.create({
        requestBody: {
          name: fileName,
          ...(targetFolderId ? { parents: [targetFolderId] } : {}),
        },
        media: {
          mimeType,
          body: Readable.from(buffer),
        },
        fields: "id, webViewLink, webContentLink, name, mimeType",
        supportsAllDrives: true,
      });

      const fileId = uploaded.data.id;
      if (!fileId) {
        throw new Error("Google Drive tidak mengembalikan ID berkas.");
      }

      if (makePublic) {
        await setPublicReaderPermission(drive, fileId);
      }

      return {
        id: fileId,
        name: uploaded.data.name || fileName,
        mimeType: uploaded.data.mimeType || mimeType,
        webViewLink: uploaded.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
        webContentLink: uploaded.data.webContentLink ?? undefined,
      };
    } catch (err: unknown) {
      const status =
        (err as { code?: number; response?: { status?: number } })?.code ??
        (err as { response?: { status?: number } })?.response?.status;

      if (status && RETRYABLE_STATUS.has(status) && attempt < maxRetry) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw new Error("uploadBufferToDrive: batas percobaan ulang terlampaui.");
}
