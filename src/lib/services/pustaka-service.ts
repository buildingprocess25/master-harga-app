import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/services/transisi-tiket";
import { validasiHarga, validasiKoefisien } from "@/lib/services/ahsp-service";
import { KategoriKoefisien } from "@/types";

// ============================================================================
// PUSTAKA KOEFISIEN (HALAMAN KELOLA)
// ============================================================================

/** Divisi yang boleh dikelola: S&B terikat divisi hanya divisinya, S&B HO semua divisi. */
export async function getDivisiKelola(divisiUser: string | null | undefined) {
  return prisma.divisi.findMany({
    where: { isActive: true, ...(divisiUser ? { id: divisiUser } : {}) },
    select: { id: true, namaDivisi: true },
    orderBy: { namaDivisi: "asc" },
  });
}

export async function daftarPustakaKoefisien(params: {
  divisiId: string;
  kategori?: string;
  q?: string;
  termasukNonaktif?: boolean;
}) {
  const q = params.q?.trim();
  const rows = await prisma.masterKoefisien.findMany({
    where: {
      divisiId: params.divisiId,
      ...(params.termasukNonaktif ? {} : { isActive: true }),
      ...(params.kategori ? { kategoriKomponen: params.kategori } : {}),
      ...(q ? { namaKomponen: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: [{ isActive: "desc" }, { kategoriKomponen: "asc" }, { namaKomponen: "asc" }],
    include: { _count: { select: { rincianAHSP: true } } },
  });
  return rows.map((k) => ({
    id: k.id,
    kategori: k.kategoriKomponen as KategoriKoefisien,
    namaKomponen: k.namaKomponen,
    satuan: k.satuan,
    nilaiKoefisienDefault: k.nilaiKoefisienDefault.toNumber(),
    hargaAcuanDefault: k.hargaAcuanDefault?.toNumber() ?? null,
    wajibSurveiToko: k.wajibSurveiToko,
    isActive: k.isActive,
    dipakai: k._count.rincianAHSP,
    updatedAt: k.updatedAt.toISOString(),
  }));
}

export type BarisPustaka = Awaited<ReturnType<typeof daftarPustakaKoefisien>>[number];

/** Pastikan komponen ada dan berada di divisi yang boleh dikelola pengguna. */
async function ambilUntukKelola(id: string, divisiUser: string | null | undefined) {
  const k = await prisma.masterKoefisien.findUnique({ where: { id } });
  if (!k) throw new DomainError("Komponen tidak ditemukan.", 404);
  if (divisiUser && k.divisiId !== divisiUser) {
    throw new DomainError("Komponen ini bukan milik divisi Anda.", 403);
  }
  return k;
}

export interface UbahKoefisienInput {
  namaKomponen: string;
  satuan: string;
  nilaiKoefisienDefault: number;
  hargaAcuanDefault: number | null;
  wajibSurveiToko: boolean;
}

/**
 * Ubah komponen pustaka. Rincian AHSP tiket menyalin nama/satuan/koefisien saat disusun,
 * jadi perubahan di sini hanya berlaku untuk penyusunan resep berikutnya. Flag wajib survei
 * dibaca saat survei, sehingga ikut berlaku untuk tiket yang belum disurvei.
 */
export async function ubahKoefisien(id: string, input: UbahKoefisienInput, divisiUser: string | null | undefined) {
  const k = await ambilUntukKelola(id, divisiUser);
  const nama = input.namaKomponen.trim().replace(/\s+/g, " ");
  const satuan = input.satuan.trim();
  if (nama.length < 3 || nama.length > 120) throw new DomainError("Nama komponen harus 3 sampai 120 karakter.");
  if (!satuan || satuan.length > 20) throw new DomainError("Satuan wajib diisi (maksimal 20 karakter).");
  validasiKoefisien(input.nilaiKoefisienDefault);
  if (input.hargaAcuanDefault !== null) validasiHarga(input.hargaAcuanDefault);

  const duplikat = await prisma.masterKoefisien.findFirst({
    where: {
      id: { not: id },
      divisiId: k.divisiId,
      kategoriKomponen: k.kategoriKomponen,
      isActive: true,
      namaKomponen: { equals: nama, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplikat) throw new DomainError(`Komponen "${nama}" sudah ada di kategori yang sama.`, 409);

  await prisma.masterKoefisien.update({
    where: { id },
    data: {
      namaKomponen: nama,
      satuan,
      nilaiKoefisienDefault: input.nilaiKoefisienDefault,
      hargaAcuanDefault: input.hargaAcuanDefault,
      wajibSurveiToko: input.wajibSurveiToko,
    },
  });
}

/**
 * Nonaktifkan / aktifkan kembali komponen (tanpa hapus permanen, karena rincian tiket
 * merujuknya). Komponen nonaktif tidak muncul di combobox worksheet.
 */
export async function setStatusKoefisien(id: string, aktif: boolean, divisiUser: string | null | undefined) {
  const k = await ambilUntukKelola(id, divisiUser);
  if (k.isActive === aktif) return;
  if (aktif) {
    const duplikat = await prisma.masterKoefisien.findFirst({
      where: {
        id: { not: id },
        divisiId: k.divisiId,
        kategoriKomponen: k.kategoriKomponen,
        isActive: true,
        namaKomponen: { equals: k.namaKomponen, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplikat) {
      throw new DomainError(`Sudah ada komponen aktif bernama "${k.namaKomponen}". Ubah nama salah satunya dulu.`, 409);
    }
  }
  await prisma.masterKoefisien.update({ where: { id }, data: { isActive: aktif } });
}
