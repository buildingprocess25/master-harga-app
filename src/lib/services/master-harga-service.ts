import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { TipeLampiranSurvei } from "@/types";
import {
  kelompokkanSlotPerCabang,
  ringkasHargaItemPerCabang,
  type CabangHargaGroup,
  type SlotHargaCabangSnb,
} from "@/lib/master-harga-grouping";

export type { CabangHargaGroup, SlotHargaCabangSnb };

/**
 * Filter Katalog Master Harga. Semua opsional; string kosong dianggap tidak difilter.
 */
export interface FilterKatalog {
  q?: string;
  cabangId?: string;
  divisiId?: string;
  kategori?: string;
  kelompok?: "SIP" | "ME";
  statusCabangSaya?: "semua" | "aktif" | "belum_aktif";
  /** true: hanya item yang memiliki harga khusus wilayah (override). */
  hanyaOverride?: boolean;
  /** Batasi ke cabang tertentu (cakupan wewenang Regional Manager). */
  cabangIds?: string[];
}

export const UKURAN_HALAMAN_KATALOG = 50;
export const UKURAN_HALAMAN_SNB = 20;
export const UKURAN_HALAMAN_CABANG_MODAL = 15;
export const BATAS_EKSPOR_KATALOG = 5000;

/** Membaca filter dari query string (?q=&cabang=&divisi=&kategori=&kelompok=&status=&override=1). */
export function parseFilterKatalog(sp: Record<string, string | string[] | undefined>): FilterKatalog {
  const ambil = (k: string) => {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s : undefined;
  };
  const kelRaw = ambil("kelompok")?.toUpperCase();
  const statusRaw = ambil("status")?.toLowerCase();
  return {
    q: ambil("q"),
    cabangId: ambil("cabang"),
    divisiId: ambil("divisi"),
    kategori: ambil("kategori"),
    kelompok: kelRaw === "SIP" || kelRaw === "ME" ? kelRaw : undefined,
    statusCabangSaya:
      statusRaw === "aktif" || statusRaw === "belum_aktif" ? statusRaw : "semua",
    hanyaOverride: ambil("override") === "1",
  };
}

function buatItemWhere(f: FilterKatalog): Prisma.MasterItemWhereInput {
  return {
    ...(f.kategori ? { kategori: f.kategori } : {}),
    ...(f.kelompok
      ? { kodeItem: { startsWith: `${f.kelompok}-`, mode: "insensitive" } }
      : {}),
    ...(f.q
      ? {
          OR: [
            { namaItem: { contains: f.q, mode: "insensitive" } },
            { kodeItem: { contains: f.q, mode: "insensitive" } },
            { kodeMaster: { contains: f.q, mode: "insensitive" } },
            { merk: { contains: f.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function buatWhere(f: FilterKatalog): Prisma.MasterHargaCabangWhereInput {
  const itemWhere = buatItemWhere(f);

  return {
    statusHarga: "AKTIF",
    ...(f.divisiId ? { divisiId: f.divisiId } : {}),
    // Filter cabang tunggal tetap dibatasi cakupan wewenang bila ada.
    ...(f.cabangIds
      ? { cabangId: f.cabangId && f.cabangIds.includes(f.cabangId) ? f.cabangId : { in: f.cabangIds } }
      : f.cabangId
        ? { cabangId: f.cabangId }
        : {}),
    masterItem: itemWhere,
    ...(f.hanyaOverride ? { masterHargaWilayah: { some: { statusHarga: "AKTIF" } } } : {}),
  };
}

const INCLUDE_KATALOG = {
  masterItem: { include: { divisi: true } },
  cabang: true,
  divisi: true,
  pengajuanTerakhir: { select: { nomorTiket: true } },
  masterHargaWilayah: {
    where: { statusHarga: "AKTIF" as const },
    orderBy: { wilayahCabang: { namaWilayah: "asc" as const } },
    include: {
      wilayahCabang: true,
      pengajuanTerakhir: { select: { nomorTiket: true } },
    },
  },
} satisfies Prisma.MasterHargaCabangInclude;

const ORDER_KATALOG: Prisma.MasterHargaCabangOrderByWithRelationInput[] = [
  { masterItem: { kategori: "asc" } },
  { masterItem: { namaItem: "asc" } },
  { cabang: { namaCabang: "asc" } },
];

type BarisDb = Prisma.MasterHargaCabangGetPayload<{ include: typeof INCLUDE_KATALOG }>;

function petakanBaris(r: BarisDb) {
  const m = r.masterItem;
  const spesifikasi = [m.jenisCor, m.merk, m.ukuran, m.tipe, m.warna].filter(Boolean).join(", ");
  return {
    id: r.id,
    kodeItem: m.kodeItem,
    kodeMaster: m.kodeMaster,
    kelompokKode: (m.kodeItem.toUpperCase().startsWith("ME-") ? "ME" : "SIP") as "SIP" | "ME",
    namaItem: m.namaItem,
    spesifikasi,
    kategori: m.kategori,
    divisiId: r.divisiId,
    kodeDivisi: r.divisi.kodeDivisi,
    namaDivisi: r.divisi.namaDivisi,
    satuan: m.satuan,
    namaCabang: r.cabang.namaCabang,
    kodeCabang: r.cabang.kodeCabang,
    regional: r.cabang.regional,
    harga: r.hargaFinalInduk.toNumber(),
    marginPersen: r.marginTotalPersen.toNumber(),
    berlakuSejak: r.berlakuSejak.toISOString(),
    nomorTiket: r.pengajuanTerakhir?.nomorTiket ?? null,
    wilayahList: r.masterHargaWilayah.map((w) => ({
      id: w.id,
      namaWilayah: w.wilayahCabang.namaWilayah,
      kodeWilayah: w.wilayahCabang.kodeWilayah,
      harga: w.hargaFinalWilayah.toNumber(),
      selisihRp: w.selisihDariIndukRp.toNumber(),
      selisihPersen: w.selisihDariIndukPersen.toNumber(),
      berlakuSejak: w.berlakuSejak.toISOString(),
      nomorTiket: w.pengajuanTerakhir?.nomorTiket ?? null,
    })),
  };
}

export type BarisKatalog = ReturnType<typeof petakanBaris>;

/**
 * Katalog harga resmi (status AKTIF) per cabang induk, lengkap dengan
 * harga override wilayah di bawahnya. Paginasi berdasarkan baris harga induk.
 */
export async function getKatalogHarga(filter: FilterKatalog, page = 1) {
  const where = buatWhere(filter);
  const halaman = Math.max(1, Math.floor(page) || 1);

  const [total, totalOverride, cabangTercakup, rows] = await Promise.all([
    prisma.masterHargaCabang.count({ where }),
    prisma.masterHargaWilayah.count({
      where: { statusHarga: "AKTIF", masterHargaCabang: where },
    }),
    prisma.masterHargaCabang.groupBy({ by: ["cabangId"], where }),
    prisma.masterHargaCabang.findMany({
      where,
      include: INCLUDE_KATALOG,
      orderBy: ORDER_KATALOG,
      skip: (halaman - 1) * UKURAN_HALAMAN_KATALOG,
      take: UKURAN_HALAMAN_KATALOG,
    }),
  ]);

  return {
    rows: rows.map(petakanBaris),
    total,
    totalOverride,
    totalCabang: cabangTercakup.length,
    halaman,
    jumlahHalaman: Math.max(1, Math.ceil(total / UKURAN_HALAMAN_KATALOG)),
  };
}

/** Seluruh baris sesuai filter (dibatasi) untuk ekspor dan cetak. */
export async function getKatalogUntukEkspor(filter: FilterKatalog) {
  const rows = await prisma.masterHargaCabang.findMany({
    where: buatWhere(filter),
    include: INCLUDE_KATALOG,
    orderBy: ORDER_KATALOG,
    take: BATAS_EKSPOR_KATALOG + 1,
  });
  return {
    rows: rows.slice(0, BATAS_EKSPOR_KATALOG).map(petakanBaris),
    terpotong: rows.length > BATAS_EKSPOR_KATALOG,
  };
}

/** Opsi dropdown filter: hanya cabang/kategori yang relevan + seluruh divisi aktif. */
export async function getOpsiFilterKatalog(cabangIds?: string[]) {
  const [cabangList, divisiList, kategoriRows] = await Promise.all([
    prisma.cabang.findMany({
      where: { masterHargaList: { some: { statusHarga: "AKTIF" } }, ...(cabangIds ? { id: { in: cabangIds } } : {}) },
      select: { id: true, namaCabang: true, regional: true },
      orderBy: { namaCabang: "asc" },
    }),
    prisma.divisi.findMany({
      where: { isActive: true },
      select: { id: true, kodeDivisi: true, namaDivisi: true },
      orderBy: { kodeDivisi: "asc" },
    }),
    prisma.masterItem.findMany({
      where: { hargaPerCabang: { some: { statusHarga: "AKTIF" } } },
      select: { kategori: true },
      distinct: ["kategori"],
      orderBy: { kategori: "asc" },
    }),
  ]);
  return { cabangList, divisiList, kategoriList: kategoriRows.map((k) => k.kategori) };
}

/** Ringkasan teks filter aktif, dipakai di judul cetak dan nama berkas ekspor. */
export async function deskripsiFilterKatalog(f: FilterKatalog) {
  const bagian: string[] = [];
  if (f.cabangId) {
    const c = await prisma.cabang.findUnique({ where: { id: f.cabangId }, select: { namaCabang: true } });
    if (c) bagian.push(`Cabang ${c.namaCabang}`);
  }
  if (f.divisiId) {
    const d = await prisma.divisi.findUnique({ where: { id: f.divisiId }, select: { namaDivisi: true } });
    if (d) bagian.push(`Divisi ${d.namaDivisi}`);
  }
  if (f.kategori) bagian.push(`Kategori ${f.kategori}`);
  if (f.q) bagian.push(`Pencarian "${f.q}"`);
  if (f.hanyaOverride) bagian.push("Hanya item dengan harga khusus wilayah");
  return bagian.length > 0 ? bagian.join(" | ") : "Semua cabang dan divisi";
}

/**
 * Mengambil rincian lengkap satu entri MasterHargaCabang (spesifikasi item,
 * harga induk & wilayah, serta resep AHSP dan survei 3 toko dari tiket rilis terakhir).
 */
export async function getDetailHargaRilis(masterHargaCabangId: string) {
  const row = await prisma.masterHargaCabang.findUnique({
    where: { id: masterHargaCabangId },
    include: {
      masterItem: { include: { divisi: true } },
      cabang: true,
      divisi: true,
      masterHargaWilayah: {
        orderBy: { wilayahCabang: { namaWilayah: "asc" } },
        include: {
          wilayahCabang: true,
          pengajuanTerakhir: { select: { nomorTiket: true } },
        },
      },
      pengajuanTerakhir: {
        include: {
          rincianAHSP: {
            include: {
              masterKoefisien: true,
              surveiTokoList: {
                include: { lampiranList: true },
                orderBy: { urutanToko: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!row) return null;

  const m = row.masterItem;
  const tiket = row.pengajuanTerakhir;
  const surveiList = (tiket?.rincianAHSP ?? []).flatMap((r) =>
    r.surveiTokoList.map((s) => ({
      id: s.id,
      noToko: s.urutanToko,
      urutanToko: s.urutanToko,
      namaToko: s.namaToko,
      alamatToko: s.alamatToko || "",
      harga: Number(s.hargaSatuanSurvei),
      tanggalSurvei: s.tanggalSurvei.toISOString(),
      catatan: s.catatanSurvei || undefined,
      namaKomponen: r.namaKomponen,
      lampiranList: s.lampiranList.map((l) => ({
        id: l.id,
        tipe: (l.jenisLampiran as TipeLampiranSurvei) || "NOTA_PEMBELIAN",
        namaFile: l.namaFile,
        url: l.fileUrl,
        keterangan: l.ukuranFile || undefined,
      })),
    }))
  );

  const koefisienItems = (tiket?.rincianAHSP ?? []).map((r) => ({
    id: r.id,
    masterKoefisienId: r.masterKoefisienId,
    kategori: r.kategoriKomponen as "UPAH" | "MATERIAL" | "ALAT" | "BONGKARAN",
    namaKomponen: r.namaKomponen,
    satuan: r.satuan,
    koefisien: Number(r.nilaiKoefisien),
    hargaAcuan: Number(r.hargaAcuanSatuan),
    marginPersen: Number(r.marginPersen),
    wajibSurveiToko: r.masterKoefisien.wajibSurveiToko,
    subtotal: Number(r.subtotal),
    total: Number(r.subtotal),
  }));

  return {
    id: row.id,
    statusHarga: row.statusHarga,
    hargaFinalInduk: row.hargaFinalInduk.toNumber(),
    marginTotalPersen: row.marginTotalPersen.toNumber(),
    berlakuSejak: row.berlakuSejak.toISOString(),
    nomorTiket: tiket?.nomorTiket ?? null,
    item: {
      id: tiket?.id ?? row.id,
      noTiket: tiket?.nomorTiket ?? "-",
      kodeItem: m.kodeItem,
      kelompokKode: (m.kodeItem.toUpperCase().startsWith("ME-") ? "ME" : "SIP") as "SIP" | "ME",
      kodeMaster: m.kodeMaster,
      namaItem: m.namaItem,
      kategori: m.kategori,
      jenisCor: m.jenisCor || undefined,
      merk: m.merk,
      tipe: m.tipe || undefined,
      ukuran: m.ukuran,
      warna: m.warna || undefined,
      permukaan: m.permukaan || undefined,
      tebal: m.tebal || undefined,
      toleransi: m.toleransi || undefined,
      lokasi: m.lokasi,
      satuan: m.satuan,
      deskripsiOtomatis: m.deskripsiOtomatis,
      divisiId: row.divisiId,
      kodeDivisi: row.divisi.kodeDivisi,
      namaDivisi: row.divisi.namaDivisi,
      cabangId: row.cabangId,
      namaCabang: row.cabang.namaCabang,
      cakupanHarga: "INDUK_CABANG" as const,
      status: "RELEASED" as const,
      tanggalPengajuan: (tiket?.tanggalPengajuan ?? row.berlakuSejak).toISOString(),
      surveiTokoList: surveiList,
      koefisienItems,
      liveMarginUpah:
        koefisienItems.find((k) => k.kategori === "UPAH")?.marginPersen ?? row.marginTotalPersen.toNumber(),
      liveMarginMaterial:
        koefisienItems.find((k) => k.kategori === "MATERIAL")?.marginPersen ?? row.marginTotalPersen.toNumber(),
      liveMarginBongkaran:
        koefisienItems.find((k) => k.kategori === "BONGKARAN")?.marginPersen ?? row.marginTotalPersen.toNumber(),
      totalHpp: koefisienItems.reduce((s, k) => s + k.koefisien * k.hargaAcuan, 0),
      totalHargaSatuan: row.hargaFinalInduk.toNumber(),
    },
    wilayahList: row.masterHargaWilayah.map((w) => ({
      id: w.id,
      namaWilayah: w.wilayahCabang.namaWilayah,
      kodeWilayah: w.wilayahCabang.kodeWilayah,
      harga: w.hargaFinalWilayah.toNumber(),
      selisihRp: w.selisihDariIndukRp.toNumber(),
      selisihPersen: w.selisihDariIndukPersen.toNumber(),
      statusHarga: w.statusHarga,
      berlakuSejak: w.berlakuSejak.toISOString(),
      nomorTiket: w.pengajuanTerakhir?.nomorTiket ?? null,
    })),
  };
}

export type DetailHargaRilis = NonNullable<Awaited<ReturnType<typeof getDetailHargaRilis>>>;

export async function setStatusHargaCabang(id: string, aktif: boolean) {
  const existing = await prisma.masterHargaCabang.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new Error("Data master harga cabang tidak ditemukan.");
  await prisma.masterHargaCabang.update({
    where: { id },
    data: { statusHarga: aktif ? "AKTIF" : "NONAKTIF" },
  });
}

// ============================================================================
// VIEW S&B SPECIALIST: RINGKASAN PER MASTER ITEM + ON-DEMAND HARGA CABANG/WILAYAH
// ============================================================================

export async function getMasterHargaPerItem(filter: FilterKatalog, page = 1) {
  const hargaSlotFilter: Prisma.MasterHargaCabangWhereInput = {
    statusHarga: "AKTIF",
    ...(filter.cabangId ? { cabangId: filter.cabangId } : {}),
    ...(filter.divisiId ? { divisiId: filter.divisiId } : {}),
    ...(filter.hanyaOverride ? { masterHargaWilayah: { some: { statusHarga: "AKTIF" } } } : {}),
  };

  const itemWhere: Prisma.MasterItemWhereInput = {
    ...buatItemWhere(filter),
    hargaPerCabang: { some: hargaSlotFilter },
  };

  const slotWhere = buatWhere(filter);
  const halaman = Math.max(1, Math.floor(page) || 1);

  const [totalItems, totalSlotAktif, totalOverride, cabangTercakup, items] = await Promise.all([
    prisma.masterItem.count({ where: itemWhere }),
    prisma.masterHargaCabang.count({ where: slotWhere }),
    prisma.masterHargaWilayah.count({
      where: { statusHarga: "AKTIF", masterHargaCabang: slotWhere },
    }),
    prisma.masterHargaCabang.groupBy({ by: ["cabangId"], where: slotWhere }),
    prisma.masterItem.findMany({
      where: itemWhere,
      orderBy: [{ kategori: "asc" }, { namaItem: "asc" }],
      skip: (halaman - 1) * UKURAN_HALAMAN_SNB,
      take: UKURAN_HALAMAN_SNB,
      select: {
        id: true,
        kodeItem: true,
        kodeMaster: true,
        namaItem: true,
        kategori: true,
        jenisCor: true,
        merk: true,
        ukuran: true,
        tipe: true,
        warna: true,
        lokasi: true,
        satuan: true,
        divisi: { select: { namaDivisi: true } },
        hargaPerCabang: {
          where: hargaSlotFilter,
          select: {
            cabangId: true,
            hargaFinalInduk: true,
            _count: {
              select: {
                masterHargaWilayah: { where: { statusHarga: "AKTIF" } },
              },
            },
          },
        },
      },
    }),
  ]);

  const rows = items.map((m) => {
    const spesifikasi = [m.jenisCor, m.merk, m.ukuran, m.tipe, m.warna].filter(Boolean).join(", ");
    const ringkasan = ringkasHargaItemPerCabang(
      m.hargaPerCabang.map((h) => ({
        cabangId: h.cabangId,
        harga: h.hargaFinalInduk.toNumber(),
        jumlahWilayah: h._count.masterHargaWilayah,
      }))
    );

    return {
      id: m.id,
      kodeItem: m.kodeItem,
      kodeMaster: m.kodeMaster,
      kelompokKode: (m.kodeItem.toUpperCase().startsWith("ME-") ? "ME" : "SIP") as "SIP" | "ME",
      namaItem: m.namaItem,
      spesifikasi,
      kategori: m.kategori,
      jenisCor: m.jenisCor,
      lokasi: m.lokasi,
      satuan: m.satuan,
      namaDivisiUtama: m.divisi.namaDivisi,
      ...ringkasan,
    };
  });

  return {
    rows,
    totalItems,
    totalSlotAktif,
    totalOverride,
    totalCabang: cabangTercakup.length,
    halaman,
    jumlahHalaman: Math.max(1, Math.ceil(totalItems / UKURAN_HALAMAN_SNB)),
  };
}

export type BarisMasterHargaPerItem = Awaited<ReturnType<typeof getMasterHargaPerItem>>["rows"][number];

export interface FilterCabangPerItem {
  q?: string;
  cabangId?: string;
  divisiId?: string;
  hanyaOverride?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getDaftarHargaCabangPerItem(
  masterItemId: string,
  filter: FilterCabangPerItem = {}
) {
  const item = await prisma.masterItem.findUnique({
    where: { id: masterItemId },
    select: {
      id: true,
      kodeItem: true,
      kodeMaster: true,
      namaItem: true,
      kategori: true,
      satuan: true,
      lokasi: true,
    },
  });
  if (!item) return null;

  const qClean = filter.q?.trim();
  const pageSize = Math.max(1, Math.min(50, Math.floor(filter.pageSize || UKURAN_HALAMAN_CABANG_MODAL)));

  const slotWhere: Prisma.MasterHargaCabangWhereInput = {
    masterItemId,
    statusHarga: "AKTIF",
    ...(filter.cabangId ? { cabangId: filter.cabangId } : {}),
    ...(filter.divisiId ? { divisiId: filter.divisiId } : {}),
    ...(filter.hanyaOverride ? { masterHargaWilayah: { some: { statusHarga: "AKTIF" } } } : {}),
    ...(qClean
      ? {
          OR: [
            { cabang: { namaCabang: { contains: qClean, mode: "insensitive" } } },
            { cabang: { kodeCabang: { contains: qClean, mode: "insensitive" } } },
            {
              masterHargaWilayah: {
                some: {
                  statusHarga: "AKTIF",
                  wilayahCabang: {
                    OR: [
                      { namaWilayah: { contains: qClean, mode: "insensitive" } },
                      { kodeWilayah: { contains: qClean, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [matchingCabangRows, totalSlot, totalWilayah, cabangAktifItemRows] = await Promise.all([
    prisma.masterHargaCabang.findMany({
      where: slotWhere,
      distinct: ["cabangId"],
      orderBy: { cabang: { namaCabang: "asc" } },
      select: { cabangId: true },
    }),
    prisma.masterHargaCabang.count({ where: slotWhere }),
    prisma.masterHargaWilayah.count({
      where: { statusHarga: "AKTIF", masterHargaCabang: slotWhere },
    }),
    prisma.masterHargaCabang.findMany({
      where: { masterItemId, statusHarga: "AKTIF" },
      distinct: ["cabangId"],
      orderBy: { cabang: { namaCabang: "asc" } },
      select: { cabang: { select: { id: true, namaCabang: true } } },
    }),
  ]);

  const totalCabang = matchingCabangRows.length;
  const jumlahHalaman = Math.max(1, Math.ceil(totalCabang / pageSize));
  const halaman = Math.min(jumlahHalaman, Math.max(1, Math.floor(filter.page || 1)));
  const targetCabangIds = matchingCabangRows
    .slice((halaman - 1) * pageSize, halaman * pageSize)
    .map((c) => c.cabangId);

  const slotsDb =
    targetCabangIds.length > 0
      ? await prisma.masterHargaCabang.findMany({
          where: { ...slotWhere, cabangId: { in: targetCabangIds } },
          orderBy: [{ cabang: { namaCabang: "asc" } }, { divisi: { kodeDivisi: "asc" } }],
          include: {
            cabang: { select: { id: true, namaCabang: true, kodeCabang: true, regional: true } },
            divisi: { select: { id: true, kodeDivisi: true, namaDivisi: true } },
            pengajuanTerakhir: { select: { nomorTiket: true } },
            masterHargaWilayah: {
              where: { statusHarga: "AKTIF" },
              orderBy: { wilayahCabang: { namaWilayah: "asc" } },
              include: {
                wilayahCabang: { select: { namaWilayah: true, kodeWilayah: true } },
                pengajuanTerakhir: { select: { nomorTiket: true } },
              },
            },
          },
        })
      : [];

  const mappedSlots: SlotHargaCabangSnb[] = slotsDb.map((r) => ({
    id: r.id,
    cabangId: r.cabangId,
    namaCabang: r.cabang.namaCabang,
    kodeCabang: r.cabang.kodeCabang,
    regional: r.cabang.regional,
    divisiId: r.divisiId,
    kodeDivisi: r.divisi.kodeDivisi,
    namaDivisi: r.divisi.namaDivisi,
    harga: r.hargaFinalInduk.toNumber(),
    marginPersen: r.marginTotalPersen.toNumber(),
    berlakuSejak: r.berlakuSejak.toISOString(),
    nomorTiket: r.pengajuanTerakhir?.nomorTiket ?? null,
    wilayahList: r.masterHargaWilayah.map((w) => ({
      id: w.id,
      namaWilayah: w.wilayahCabang.namaWilayah,
      kodeWilayah: w.wilayahCabang.kodeWilayah,
      harga: w.hargaFinalWilayah.toNumber(),
      selisihRp: w.selisihDariIndukRp.toNumber(),
      selisihPersen: w.selisihDariIndukPersen.toNumber(),
      berlakuSejak: w.berlakuSejak.toISOString(),
      nomorTiket: w.pengajuanTerakhir?.nomorTiket ?? null,
    })),
  }));

  return {
    item: {
      id: item.id,
      kodeItem: item.kodeItem,
      kodeMaster: item.kodeMaster,
      kelompokKode: (item.kodeItem.toUpperCase().startsWith("ME-") ? "ME" : "SIP") as "SIP" | "ME",
      namaItem: item.namaItem,
      kategori: item.kategori,
      satuan: item.satuan,
      lokasi: item.lokasi,
    },
    cabangGroups: kelompokkanSlotPerCabang(mappedSlots),
    cabangOpsiItem: cabangAktifItemRows.map((c) => c.cabang),
    totalCabang,
    totalSlot,
    totalWilayah,
    halaman,
    jumlahHalaman,
    pageSize,
  };
}

export type DaftarHargaCabangPerItem = NonNullable<
  Awaited<ReturnType<typeof getDaftarHargaCabangPerItem>>
>;

// ============================================================================
// VIEW B&M MANAGER: ISOLASI HARGA PER CABANG SENDIRI + STATUS AKTIF PER DIVISI
// ============================================================================

const URUTAN_DIVISI_RESMI = ["DIV-BLD", "DIV-MNT", "DIV-ENG", "DIV-DC"];

export async function getMasterHargaUntukBm(
  cabangId: string,
  filter: FilterKatalog,
  page = 1
) {
  const allDivisiRaw = await prisma.divisi.findMany({
    where: { isActive: true, kodeDivisi: { in: URUTAN_DIVISI_RESMI } },
    select: { id: true, kodeDivisi: true, namaDivisi: true },
  });
  const allDivisi = [...allDivisiRaw].sort(
    (a, b) => URUTAN_DIVISI_RESMI.indexOf(a.kodeDivisi) - URUTAN_DIVISI_RESMI.indexOf(b.kodeDivisi)
  );
  const jumlahDivisiResmi = Math.max(allDivisi.length, 1);

  let statusFilterWhere: Prisma.MasterItemWhereInput = {};
  if (filter.statusCabangSaya === "aktif") {
    statusFilterWhere = {
      hargaPerCabang: {
        some: {
          cabangId,
          statusHarga: "AKTIF",
          ...(filter.divisiId ? { divisiId: filter.divisiId } : {}),
        },
      },
    };
  } else if (filter.statusCabangSaya === "belum_aktif") {
    if (filter.divisiId) {
      statusFilterWhere = {
        hargaPerCabang: {
          none: { cabangId, divisiId: filter.divisiId, statusHarga: "AKTIF" },
        },
      };
    } else {
      // Item yang belum aktif di minimal 1 divisi pada cabang ini (termasuk yang baru aktif di Building saja)
      statusFilterWhere = {
        OR: allDivisi.map((d) => ({
          hargaPerCabang: { none: { cabangId, divisiId: d.id, statusHarga: "AKTIF" } },
        })),
      };
    }
  } else if (filter.divisiId) {
    statusFilterWhere = {
      OR: [
        { divisiId: filter.divisiId },
        { hargaPerCabang: { some: { divisiId: filter.divisiId, statusHarga: "AKTIF" } } },
      ],
    };
  }

  const baseReleaseWhere: Prisma.MasterItemWhereInput = {
    ...buatItemWhere(filter),
    hargaPerCabang: { some: { statusHarga: "AKTIF" } },
  };

  const itemWhere: Prisma.MasterItemWhereInput = {
    AND: [baseReleaseWhere, statusFilterWhere],
  };

  const halaman = Math.max(1, Math.floor(page) || 1);

  const [totalItems, totalAktifDiCabang, items] = await Promise.all([
    prisma.masterItem.count({ where: itemWhere }),
    prisma.masterItem.count({
      where: {
        hargaPerCabang: { some: { statusHarga: "AKTIF", cabangId } },
      },
    }),
    prisma.masterItem.findMany({
      where: itemWhere,
      orderBy: [{ kategori: "asc" }, { namaItem: "asc" }],
      skip: (halaman - 1) * UKURAN_HALAMAN_KATALOG,
      take: UKURAN_HALAMAN_KATALOG,
      include: {
        // ISOLASI KETAT: hanya mengambil harga milik cabang BNM itu sendiri!
        hargaPerCabang: {
          where: { cabangId, statusHarga: "AKTIF" },
          include: {
            divisi: true,
            pengajuanTerakhir: { select: { nomorTiket: true } },
            masterHargaWilayah: {
              where: { statusHarga: "AKTIF" },
              orderBy: { wilayahCabang: { namaWilayah: "asc" } },
              include: {
                wilayahCabang: true,
                pengajuanTerakhir: { select: { nomorTiket: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const itemIds = items.map((m) => m.id);
  const [tiketBerjalan, cabangAktifRows] = await Promise.all([
    itemIds.length > 0
      ? prisma.pengajuanHarga.findMany({
          where: {
            cabangId,
            masterItemId: { in: itemIds },
            status: { notIn: ["DITOLAK", "RELEASED"] },
          },
          select: {
            id: true,
            nomorTiket: true,
            divisiId: true,
            masterItemId: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    itemIds.length > 0
      ? prisma.masterHargaCabang.findMany({
          where: {
            masterItemId: { in: itemIds },
            statusHarga: "AKTIF",
          },
          select: {
            masterItemId: true,
            cabangId: true,
            cabang: { select: { namaCabang: true } },
            divisi: { select: { kodeDivisi: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const urutanShortDiv = ["BLD", "MNT", "ENG", "DC"];
  const cabangAktifPerItem = new Map<
    string,
    Map<
      string,
      {
        cabangId: string;
        namaCabang: string;
        isCabangSaya: boolean;
        divisiShortList: string[];
      }
    >
  >();
  for (const row of cabangAktifRows) {
    let perCabang = cabangAktifPerItem.get(row.masterItemId);
    if (!perCabang) {
      perCabang = new Map();
      cabangAktifPerItem.set(row.masterItemId, perCabang);
    }
    const shortDiv = row.divisi.kodeDivisi.replace(/^DIV-/i, "");
    let entry = perCabang.get(row.cabangId);
    if (!entry) {
      entry = {
        cabangId: row.cabangId,
        namaCabang: row.cabang.namaCabang.replace(/^Cabang\s+/i, ""),
        isCabangSaya: row.cabangId === cabangId,
        divisiShortList: [],
      };
      perCabang.set(row.cabangId, entry);
    }
    if (!entry.divisiShortList.includes(shortDiv)) {
      entry.divisiShortList.push(shortDiv);
      entry.divisiShortList.sort(
        (a, b) => urutanShortDiv.indexOf(a) - urutanShortDiv.indexOf(b)
      );
    }
  }

  const rows = items.map((m) => {
    const spesifikasi = [m.jenisCor, m.merk, m.ukuran, m.tipe, m.warna].filter(Boolean).join(", ");
    const divisiStatusList = allDivisi.map((div) => {
      const hargaCabang = m.hargaPerCabang.find((h) => h.divisiId === div.id);
      const tiketProses = tiketBerjalan.find(
        (t) => t.masterItemId === m.id && t.divisiId === div.id
      );

      if (hargaCabang) {
        return {
          divisiId: div.id,
          kodeDivisi: div.kodeDivisi,
          namaDivisi: div.namaDivisi,
          shortLabel: div.kodeDivisi.replace(/^DIV-/i, ""),
          status: "AKTIF" as const,
          hargaInduk: hargaCabang.hargaFinalInduk.toNumber(),
          berlakuSejak: hargaCabang.berlakuSejak.toISOString(),
          nomorTiket: hargaCabang.pengajuanTerakhir?.nomorTiket ?? null,
          wilayahList: hargaCabang.masterHargaWilayah.map((w) => ({
            id: w.id,
            namaWilayah: w.wilayahCabang.namaWilayah,
            harga: w.hargaFinalWilayah.toNumber(),
            selisihPersen: w.selisihDariIndukPersen.toNumber(),
          })),
        };
      }

      if (tiketProses) {
        return {
          divisiId: div.id,
          kodeDivisi: div.kodeDivisi,
          namaDivisi: div.namaDivisi,
          shortLabel: div.kodeDivisi.replace(/^DIV-/i, ""),
          status: "PROSES" as const,
          tiketIdProses: tiketProses.id,
          nomorTiketProses: tiketProses.nomorTiket,
          statusTiketProses: tiketProses.status,
          hargaInduk: null,
          berlakuSejak: null,
          nomorTiket: null,
          wilayahList: [],
        };
      }

      return {
        divisiId: div.id,
        kodeDivisi: div.kodeDivisi,
        namaDivisi: div.namaDivisi,
        shortLabel: div.kodeDivisi.replace(/^DIV-/i, ""),
        status: "BELUM_AKTIF" as const,
        hargaInduk: null,
        berlakuSejak: null,
        nomorTiket: null,
        wilayahList: [],
      };
    });

    const jumlahDivisiAktifDiCabang = divisiStatusList.filter((d) => d.status === "AKTIF").length;
    const adaDivisiBelumAktif = divisiStatusList.some((d) => d.status === "BELUM_AKTIF");
    const hargaAktifList = divisiStatusList
      .filter((d) => d.status === "AKTIF" && d.hargaInduk !== null)
      .map((d) => d.hargaInduk as number);
    const minHargaCabangSaya = hargaAktifList.length > 0 ? Math.min(...hargaAktifList) : null;
    const maxHargaCabangSaya = hargaAktifList.length > 0 ? Math.max(...hargaAktifList) : null;
    const cabangAktifList = Array.from(cabangAktifPerItem.get(m.id)?.values() ?? []).sort((a, b) => {
      if (a.isCabangSaya !== b.isCabangSaya) return a.isCabangSaya ? -1 : 1;
      return a.namaCabang.localeCompare(b.namaCabang, "id-ID");
    });

    return {
      id: m.id,
      kodeItem: m.kodeItem,
      kodeMaster: m.kodeMaster,
      kelompokKode: (m.kodeItem.toUpperCase().startsWith("ME-") ? "ME" : "SIP") as "SIP" | "ME",
      namaItem: m.namaItem,
      kategori: m.kategori,
      jenisCor: m.jenisCor,
      ukuran: m.ukuran,
      merk: m.merk,
      tipe: m.tipe,
      warna: m.warna,
      permukaan: m.permukaan,
      tebal: m.tebal,
      toleransi: m.toleransi,
      lokasi: m.lokasi,
      satuan: m.satuan,
      deskripsiOtomatis: m.deskripsiOtomatis,
      spesifikasi,
      divisiStatusList,
      jumlahDivisiAktifDiCabang,
      jumlahDivisiResmi,
      adaDivisiBelumAktif,
      minHargaCabangSaya,
      maxHargaCabangSaya,
      cabangAktifList,
      totalCabangAktif: cabangAktifList.length,
    };
  });

  const totalKatalogRilis = await prisma.masterItem.count({
    where: { hargaPerCabang: { some: { statusHarga: "AKTIF" } } },
  });

  return {
    rows,
    totalItems,
    totalKatalogRilis,
    totalAktifDiCabang,
    totalBelumAktifDiCabang: Math.max(0, totalKatalogRilis - totalAktifDiCabang),
    halaman,
    jumlahHalaman: Math.max(1, Math.ceil(totalItems / UKURAN_HALAMAN_KATALOG)),
  };
}

export type BarisKatalogBm = Awaited<ReturnType<typeof getMasterHargaUntukBm>>["rows"][number];

/**
 * Mengambil template spesifikasi item dan daftar nama komponen material (TANPA harga cabang lain)
 * untuk pre-fill modal TambahPengajuanModal saat BNM mengajukan aktivasi ke cabang / divisi lain.
 */
export async function getTemplateAktivasiMasterItem(masterItemId: string, cabangId: string) {
  const m = await prisma.masterItem.findUnique({
    where: { id: masterItemId },
    include: {
      hargaPerCabang: {
        where: { cabangId, statusHarga: "AKTIF" },
        select: { divisiId: true },
      },
      pengajuanHargaList: {
        where: {
          OR: [{ cabangId }, { status: "RELEASED" }],
        },
        orderBy: [{ tanggalPengajuan: "desc" }],
        take: 10,
        include: {
          rincianAHSP: {
            where: { kategoriKomponen: { in: ["MATERIAL", "ALAT"] } },
            select: {
              masterKoefisienId: true,
              kategoriKomponen: true,
              namaKomponen: true,
              satuan: true,
            },
          },
        },
      },
    },
  });

  if (!m) return null;

  const activeDivisiIds = m.hargaPerCabang.map((h) => h.divisiId);
  const inProgressDivisiIds = m.pengajuanHargaList
    .filter((p) => p.cabangId === cabangId && p.status !== "DITOLAK" && p.status !== "RELEASED")
    .map((p) => p.divisiId);

  const refTiketDenganKomponen = m.pengajuanHargaList.find((p) => p.rincianAHSP.length > 0);
  const komponenMaterial = (refTiketDenganKomponen?.rincianAHSP ?? []).map((r) => ({
    masterKoefisienId: r.masterKoefisienId,
    kategori: r.kategoriKomponen as "MATERIAL" | "ALAT",
    namaKomponen: r.namaKomponen,
    satuan: r.satuan,
  }));

  return {
    masterItemId: m.id,
    kelompokKode: (m.kodeItem.toUpperCase().startsWith("ME-") ? "ME" : "SIP") as "SIP" | "ME",
    kodeItem: m.kodeItem,
    kodeMaster: m.kodeMaster,
    namaItem: m.namaItem,
    kategori: m.kategori,
    jenisCor: m.jenisCor ?? "",
    ukuran: m.ukuran,
    merk: m.merk,
    tipe: m.tipe ?? "",
    warna: m.warna ?? "",
    permukaan: m.permukaan ?? "",
    tebal: m.tebal ?? "",
    toleransi: m.toleransi ?? "",
    lokasi: m.lokasi,
    satuan: m.satuan,
    deskripsiOtomatis: m.deskripsiOtomatis,
    activeDivisiIds,
    inProgressDivisiIds,
    komponenMaterial,
  };
}
