/**
 * Kalkulasi AHSP murni (tanpa akses database) agar angka yang dilihat S&B di layar
 * identik dengan angka yang disimpan server.
 *
 * Rumus resmi: Subtotal Komponen = (Koefisien x Harga Acuan) x (1 + Margin% / 100)
 * Margin diatur per kategori (Upah, Material, Bongkaran); Alat tanpa margin.
 */
import type { KategoriKoefisien } from "@/types";

export const MARGIN_MIN = 0;
export const MARGIN_MAKS = 25;
export const MARGIN_LANGKAH = 0.5;

export interface MarginKategori {
  upah: number;
  material: number;
  bongkaran: number;
}

export interface KomponenKalkulasi {
  kategori: KategoriKoefisien;
  koefisien: number;
  hargaAcuan: number;
}

export function marginUntuk(kategori: KategoriKoefisien, m: MarginKategori): number {
  switch (kategori) {
    case "UPAH":
      return m.upah;
    case "MATERIAL":
      return m.material;
    case "BONGKARAN":
      return m.bongkaran;
    default:
      return 0;
  }
}

/** Margin valid: 0 sampai 25%, kelipatan 0,5 (selaras slider RincianKalkulasiKoefisien). */
export function marginValid(v: number) {
  return (
    Number.isFinite(v) &&
    v >= MARGIN_MIN &&
    v <= MARGIN_MAKS &&
    Math.abs(v / MARGIN_LANGKAH - Math.round(v / MARGIN_LANGKAH)) < 1e-9
  );
}

export function bulat2(n: number) {
  return Math.round(n * 100) / 100;
}

export function hitungAhsp(items: KomponenKalkulasi[], m: MarginKategori) {
  const perKategori: Record<KategoriKoefisien, { hpp: number; total: number }> = {
    UPAH: { hpp: 0, total: 0 },
    MATERIAL: { hpp: 0, total: 0 },
    ALAT: { hpp: 0, total: 0 },
    BONGKARAN: { hpp: 0, total: 0 },
  };
  for (const it of items) {
    const hpp = it.koefisien * it.hargaAcuan;
    perKategori[it.kategori].hpp += hpp;
    perKategori[it.kategori].total += hpp * (1 + marginUntuk(it.kategori, m) / 100);
  }
  const hpp = Object.values(perKategori).reduce((a, k) => a + k.hpp, 0);
  const total = Object.values(perKategori).reduce((a, k) => a + k.total, 0);
  // Harga satuan resmi dibulatkan ke rupiah penuh.
  const hargaFinal = Math.round(total);
  const marginEfektif = hpp > 0 ? bulat2((hargaFinal / hpp - 1) * 100) : 0;
  return { perKategori, hpp, total, hargaFinal, marginEfektif };
}

/** Statistik harga survei toko: terendah, tertinggi, rata-rata, dan sebaran (%). */
export function statistikSurvei(harga: number[]) {
  const valid = harga.filter((h) => h > 0);
  if (valid.length === 0) return null;
  const min = Math.min(...valid);
  const maks = Math.max(...valid);
  const rata = bulat2(valid.reduce((a, b) => a + b, 0) / valid.length);
  return { jumlah: valid.length, min, maks, rata, sebaranPersen: bulat2(((maks - min) / min) * 100) };
}
