import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCabangWewenang } from "@/lib/services/kuorum-service";
import {
  KategoriKoefisien,
  KoefisienDetailItem,
  PengajuanHargaItem,
  RoleUser,
  StatusPengajuanHarga,
  SurveyTokoItem,
  UserSessionProfile,
} from "@/types";

/** Urutan kategori AHSP yang dipakai di seluruh tampilan. */
export const KATEGORI_AHSP: KategoriKoefisien[] = ["UPAH", "MATERIAL", "ALAT", "BONGKARAN"];

/** Komponen Alat tidak diberi margin (selaras dengan RincianKalkulasiKoefisien). */
export function marginDefaultKategori(kategori: string, marginAwal: number) {
  return kategori === "ALAT" ? 0 : marginAwal;
}

/**
 * Cakupan data tiket per pengguna internal:
 * - SB_SPECIALIST (HO): semua cabang, dibatasi divisi bila akun memiliki divisi.
 * - REGIONAL_MANAGER: cabang induk + UserCabangCoverage.
 * - Role lain: cabang induknya.
 */
export async function buatWhereCakupan(user: UserSessionProfile): Promise<Prisma.PengajuanHargaWhereInput> {
  if (user.role === "SB_SPECIALIST") {
    return user.divisiId ? { divisiId: user.divisiId } : {};
  }
  const cabang = await getCabangWewenang(user.id, user.role as RoleUser);
  if (cabang === "SEMUA") return {};
  return { cabangId: { in: cabang } };
}

export interface FilterAntrean {
  statuses: StatusPengajuanHarga[];
  q?: string;
  cabangId?: string;
}

/** Daftar tiket untuk tabel antrean sesuai status dan cakupan wewenang pengguna. */
export async function getAntreanPengajuan(user: UserSessionProfile, filter: FilterAntrean) {
  const cakupan = await buatWhereCakupan(user);
  const q = filter.q?.trim();

  const rows = await prisma.pengajuanHarga.findMany({
    where: {
      AND: [
        cakupan,
        { status: { in: filter.statuses } },
        filter.cabangId ? { cabangId: filter.cabangId } : {},
        q
          ? {
              OR: [
                { nomorTiket: { contains: q, mode: "insensitive" } },
                { masterItem: { namaItem: { contains: q, mode: "insensitive" } } },
                { masterItem: { kodeMaster: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    orderBy: [{ updatedAt: "asc" }],
    include: {
      masterItem: { select: { namaItem: true, kodeMaster: true, kategori: true, satuan: true } },
      divisi: { select: { namaDivisi: true } },
      cabang: { select: { namaCabang: true, regional: true } },
      wilayahCabang: { select: { namaWilayah: true } },
      pembuatUser: { select: { fullName: true } },
      _count: { select: { rincianAHSP: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    nomorTiket: r.nomorTiket,
    status: r.status as StatusPengajuanHarga,
    namaItem: r.masterItem?.namaItem ?? "(Item belum terhubung)",
    kodeMaster: r.masterItem?.kodeMaster ?? null,
    kategori: r.masterItem?.kategori ?? "-",
    satuan: r.masterItem?.satuan ?? null,
    namaDivisi: r.divisi.namaDivisi,
    namaCabang: r.cabang.namaCabang,
    regional: r.cabang.regional,
    namaWilayah: r.wilayahCabang?.namaWilayah ?? null,
    cakupanHarga: r.cakupanHarga,
    pembuat: r.pembuatUser?.fullName ?? null,
    jumlahKomponen: r._count.rincianAHSP,
    hargaDitetapkanSNB: r.hargaDitetapkanSNB?.toNumber() ?? null,
    tanggalPengajuan: r.tanggalPengajuan.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export type BarisAntrean = Awaited<ReturnType<typeof getAntreanPengajuan>>[number];

/** Jumlah tiket per status dalam cakupan pengguna (untuk badge tab). */
export async function hitungPerStatus(user: UserSessionProfile, statuses: StatusPengajuanHarga[]) {
  const cakupan = await buatWhereCakupan(user);
  const grup = await prisma.pengajuanHarga.groupBy({
    by: ["status"],
    where: { AND: [cakupan, { status: { in: statuses } }] },
    _count: { _all: true },
  });
  const hasil = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<StatusPengajuanHarga, number>;
  for (const g of grup) hasil[g.status as StatusPengajuanHarga] = g._count._all;
  return hasil;
}

const INCLUDE_DETAIL = {
  masterItem: true,
  divisi: true,
  cabang: true,
  wilayahCabang: true,
  pembuatUser: { select: { fullName: true, email: true } },
  rincianAHSP: {
    orderBy: { id: "asc" as const },
    include: {
      masterKoefisien: { select: { wajibSurveiToko: true, isActive: true } },
      surveiTokoList: { orderBy: { urutanToko: "asc" as const }, include: { lampiranList: true } },
    },
  },
  auditLogs: {
    orderBy: { createdAt: "desc" as const },
    include: { user: { select: { fullName: true } } },
  },
} satisfies Prisma.PengajuanHargaInclude;

type DetailDb = Prisma.PengajuanHargaGetPayload<{ include: typeof INCLUDE_DETAIL }>;

/**
 * Detail tiket lengkap dalam cakupan pengguna. Mengembalikan null bila tidak ada
 * atau di luar cakupan (agar halaman merender 404, bukan membocorkan keberadaan tiket).
 */
export async function getPengajuanDetail(user: UserSessionProfile, tiketId: string) {
  const cakupan = await buatWhereCakupan(user);
  const tiket = await prisma.pengajuanHarga.findFirst({
    where: { AND: [{ id: tiketId }, cakupan] },
    include: INCLUDE_DETAIL,
  });
  if (!tiket) return null;

  return {
    item: petakanKeKontrak(tiket),
    divisiId: tiket.divisiId,
    masterItemId: tiket.masterItemId,
    satuan: tiket.masterItem?.satuan ?? null,
    marginAwalPersen: tiket.marginAwalPersen.toNumber(),
    pembuat: tiket.pembuatUser?.fullName ?? null,
    rincian: tiket.rincianAHSP.map((r) => ({
      id: r.id,
      masterKoefisienId: r.masterKoefisienId,
      namaKomponen: r.namaKomponen,
      kategori: r.kategoriKomponen as KategoriKoefisien,
      satuan: r.satuan,
      nilaiKoefisien: r.nilaiKoefisien.toNumber(),
      hargaAcuanSatuan: r.hargaAcuanSatuan.toNumber(),
      marginPersen: r.marginPersen.toNumber(),
      wajibSurveiToko: r.masterKoefisien.wajibSurveiToko,
      jumlahSurvei: r.surveiTokoList.length,
      surveiList: r.surveiTokoList.map(petakanSurvei),
    })),
    riwayat: tiket.auditLogs.map((a) => ({
      id: a.id,
      aksi: a.action,
      roleActor: a.roleActor,
      oleh: a.user?.fullName ?? (a.roleActor === "SYSTEM" ? "Sistem" : "-"),
      catatan: a.catatan,
      waktu: a.createdAt.toISOString(),
    })),
  };
}

export type DetailPengajuan = NonNullable<Awaited<ReturnType<typeof getPengajuanDetail>>>;

type SurveiDb = DetailDb["rincianAHSP"][number]["surveiTokoList"][number];

function petakanSurvei(s: SurveiDb): SurveyTokoItem {
  return {
    id: s.id,
    noToko: s.urutanToko,
    namaToko: s.namaToko,
    alamat: s.alamatToko ?? undefined,
    tanggalSurvei: s.tanggalSurvei.toISOString(),
    harga: s.hargaSatuanSurvei.toNumber(),
    catatan: s.catatanSurvei ?? undefined,
    lampiranList: s.lampiranList.map((l) => ({
      id: l.id,
      tipe: (["NOTA_PEMBELIAN", "FOTO_TOKO", "FOTO_MATERIAL"].includes(l.jenisLampiran)
        ? l.jenisLampiran
        : "LAINNYA") as SurveyTokoItem["lampiranList"][number]["tipe"],
      namaFile: l.namaFile,
      url: l.fileUrl,
      createdAt: l.uploadedAt.toISOString(),
    })),
  };
}

/** Pemetaan model Prisma ke kontrak UI global (src/types/pengajuan.ts). */
function petakanKeKontrak(t: DetailDb): PengajuanHargaItem {
  const m = t.masterItem;

  const koefisienItems: KoefisienDetailItem[] = t.rincianAHSP.map((r) => {
    const koefisien = r.nilaiKoefisien.toNumber();
    const hargaAcuan = r.hargaAcuanSatuan.toNumber();
    const marginPersen = r.marginPersen.toNumber();
    const subtotal = koefisien * hargaAcuan;
    return {
      id: r.id,
      kodeKomponen: r.masterKoefisienId,
      kategori: r.kategoriKomponen as KategoriKoefisien,
      namaKomponen: r.namaKomponen,
      satuan: r.satuan,
      koefisien,
      hargaAcuan,
      subtotal,
      marginPersen,
      total: subtotal * (1 + marginPersen / 100),
    };
  });

  const marginKategori = (kat: KategoriKoefisien) =>
    koefisienItems.find((k) => k.kategori === kat)?.marginPersen ??
    t.marginSNBPersen?.toNumber() ??
    t.marginAwalPersen.toNumber();

  // Survei disimpan per komponen material; kontrak UI saat ini menampilkan satu daftar 3 toko.
  const surveiTokoList: SurveyTokoItem[] = t.rincianAHSP.flatMap((r) => r.surveiTokoList.map(petakanSurvei));

  const totalHpp = koefisienItems.reduce((a, k) => a + k.subtotal, 0);
  const totalHargaSatuan = koefisienItems.reduce((a, k) => a + k.total, 0);

  return {
    id: t.id,
    noTiket: t.nomorTiket,
    kodeItem: m?.kodeMaster ?? "-",
    namaItem: m?.namaItem ?? "(Item belum terhubung)",
    kategori: m?.kategori ?? "-",
    merk: m?.merk,
    tipe: m?.tipe ?? undefined,
    ukuran: m?.ukuran,
    warna: m?.warna ?? undefined,
    lokasi: m?.lokasi,
    divisiId: t.divisiId,
    namaDivisi: t.divisi.namaDivisi,
    kodeDivisi: t.divisi.kodeDivisi,
    cabangId: t.cabangId,
    namaCabang: t.cabang.namaCabang,
    kodeCabang: t.cabang.kodeCabang,
    cakupanHarga: t.cakupanHarga,
    wilayahCabangId: t.wilayahCabangId,
    namaWilayah: t.wilayahCabang?.namaWilayah ?? null,
    status: t.status as StatusPengajuanHarga,
    tanggalPengajuan: t.tanggalPengajuan.toISOString(),
    catatanReviewTerakhir: t.catatanReview ?? undefined,
    surveiTokoList,
    hargaAcuanPasar: t.rataRataSurveiMaterial?.toNumber(),
    koefisienItems,
    liveMarginUpah: marginKategori("UPAH"),
    liveMarginMaterial: marginKategori("MATERIAL"),
    liveMarginBongkaran: marginKategori("BONGKARAN"),
    totalHpp,
    totalHargaSatuan: t.hargaDitetapkanSNB?.toNumber() ?? totalHargaSatuan,
    deadlineVoting: t.deadlineVoting?.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
