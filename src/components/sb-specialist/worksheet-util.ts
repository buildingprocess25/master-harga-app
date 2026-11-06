import { KategoriKoefisien } from "@/types";

export const LABEL_KATEGORI: Record<KategoriKoefisien, string> = {
  UPAH: "Upah Kerja",
  MATERIAL: "Material Bahan",
  ALAT: "Peralatan Kerja",
  BONGKARAN: "Pekerjaan Bongkaran",
};

export const URUTAN_KATEGORI: KategoriKoefisien[] = ["UPAH", "MATERIAL", "ALAT", "BONGKARAN"];

/** Terima "0,0188" maupun "0.0188"; kembalikan NaN bila tidak valid. */
export function parseAngka(s: string): number {
  const bersih = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d*\.?\d+$/.test(bersih)) return NaN;
  return Number(bersih);
}

export function formatAngka(n: number, maks = 4) {
  return n.toLocaleString("id-ID", { maximumFractionDigits: maks });
}
