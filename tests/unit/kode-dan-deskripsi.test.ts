import { describe, expect, it } from "vitest";
import {
  generateDeskripsiOtomatis,
  getKodeData,
  PengajuanHargaItem,
} from "@/types/pengajuan";
import { buatDeskripsiOtomatis, buatKodePaket } from "@/lib/utils";

function makeExistingItem(overrides: Partial<PengajuanHargaItem>): PengajuanHargaItem {
  return {
    id: "ex-1",
    noTiket: "REQ-2026-001",
    kodeItem: "SIP-001",
    kode: "SIP-001",
    kodeMaster: "SIP-001-A-PekerjaanKeramik",
    namaItem: "Homogeneous Tile",
    item: "Homogeneous Tile",
    kategori: "Pekerjaan Keramik",
    merk: "Roman",
    ukuran: "60x60 cm",
    warna: "Grey",
    tipe: "Sicily Grey Matte",
    permukaan: "Matte",
    tebal: "9 mm",
    lokasi: "Sales Area",
    divisiId: "div-bld",
    cabangId: "cab-cikokol",
    cakupanHarga: "INDUK_CABANG",
    status: "DIAJUKAN",
    tanggalPengajuan: "2026-11-01",
    surveiTokoList: [],
    koefisienItems: [],
    liveMarginUpah: 8,
    liveMarginMaterial: 8,
    liveMarginBongkaran: 8,
    totalHpp: 0,
    totalHargaSatuan: 0,
    ...overrides,
  };
}

describe("Unit: Penomoran Kode Master & Deskripsi Terstandarisasi", () => {
  it("menetapkan SIP-001 varian A untuk item fisik pertama yang belum ada", () => {
    const res = getKodeData({
      kategori: "Pekerjaan Keramik",
      item: "Homogeneous Tile",
      lokasi: "Sales Area",
      ukuran: "60x60 cm",
      merk: "Roman",
      warna: "Grey",
      tipe: "Sicily Grey Matte",
      permukaan: "Matte",
      tebal: "9 mm",
      existingItems: [],
    });

    expect(res.kodeItem).toBe("SIP-001");
    expect(res.kodeArea).toBe("A");
    expect(res.kodeMaster).toBe("SIP-001-A-PekerjaanKeramik");
    expect(res.isDuplicate).toBe(false);
  });

  it("mendeteksi duplikat saat spesifikasi fisik DAN lokasi area gerai identik", () => {
    const existing = [makeExistingItem({})];
    const res = getKodeData({
      kategori: "Pekerjaan Keramik",
      item: "homogeneous tile",
      lokasi: "sales area",
      ukuran: "60x60",
      merk: "Roman",
      warna: "Grey",
      tipe: "Sicily Grey Matte",
      permukaan: "Matte",
      tebal: "9mm",
      existingItems: existing,
    });

    expect(res.isDuplicate).toBe(true);
    expect(res.kodeItem).toBe("SIP-001");
    expect(res.kodeArea).toBe("A");
  });

  it("membuat varian huruf berikutnya (B) ketika fisik sama tetapi lokasi area gerai berbeda", () => {
    const existing = [makeExistingItem({})];
    const res = getKodeData({
      kategori: "Pekerjaan Keramik",
      item: "Homogeneous Tile",
      lokasi: "Teras",
      ukuran: "60x60 cm",
      merk: "Roman",
      warna: "Grey",
      tipe: "Sicily Grey Matte",
      permukaan: "Matte",
      tebal: "9 mm",
      existingItems: existing,
    });

    expect(res.isDuplicate).toBe(false);
    expect(res.kodeItem).toBe("SIP-001");
    expect(res.kodeArea).toBe("B");
    expect(res.kodeMaster).toBe("SIP-001-B-PekerjaanKeramik");
  });

  it("menaikkan nomor urut SIP-XXX saat item fisik berbeda diajukan", () => {
    const existing = [makeExistingItem({ kode: "SIP-004", kodeItem: "SIP-004" })];
    const res = getKodeData({
      kategori: "Pekerjaan Pengecatan",
      item: "Cat Interior",
      lokasi: "Dinding Dalam",
      ukuran: "20 kg",
      merk: "Dulux",
      warna: "White",
      tipe: "Pentalite Ultra Matt",
      permukaan: "Matte",
      tebal: "1 mm",
      existingItems: existing,
    });

    expect(res.isDuplicate).toBe(false);
    expect(res.kodeItem).toBe("SIP-005");
    expect(res.kodeArea).toBe("A");
  });

  it("menyusun deskripsi otomatis lengkap dengan toleransi terukur minimal dan catatan kurung", () => {
    const desc = generateDeskripsiOtomatis({
      item: "Homogeneous Tile",
      ukuran: "60x60 cm",
      merk: "Roman",
      warna: "Grey",
      tipe: "Sicily Grey Matte",
      tebal: "10 mm",
      permukaan: "Matte",
      toleransi: "0.5 mm",
      lokasi: "Sales Area",
      implementasi: "Lantai",
      informasiTambahan: "Anti slip R10",
    });

    expect(desc).toContain("Homogeneous Tile 60x60 cm Roman Grey");
    expect(desc).toContain("Tipe Sicily Grey Matte");
    expect(desc).toContain("Tebal 10 mm");
    expect(desc).toContain("Toleransi 0.5 mm (Toleransi Terukur Minimal: 9.50 mm)");
    expect(desc).toContain("Lokasi Sales Area");
    expect(desc).toContain("Implementasi Lantai");
    expect(desc).toContain("(Anti slip R10)");
  });

  it("menyertakan jenisCor pada buatDeskripsiOtomatis dan generateDeskripsiOtomatis", () => {
    const clientDesc = generateDeskripsiOtomatis({
      item: "Pengecoran Lantai Gudang",
      jenisCor: "Ready Mix K-225",
      ukuran: "10 cm",
      merk: "Holcim",
      warna: "Grey",
      tipe: "Structur",
      permukaan: "Trowel",
      lokasi: "Gudang",
    });
    expect(clientDesc).toContain("Pengecoran Lantai Gudang Jenis Ready Mix K-225");

    const serverDesc = buatDeskripsiOtomatis({
      kategori: "Pekerjaan Cor",
      jenisCor: "Site Mix",
      namaItem: "Cor Rabat Beton",
      ukuran: "15 cm",
      merk: "Lokal",
      lokasi: "Area Parkir",
      satuan: "M3",
    });
    expect(serverDesc).toBe(
      "Cor Rabat Beton, jenis Site Mix, ukuran 15 cm, merk Lokal, lokasi Area Parkir"
    );
  });

  it("menghasilkan kodePaket konsisten untuk cabang & tanggal Asia/Jakarta yang sama", () => {
    const tglPagi = new Date("2026-11-17T01:00:00.000Z"); // 08:00 WIB
    const tglSore = new Date("2026-11-17T11:30:00.000Z"); // 18:30 WIB
    const tglBesok = new Date("2026-11-17T18:00:00.000Z"); // 2026-11-18 01:00 WIB

    expect(buatKodePaket("CAB-CKL", tglPagi)).toBe("PKT-CKL-20261117");
    expect(buatKodePaket("CKL", tglSore)).toBe("PKT-CKL-20261117");
    expect(buatKodePaket("CAB-CKL", tglBesok)).toBe("PKT-CKL-20261118");
  });
});
