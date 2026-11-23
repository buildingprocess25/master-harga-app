import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));

import {
  hitungSelisihTerhadapInduk,
  susunRincianWilayahDariInduk,
  type KomponenAhspIndukInput,
} from "@/lib/wilayah-ahsp";
import { hargaAcuanEfektif } from "@/lib/services/margin-service";

const sampleInduk: KomponenAhspIndukInput[] = [
  {
    id: "r-upah",
    masterKoefisienId: "k-upah",
    kategori: "UPAH",
    namaKomponen: "Tukang Cat",
    satuan: "Oh",
    nilaiKoefisien: 0.5,
    hargaAcuanSatuan: 150000,
    marginPersen: 10,
  },
  {
    id: "r-mat",
    masterKoefisienId: "k-mat",
    kategori: "MATERIAL",
    namaKomponen: "Cat Eksterior",
    satuan: "Kg",
    nilaiKoefisien: 0.25,
    hargaAcuanSatuan: 100000,
    marginPersen: 8,
  },
  {
    id: "r-alat",
    masterKoefisienId: "k-alat",
    kategori: "ALAT",
    namaKomponen: "Roller Cat",
    satuan: "Unit",
    nilaiKoefisien: 1,
    hargaAcuanSatuan: 20000,
    marginPersen: 8,
  },
];

describe("Unit: Pengajuan Harga Wilayah Input 3 Toko", () => {
  it("menghitung rata-rata 3 toko untuk MATERIAL & ALAT dan mempertahankan UPAH", () => {
    const res = susunRincianWilayahDariInduk(sampleInduk, [
      {
        rincianId: "r-mat",
        surveyToko: [
          { namaToko: "Toko A", hargaSatuan: 110000 },
          { namaToko: "Toko B", hargaSatuan: 120000 },
          { namaToko: "Toko C", hargaSatuan: 130000 },
        ],
      },
      {
        rincianId: "r-alat",
        surveyToko: [
          { namaToko: "Toko A", hargaSatuan: 24000 },
          { namaToko: "Toko B", hargaSatuan: 25000 },
          { namaToko: "Toko C", hargaSatuan: 26000 },
        ],
      },
    ]);

    expect(res.baris[0].hargaAcuanSatuan).toBe(150000);
    expect(res.baris[1].hargaAcuanSatuan).toBe(120000);
    expect(res.baris[1].surveyToko).toHaveLength(3);
    expect(res.baris[2].hargaAcuanSatuan).toBe(25000);
    expect(res.baris[2].surveyToko).toHaveLength(3);

    // HPP: (0.5*150000) + (0.25*120000) + (1*25000) = 75000 + 30000 + 25000 = 130000
    expect(res.hpp).toBe(130000);
    // Total: (75000*1.10) + (30000*1.08) + (25000*1.08) = 82500 + 32400 + 27000 = 141900
    expect(res.hargaFinal).toBe(141900);
    expect(res.rataRataSurveiMaterial).toBe(120000);
  });

  it("menolak bila komponen Bahan/Peralatan kurang dari 3 toko valid atau resep kosong", () => {
    expect(() =>
      susunRincianWilayahDariInduk(sampleInduk, [
        {
          rincianId: "r-mat",
          surveyToko: [
            { namaToko: "Toko A", hargaSatuan: 110000 },
            { namaToko: "Toko B", hargaSatuan: 120000 },
            { namaToko: "", hargaSatuan: 130000 },
          ],
        },
        {
          rincianId: "r-alat",
          surveyToko: [
            { namaToko: "Toko A", hargaSatuan: 24000 },
            { namaToko: "Toko B", hargaSatuan: 25000 },
            { namaToko: "Toko C", hargaSatuan: 26000 },
          ],
        },
      ])
    ).toThrow(/3 toko valid/);

    expect(() => susunRincianWilayahDariInduk([], [])).toThrow(/Resep AHSP/);
  });

  it("menghitung selisih harga wilayah terhadap induk cabang", () => {
    expect(hitungSelisihTerhadapInduk(108000, 100000)).toEqual({
      selisihRp: 8000,
      selisihPersen: 8,
    });
    expect(hitungSelisihTerhadapInduk(95000, 100000)).toEqual({
      selisihRp: -5000,
      selisihPersen: -5,
    });
  });

  it("hargaAcuanEfektif menghitung rata-rata 3 toko saat survei tersedia", () => {
    expect(
      hargaAcuanEfektif({
        wajibSurveiToko: true,
        hargaAcuanSatuan: 120000,
        hargaSurvei: [110000, 120000, 130000],
      })
    ).toEqual({
      harga: 120000,
      sumber: "SURVEI",
      stat: { jumlah: 3, min: 110000, maks: 130000, rata: 120000, sebaranPersen: 18.18 },
    });
  });
});
