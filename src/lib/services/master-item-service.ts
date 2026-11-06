import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/services/transisi-tiket";

/** Kolom spesifikasi yang membentuk identitas item (urutan = urutan deskripsi otomatis). */
export interface SpesifikasiItem {
  kategori: string;
  namaItem: string;
  ukuran: string;
  merk: string;
  tipe?: string | null;
  warna?: string | null;
  permukaan?: string | null;
  tebal?: string | null;
  toleransi?: string | null;
  lokasi: string;
  satuan: string;
}

export interface InputItemBaru extends SpesifikasiItem {
  divisiId: string;
  kodeItem: string;
  kodeVarian: string;
}

const rapikan = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ");

/**
 * Deskripsi otomatis: nama item diikuti atribut spesifikasi yang terisi, dipisah koma.
 * Contoh: "Pasang Keramik Lantai, ukuran 60x60 cm, merk Granito, tipe Polish, warna Putih, lokasi Area Sales".
 */
export function buatDeskripsiOtomatis(s: SpesifikasiItem) {
  const bagian = [
    rapikan(s.namaItem),
    s.ukuran && `ukuran ${rapikan(s.ukuran)}`,
    s.merk && `merk ${rapikan(s.merk)}`,
    s.tipe && `tipe ${rapikan(s.tipe)}`,
    s.warna && `warna ${rapikan(s.warna)}`,
    s.permukaan && `permukaan ${rapikan(s.permukaan)}`,
    s.tebal && `tebal ${rapikan(s.tebal)}`,
    s.toleransi && `toleransi ${rapikan(s.toleransi)}`,
    s.lokasi && `lokasi ${rapikan(s.lokasi)}`,
  ].filter(Boolean);
  return bagian.join(", ");
}

/** Kode master mengikuti konvensi seed: KODE_ITEM-KODE_VARIAN (mis. SIP-001-01). */
export function buatKodeMaster(kodeItem: string, kodeVarian: string) {
  return `${rapikan(kodeItem).toUpperCase()}-${rapikan(kodeVarian).toUpperCase()}`;
}

function validasiSpesifikasi(s: SpesifikasiItem) {
  const wajib: [keyof SpesifikasiItem, string][] = [
    ["namaItem", "Nama item"],
    ["kategori", "Kategori"],
    ["ukuran", "Ukuran"],
    ["merk", "Merk"],
    ["lokasi", "Lokasi"],
    ["satuan", "Satuan"],
  ];
  for (const [k, label] of wajib) {
    if (!rapikan(s[k] as string)) throw new DomainError(`${label} wajib diisi.`);
  }
  if (rapikan(s.namaItem).length > 150) throw new DomainError("Nama item maksimal 150 karakter.");
  for (const [k, v] of Object.entries(s)) {
    if (typeof v === "string" && v.length > 150) throw new DomainError(`Isian ${k} terlalu panjang (maks 150 karakter).`);
  }
}

function dataSpesifikasi(s: SpesifikasiItem) {
  const opsional = (v: string | null | undefined) => (rapikan(v) ? rapikan(v) : null);
  return {
    kategori: rapikan(s.kategori),
    namaItem: rapikan(s.namaItem),
    ukuran: rapikan(s.ukuran),
    merk: rapikan(s.merk),
    tipe: opsional(s.tipe),
    warna: opsional(s.warna),
    permukaan: opsional(s.permukaan),
    tebal: opsional(s.tebal),
    toleransi: opsional(s.toleransi),
    lokasi: rapikan(s.lokasi),
    satuan: rapikan(s.satuan),
    deskripsiOtomatis: buatDeskripsiOtomatis(s),
  };
}

export async function daftarMasterItem(params: { divisiIds: string[]; divisiId?: string; kategori?: string; q?: string }) {
  const q = params.q?.trim();
  const divisi = params.divisiId && params.divisiIds.includes(params.divisiId) ? [params.divisiId] : params.divisiIds;
  const rows = await prisma.masterItem.findMany({
    where: {
      divisiId: { in: divisi },
      ...(params.kategori ? { kategori: params.kategori } : {}),
      ...(q
        ? {
            OR: [
              { namaItem: { contains: q, mode: "insensitive" } },
              { kodeMaster: { contains: q, mode: "insensitive" } },
              { merk: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ kategori: "asc" }, { namaItem: "asc" }],
    take: 300,
    include: {
      divisi: { select: { namaDivisi: true } },
      _count: { select: { hargaPerCabang: true, pengajuanHargaList: true } },
    },
  });
  return rows.map((m) => ({
    id: m.id,
    divisiId: m.divisiId,
    namaDivisi: m.divisi.namaDivisi,
    kodeItem: m.kodeItem,
    kodeVarian: m.kodeVarian,
    kodeMaster: m.kodeMaster,
    kategori: m.kategori,
    namaItem: m.namaItem,
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
    jumlahHargaCabang: m._count.hargaPerCabang,
    jumlahPengajuan: m._count.pengajuanHargaList,
  }));
}

export type BarisMasterItem = Awaited<ReturnType<typeof daftarMasterItem>>[number];

export async function daftarKategoriItem(divisiIds: string[]) {
  const rows = await prisma.masterItem.findMany({
    where: { divisiId: { in: divisiIds } },
    select: { kategori: true },
    distinct: ["kategori"],
    orderBy: { kategori: "asc" },
  });
  return rows.map((r) => r.kategori);
}

export async function buatMasterItem(input: InputItemBaru, divisiUser: string | null | undefined) {
  if (divisiUser && input.divisiId !== divisiUser) throw new DomainError("Anda hanya dapat menambah item untuk divisi Anda.", 403);
  validasiSpesifikasi(input);
  const kodeItem = rapikan(input.kodeItem).toUpperCase();
  const kodeVarian = rapikan(input.kodeVarian).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(kodeItem)) {
    throw new DomainError("Kode item 2 sampai 30 karakter: huruf, angka, atau tanda hubung.");
  }
  if (!/^[A-Z0-9]{1,10}$/.test(kodeVarian)) throw new DomainError("Kode varian 1 sampai 10 karakter huruf/angka.");

  const divisi = await prisma.divisi.findUnique({ where: { id: input.divisiId }, select: { id: true } });
  if (!divisi) throw new DomainError("Divisi tidak ditemukan.", 404);

  const kodeMaster = buatKodeMaster(kodeItem, kodeVarian);
  const bentrok = await prisma.masterItem.findFirst({
    where: { OR: [{ kodeMaster }, { kodeItem, kodeVarian }] },
    select: { kodeMaster: true },
  });
  if (bentrok) throw new DomainError(`Kode ${kodeMaster} sudah dipakai item lain.`, 409);

  const baru = await prisma.masterItem.create({
    data: { divisiId: input.divisiId, kodeItem, kodeVarian, kodeMaster, ...dataSpesifikasi(input) },
    select: { id: true, kodeMaster: true },
  });
  return baru;
}

/**
 * Ubah spesifikasi item. Kode tidak dapat diubah karena menjadi acuan katalog harga
 * dan tiket yang sudah berjalan.
 */
export async function ubahMasterItem(id: string, input: SpesifikasiItem, divisiUser: string | null | undefined) {
  const item = await prisma.masterItem.findUnique({ where: { id }, select: { divisiId: true } });
  if (!item) throw new DomainError("Item tidak ditemukan.", 404);
  if (divisiUser && item.divisiId !== divisiUser) throw new DomainError("Item ini bukan milik divisi Anda.", 403);
  validasiSpesifikasi(input);
  await prisma.masterItem.update({ where: { id }, data: dataSpesifikasi(input) });
}
