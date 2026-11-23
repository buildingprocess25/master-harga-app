export { cocokSignature, formatUkuran, MIME_DARI_EXT } from "@/lib/storage/lampiran-storage";

export const MAKS_UKURAN_LAMPIRAN = 5 * 1024 * 1024;

export const TIPE_LAMPIRAN: Record<string, { ext: string; mime: string }> = {
  "application/pdf": { ext: "pdf", mime: "application/pdf" },
  "image/jpeg": { ext: "jpg", mime: "image/jpeg" },
  "image/png": { ext: "png", mime: "image/png" },
};
