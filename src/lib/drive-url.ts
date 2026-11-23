const DRIVE_FILE_D_PATTERN = /https?:\/\/(?:drive|docs)\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/i;
const DRIVE_OPEN_ID_PATTERN = /https?:\/\/drive\.google\.com\/open\?[^#]*\bid=([A-Za-z0-9_-]{10,})/i;

/** Mengambil Google Drive fileId dari URL Google Drive, atau null jika bukan tautan Drive. */
export function extractGoogleDriveFileId(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const matchD = DRIVE_FILE_D_PATTERN.exec(trimmed);
  if (matchD?.[1]) return matchD[1];

  const matchOpen = DRIVE_OPEN_ID_PATTERN.exec(trimmed);
  if (matchOpen?.[1]) return matchOpen[1];

  return null;
}

/** Menentukan apakah lampiran bertipe PDF berdasarkan nama berkas maupun URL. */
export function isPdfLampiran(url?: string | null, namaFile?: string | null): boolean {
  const byName = (namaFile || "").trim().toLowerCase().endsWith(".pdf");
  const cleanUrl = (url || "").split("?")[0].trim().toLowerCase();
  const byUrl = cleanUrl.endsWith(".pdf");
  return byName || byUrl;
}

export interface PreviewSourceResult {
  kind: "iframe" | "image";
  src: string;
  isGoogleDrive: boolean;
}

/**
 * Mengubah URL lampiran (Google Drive `webViewLink` atau URL lokal)
 * menjadi sumber siap tampil untuk `<iframe>` atau `<img>` pratinjau.
 */
export function toPreviewSource(url: string, namaFile?: string | null): PreviewSourceResult {
  const isPdf = isPdfLampiran(url, namaFile);
  const driveId = extractGoogleDriveFileId(url);

  if (driveId) {
    if (isPdf) {
      return {
        kind: "iframe",
        src: `https://drive.google.com/file/d/${driveId}/preview`,
        isGoogleDrive: true,
      };
    }
    return {
      kind: "image",
      src: `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`,
      isGoogleDrive: true,
    };
  }

  return {
    kind: isPdf ? "iframe" : "image",
    src: url,
    isGoogleDrive: false,
  };
}
