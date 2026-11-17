import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { TipeLampiranSurvei } from "@/types";

/**
 * Filter Katalog Master Harga. Semua opsional; string kosong dianggap tidak difilter.
 */
export interface FilterKatalog {
  q?: string;
  cabangId?: string;
  divisiId?: string;
  kategori?: string;
  /** true: hanya item yang memiliki harga khusus wilayah (override). */
  hanyaOverride?: boolean;
  /** Batasi ke cabang tertentu (cakupan wewenang Regional Manager). */
  cabangIds?: string[];
}

export const UKURAN_HALAMAN_KATALOG = 50;
export const BATAS_EKSPOR_KATALOG = 5000;

/** Membaca filter dari query string (?q=&cabang=&divisi=&kategori=&override=1). */
export function parseFilterKatalog(sp: Record<string, string | string[] | undefined>): FilterKatalog {
  const ambil = (k: string) => {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s : undefined;
  };
  return {
    q: ambil("q"),
    cabangId: ambil("cabang"),
    divisiId: ambil("divisi"),
    kategori: ambil("kategori"),
    hanyaOverride: ambil("override") === "1",
  };
}

function buatWhere(f: FilterKatalog): Prisma.MasterHargaCabangWhereInput {
  const itemWhere: Prisma.MasterItemWhereInput = {
    ...(f.divisiId ? { divisiId: f.divisiId } : {}),
    ...(f.kategori ? { kategori: f.kategori } : {}),
    ...(f.q
      ? {
          OR: [
            { namaItem: { contains: f.q, mode: "insensitive" } },
            { kodeMaster: { contains: f.q, mode: "insensitive" } },
            { merk: { contains: f.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return {
    statusHarga: "AKTIF",
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
  const spesifikasi = [m.merk, m.ukuran, m.tipe, m.warna].filter(Boolean).join(", ");
  return {
    id: r.id,
    kodeMaster: m.kodeMaster,
    namaItem: m.namaItem,
    spesifikasi,
    kategori: m.kategori,
    namaDivisi: m.divisi.namaDivisi,
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

/** Opsi dropdown filter: hanya nilai yang benar-benar memiliki harga resmi aktif. */
export async function getOpsiFilterKatalog(cabangIds?: string[]) {
  const [cabangList, divisiList, kategoriRows] = await Promise.all([
    prisma.cabang.findMany({
      where: { masterHargaList: { some: { statusHarga: "AKTIF" } }, ...(cabangIds ? { id: { in: cabangIds } } : {}) },
      select: { id: true, namaCabang: true, regional: true },
      orderBy: { namaCabang: "asc" },
    }),
    prisma.divisi.findMany({
      where: { masterItems: { some: { hargaPerCabang: { some: { statusHarga: "AKTIF" } } } } },
      select: { id: true, namaDivisi: true },
      orderBy: { namaDivisi: "asc" },
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
      kodeMaster: m.kodeMaster,
      namaItem: m.namaItem,
      kategori: m.kategori,
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
      divisiId: m.divisiId,
      namaDivisi: m.divisi.namaDivisi,
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
