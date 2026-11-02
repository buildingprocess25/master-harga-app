import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { canTransitionStatus } from "@/lib/services/state-machine";
import {
  RoleUser,
  StatusPengajuanHarga,
  StatusVoteKontraktor,
  VotingKontraktorItem,
} from "@/types";

type Tx = Prisma.TransactionClient;

/** SLA respon voting rekanan: 3 x 24 jam sejak putaran dibuka. */
export const SLA_VOTING_JAM = 72;

/**
 * Error domain kuorum dengan HTTP status, agar route handler dapat
 * meneruskan pesan yang jelas ke pengguna tanpa membocorkan error internal.
 */
export class KuorumError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "KuorumError";
  }
}

/** Rumus Kuorum Alfamart: minimal 50% + 1 dari rekanan yang diundang. */
export function hitungTargetKuorum(totalDiundang: number): number {
  return totalDiundang > 0 ? Math.floor(totalDiundang / 2) + 1 : 1;
}

// ============================================================================
// HELPER INTERNAL (BERJALAN DI DALAM TRANSAKSI)
// ============================================================================

/**
 * Mengunci baris tiket (SELECT ... FOR UPDATE) agar vote dan evaluasi kuorum
 * pada tiket yang sama diproses berurutan, sehingga hitungan tidak balapan.
 */
async function kunciTiket(tx: Tx, tiketId: string) {
  await tx.$queryRaw`SELECT id FROM pengajuan_harga WHERE id = ${tiketId} FOR UPDATE`;
}

async function getPutaranTerakhir(tx: Tx, tiketId: string): Promise<number | null> {
  const agg = await tx.votingKontraktor.aggregate({
    where: { pengajuanHargaId: tiketId },
    _max: { putaranVote: true },
  });
  return agg._max.putaranVote;
}

interface UbahStatusParams {
  tiketId: string;
  dariStatus: StatusPengajuanHarga;
  keStatus: StatusPengajuanHarga;
  userId: string | null;
  roleActor: string;
  aksi: string;
  catatan?: string;
}

/**
 * Versi transaksional dari advanceTicketStatus (state-machine.ts) agar
 * perubahan status, rilis harga, dan audit log tercatat dalam satu transaksi.
 */
async function ubahStatusTiket(tx: Tx, params: UbahStatusParams) {
  const { tiketId, dariStatus, keStatus, userId, roleActor, aksi, catatan } = params;

  if (!canTransitionStatus(dariStatus, keStatus)) {
    throw new KuorumError(
      `Transisi status tidak sah dari ${dariStatus} ke ${keStatus}.`,
      409
    );
  }

  const updated = await tx.pengajuanHarga.updateMany({
    where: { id: tiketId, status: dariStatus },
    data: { status: keStatus, catatanReview: catatan || null },
  });
  if (updated.count === 0) {
    throw new KuorumError("Status tiket telah berubah. Muat ulang halaman.", 409);
  }

  await tx.approvalAuditLog.create({
    data: {
      pengajuanHargaId: tiketId,
      userId,
      roleActor,
      action: aksi,
      catatan: catatan || null,
    },
  });
}

/**
 * Membuka putaran voting baru untuk seluruh rekanan AKTIF pada cabang dan divisi tiket.
 * Rekanan yang menolak di putaran sebelumnya membawa tanda hasRejectedOnce,
 * sehingga tidak dapat banding lagi dan penolakan berikutnya memicu Parked.
 */
async function bukaPutaranBaru(tx: Tx, tiketId: string) {
  const tiket = await tx.pengajuanHarga.findUnique({
    where: { id: tiketId },
    select: {
      id: true,
      cabangId: true,
      divisiId: true,
      masterItemId: true,
      cakupanHarga: true,
      wilayahCabangId: true,
      hargaDitetapkanSNB: true,
    },
  });
  if (!tiket) throw new KuorumError("Tiket tidak ditemukan.", 404);

  // Prasyarat rilis dicek di awal, agar masalah data muncul ke Regional Manager
  // dan bukan saat kontraktor terakhir menekan tombol Setuju.
  if (!tiket.masterItemId) {
    throw new KuorumError("Tiket belum terhubung ke Master Item.");
  }
  if (!tiket.hargaDitetapkanSNB) {
    throw new KuorumError("Harga yang ditetapkan S&B belum diisi.");
  }
  if (tiket.cakupanHarga === "KHUSUS_WILAYAH") {
    if (!tiket.wilayahCabangId) {
      throw new KuorumError("Tiket harga khusus wilayah belum memilih wilayah.");
    }
    const induk = await tx.masterHargaCabang.findUnique({
      where: {
        masterItemId_cabangId: {
          masterItemId: tiket.masterItemId,
          cabangId: tiket.cabangId,
        },
      },
      select: { id: true },
    });
    if (!induk) {
      throw new KuorumError(
        "Harga induk cabang untuk item ini belum dirilis, sehingga harga khusus wilayah belum dapat ditawarkan."
      );
    }
  }

  const relasiAktif = await tx.kontraktorCabang.findMany({
    where: {
      cabangId: tiket.cabangId,
      divisiId: tiket.divisiId,
      statusKeaktifan: "AKTIF",
    },
    select: { id: true },
  });
  if (relasiAktif.length === 0) {
    throw new KuorumError(
      "Tidak ada rekanan kontraktor aktif pada cabang dan divisi ini, kuorum tidak dapat dibuka."
    );
  }

  const putaranSebelumnya = await getPutaranTerakhir(tx, tiketId);
  const putaranBaru = (putaranSebelumnya ?? 0) + 1;

  const pernahTolak = new Set<string>();
  if (putaranSebelumnya !== null) {
    const voteSebelumnya = await tx.votingKontraktor.findMany({
      where: {
        pengajuanHargaId: tiketId,
        putaranVote: putaranSebelumnya,
        statusVote: "TOLAK",
      },
      select: { kontraktorCabangId: true },
    });
    voteSebelumnya.forEach((v) => pernahTolak.add(v.kontraktorCabangId));
  }

  await tx.votingKontraktor.createMany({
    data: relasiAktif.map((r) => ({
      pengajuanHargaId: tiketId,
      kontraktorCabangId: r.id,
      putaranVote: putaranBaru,
      statusVote: "MENUNGGU" as const,
      hasRejectedOnce: pernahTolak.has(r.id),
    })),
  });

  const deadlineVoting = new Date(Date.now() + SLA_VOTING_JAM * 60 * 60 * 1000);
  await tx.pengajuanHarga.update({
    where: { id: tiketId },
    data: { deadlineVoting },
  });

  return { putaran: putaranBaru, deadlineVoting, totalDiundang: relasiAktif.length };
}

/**
 * Menulis harga resmi ke Master Katalog saat kuorum tercapai.
 * INDUK_CABANG -> MasterHargaCabang (dan selisih seluruh override wilayah dihitung ulang).
 * KHUSUS_WILAYAH -> MasterHargaWilayah sebagai override terhadap harga induk.
 */
async function rilisHargaResmi(tx: Tx, tiketId: string) {
  const tiket = await tx.pengajuanHarga.findUniqueOrThrow({
    where: { id: tiketId },
    select: {
      id: true,
      cabangId: true,
      masterItemId: true,
      cakupanHarga: true,
      wilayahCabangId: true,
      hargaDitetapkanSNB: true,
      marginSNBPersen: true,
      marginAwalPersen: true,
    },
  });

  if (!tiket.masterItemId || !tiket.hargaDitetapkanSNB) {
    throw new KuorumError("Data harga tiket tidak lengkap untuk dirilis.", 409);
  }

  const hargaFinal = tiket.hargaDitetapkanSNB;
  const sekarang = new Date();

  if (tiket.cakupanHarga === "INDUK_CABANG") {
    const induk = await tx.masterHargaCabang.upsert({
      where: {
        masterItemId_cabangId: {
          masterItemId: tiket.masterItemId,
          cabangId: tiket.cabangId,
        },
      },
      update: {
        pengajuanTerakhirId: tiket.id,
        hargaFinalInduk: hargaFinal,
        marginTotalPersen: tiket.marginSNBPersen ?? tiket.marginAwalPersen,
        statusHarga: "AKTIF",
        berlakuSejak: sekarang,
      },
      create: {
        masterItemId: tiket.masterItemId,
        cabangId: tiket.cabangId,
        pengajuanTerakhirId: tiket.id,
        hargaFinalInduk: hargaFinal,
        marginTotalPersen: tiket.marginSNBPersen ?? tiket.marginAwalPersen,
        statusHarga: "AKTIF",
        berlakuSejak: sekarang,
      },
    });

    const overrideList = await tx.masterHargaWilayah.findMany({
      where: { masterHargaCabangId: induk.id },
      select: { id: true, hargaFinalWilayah: true },
    });
    for (const ov of overrideList) {
      await tx.masterHargaWilayah.update({
        where: { id: ov.id },
        data: hitungSelisih(ov.hargaFinalWilayah, hargaFinal),
      });
    }
    return;
  }

  if (!tiket.wilayahCabangId) {
    throw new KuorumError("Wilayah tiket tidak ditemukan.", 409);
  }
  const induk = await tx.masterHargaCabang.findUnique({
    where: {
      masterItemId_cabangId: {
        masterItemId: tiket.masterItemId,
        cabangId: tiket.cabangId,
      },
    },
    select: { id: true, hargaFinalInduk: true },
  });
  if (!induk) {
    throw new KuorumError("Harga induk cabang tidak ditemukan.", 409);
  }

  const selisih = hitungSelisih(hargaFinal, induk.hargaFinalInduk);
  await tx.masterHargaWilayah.upsert({
    where: {
      masterHargaCabangId_wilayahCabangId: {
        masterHargaCabangId: induk.id,
        wilayahCabangId: tiket.wilayahCabangId,
      },
    },
    update: {
      pengajuanTerakhirId: tiket.id,
      hargaFinalWilayah: hargaFinal,
      ...selisih,
      statusHarga: "AKTIF",
      berlakuSejak: sekarang,
    },
    create: {
      masterHargaCabangId: induk.id,
      wilayahCabangId: tiket.wilayahCabangId,
      pengajuanTerakhirId: tiket.id,
      hargaFinalWilayah: hargaFinal,
      ...selisih,
      statusHarga: "AKTIF",
      berlakuSejak: sekarang,
    },
  });
}

function hitungSelisih(hargaWilayah: Prisma.Decimal, hargaInduk: Prisma.Decimal) {
  const selisihRp = hargaWilayah.minus(hargaInduk);
  const selisihPersen = hargaInduk.isZero()
    ? new Prisma.Decimal(0)
    : selisihRp.div(hargaInduk).times(100).toDecimalPlaces(2);
  return { selisihDariIndukRp: selisihRp, selisihDariIndukPersen: selisihPersen };
}

export type HasilEvaluasiKuorum =
  | "BELUM_DIBUKA"
  | "BERJALAN"
  | "RELEASED"
  | "USULAN_KONTRAKTOR"
  | "DITOLAK_KONTRAKTOR";

/**
 * Mengevaluasi putaran voting terakhir:
 * 1. Jika SLA lewat, vote MENUNGGU menjadi TIMEOUT (tidak dihitung setuju, tidak memicu Parked).
 * 2. Setuju >= 50%+1 -> RELEASED dan harga dirilis ke Master Katalog.
 * 3. Kuorum mustahil tercapai -> USULAN_KONTRAKTOR (ada banding) atau DITOLAK_KONTRAKTOR.
 */
async function evaluasiPutaran(
  tx: Tx,
  tiketId: string,
  actor: { userId: string | null; roleActor: string }
): Promise<HasilEvaluasiKuorum> {
  const tiket = await tx.pengajuanHarga.findUnique({
    where: { id: tiketId },
    select: { status: true, deadlineVoting: true },
  });
  if (!tiket) throw new KuorumError("Tiket tidak ditemukan.", 404);
  if (tiket.status !== "PENDING_KONTRAKTOR") {
    return tiket.status === "RELEASED" ||
      tiket.status === "USULAN_KONTRAKTOR" ||
      tiket.status === "DITOLAK_KONTRAKTOR"
      ? tiket.status
      : "BELUM_DIBUKA";
  }

  const putaran = await getPutaranTerakhir(tx, tiketId);
  if (putaran === null) return "BELUM_DIBUKA";

  const sekarang = new Date();
  const slaLewat = !!tiket.deadlineVoting && tiket.deadlineVoting < sekarang;
  if (slaLewat) {
    await tx.votingKontraktor.updateMany({
      where: { pengajuanHargaId: tiketId, putaranVote: putaran, statusVote: "MENUNGGU" },
      data: { statusVote: "TIMEOUT", tanggalRespon: sekarang },
    });
  }

  const voteList = await tx.votingKontraktor.findMany({
    where: { pengajuanHargaId: tiketId, putaranVote: putaran },
    select: { statusVote: true, usulanHarga: true },
  });

  const total = voteList.length;
  const setuju = voteList.filter((v) => v.statusVote === "SETUJU").length;
  const menunggu = voteList.filter((v) => v.statusVote === "MENUNGGU").length;
  const target = hitungTargetKuorum(total);
  const ringkas = `Putaran ${putaran}: ${setuju} dari ${total} rekanan setuju (target ${target}).`;

  let hasil: HasilEvaluasiKuorum;
  if (setuju >= target) {
    await rilisHargaResmi(tx, tiketId);
    await ubahStatusTiket(tx, {
      tiketId,
      dariStatus: "PENDING_KONTRAKTOR",
      keStatus: "RELEASED",
      ...actor,
      aksi: "KUORUM_TERCAPAI",
      catatan: `Kuorum 50%+1 tercapai. ${ringkas} Harga resmi terbit di Master Katalog.`,
    });
    hasil = "RELEASED";
  } else if (setuju + menunggu < target) {
    const adaBanding = voteList.some(
      (v) => v.statusVote === "TOLAK" && v.usulanHarga !== null
    );
    hasil = adaBanding ? "USULAN_KONTRAKTOR" : "DITOLAK_KONTRAKTOR";
    await ubahStatusTiket(tx, {
      tiketId,
      dariStatus: "PENDING_KONTRAKTOR",
      keStatus: hasil,
      ...actor,
      aksi: "KUORUM_GAGAL",
      catatan: adaBanding
        ? `Kuorum tidak tercapai, terdapat usulan banding rekanan untuk ditinjau. ${ringkas}`
        : `Kuorum tidak tercapai tanpa usulan banding. ${ringkas}`,
    });
  } else {
    return "BERJALAN";
  }

  // Putaran ditutup: rekanan yang belum merespons ditandai TIMEOUT,
  // sehingga putaran ini tidak lagi dianggap terbuka.
  await tx.votingKontraktor.updateMany({
    where: { pengajuanHargaId: tiketId, putaranVote: putaran, statusVote: "MENUNGGU" },
    data: { statusVote: "TIMEOUT", tanggalRespon: sekarang },
  });

  return hasil;
}

// ============================================================================
// API PUBLIK SERVICE KUORUM
// ============================================================================

export interface TeruskanKeKontraktorParams {
  tiketId: string;
  userId: string;
  roleActor: RoleUser | string;
  catatan?: string;
}

/**
 * Titik integrasi dengan Approval Regional Manager (Dev B).
 * Dipanggil sebagai pengganti advanceTicketStatus untuk transisi
 * PENDING_REGIONAL_MGR -> PENDING_KONTRAKTOR: status berubah dan putaran voting
 * dibuka dalam satu transaksi. Aman dipanggil ulang: jika putaran sudah terbuka,
 * data putaran yang ada dikembalikan tanpa membuat baris baru.
 */
export async function teruskanKeKontraktor({
  tiketId,
  userId,
  roleActor,
  catatan,
}: TeruskanKeKontraktorParams) {
  return prisma.$transaction(async (tx) => {
    await kunciTiket(tx, tiketId);
    const tiket = await tx.pengajuanHarga.findUnique({
      where: { id: tiketId },
      select: { status: true, deadlineVoting: true },
    });
    if (!tiket) throw new KuorumError("Tiket tidak ditemukan.", 404);

    if (tiket.status === "PENDING_REGIONAL_MGR") {
      await ubahStatusTiket(tx, {
        tiketId,
        dariStatus: "PENDING_REGIONAL_MGR",
        keStatus: "PENDING_KONTRAKTOR",
        userId,
        roleActor,
        aksi: "TERUSKAN_KE_KONTRAKTOR",
        catatan,
      });
      return { ...(await bukaPutaranBaru(tx, tiketId)), sudahTerbuka: false };
    }

    if (tiket.status === "PENDING_KONTRAKTOR") {
      const putaran = await getPutaranTerakhir(tx, tiketId);
      const masihMenunggu =
        putaran !== null &&
        (await tx.votingKontraktor.count({
          where: { pengajuanHargaId: tiketId, putaranVote: putaran, statusVote: "MENUNGGU" },
        })) > 0;

      if (masihMenunggu && putaran !== null) {
        const totalDiundang = await tx.votingKontraktor.count({
          where: { pengajuanHargaId: tiketId, putaranVote: putaran },
        });
        return {
          putaran,
          deadlineVoting: tiket.deadlineVoting,
          totalDiundang,
          sudahTerbuka: true,
        };
      }
      // Status sudah PENDING_KONTRAKTOR (mis. diubah via advanceTicketStatus)
      // namun belum ada putaran terbuka: buka putaran baru.
      return { ...(await bukaPutaranBaru(tx, tiketId)), sudahTerbuka: false };
    }

    throw new KuorumError(
      `Tiket berstatus ${tiket.status} tidak dapat diteruskan ke kontraktor.`,
      409
    );
  });
}

/** Evaluasi kuorum satu tiket (dipakai saat halaman dibuka atau oleh job terjadwal). */
export async function evaluasiKuorum(
  tiketId: string,
  actor: { userId: string | null; roleActor: string } = { userId: null, roleActor: "SYSTEM" }
) {
  return prisma.$transaction(async (tx) => {
    await kunciTiket(tx, tiketId);
    return evaluasiPutaran(tx, tiketId, actor);
  });
}

/**
 * Evaluasi lazy: hanya jalan bila tiket masih PENDING_KONTRAKTOR dan SLA sudah lewat.
 * Dipanggil sebelum menampilkan data agar status yang terlihat selalu final.
 */
export async function evaluasiJikaKedaluwarsa(tiketId: string) {
  const tiket = await prisma.pengajuanHarga.findUnique({
    where: { id: tiketId },
    select: { status: true, deadlineVoting: true },
  });
  if (
    tiket?.status === "PENDING_KONTRAKTOR" &&
    tiket.deadlineVoting &&
    tiket.deadlineVoting < new Date()
  ) {
    return evaluasiKuorum(tiketId);
  }
  return null;
}

/** Evaluasi seluruh tiket PENDING_KONTRAKTOR yang SLA-nya sudah lewat. */
export async function evaluasiKuorumKedaluwarsa() {
  const tiketList = await prisma.pengajuanHarga.findMany({
    where: { status: "PENDING_KONTRAKTOR", deadlineVoting: { lt: new Date() } },
    select: { id: true, nomorTiket: true },
  });

  const hasil: { nomorTiket: string; hasil: HasilEvaluasiKuorum | "ERROR"; pesan?: string }[] = [];
  for (const t of tiketList) {
    try {
      hasil.push({ nomorTiket: t.nomorTiket, hasil: await evaluasiKuorum(t.id) });
    } catch (error) {
      hasil.push({
        nomorTiket: t.nomorTiket,
        hasil: "ERROR",
        pesan: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return hasil;
}

export interface LampiranBandingInput {
  namaFile: string;
  fileUrl: string;
  ukuranFile?: string;
}

/** Lampiran banding hanya boleh merujuk berkas yang diunggah lewat /api/kuorum/lampiran. */
export const POLA_URL_LAMPIRAN_BANDING = /^\/api\/kuorum\/lampiran\/[a-f0-9-]{36}\.(pdf|jpg|jpeg|png)$/;

export interface SubmitVoteParams {
  tiketId: string;
  kontraktorId: string;
  userId: string;
  keputusan: "SETUJU" | "TOLAK";
  usulanHarga?: number;
  catatan?: string;
  lampiranList?: LampiranBandingInput[];
}

/**
 * Merekam respon rekanan pada putaran voting aktif.
 * - Putaran pertama rekanan menolak: wajib berupa Usulan Banding (harga + argumentasi).
 * - Rekanan yang sudah pernah banding (hasRejectedOnce) hanya dapat Setuju atau Tolak;
 *   penolakan kedua berturut-turut otomatis menonaktifkan sementara (Parked) relasi cabangnya.
 */
export async function submitVoteKontraktor(params: SubmitVoteParams) {
  const { tiketId, kontraktorId, userId, keputusan, usulanHarga, catatan, lampiranList } =
    params;

  const cek = await prisma.pengajuanHarga.findUnique({
    where: { id: tiketId },
    select: { status: true, deadlineVoting: true },
  });
  if (!cek) throw new KuorumError("Penawaran tidak ditemukan.", 404);
  if (cek.status === "PENDING_KONTRAKTOR" && cek.deadlineVoting && cek.deadlineVoting < new Date()) {
    // Tutup putaran dulu (commit terpisah), baru tolak vote yang terlambat.
    await evaluasiKuorum(tiketId);
    throw new KuorumError("Batas waktu respon (SLA 3x24 jam) telah berakhir.", 409);
  }

  return prisma.$transaction(async (tx) => {
    await kunciTiket(tx, tiketId);

    const tiket = await tx.pengajuanHarga.findUniqueOrThrow({
      where: { id: tiketId },
      select: {
        status: true,
        nomorTiket: true,
        masterItem: { select: { kodeMaster: true, namaItem: true } },
      },
    });
    if (tiket.status !== "PENDING_KONTRAKTOR") {
      throw new KuorumError("Penawaran ini sudah tidak dalam tahap voting.", 409);
    }

    const putaran = await getPutaranTerakhir(tx, tiketId);
    const vote =
      putaran === null
        ? null
        : await tx.votingKontraktor.findFirst({
            where: {
              pengajuanHargaId: tiketId,
              putaranVote: putaran,
              kontraktorCabang: { kontraktorId },
            },
            select: {
              id: true,
              statusVote: true,
              hasRejectedOnce: true,
              kontraktorCabangId: true,
            },
          });
    if (!vote) {
      throw new KuorumError("Perusahaan Anda tidak diundang pada penawaran ini.", 404);
    }
    if (vote.statusVote !== "MENUNGGU") {
      throw new KuorumError("Perusahaan Anda sudah memberikan respon pada putaran ini.", 409);
    }

    const catatanBersih = catatan?.trim() || null;
    const isBanding = keputusan === "TOLAK" && !vote.hasRejectedOnce;

    if (keputusan === "TOLAK" && !catatanBersih) {
      throw new KuorumError("Catatan argumentasi wajib diisi saat menolak atau banding.");
    }
    if (isBanding && !(typeof usulanHarga === "number" && usulanHarga > 0)) {
      throw new KuorumError("Harga usulan banding wajib diisi dan lebih dari 0.");
    }
    if (keputusan === "TOLAK" && !isBanding && (usulanHarga || lampiranList?.length)) {
      throw new KuorumError(
        "Kesempatan banding sudah digunakan. Pada putaran ini hanya dapat Setuju atau Tolak."
      );
    }
    if (lampiranList?.some((l) => !POLA_URL_LAMPIRAN_BANDING.test(l.fileUrl))) {
      throw new KuorumError("Lampiran banding tidak valid. Unggah ulang berkas bukti.");
    }

    const sekarang = new Date();
    const updated = await tx.votingKontraktor.updateMany({
      where: { id: vote.id, statusVote: "MENUNGGU" },
      data: {
        statusVote: keputusan,
        tanggalRespon: sekarang,
        usulanHarga: isBanding ? usulanHarga : null,
        catatanPenolakan: keputusan === "TOLAK" ? catatanBersih : null,
        hasRejectedOnce: vote.hasRejectedOnce || keputusan === "TOLAK",
      },
    });
    if (updated.count === 0) {
      throw new KuorumError("Perusahaan Anda sudah memberikan respon pada putaran ini.", 409);
    }

    if (isBanding && lampiranList?.length) {
      await tx.lampiranBanding.createMany({
        data: lampiranList.map((l) => ({
          votingKontraktorId: vote.id,
          namaFile: l.namaFile,
          fileUrl: l.fileUrl,
          ukuranFile: l.ukuranFile ?? null,
        })),
      });
    }

    let diparkir = false;
    if (keputusan === "TOLAK" && vote.hasRejectedOnce) {
      const park = await tx.kontraktorCabang.updateMany({
        where: { id: vote.kontraktorCabangId, statusKeaktifan: "AKTIF" },
        data: {
          statusKeaktifan: "NONAKTIF_SEMENTARA",
          parkedAt: sekarang,
          alasanParked: `Menolak penetapan harga 2x berturut-turut pada tiket ${tiket.nomorTiket}${
            tiket.masterItem ? ` (${tiket.masterItem.namaItem})` : ""
          }.`,
          itemPemicuKode: tiket.masterItem?.kodeMaster ?? tiket.nomorTiket,
        },
      });
      diparkir = park.count > 0;
    }

    await tx.approvalAuditLog.create({
      data: {
        pengajuanHargaId: tiketId,
        userId,
        roleActor: "KONTRAKTOR",
        action:
          keputusan === "SETUJU" ? "VOTE_SETUJU" : isBanding ? "VOTE_BANDING" : "VOTE_TOLAK",
        catatan: diparkir
          ? `${catatanBersih ?? ""} [Rekanan otomatis Parked: tolak 2x berturut-turut]`.trim()
          : catatanBersih,
      },
    });

    const hasilKuorum = await evaluasiPutaran(tx, tiketId, {
      userId: null,
      roleActor: "SYSTEM",
    });

    return { statusVote: keputusan, isBanding, diparkir, hasilKuorum };
  });
}

// ============================================================================
// QUERY BACA (MONITORING, PORTAL REKANAN, DAFTAR PARKED)
// ============================================================================

/**
 * Ringkasan kuorum putaran terakhir dalam bentuk kontrak VotingKontraktorItem,
 * siap dipakai VotingKontraktorMonitorCard / PengajuanDetailLayout.
 */
export async function getRingkasanKuorum(tiketId: string) {
  const tiket = await prisma.pengajuanHarga.findUnique({
    where: { id: tiketId },
    select: { id: true, nomorTiket: true, status: true, deadlineVoting: true },
  });
  if (!tiket) throw new KuorumError("Tiket tidak ditemukan.", 404);

  const putaran = await getPutaranTerakhir(prisma, tiketId);
  const rows =
    putaran === null
      ? []
      : await prisma.votingKontraktor.findMany({
          where: { pengajuanHargaId: tiketId, putaranVote: putaran },
          orderBy: { createdAt: "asc" },
          include: {
            kontraktorCabang: { include: { kontraktor: true } },
            lampiranBandingList: true,
          },
        });

  const votingKontraktorList: VotingKontraktorItem[] = rows.map((v) => ({
    id: v.id,
    kontraktorId: v.kontraktorCabang.kontraktorId,
    namaPerusahaan: v.kontraktorCabang.kontraktor.namaPerusahaan,
    email: v.kontraktorCabang.kontraktor.email,
    statusVote: v.statusVote as StatusVoteKontraktor,
    tanggalVote: v.tanggalRespon?.toISOString(),
    hargaBanding: v.usulanHarga ? v.usulanHarga.toNumber() : undefined,
    catatanBanding: v.catatanPenolakan ?? undefined,
    lampiranBandingList: v.lampiranBandingList.map((l) => ({
      id: l.id,
      namaFile: l.namaFile,
      url: l.fileUrl,
      createdAt: l.uploadedAt.toISOString(),
    })),
  }));

  const total = votingKontraktorList.length;
  const setuju = votingKontraktorList.filter((v) => v.statusVote === "SETUJU").length;
  const target = hitungTargetKuorum(total);

  return {
    tiketId: tiket.id,
    nomorTiket: tiket.nomorTiket,
    status: tiket.status as StatusPengajuanHarga,
    putaran,
    deadlineVoting: tiket.deadlineVoting?.toISOString(),
    votingKontraktorList,
    totalDiundang: total,
    jumlahSetuju: setuju,
    targetKuorum: target,
    kuorumPersentase: total > 0 ? Math.round((setuju / total) * 100) : 0,
    kuorumTerpenuhi: total > 0 && setuju >= target,
  };
}

/**
 * Daftar penawaran untuk satu PT rekanan (isolasi data ketat per kontraktorId).
 * Mengembalikan baris vote putaran terakhir per tiket yang mengundang PT tersebut.
 */
export async function getPenawaranKontraktor(kontraktorId: string) {
  const rows = await prisma.votingKontraktor.findMany({
    where: { kontraktorCabang: { kontraktorId } },
    orderBy: [{ putaranVote: "desc" }, { createdAt: "desc" }],
    include: {
      kontraktorCabang: { include: { cabang: true } },
      pengajuanHarga: {
        include: {
          masterItem: true,
          divisi: true,
          wilayahCabang: true,
        },
      },
    },
  });

  // Ambil hanya baris putaran terbaru per tiket.
  const terbaru = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!terbaru.has(r.pengajuanHargaId)) terbaru.set(r.pengajuanHargaId, r);
  }

  return [...terbaru.values()].map((r) => {
    const p = r.pengajuanHarga;
    return {
      votingId: r.id,
      tiketId: p.id,
      nomorTiket: p.nomorTiket,
      statusTiket: p.status as StatusPengajuanHarga,
      namaItem: p.masterItem?.namaItem ?? "-",
      kodeMaster: p.masterItem?.kodeMaster ?? null,
      satuan: p.masterItem?.satuan ?? null,
      namaDivisi: p.divisi.namaDivisi,
      namaCabang: r.kontraktorCabang.cabang.namaCabang,
      cakupanHarga: p.cakupanHarga,
      namaWilayah: p.wilayahCabang?.namaWilayah ?? null,
      hargaDitawarkan: p.hargaDitetapkanSNB?.toNumber() ?? null,
      deadlineVoting: p.deadlineVoting?.toISOString() ?? null,
      putaran: r.putaranVote,
      statusVote: r.statusVote as StatusVoteKontraktor,
      bolehBanding: !r.hasRejectedOnce,
      usulanHarga: r.usulanHarga?.toNumber() ?? null,
      tanggalRespon: r.tanggalRespon?.toISOString() ?? null,
    };
  });
}

/** Relasi cabang PT rekanan yang sedang Parked, untuk pemberitahuan di portal rekanan. */
export async function getCabangParkedKontraktor(kontraktorId: string) {
  const rows = await prisma.kontraktorCabang.findMany({
    where: { kontraktorId, statusKeaktifan: "NONAKTIF_SEMENTARA" },
    orderBy: { parkedAt: "desc" },
    include: { cabang: true, divisi: true },
  });
  return rows.map((r) => ({
    relasiId: r.id,
    namaCabang: r.cabang.namaCabang,
    namaDivisi: r.divisi.namaDivisi,
    parkedAt: r.parkedAt?.toISOString() ?? null,
    alasanParked: r.alasanParked,
  }));
}

/**
 * Detail satu penawaran untuk portal rekanan. Hanya memuat baris vote milik PT
 * yang login (seluruh putaran), tanpa respon rekanan lain maupun rincian AHSP internal.
 * Mengembalikan null bila PT tersebut tidak pernah diundang pada tiket ini.
 */
export async function getDetailPenawaranKontraktor(tiketId: string, kontraktorId: string) {
  const voteList = await prisma.votingKontraktor.findMany({
    where: { pengajuanHargaId: tiketId, kontraktorCabang: { kontraktorId } },
    orderBy: { putaranVote: "desc" },
    include: { lampiranBandingList: { orderBy: { uploadedAt: "asc" } } },
  });
  if (voteList.length === 0) return null;

  const tiket = await prisma.pengajuanHarga.findUniqueOrThrow({
    where: { id: tiketId },
    include: { masterItem: true, divisi: true, cabang: true, wilayahCabang: true },
  });

  const toVote = (v: (typeof voteList)[number]) => ({
    id: v.id,
    putaran: v.putaranVote,
    statusVote: v.statusVote as StatusVoteKontraktor,
    usulanHarga: v.usulanHarga?.toNumber() ?? null,
    catatan: v.catatanPenolakan,
    tanggalRespon: v.tanggalRespon?.toISOString() ?? null,
    lampiranList: v.lampiranBandingList.map((l) => ({
      id: l.id,
      namaFile: l.namaFile,
      url: l.fileUrl,
      ukuranFile: l.ukuranFile,
    })),
  });

  const [terbaru, ...sebelumnya] = voteList;
  const m = tiket.masterItem;

  return {
    tiketId: tiket.id,
    nomorTiket: tiket.nomorTiket,
    statusTiket: tiket.status as StatusPengajuanHarga,
    namaDivisi: tiket.divisi.namaDivisi,
    namaCabang: tiket.cabang.namaCabang,
    cakupanHarga: tiket.cakupanHarga,
    namaWilayah: tiket.wilayahCabang?.namaWilayah ?? null,
    hargaDitawarkan: tiket.hargaDitetapkanSNB?.toNumber() ?? null,
    deadlineVoting: tiket.deadlineVoting?.toISOString() ?? null,
    item: m
      ? {
          kodeMaster: m.kodeMaster,
          namaItem: m.namaItem,
          kategori: m.kategori,
          merk: m.merk,
          ukuran: m.ukuran,
          tipe: m.tipe,
          warna: m.warna,
          lokasi: m.lokasi,
          satuan: m.satuan,
          deskripsi: m.deskripsiOtomatis,
        }
      : null,
    bolehBanding: !terbaru.hasRejectedOnce,
    voteAktif: toVote(terbaru),
    riwayatPutaran: sebelumnya.map(toVote),
  };
}

/**
 * Cakupan cabang wewenang pengguna internal untuk aksi Unpark.
 * SB_SPECIALIST (HO) berwenang lintas cabang; REGIONAL_MANAGER dibatasi
 * cabang induknya ditambah UserCabangCoverage.
 */
export async function getCabangWewenang(
  userId: string,
  role: RoleUser
): Promise<string[] | "SEMUA"> {
  if (role === "SB_SPECIALIST") return "SEMUA";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cabangId: true, coverages: { select: { cabangId: true } } },
  });
  if (!user) return [];
  const ids = new Set(user.coverages.map((c) => c.cabangId));
  if (user.cabangId) ids.add(user.cabangId);
  return [...ids];
}

export async function getDaftarRekananParked(cabangWewenang: string[] | "SEMUA") {
  const rows = await prisma.kontraktorCabang.findMany({
    where: {
      statusKeaktifan: "NONAKTIF_SEMENTARA",
      ...(cabangWewenang === "SEMUA" ? {} : { cabangId: { in: cabangWewenang } }),
    },
    orderBy: { parkedAt: "desc" },
    include: { kontraktor: true, cabang: true, divisi: true },
  });

  return rows.map((r) => ({
    relasiId: r.id,
    kontraktorId: r.kontraktorId,
    kodeVendor: r.kontraktor.kodeVendor,
    namaPerusahaan: r.kontraktor.namaPerusahaan,
    picName: r.kontraktor.picName,
    telepon: r.kontraktor.telepon,
    cabangId: r.cabangId,
    namaCabang: r.cabang.namaCabang,
    namaDivisi: r.divisi.namaDivisi,
    parkedAt: r.parkedAt?.toISOString() ?? null,
    alasanParked: r.alasanParked,
    itemPemicuKode: r.itemPemicuKode,
  }));
}

/** Riwayat pemulihan (Unpark) terakhir dalam cakupan wewenang, untuk jejak audit di layar. */
export async function getRiwayatUnpark(cabangWewenang: string[] | "SEMUA", limit = 20) {
  const rows = await prisma.kontraktorCabang.findMany({
    where: {
      unparkedAt: { not: null },
      ...(cabangWewenang === "SEMUA" ? {} : { cabangId: { in: cabangWewenang } }),
    },
    orderBy: { unparkedAt: "desc" },
    take: limit,
    include: { kontraktor: true, cabang: true, divisi: true },
  });

  const userIds = [...new Set(rows.map((r) => r.unparkedBy).filter((id): id is string => !!id))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => ({
    relasiId: r.id,
    namaPerusahaan: r.kontraktor.namaPerusahaan,
    kodeVendor: r.kontraktor.kodeVendor,
    namaCabang: r.cabang.namaCabang,
    namaDivisi: r.divisi.namaDivisi,
    statusKeaktifan: r.statusKeaktifan,
    unparkedAt: r.unparkedAt!.toISOString(),
    unparkedOleh: r.unparkedBy ? (userMap.get(r.unparkedBy)?.fullName ?? "Pengguna dihapus") : "-",
    unparkReason: r.unparkReason,
  }));
}

export async function getNamaCabang(cabangIds: string[]) {
  const rows = await prisma.cabang.findMany({
    where: { id: { in: cabangIds } },
    select: { namaCabang: true },
    orderBy: { namaCabang: "asc" },
  });
  return rows.map((r) => r.namaCabang);
}

export interface UnparkParams {
  relasiId: string;
  userId: string;
  role: RoleUser;
  alasan: string;
}

/**
 * Aksi tunggal "Aktifkan Kembali" (Unpark). Mediasi diselesaikan di luar sistem,
 * sistem hanya mencatat siapa, kapan, dan alasan pemulihan.
 */
export async function unparkKontraktorCabang({ relasiId, userId, role, alasan }: UnparkParams) {
  const alasanBersih = alasan.trim();
  if (!alasanBersih) {
    throw new KuorumError("Alasan pengaktifan kembali wajib diisi.");
  }

  const relasi = await prisma.kontraktorCabang.findUnique({
    where: { id: relasiId },
    select: { id: true, cabangId: true, statusKeaktifan: true },
  });
  if (!relasi) throw new KuorumError("Relasi rekanan cabang tidak ditemukan.", 404);

  const wewenang = await getCabangWewenang(userId, role);
  if (wewenang !== "SEMUA" && !wewenang.includes(relasi.cabangId)) {
    throw new KuorumError("Cabang rekanan ini di luar cakupan wewenang Anda.", 403);
  }
  if (relasi.statusKeaktifan !== "NONAKTIF_SEMENTARA") {
    throw new KuorumError("Rekanan ini tidak sedang berstatus Parked.", 409);
  }

  const updated = await prisma.kontraktorCabang.updateMany({
    where: { id: relasiId, statusKeaktifan: "NONAKTIF_SEMENTARA" },
    data: {
      statusKeaktifan: "AKTIF",
      unparkedAt: new Date(),
      unparkedBy: userId,
      unparkReason: alasanBersih,
    },
  });
  if (updated.count === 0) {
    throw new KuorumError("Rekanan ini sudah diaktifkan kembali.", 409);
  }

  return { relasiId, statusKeaktifan: "AKTIF" as const };
}
