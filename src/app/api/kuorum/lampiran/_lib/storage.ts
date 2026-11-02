import path from "node:path";

/**
 * Penyimpanan lokal berkas bukti banding (di luar folder public, disajikan lewat
 * route terproteksi). Untuk deployment, ganti ke object storage bersama tim.
 */
export const DIR_LAMPIRAN_BANDING = path.join(
  process.env.STORAGE_DIR || path.join(process.cwd(), "storage"),
  "lampiran-banding"
);

export const MAKS_UKURAN_LAMPIRAN = 5 * 1024 * 1024;

export const TIPE_LAMPIRAN: Record<string, { ext: string; mime: string }> = {
  "application/pdf": { ext: "pdf", mime: "application/pdf" },
  "image/jpeg": { ext: "jpg", mime: "image/jpeg" },
  "image/png": { ext: "png", mime: "image/png" },
};

export const MIME_DARI_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/** Cek magic bytes agar berkas yang diunggah benar PDF/JPG/PNG, bukan hanya berganti nama. */
export function cocokSignature(buf: Buffer, mime: string) {
  if (mime === "application/pdf") return buf.subarray(0, 5).toString("latin1") === "%PDF-";
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === "image/png")
    return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return false;
}

export function formatUkuran(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
