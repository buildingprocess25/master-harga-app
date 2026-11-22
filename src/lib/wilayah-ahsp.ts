/**
 * Helper murni (tanpa akses database) untuk pengajuan harga wilayah B&M Manager:
 * resep AHSP dan komponen Tenaga Kerja menggunakan daftar komponen yang berlaku,
 * sedangkan komponen Bahan & Peralatan diisi via input 3 toko saat pengajuan.
 */

import { bulat2, hitungAhsp, type MarginKategori } from "@/lib/kalkulasi-ahsp";
import type { KategoriKoefisien } from "@/types";

export interface LampiranSurveiWilayahInput {
  tipe?: string;
  jenisLampiran?: string;
  namaFile: string;
  url?: string;
  fileUrl?: string;
  ukuranFile?: string;
}

export interface StoreSurveiWilayahInput {
  noToko?: number;
  namaToko: string;
  alamatToko?: string;
  alamat?: string;
  volumeAcuan?: number;
  hargaSatuan: number;
  tanggalSurvei?: string;
  catatanSurvei?: string;
  catatan?: string;
  buktiSurveiUrl?: string;
  buktiSurveiName?: string;
  lampiranList?: LampiranSurveiWilayahInput[];
}

export interface KomponenAhspIndukInput {
  id: string;
  masterKoefisienId: string;
  kategori: KategoriKoefisien;
  namaKomponen: string;
  satuan: string;
  nilaiKoefisien: number;
  hargaAcuanSatuan: number;
  marginPersen: number;
}

export interface InputHargaKomponenWilayah {
  rincianId?: string;
  masterKoefisienId?: string;
  surveyToko?: StoreSurveiWilayahInput[];
}

export interface BarisAhspWilayahTersusun {
  masterKoefisienId: string;
  namaKomponen: string;
  kategoriKomponen: KategoriKoefisien;
  satuan: string;
  nilaiKoefisien: number;
  hargaAcuanSatuan: number;
  marginPersen: number;
  subtotal: number;
  surveyToko: StoreSurveiWilayahInput[];
}

export function isKomponenHargaEditableWilayah(kategori: KategoriKoefisien): boolean {
  return kategori === "MATERIAL" || kategori === "ALAT";
}

export function susunRincianWilayahDariInduk(
  komponenInduk: KomponenAhspIndukInput[],
  hargaInput: InputHargaKomponenWilayah[],
  marginFallback = 8
): {
  baris: BarisAhspWilayahTersusun[];
  hpp: number;
  total: number;
  hargaFinal: number;
  marginEfektif: number;
  marginKategori: MarginKategori;
  rataRataSurveiMaterial: number | null;
} {
  if (komponenInduk.length === 0) {
    throw new Error("Resep AHSP untuk item dan divisi ini belum tersedia.");
  }

  const byRincianId = new Map<string, StoreSurveiWilayahInput[]>();
  const byMasterId = new Map<string, StoreSurveiWilayahInput[]>();
  for (const h of hargaInput) {
    const stores = Array.isArray(h.surveyToko) ? h.surveyToko : [];
    if (h.rincianId) byRincianId.set(h.rincianId, stores);
    if (h.masterKoefisienId) byMasterId.set(h.masterKoefisienId, stores);
  }

  const baris: BarisAhspWilayahTersusun[] = komponenInduk.map((k) => {
    let hargaAcuan = k.hargaAcuanSatuan;
    let surveyToko: StoreSurveiWilayahInput[] = [];

    if (isKomponenHargaEditableWilayah(k.kategori)) {
      const rawStores = byRincianId.get(k.id) ?? byMasterId.get(k.masterKoefisienId) ?? [];
      const validStores = rawStores.filter(
        (s) => Boolean(s.namaToko?.trim()) && Number(s.hargaSatuan) > 0
      );
      if (validStores.length < 3) {
        throw new Error(
          `Komponen "${k.namaKomponen}" wajib memiliki 3 toko valid dengan harga > 0.`
        );
      }

      const tigaToko = validStores.slice(0, 3).map((s, idx) => ({
        ...s,
        noToko: idx + 1,
        namaToko: s.namaToko.trim(),
        alamatToko: (s.alamatToko ?? s.alamat ?? "").trim(),
        volumeAcuan: Number(s.volumeAcuan) || 1,
        hargaSatuan: Math.round(Number(s.hargaSatuan)),
        catatanSurvei: (s.catatanSurvei ?? s.catatan ?? "").trim(),
      }));

      hargaAcuan = Math.round(
        (tigaToko[0].hargaSatuan + tigaToko[1].hargaSatuan + tigaToko[2].hargaSatuan) / 3
      );
      surveyToko = tigaToko;
    }

    const subtotal = bulat2(k.nilaiKoefisien * hargaAcuan * (1 + k.marginPersen / 100));

    return {
      masterKoefisienId: k.masterKoefisienId,
      namaKomponen: k.namaKomponen,
      kategoriKomponen: k.kategori,
      satuan: k.satuan,
      nilaiKoefisien: k.nilaiKoefisien,
      hargaAcuanSatuan: hargaAcuan,
      marginPersen: k.marginPersen,
      subtotal,
      surveyToko,
    };
  });

  const ambilMargin = (kat: KategoriKoefisien) =>
    baris.find((b) => b.kategoriKomponen === kat)?.marginPersen ?? marginFallback;

  const marginKategori: MarginKategori = {
    upah: ambilMargin("UPAH"),
    material: ambilMargin("MATERIAL") ?? ambilMargin("ALAT"),
    bongkaran: ambilMargin("BONGKARAN"),
  };

  const kalk = hitungAhsp(
    baris.map((b) => ({
      kategori: b.kategoriKomponen,
      koefisien: b.nilaiKoefisien,
      hargaAcuan: b.hargaAcuanSatuan,
    })),
    marginKategori
  );

  if (kalk.hargaFinal <= 0) {
    throw new Error("Total harga wilayah harus lebih dari Rp 0.");
  }

  const utamaMaterial = baris
    .filter((b) => isKomponenHargaEditableWilayah(b.kategoriKomponen))
    .sort(
      (a, b) =>
        b.nilaiKoefisien * b.hargaAcuanSatuan - a.nilaiKoefisien * a.hargaAcuanSatuan
    )[0];

  return {
    baris,
    hpp: kalk.hpp,
    total: kalk.total,
    hargaFinal: kalk.hargaFinal,
    marginEfektif: kalk.marginEfektif,
    marginKategori,
    rataRataSurveiMaterial: utamaMaterial ? utamaMaterial.hargaAcuanSatuan : null,
  };
}

export function hitungSelisihTerhadapInduk(hargaWilayah: number, hargaInduk: number) {
  const selisihRp = Math.round(hargaWilayah - hargaInduk);
  const selisihPersen =
    hargaInduk > 0 ? bulat2(((hargaWilayah - hargaInduk) / hargaInduk) * 100) : 0;
  return { selisihRp, selisihPersen };
}
