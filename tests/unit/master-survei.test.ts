import { describe, expect, it } from "vitest";
import { evaluasiAcuanSurveiKomponen } from "@/lib/master-survei-util";

describe("evaluasiAcuanSurveiKomponen", () => {
  it("otomatis memakai rata-rata survei saat hanya ada 1 variasi harga dan acuan DB null", () => {
    const res = evaluasiAcuanSurveiKomponen(
      [{ id: "1", rataRataHarga: 98000 }],
      null
    );
    expect(res.jumlahVariasiHarga).toBe(1);
    expect(res.hargaAcuanEfektif).toBe(98000);
    expect(res.adaKonflikAcuan).toBe(false);
  });

  it("tidak menandai konflik saat banyak cabang punya rata-rata survei sama", () => {
    const res = evaluasiAcuanSurveiKomponen(
      [
        { id: "1", rataRataHarga: 120000 },
        { id: "2", rataRataHarga: 120000 },
      ],
      120000
    );
    expect(res.jumlahVariasiHarga).toBe(1);
    expect(res.hargaAcuanEfektif).toBe(120000);
    expect(res.adaKonflikAcuan).toBe(false);
  });

  it("menandai konflik dan menahan acuan saat ada 2+ variasi harga berbeda dan acuan DB masih null", () => {
    const res = evaluasiAcuanSurveiKomponen(
      [
        { id: "1", rataRataHarga: 98000 },
        { id: "2", rataRataHarga: 95000 },
      ],
      null
    );
    expect(res.jumlahVariasiHarga).toBe(2);
    expect(res.hargaAcuanEfektif).toBeNull();
    expect(res.adaKonflikAcuan).toBe(true);
  });

  it("mempertahankan acuan tersimpan dan menandai konflik saat ada survei baru dengan harga berbeda", () => {
    const res = evaluasiAcuanSurveiKomponen(
      [
        { id: "1", rataRataHarga: 105000 },
        { id: "2", rataRataHarga: 98000 },
      ],
      98000
    );
    expect(res.hargaAcuanEfektif).toBe(98000);
    expect(res.adaKonflikAcuan).toBe(true);
  });
});
