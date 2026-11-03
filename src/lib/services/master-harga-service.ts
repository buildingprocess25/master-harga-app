import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

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
    ...(f.cabangId ? { cabangId: f.cabangId } : {}),
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
export async function getOpsiFilterKatalog() {
  const [cabangList, divisiList, kategoriRows] = await Promise.all([
    prisma.cabang.findMany({
      where: { masterHargaList: { some: { statusHarga: "AKTIF" } } },
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
