import { KategoriKoefisien } from "@/types";

export const LABEL_KATEGORI: Record<KategoriKoefisien, string> = {
  UPAH: "Upah Kerja",
  MATERIAL: "Material Bahan",
  ALAT: "Peralatan Kerja",
  BONGKARAN: "Pekerjaan Bongkaran",
};

export const URUTAN_KATEGORI: KategoriKoefisien[] = ["UPAH", "MATERIAL", "ALAT", "BONGKARAN"];

/** Pilihan kategori standar untuk form tambah komponen di Master Koefisien. */
export const OPSI_KATEGORI_KOEFISIEN: Array<{ value: KategoriKoefisien; label: string }> = [
  { value: "UPAH", label: "Tenaga kerja" },
  { value: "MATERIAL", label: "Bahan" },
  { value: "ALAT", label: "Peralatan" },
];

/** Terima "0,0188" maupun "0.0188"; kembalikan NaN bila tidak valid. */
export function parseAngka(s: string): number {
  const bersih = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d*\.?\d+$/.test(bersih)) return NaN;
  return Number(bersih);
}

/** Membatasi input koefisien agar hanya berisi angka dan maksimal satu koma desimal (maks 4 digit). */
export function sanitasiInputKoefisien(raw: string): string {
  const denganKoma = raw.replace(/\./g, ",").replace(/[^0-9,]/g, "");
  const idx = denganKoma.indexOf(",");
  if (idx === -1) return denganKoma;
  const sebelum = denganKoma.slice(0, idx);
  const sesudah = denganKoma.slice(idx + 1).replace(/,/g, "").slice(0, 4);
  return `${sebelum},${sesudah}`;
}

export function formatAngka(n: number, maks = 4) {
  return n.toLocaleString("id-ID", { maximumFractionDigits: maks });
}
