import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));

import {
  bulat2,
  hitungAhsp,
  marginUntuk,
  marginValid,
  statistikSurvei,
} from "@/lib/kalkulasi-ahsp";
import { hargaAcuanEfektif, marginTersimpan } from "@/lib/services/margin-service";
import { marginDefaultKategori } from "@/lib/services/pengajuan-service";

describe("Unit: Kalkulasi AHSP, Survei & Margin", () => {
  it("memvalidasi aturan margin 0..25% dengan kelipatan 0.5%", () => {
    expect(marginValid(0)).toBe(true);
    expect(marginValid(8)).toBe(true);
    expect(marginValid(12.5)).toBe(true);
    expect(marginValid(25)).toBe(true);

    expect(marginValid(-0.5)).toBe(false);
    expect(marginValid(25.5)).toBe(false);
    expect(marginValid(8.3)).toBe(false);
    expect(marginValid(Number.NaN)).toBe(false);
  });

  it("menerapkan margin pada UPAH, MATERIAL (Bahan & Peralatan), dan BONGKARAN", () => {
    const m = { upah: 10, material: 8, bongkaran: 12 };
    expect(marginUntuk("UPAH", m)).toBe(10);
    expect(marginUntuk("MATERIAL", m)).toBe(8);
    expect(marginUntuk("BONGKARAN", m)).toBe(12);
    expect(marginUntuk("ALAT", m)).toBe(8);
    expect(marginDefaultKategori("ALAT", 8)).toBe(8);
    expect(marginDefaultKategori("MATERIAL", 8)).toBe(8);
  });

  it("menghitung HPP, total per kategori, hargaFinal bulat rupiah, dan marginEfektif dengan tepat", () => {
    const res = hitungAhsp(
      [
        { kategori: "UPAH", koefisien: 0.5, hargaAcuan: 120000 }, // HPP 60,000 -> +10% = 66,000
        { kategori: "MATERIAL", koefisien: 1.05, hargaAcuan: 100000 }, // HPP 105,000 -> +8% = 113,400
        { kategori: "ALAT", koefisien: 1, hargaAcuan: 10000 }, // HPP 10,000 -> +8% = 10,800
        { kategori: "BONGKARAN", koefisien: 0.25, hargaAcuan: 40000 }, // HPP 10,000 -> +12% = 11,200
      ],
      { upah: 10, material: 8, bongkaran: 12 }
    );

    expect(res.perKategori.UPAH).toEqual({ hpp: 60000, total: 66000 });
    expect(res.perKategori.MATERIAL.hpp).toBe(105000);
    expect(res.perKategori.MATERIAL.total).toBeCloseTo(113400, 5);
    expect(res.perKategori.ALAT).toEqual({ hpp: 10000, total: 10800 });
    expect(res.perKategori.BONGKARAN.hpp).toBe(10000);
    expect(res.perKategori.BONGKARAN.total).toBeCloseTo(11200, 5);
    expect(res.hpp).toBe(185000);
    expect(res.hargaFinal).toBe(201400);
    expect(res.marginEfektif).toBe(bulat2((201400 / 185000 - 1) * 100));
  });

  it("menghasilkan marginEfektif 0 jika total HPP adalah 0", () => {
    const res = hitungAhsp([], { upah: 8, material: 8, bongkaran: 8 });
    expect(res.hpp).toBe(0);
    expect(res.hargaFinal).toBe(0);
    expect(res.marginEfektif).toBe(0);
  });

  it("menghitung statistik survei 3 toko (min, maks, rata-rata, sebaranPersen)", () => {
    expect(statistikSurvei([])).toBeNull();
    expect(statistikSurvei([0, -100])).toBeNull();

    const stat = statistikSurvei([90000, 100000, 110000]);
    expect(stat).toEqual({
      jumlah: 3,
      min: 90000,
      maks: 110000,
      rata: 100000,
      sebaranPersen: 22.22,
    });
  });

  it("memilih harga acuan efektif dari survei untuk wajibSurveiToko dan menandai SURVEI_KOSONG jika belum disurvei", () => {
    expect(
      hargaAcuanEfektif({ wajibSurveiToko: false, hargaAcuanSatuan: 150000, hargaSurvei: [] })
    ).toEqual({ harga: 150000, sumber: "PUSTAKA", stat: null });

    expect(
      hargaAcuanEfektif({ wajibSurveiToko: true, hargaAcuanSatuan: 95000, hargaSurvei: [] })
    ).toEqual({ harga: 95000, sumber: "SURVEI_KOSONG", stat: null });

    const withSurvey = hargaAcuanEfektif({
      wajibSurveiToko: true,
      hargaAcuanSatuan: 95000,
      hargaSurvei: [98000, 100000, 102000],
    });
    expect(withSurvey.sumber).toBe("SURVEI");
    expect(withSurvey.harga).toBe(100000);
  });

  it("mengambil margin tersimpan per kategori dengan fallback ke marginAwal", () => {
    const m = marginTersimpan(
      [
        { kategori: "UPAH", marginPersen: 10 },
        { kategori: "MATERIAL", marginPersen: 7.5 },
      ],
      8
    );
    expect(m).toEqual({ upah: 10, material: 7.5, bongkaran: 8 });
  });
});
