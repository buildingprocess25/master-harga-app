import prisma from "@/lib/prisma";
import { bulat2 } from "@/lib/kalkulasi-ahsp";
import { DomainError } from "@/lib/services/transisi-tiket";
import { KategoriKoefisien, TipeLampiranSurvei } from "@/types";

export const KATEGORI_SURVEI: KategoriKoefisien[] = ["MATERIAL", "ALAT"];

export interface MasterSurveiFilter {
  divisiIds?: string[];
  divisiId?: string;
  cabangId?: string;
  kategori?: string;
  q?: string;
}

export async function getMasterSurveiData(filter: MasterSurveiFilter) {
  const q = filter.q?.trim();
  const kategoriFilter =
    filter.kategori && KATEGORI_SURVEI.includes(filter.kategori as KategoriKoefisien)
      ? [filter.kategori]
      : KATEGORI_SURVEI;

  const divisiWhere = filter.divisiId
    ? filter.divisiId
    : filter.divisiIds?.length
      ? { in: filter.divisiIds }
      : undefined;

  const [divisiList, cabangList, koefRows, riwayatRows, tokoRows] = await Promise.all([
    prisma.divisi.findMany({
      where: {
        isActive: true,
        ...(filter.divisiIds?.length ? { id: { in: filter.divisiIds } } : {}),
      },
      select: { id: true, namaDivisi: true, kodeDivisi: true },
      orderBy: { namaDivisi: "asc" },
    }),
    prisma.cabang.findMany({
      where: { isActive: true },
      select: {
        id: true,
        namaCabang: true,
        kodeCabang: true,
        regional: true,
        wilayahList: {
          where: { isActive: true },
          select: { id: true, namaWilayah: true },
          orderBy: { namaWilayah: "asc" },
        },
      },
      orderBy: { namaCabang: "asc" },
    }),
    prisma.masterKoefisien.findMany({
      where: {
        isActive: true,
        kategoriKomponen: { in: kategoriFilter },
        ...(divisiWhere ? { divisiId: divisiWhere } : {}),
        ...(q ? { namaKomponen: { contains: q, mode: "insensitive" } } : {}),
      },
      include: {
        divisi: { select: { id: true, namaDivisi: true } },
        rincianAHSP: {
          where: {
            surveiTokoList: { some: {} },
            ...(filter.cabangId
              ? { pengajuanHarga: { cabangId: filter.cabangId } }
              : {}),
          },
          orderBy: { pengajuanHarga: { tanggalPengajuan: "desc" } },
          take: 5,
          include: {
            pengajuanHarga: {
              select: {
                id: true,
                nomorTiket: true,
                status: true,
                tanggalPengajuan: true,
                cabang: { select: { id: true, namaCabang: true } },
                wilayahCabang: { select: { id: true, namaWilayah: true } },
              },
            },
            surveiTokoList: {
              orderBy: { urutanToko: "asc" },
              include: { lampiranList: true },
            },
          },
        },
      },
      orderBy: [{ kategoriKomponen: "asc" }, { namaKomponen: "asc" }],
    }),
    prisma.rincianAhspPengajuan.findMany({
      where: {
        kategoriKomponen: { in: kategoriFilter },
        surveiTokoList: { some: {} },
        ...(divisiWhere ? { masterKoefisien: { divisiId: divisiWhere } } : {}),
        ...(filter.cabangId
          ? { pengajuanHarga: { cabangId: filter.cabangId } }
          : {}),
        ...(q
          ? {
              OR: [
                { namaKomponen: { contains: q, mode: "insensitive" } },
                { pengajuanHarga: { nomorTiket: { contains: q, mode: "insensitive" } } },
                {
                  surveiTokoList: {
                    some: { namaToko: { contains: q, mode: "insensitive" } },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { pengajuanHarga: { tanggalPengajuan: "desc" } },
      take: 150,
      include: {
        masterKoefisien: {
          select: {
            id: true,
            divisiId: true,
            hargaAcuanDefault: true,
            wajibSurveiToko: true,
          },
        },
        pengajuanHarga: {
          select: {
            id: true,
            nomorTiket: true,
            status: true,
            tanggalPengajuan: true,
            cabang: { select: { id: true, namaCabang: true } },
            wilayahCabang: { select: { id: true, namaWilayah: true } },
            masterItem: { select: { namaItem: true, kodeMaster: true } },
          },
        },
        surveiTokoList: {
          orderBy: { urutanToko: "asc" },
          include: { lampiranList: true },
        },
      },
    }),
    prisma.masterToko.findMany({
      where: {
        ...(filter.cabangId ? { cabangId: filter.cabangId } : {}),
        ...(q
          ? {
              OR: [
                { namaToko: { contains: q, mode: "insensitive" } },
                { alamat: { contains: q, mode: "insensitive" } },
                { kota: { contains: q, mode: "insensitive" } },
                { kontakPic: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        cabang: { select: { id: true, namaCabang: true, kodeCabang: true } },
        wilayahCabang: { select: { id: true, namaWilayah: true } },
        _count: { select: { surveiList: true } },
      },
      orderBy: [{ isActive: "desc" }, { cabang: { namaCabang: "asc" } }, { namaToko: "asc" }],
    }),
  ]);

  const mapSurveiStats = (
    stores: {
      id: string;
      urutanToko: number;
      namaToko: string;
      alamatToko: string | null;
      hargaSatuanSurvei: { toNumber(): number };
      tanggalSurvei: Date;
      catatanSurvei: string | null;
      lampiranList: {
        id: string;
        jenisLampiran: string;
        namaFile: string;
        fileUrl: string;
        ukuranFile: string | null;
      }[];
    }[]
  ) => {
    const prices = stores
      .map((s) => s.hargaSatuanSurvei.toNumber())
      .filter((n) => n > 0);
    const rataRataHarga =
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0;
    const hargaTerendah = prices.length > 0 ? Math.min(...prices) : 0;
    const hargaTertinggi = prices.length > 0 ? Math.max(...prices) : 0;

    return {
      rataRataHarga,
      hargaTerendah,
      hargaTertinggi,
      tokoList: stores.map((s) => ({
        id: s.id,
        noToko: s.urutanToko,
        urutanToko: s.urutanToko,
        namaToko: s.namaToko,
        alamatToko: s.alamatToko || "",
        harga: s.hargaSatuanSurvei.toNumber(),
        tanggalSurvei: s.tanggalSurvei.toISOString(),
        catatan: s.catatanSurvei || undefined,
        lampiranList: s.lampiranList.map((l) => ({
          id: l.id,
          tipe: (l.jenisLampiran as TipeLampiranSurvei) || "NOTA_PEMBELIAN",
          namaFile: l.namaFile,
          url: l.fileUrl,
          keterangan: l.ukuranFile || undefined,
        })),
      })),
    };
  };

  const komponenSurvei = koefRows.map((k) => {
    const terbaru = k.rincianAHSP[0];
    const stats = terbaru ? mapSurveiStats(terbaru.surveiTokoList) : null;
    return {
      id: k.id,
      divisiId: k.divisiId,
      namaDivisi: k.divisi.namaDivisi,
      kategori: k.kategoriKomponen as KategoriKoefisien,
      namaKomponen: k.namaKomponen,
      satuan: k.satuan,
      nilaiKoefisienDefault: k.nilaiKoefisienDefault.toNumber(),
      hargaAcuanDefault: k.hargaAcuanDefault?.toNumber() ?? null,
      wajibSurveiToko: k.wajibSurveiToko,
      riwayatCount: k.rincianAHSP.length,
      latestSurvei: terbaru && stats
        ? {
            rincianId: terbaru.id,
            tiketId: terbaru.pengajuanHarga.id,
            nomorTiket: terbaru.pengajuanHarga.nomorTiket,
            statusTiket: terbaru.pengajuanHarga.status,
            namaCabang: terbaru.pengajuanHarga.cabang.namaCabang,
            namaWilayah: terbaru.pengajuanHarga.wilayahCabang?.namaWilayah ?? null,
            tanggalPengajuan: terbaru.pengajuanHarga.tanggalPengajuan.toISOString(),
            ...stats,
          }
        : null,
    };
  });

  const riwayatSurvei = riwayatRows.map((r) => {
    const stats = mapSurveiStats(r.surveiTokoList);
    return {
      id: r.id,
      masterKoefisienId: r.masterKoefisienId,
      namaKomponen: r.namaKomponen,
      kategori: r.kategoriKomponen as KategoriKoefisien,
      satuan: r.satuan,
      hargaAcuanDefault: r.masterKoefisien.hargaAcuanDefault?.toNumber() ?? null,
      tiketId: r.pengajuanHarga.id,
      nomorTiket: r.pengajuanHarga.nomorTiket,
      statusTiket: r.pengajuanHarga.status,
      namaItem: r.pengajuanHarga.masterItem?.namaItem ?? "-",
      kodeMaster: r.pengajuanHarga.masterItem?.kodeMaster ?? "-",
      namaCabang: r.pengajuanHarga.cabang.namaCabang,
      namaWilayah: r.pengajuanHarga.wilayahCabang?.namaWilayah ?? null,
      tanggalPengajuan: r.pengajuanHarga.tanggalPengajuan.toISOString(),
      ...stats,
    };
  });

  const masterTokoList = tokoRows.map((t) => ({
    id: t.id,
    cabangId: t.cabangId,
    namaCabang: t.cabang.namaCabang,
    wilayahCabangId: t.wilayahCabangId,
    namaWilayah: t.wilayahCabang?.namaWilayah ?? null,
    namaToko: t.namaToko,
    alamat: t.alamat,
    kota: t.kota,
    kontakPic: t.kontakPic,
    telepon: t.telepon,
    isActive: t.isActive,
    dipakaiCount: t._count.surveiList,
  }));

  return {
    divisiList,
    cabangList,
    komponenSurvei,
    riwayatSurvei,
    masterTokoList,
  };
}

export type MasterSurveiData = Awaited<ReturnType<typeof getMasterSurveiData>>;
export type BarisKomponenSurvei = MasterSurveiData["komponenSurvei"][number];
export type BarisRiwayatSurvei = MasterSurveiData["riwayatSurvei"][number];
export type BarisMasterToko = MasterSurveiData["masterTokoList"][number];

/**
 * Menetapkan harga rata-rata hasil survei 3 toko sebagai hargaAcuanDefault
 * pada MasterKoefisien (khusus komponen MATERIAL dan ALAT).
 */
export async function jadikanHargaAcuan(params: {
  masterKoefisienId: string;
  hargaBaru: number;
  divisiUser?: string | null;
}) {
  const harga = Number(params.hargaBaru);
  if (!Number.isFinite(harga) || harga <= 0 || harga > 1_000_000_000) {
    throw new DomainError("Harga acuan harus lebih besar dari Rp 0.");
  }

  const koef = await prisma.masterKoefisien.findUnique({
    where: { id: params.masterKoefisienId },
    select: { id: true, divisiId: true, namaKomponen: true, kategoriKomponen: true },
  });
  if (!koef) throw new DomainError("Komponen koefisien tidak ditemukan.", 404);
  if (params.divisiUser && koef.divisiId !== params.divisiUser) {
    throw new DomainError("Komponen ini bukan milik divisi Anda.", 403);
  }
  if (!KATEGORI_SURVEI.includes(koef.kategoriKomponen as KategoriKoefisien)) {
    throw new DomainError("Hanya komponen Material Bahan dan Peralatan yang dapat diperbarui dari survei pasar.");
  }

  await prisma.masterKoefisien.update({
    where: { id: koef.id },
    data: { hargaAcuanDefault: bulat2(harga) },
  });

  return { namaKomponen: koef.namaKomponen, hargaBaru: bulat2(harga) };
}

export async function simpanMasterTokoSnb(input: {
  id?: string;
  cabangId: string;
  wilayahCabangId?: string | null;
  namaToko: string;
  alamat: string;
  kota: string;
  kontakPic?: string | null;
  telepon?: string | null;
}) {
  const namaToko = input.namaToko.trim();
  const alamat = input.alamat.trim();
  const kota = input.kota.trim();
  if (namaToko.length < 3) throw new DomainError("Nama toko minimal 3 karakter.");
  if (alamat.length < 5) throw new DomainError("Alamat toko minimal 5 karakter.");
  if (!kota) throw new DomainError("Kota toko wajib diisi.");
  if (!input.cabangId) throw new DomainError("Cabang wajib dipilih.");

  const data = {
    cabangId: input.cabangId,
    wilayahCabangId: input.wilayahCabangId || null,
    namaToko,
    alamat,
    kota,
    kontakPic: input.kontakPic?.trim() || null,
    telepon: input.telepon?.trim() || null,
  };

  if (input.id) {
    const existing = await prisma.masterToko.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!existing) throw new DomainError("Data toko tidak ditemukan.", 404);
    await prisma.masterToko.update({ where: { id: input.id }, data });
    return `Toko "${namaToko}" berhasil diperbarui.`;
  }

  await prisma.masterToko.create({ data: { ...data, isActive: true } });
  return `Toko "${namaToko}" berhasil didaftarkan ke Master Survei.`;
}

export async function setStatusMasterTokoSnb(id: string, aktif: boolean) {
  const existing = await prisma.masterToko.findUnique({ where: { id }, select: { id: true, namaToko: true } });
  if (!existing) throw new DomainError("Data toko tidak ditemukan.", 404);
  await prisma.masterToko.update({ where: { id }, data: { isActive: aktif } });
  return aktif ? `Toko "${existing.namaToko}" diaktifkan kembali.` : `Toko "${existing.namaToko}" dinonaktifkan.`;
}
