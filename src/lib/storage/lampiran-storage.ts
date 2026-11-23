import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { isGoogleDriveConfigured, uploadBufferToDrive } from "./google-drive";

export interface TipeLampiranMeta {
  ext: string;
  mime: string;
}

export const TIPE_LAMPIRAN_UMUM: Record<string, TipeLampiranMeta> = {
  "application/pdf": { ext: "pdf", mime: "application/pdf" },
  "image/jpeg": { ext: "jpg", mime: "image/jpeg" },
  "image/png": { ext: "png", mime: "image/png" },
  "image/webp": { ext: "webp", mime: "image/webp" },
};

export const MIME_DARI_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Validasi magic bytes agar isi berkas benar PDF/JPG/PNG/WEBP, bukan file lain yang diganti ekstensinya. */
export function cocokSignature(buf: Buffer, mime: string): boolean {
  if (mime === "application/pdf") {
    return buf.subarray(0, 5).toString("latin1") === "%PDF-";
  }
  if (mime === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === "image/png") {
    return buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === "image/webp") {
    return (
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

export function formatUkuran(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getLocalStorageRoot(): string {
  if (process.env.STORAGE_DIR?.trim()) {
    return process.env.STORAGE_DIR.trim();
  }
  if (process.env.VERCEL === "1") {
    return path.join(/*turbopackIgnore: true*/ "/tmp", "master-harga-storage");
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "storage");
}

function resolveLocalBucketFile(bucket: string, filename: string): string {
  const safeBucket = path.basename(bucket);
  const safeName = path.basename(filename);
  return path.join(/*turbopackIgnore: true*/ getLocalStorageRoot(), safeBucket, safeName);
}

export interface SimpanLampiranParams {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  ext: string;
  size: number;
  bucket: "lampiran-survei" | "lampiran-banding" | string;
  localUrlPrefix: string;
  driveFolderEnvKey?: string;
  makePublic?: boolean;
}

export interface SimpanLampiranResult {
  namaFile: string;
  namaSimpan: string;
  fileUrl: string;
  url: string;
  ukuranFile: string;
  storageProvider: "google-drive" | "local";
  driveFileId: string | null;
}

/**
 * Menyimpan berkas lampiran secara reusable:
 * - Jika kredensial OAuth2 Google Drive tersedia di env, langsung upload ke Google Drive
 *   dan mengembalikan `webViewLink` publik (atau private jika `makePublic: false`).
 * - Jika env Google Drive belum diisi, otomatis fallback ke storage lokal dengan
 *   `turbopackIgnore` agar Next.js/Vercel tidak men-trace seluruh isi proyek.
 */
export async function simpanBerkasLampiran({
  buffer,
  originalName,
  mimeType,
  ext,
  size,
  bucket,
  localUrlPrefix,
  driveFolderEnvKey,
  makePublic = true,
}: SimpanLampiranParams): Promise<SimpanLampiranResult> {
  const namaFile = originalName.slice(0, 200);
  const namaSimpan = `${randomUUID()}.${ext}`;
  const ukuranFile = formatUkuran(size);

  if (isGoogleDriveConfigured()) {
    const driveName = `${randomUUID().slice(0, 8)}_${namaFile}`;
    const uploaded = await uploadBufferToDrive({
      buffer,
      fileName: driveName,
      mimeType,
      folderEnvKey: driveFolderEnvKey,
      subFolderName: bucket,
      makePublic,
    });

    return {
      namaFile,
      namaSimpan,
      fileUrl: uploaded.webViewLink,
      url: uploaded.webViewLink,
      ukuranFile,
      storageProvider: "google-drive",
      driveFileId: uploaded.id,
    };
  }

  const targetDir = path.join(/*turbopackIgnore: true*/ getLocalStorageRoot(), path.basename(bucket));
  const targetFile = path.join(/*turbopackIgnore: true*/ targetDir, path.basename(namaSimpan));
  await mkdir(targetDir, { recursive: true });
  await writeFile(targetFile, buffer);

  const prefix = localUrlPrefix.replace(/\/$/, "");
  const localUrl = `${prefix}/${namaSimpan}`;

  return {
    namaFile,
    namaSimpan,
    fileUrl: localUrl,
    url: localUrl,
    ukuranFile,
    storageProvider: "local",
    driveFileId: null,
  };
}

/** Membaca berkas fallback lokal (bila belum memakai Google Drive atau untuk berkas lama). */
export async function bacaBerkasLokal(
  bucket: string,
  filename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const safeName = path.basename(filename);
  const targetPath = resolveLocalBucketFile(bucket, safeName);

  const info = await stat(targetPath).catch(() => null);
  if (!info || !info.isFile()) return null;

  const buffer = await readFile(targetPath);
  const ext = path.extname(safeName).replace(".", "").toLowerCase();
  const mimeType = MIME_DARI_EXT[ext] ?? "application/octet-stream";

  return { buffer, mimeType };
}
