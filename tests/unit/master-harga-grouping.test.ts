import { describe, expect, it } from "vitest";
import {
  kelompokkanSlotPerCabang,
  ringkasHargaItemPerCabang,
  type SlotHargaCabangSnb,
} from "@/lib/master-harga-grouping";

function makeSlot(overrides: Partial<SlotHargaCabangSnb>): SlotHargaCabangSnb {
  return {
    id: "slot-1",
    cabangId: "cab-ckk",
    namaCabang: "Cabang Cikokol",
    kodeCabang: "CKK",
    regional: "Jabodetabek 1",
    divisiId: "div-bld",
    kodeDivisi: "DIV-BLD",
    namaDivisi: "Building",
    harga: 200000,
    marginPersen: 8,
    berlakuSejak: "2026-11-01T00:00:00.000Z",
    nomorTiket: "MH-REL-0001",
    wilayahList: [],
    ...overrides,
  };
}

describe("Unit: Agregasi & Pengelompokan Master Harga Nasional SNB", () => {
  it("menghitung ringkasan jumlah cabang unik, slot divisi, total wilayah, dan rentang harga", () => {
    const summary = ringkasHargaItemPerCabang([
      { cabangId: "cab-ckk", harga: 200000, jumlahWilayah: 2 },
      { cabangId: "cab-ckk", harga: 210000, jumlahWilayah: 0 },
      { cabangId: "cab-bdg", harga: 195000, jumlahWilayah: 1 },
    ]);

    expect(summary).toEqual({
      minHarga: 195000,
      maxHarga: 210000,
      totalCabangUnik: 2,
      totalSlotAktif: 3,
      totalWilayah: 3,
    });
  });

  it("mengembalikan nilai nol saat belum ada slot harga aktif", () => {
    expect(ringkasHargaItemPerCabang([])).toEqual({
      minHarga: 0,
      maxHarga: 0,
      totalCabangUnik: 0,
      totalSlotAktif: 0,
      totalWilayah: 0,
    });
  });

  it("mengelompokkan slot per cabang urut nama cabang & urutan divisi resmi", () => {
    const groups = kelompokkanSlotPerCabang([
      makeSlot({
        id: "s-ckk-dc",
        cabangId: "cab-ckk",
        namaCabang: "Cabang Cikokol",
        kodeDivisi: "DIV-DC",
        namaDivisi: "Distribution Center",
      }),
      makeSlot({
        id: "s-bdg-mnt",
        cabangId: "cab-bdg",
        namaCabang: "Cabang Bandung 1",
        kodeCabang: "BDG",
        kodeDivisi: "DIV-MNT",
        namaDivisi: "Maintenance",
        wilayahList: [
          {
            id: "w-1",
            namaWilayah: "Wilayah Soreang",
            kodeWilayah: "WIL-KBP",
            harga: 215000,
            selisihRp: 15000,
            selisihPersen: 7.5,
            berlakuSejak: "2026-11-01T00:00:00.000Z",
            nomorTiket: "MH-WIL-0001",
          },
        ],
      }),
      makeSlot({
        id: "s-ckk-bld",
        cabangId: "cab-ckk",
        namaCabang: "Cabang Cikokol",
        kodeDivisi: "DIV-BLD",
        namaDivisi: "Building",
      }),
    ]);

    expect(groups.map((g) => g.namaCabang)).toEqual([
      "Cabang Bandung 1",
      "Cabang Cikokol",
    ]);
    expect(groups[0].totalWilayah).toBe(1);
    expect(groups[1].slots.map((s) => s.kodeDivisi)).toEqual(["DIV-BLD", "DIV-DC"]);
  });
});
