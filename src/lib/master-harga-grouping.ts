/**
 * Helper murni (tanpa koneksi DB) untuk agregasi ringkasan item dan pengelompokan
 * harga cabang/divisi/wilayah pada katalog S&B Specialist skala nasional.
 */

export interface SlotRingkasanInput {
  cabangId: string;
  harga: number;
  jumlahWilayah: number;
}

export interface RingkasanItemNasional {
  minHarga: number;
  maxHarga: number;
  totalCabangUnik: number;
  totalSlotAktif: number;
  totalWilayah: number;
}

export interface WilayahHargaItem {
  id: string;
  namaWilayah: string;
  kodeWilayah: string;
  harga: number;
  selisihRp: number;
  selisihPersen: number;
  berlakuSejak: string;
  nomorTiket: string | null;
}

export interface SlotHargaCabangSnb {
  id: string;
  cabangId: string;
  namaCabang: string;
  kodeCabang: string;
  regional: string;
  divisiId: string;
  kodeDivisi: string;
  namaDivisi: string;
  harga: number;
  marginPersen: number;
  berlakuSejak: string;
  nomorTiket: string | null;
  wilayahList: WilayahHargaItem[];
}

export interface CabangHargaGroup {
  cabangId: string;
  namaCabang: string;
  kodeCabang: string;
  regional: string;
  totalWilayah: number;
  slots: SlotHargaCabangSnb[];
}

const URUTAN_KODE_DIVISI = ["DIV-BLD", "DIV-MNT", "DIV-ENG", "DIV-DC"];

export function ringkasHargaItemPerCabang(slots: SlotRingkasanInput[]): RingkasanItemNasional {
  if (slots.length === 0) {
    return {
      minHarga: 0,
      maxHarga: 0,
      totalCabangUnik: 0,
      totalSlotAktif: 0,
      totalWilayah: 0,
    };
  }

  const cabangSet = new Set<string>();
  let minHarga = Number.POSITIVE_INFINITY;
  let maxHarga = Number.NEGATIVE_INFINITY;
  let totalWilayah = 0;

  for (const s of slots) {
    cabangSet.add(s.cabangId);
    if (s.harga < minHarga) minHarga = s.harga;
    if (s.harga > maxHarga) maxHarga = s.harga;
    totalWilayah += s.jumlahWilayah;
  }

  return {
    minHarga: Number.isFinite(minHarga) ? minHarga : 0,
    maxHarga: Number.isFinite(maxHarga) ? maxHarga : 0,
    totalCabangUnik: cabangSet.size,
    totalSlotAktif: slots.length,
    totalWilayah,
  };
}

export function kelompokkanSlotPerCabang(slots: SlotHargaCabangSnb[]): CabangHargaGroup[] {
  const groupMap = new Map<string, CabangHargaGroup>();

  for (const slot of slots) {
    let group = groupMap.get(slot.cabangId);
    if (!group) {
      group = {
        cabangId: slot.cabangId,
        namaCabang: slot.namaCabang,
        kodeCabang: slot.kodeCabang,
        regional: slot.regional,
        totalWilayah: 0,
        slots: [],
      };
      groupMap.set(slot.cabangId, group);
    }
    group.slots.push(slot);
    group.totalWilayah += slot.wilayahList.length;
  }

  const result = Array.from(groupMap.values());
  for (const group of result) {
    group.slots.sort((a, b) => {
      const idxA = URUTAN_KODE_DIVISI.indexOf(a.kodeDivisi.toUpperCase());
      const idxB = URUTAN_KODE_DIVISI.indexOf(b.kodeDivisi.toUpperCase());
      const rankA = idxA === -1 ? 99 : idxA;
      const rankB = idxB === -1 ? 99 : idxB;
      if (rankA !== rankB) return rankA - rankB;
      return a.namaDivisi.localeCompare(b.namaDivisi, "id-ID");
    });
  }

  result.sort((a, b) => a.namaCabang.localeCompare(b.namaCabang, "id-ID"));
  return result;
}

/**
 * Menyusun klausa WHERE Prisma untuk filter status katalog B&M Manager:
 * - "belum_aktif" tanpa divisiId mencari item yang sama sekali belum aktif di cabang tersebut.
 * - "belum_aktif" dengan divisiId mencari item rilis yang belum aktif pada divisi tersebut di cabang ini.
 */
export function buatStatusFilterBmWhere(
  cabangId: string,
  statusCabangSaya?: "semua" | "aktif" | "belum_aktif",
  divisiId?: string
) {
  if (statusCabangSaya === "aktif") {
    return {
      hargaPerCabang: {
        some: {
          cabangId,
          statusHarga: "AKTIF" as const,
          ...(divisiId ? { divisiId } : {}),
        },
      },
    };
  }

  if (statusCabangSaya === "belum_aktif") {
    return {
      hargaPerCabang: {
        none: {
          cabangId,
          statusHarga: "AKTIF" as const,
          ...(divisiId ? { divisiId } : {}),
        },
      },
    };
  }

  if (divisiId) {
    return {
      OR: [
        { divisiId },
        { hargaPerCabang: { some: { divisiId, statusHarga: "AKTIF" as const } } },
      ],
    };
  }

  return {};
}
