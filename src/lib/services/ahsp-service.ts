import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { DomainError, kunciTiket, ubahStatusTiket } from "@/lib/services/transisi-tiket";
import { KATEGORI_AHSP, marginDefaultKategori } from "@/lib/services/pengajuan-service";
import { KategoriKoefisien } from "@/types";

// ============================================================================
// PUSTAKA KOEFISIEN (COMBOBOX CREATABLE)
// ============================================================================

export interface OpsiKoefisien {
  id: string;
  kategori: KategoriKoefisien;
  namaKomponen: string;
  satuan: string;
  nilaiKoefisienDefault: number;
  hargaAcuanDefault: number | null;
  wajibSurveiToko: boolean;
}

function petakanKoefisien(k: {
  id: string;
  kategoriKomponen: string;
  namaKomponen: string;
  satuan: string;
  nilaiKoefisienDefault: Prisma.Decimal;
  hargaAcuanDefault: Prisma.Decimal | null;
  wajibSurveiToko: boolean;
}): OpsiKoefisien {
  return {
    id: k.id,
    kategori: k.kategoriKomponen as KategoriKoefisien,
    namaKomponen: k.namaKomponen,
    satuan: k.satuan,
    nilaiKoefisienDefault: k.nilaiKoefisienDefault.toNumber(),
    hargaAcuanDefault: k.hargaAcuanDefault?.toNumber() ?? null,
    wajibSurveiToko: k.wajibSurveiToko,
  };
}

/** Koefisien baku aktif per divisi (opsional kategori & kata kunci) untuk combobox. */
export async function cariKoefisien(params: { divisiId: string; kategori?: string; q?: string; limit?: number }) {
  const q = params.q?.trim();
  const rows = await prisma.masterKoefisien.findMany({
    where: {
      divisiId: params.divisiId,
      isActive: true,
      ...(params.kategori ? { kategoriKomponen: params.kategori } : {}),
      ...(q ? { namaKomponen: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: [{ kategoriKomponen: "asc" }, { namaKomponen: "asc" }],
    take: params.limit ?? 200,
  });
  return rows.map(petakanKoefisien);
}

export interface InputKoefisienBaru {
  divisiId: string;
  kategori: string;
  namaKomponen: string;
  satuan: string;
  nilaiKoefisienDefault: number;
  hargaAcuanDefault: number | null;
  wajibSurveiToko: boolean;
}

/** Menambah komponen baru ke pustaka langsung dari combobox worksheet. */
export async function buatKoefisienBaru(input: InputKoefisienBaru) {
  const nama = input.namaKomponen.trim().replace(/\s+/g, " ");
  const satuan = input.satuan.trim();

  if (!KATEGORI_AHSP.includes(input.kategori as KategoriKoefisien)) {
    throw new DomainError("Kategori komponen tidak valid.");
  }
  if (nama.length < 3 || nama.length > 120) {
    throw new DomainError("Nama komponen harus 3 sampai 120 karakter.");
  }
  if (!satuan || satuan.length > 20) {
    throw new DomainError("Satuan wajib diisi (maksimal 20 karakter).");
  }
  validasiKoefisien(input.nilaiKoefisienDefault);
  if (input.hargaAcuanDefault !== null) validasiHarga(input.hargaAcuanDefault);

  const divisi = await prisma.divisi.findUnique({ where: { id: input.divisiId }, select: { id: true } });
  if (!divisi) throw new DomainError("Divisi tidak ditemukan.", 404);

  const duplikat = await prisma.masterKoefisien.findFirst({
    where: {
      divisiId: input.divisiId,
      kategoriKomponen: input.kategori,
      isActive: true,
      namaKomponen: { equals: nama, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplikat) {
    throw new DomainError(`Komponen "${nama}" sudah ada di pustaka. Pilih dari daftar.`, 409);
  }

  const baru = await prisma.masterKoefisien.create({
    data: {
      divisiId: input.divisiId,
      kategoriKomponen: input.kategori,
      namaKomponen: nama,
      satuan,
      nilaiKoefisienDefault: input.nilaiKoefisienDefault,
      hargaAcuanDefault: input.hargaAcuanDefault,
      wajibSurveiToko: input.wajibSurveiToko,
    },
  });
  return petakanKoefisien(baru);
}

export function validasiKoefisien(v: number) {
  if (!Number.isFinite(v) || v <= 0 || v >= 1_000_000) {
    throw new DomainError("Nilai koefisien harus lebih dari 0 dan kurang dari 1.000.000.");
  }
  if (Math.round(v * 10_000) / 10_000 !== v) {
    throw new DomainError("Nilai koefisien maksimal 4 angka di belakang koma.");
  }
}

export function validasiHarga(v: number) {
  if (!Number.isFinite(v) || v < 0 || v >= 1e13) {
    throw new DomainError("Harga acuan tidak valid.");
  }
}

// ============================================================================
// WORKSHEET AHSP (STATUS DIAJUKAN)
// ============================================================================

export interface BarisWorksheet {
  masterKoefisienId: string;
  nilaiKoefisien: number;
  hargaAcuanSatuan: number;
}

export interface SimpanWorksheetParams {
  tiketId: string;
  userId: string;
  baris: BarisWorksheet[];
  /** true: kunci resep dan terbitkan tiket ke Building Coordinator (SIAP_SURVEI). */
  terbitkan: boolean;
  catatan?: string;
}

/**
 * Menyimpan resep AHSP tiket DIAJUKAN. Data komponen (nama, kategori, satuan) disalin
 * dari pustaka agar resep tiket tidak berubah bila pustaka diedit kemudian.
 * Subtotal = (koefisien x harga acuan) x (1 + margin%/100), margin awal per kategori.
 */
export async function simpanWorksheetAhsp({ tiketId, userId, baris, terbitkan, catatan }: SimpanWorksheetParams) {
  if (baris.length === 0) throw new DomainError("Tambahkan minimal satu komponen AHSP.");
  if (baris.length > 100) throw new DomainError("Maksimal 100 komponen per tiket.");

  const ids = baris.map((b) => b.masterKoefisienId);
  if (new Set(ids).size !== ids.length) {
    throw new DomainError("Ada komponen yang dipilih lebih dari satu kali.");
  }
  for (const b of baris) {
    validasiKoefisien(b.nilaiKoefisien);
    validasiHarga(b.hargaAcuanSatuan);
  }

  return prisma.$transaction(async (tx) => {
    await kunciTiket(tx, tiketId);
    const tiket = await tx.pengajuanHarga.findUnique({
      where: { id: tiketId },
      select: { status: true, divisiId: true, masterItemId: true, marginAwalPersen: true },
    });
    if (!tiket) throw new DomainError("Tiket tidak ditemukan.", 404);
    if (tiket.status !== "DIAJUKAN") {
      throw new DomainError("Resep AHSP hanya dapat diubah saat tiket berstatus DIAJUKAN.", 409);
    }
    if (!tiket.masterItemId) {
      throw new DomainError("Tiket belum terhubung ke Master Item. Kembalikan ke BM untuk dilengkapi.", 409);
    }

    const master = await tx.masterKoefisien.findMany({ where: { id: { in: ids } } });
    const peta = new Map(master.map((m) => [m.id, m]));
    for (const id of ids) {
      const m = peta.get(id);
      if (!m) throw new DomainError("Ada komponen yang tidak ditemukan di pustaka. Muat ulang halaman.", 409);
      if (m.divisiId !== tiket.divisiId) throw new DomainError(`Komponen "${m.namaKomponen}" bukan milik divisi tiket ini.`);
      if (!m.isActive) throw new DomainError(`Komponen "${m.namaKomponen}" sudah nonaktif di pustaka.`);
    }
    // Komponen yang tidak disurvei tidak akan mendapat harga dari BC, jadi harganya wajib diisi sekarang.
    for (const b of baris) {
      const m = peta.get(b.masterKoefisienId)!;
      if (!m.wajibSurveiToko && b.hargaAcuanSatuan <= 0) {
        throw new DomainError(`Harga acuan "${m.namaKomponen}" wajib diisi karena komponen ini tidak disurvei.`);
      }
    }

    const marginAwal = tiket.marginAwalPersen.toNumber();
    await tx.rincianAhspPengajuan.deleteMany({ where: { pengajuanHargaId: tiketId } });
    await tx.rincianAhspPengajuan.createMany({
      data: baris.map((b) => {
        const m = peta.get(b.masterKoefisienId)!;
        const margin = marginDefaultKategori(m.kategoriKomponen, marginAwal);
        const subtotal = Math.round(b.nilaiKoefisien * b.hargaAcuanSatuan * (1 + margin / 100) * 100) / 100;
        return {
          pengajuanHargaId: tiketId,
          masterKoefisienId: m.id,
          namaKomponen: m.namaKomponen,
          kategoriKomponen: m.kategoriKomponen,
          satuan: m.satuan,
          nilaiKoefisien: b.nilaiKoefisien,
          hargaAcuanSatuan: b.hargaAcuanSatuan,
          marginPersen: margin,
          subtotal,
        };
      }),
    });

    const ringkas = `${baris.length} komponen (${KATEGORI_AHSP.map(
      (k) => `${k.toLowerCase()} ${baris.filter((b) => peta.get(b.masterKoefisienId)!.kategoriKomponen === k).length}`
    ).join(", ")}).`;

    if (terbitkan) {
      const wajibSurvei = baris.filter((b) => peta.get(b.masterKoefisienId)!.wajibSurveiToko);
      if (wajibSurvei.length === 0) {
        throw new DomainError(
          "Belum ada komponen wajib survei toko. Tambahkan minimal satu komponen material yang wajib disurvei BC."
        );
      }
      await ubahStatusTiket(tx, {
        tiketId,
        dariStatus: "DIAJUKAN",
        keStatus: "SIAP_SURVEI",
        userId,
        roleActor: "SB_SPECIALIST",
        aksi: "TERBITKAN_SIAP_SURVEI",
        catatan: [catatan?.trim(), `Resep AHSP dikunci: ${ringkas} ${wajibSurvei.length} komponen wajib survei.`]
          .filter(Boolean)
          .join(" "),
      });
      return { status: "SIAP_SURVEI" as const };
    }

    await tx.approvalAuditLog.create({
      data: {
        pengajuanHargaId: tiketId,
        userId,
        roleActor: "SB_SPECIALIST",
        action: "SIMPAN_DRAFT_AHSP",
        catatan: `Draft resep AHSP disimpan: ${ringkas}`,
      },
    });
    return { status: "DIAJUKAN" as const };
  });
}

// ============================================================================
// KEPUTUSAN VALIDASI SPESIFIKASI (STATUS DIAJUKAN)
// ============================================================================

export async function putuskanValidasiSpesifikasi(params: {
  tiketId: string;
  userId: string;
  keputusan: "REVISI" | "TOLAK";
  catatan: string;
}) {
  const catatan = params.catatan.trim();
  if (catatan.length < 5) {
    throw new DomainError("Catatan wajib diisi (minimal 5 karakter) agar BM dapat menindaklanjuti.");
  }
  return prisma.$transaction(async (tx) => {
    await kunciTiket(tx, params.tiketId);
    const tiket = await tx.pengajuanHarga.findUnique({ where: { id: params.tiketId }, select: { status: true } });
    if (!tiket) throw new DomainError("Tiket tidak ditemukan.", 404);
    if (tiket.status !== "DIAJUKAN") {
      throw new DomainError("Validasi spesifikasi hanya dapat diputuskan saat tiket berstatus DIAJUKAN.", 409);
    }
    await ubahStatusTiket(tx, {
      tiketId: params.tiketId,
      dariStatus: "DIAJUKAN",
      keStatus: params.keputusan === "REVISI" ? "PERLU_REVISI" : "DITOLAK",
      userId: params.userId,
      roleActor: "SB_SPECIALIST",
      aksi: params.keputusan === "REVISI" ? "KEMBALIKAN_REVISI_SPESIFIKASI" : "TOLAK_PENGAJUAN",
      catatan,
    });
  });
}
