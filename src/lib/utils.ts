import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Menggabungkan class Tailwind secara dinamis dan menyelesaikan konflik utility.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format angka menjadi mata uang Rupiah (Rp) standar Indonesia.
 */
export function formatRupiah(nominal?: number | null): string {
  if (nominal === undefined || nominal === null || isNaN(nominal)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nominal);
}

/**
 * Format angka desimal untuk koefisien AHSP (standar 4 digit desimal).
 */
export function formatKoefisien(val?: number | null, decimals = 4): string {
  if (val === undefined || val === null || isNaN(val)) return "0.0000";
  return Number(val).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format tanggal ISO ke format Indonesia ringkas (e.g. 28 Okt 2026).
 */
export function formatTanggal(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Menghasilkan Kode Paket pengajuan harian per cabang: PKT-<KODE_CABANG>-YYYYMMDD (zona Asia/Jakarta).
 */
export function buatKodePaket(kodeCabang?: string | null, tanggal: Date = new Date()): string {
  const cleanCabang = (kodeCabang || "CBG")
    .toUpperCase()
    .replace(/^CAB[-_]?/i, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6) || "CBG";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(tanggal);
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `PKT-${cleanCabang}-${y}${m}${d}`;
}

/** Kolom spesifikasi yang membentuk identitas item (urutan = urutan deskripsi otomatis). */
export interface SpesifikasiItem {
  kategori: string;
  jenisCor?: string | null;
  namaItem: string;
  ukuran: string;
  merk: string;
  tipe?: string | null;
  warna?: string | null;
  permukaan?: string | null;
  tebal?: string | null;
  toleransi?: string | null;
  lokasi: string;
  satuan: string;
}

const rapikanSpec = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ");

/**
 * Deskripsi otomatis: nama item diikuti atribut spesifikasi yang terisi, dipisah koma.
 * Dipakai bersama oleh Client Component (preview redaksi) & Server Service (persisten DB).
 */
export function buatDeskripsiOtomatis(s: SpesifikasiItem): string {
  const bagian = [
    rapikanSpec(s.namaItem),
    s.jenisCor && `jenis ${rapikanSpec(s.jenisCor)}`,
    s.ukuran && `ukuran ${rapikanSpec(s.ukuran)}`,
    s.merk && `merk ${rapikanSpec(s.merk)}`,
    s.tipe && `tipe ${rapikanSpec(s.tipe)}`,
    s.warna && `warna ${rapikanSpec(s.warna)}`,
    s.permukaan && `permukaan ${rapikanSpec(s.permukaan)}`,
    s.tebal && `tebal ${rapikanSpec(s.tebal)}`,
    s.toleransi && `toleransi ${rapikanSpec(s.toleransi)}`,
    s.lokasi && `lokasi ${rapikanSpec(s.lokasi)}`,
  ].filter(Boolean);
  return bagian.join(", ");
}

export const SATUAN_UKURAN_OPTIONS = [
  { label: "cm", value: "cm" },
  { label: "mm", value: "mm" },
  { label: "m", value: "m" },
  { label: "m2", value: "m2" },
  { label: "m3", value: "m3" },
  { label: "inch", value: "inch" },
  { label: "unit", value: "unit" },
  { label: "pcs", value: "pcs" },
];

/**
 * Memisahkan nilai dan satuan dari string ukuran/dimensi/tebal/toleransi (mis. "60x60 cm" -> { nilai: "60x60", satuan: "cm" }).
 */
export function parseNilaiDanSatuan(
  val?: string | null,
  defaultSatuan = "cm"
): { nilai: string; satuan: string } {
  if (!val) return { nilai: "", satuan: defaultSatuan };
  const trimmed = val.trim();
  const spaced = trimmed.match(/^(.+?)\s+([a-zA-Z][a-zA-Z0-9²³/%]*|%)$/);
  if (spaced) {
    return { nilai: spaced[1].trim(), satuan: spaced[2].trim() };
  }
  const compact = trimmed.match(/^(.+?\d)\s*([a-zA-Z]{1,4}\d?|%)$/);
  if (compact) {
    return { nilai: compact[1].trim(), satuan: compact[2].trim() };
  }
  return { nilai: trimmed, satuan: defaultSatuan };
}

export type JenisMitraVendor = "KONTRAKTOR" | "REKANAN";

/**
 * Menentukan jenis entitas mitra persetujuan kuorum berdasarkan divisi tiket:
 * - Building (DIV-BLD) & DC (DIV-DC) -> KONTRAKTOR
 * - Maintenance (DIV-MNT) & Engineering (DIV-ENG) -> REKANAN
 */
export function jenisMitraUntukDivisi(
  kodeDivisi?: string | null,
  namaDivisi?: string | null
): JenisMitraVendor {
  const k = (kodeDivisi || "").trim().toUpperCase();
  const n = (namaDivisi || "").trim().toLowerCase();
  if (
    k === "DIV-MNT" ||
    k === "DIV-ENG" ||
    n.includes("maintenance") ||
    n.includes("perawatan") ||
    n.includes("engineering") ||
    n.includes("m/e")
  ) {
    return "REKANAN";
  }
  return "KONTRAKTOR";
}

export function labelMitraUntukDivisi(
  kodeDivisi?: string | null,
  namaDivisi?: string | null
): "Rekanan" | "Kontraktor" {
  return jenisMitraUntukDivisi(kodeDivisi, namaDivisi) === "REKANAN"
    ? "Rekanan"
    : "Kontraktor";
}
