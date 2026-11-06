import prisma from "@/lib/prisma";
import { DomainError, kunciTiket, ubahStatusTiket } from "@/lib/services/transisi-tiket";
import { getRingkasanKuorum } from "@/lib/services/kuorum-service";
import { bulat2 } from "@/lib/kalkulasi-ahsp";

/**
 * Ringkasan usulan banding putaran terakhir terhadap harga yang ditawarkan:
 * jumlah respon per jenis, statistik harga usulan, dan selisih rata-rata.
 */
export async function getRingkasanBanding(tiketId: string, hargaDitawarkan: number | null) {
  const kuorum = await getRingkasanKuorum(tiketId);
  if (kuorum.putaran === null) return null;

  const daftar = kuorum.votingKontraktorList;
  const banding = daftar.filter((v) => v.statusVote === "TOLAK" && typeof v.hargaBanding === "number");
  const usulan = banding.map((v) => v.hargaBanding as number);
  const rata = usulan.length ? Math.round(usulan.reduce((a, b) => a + b, 0) / usulan.length) : null;

  return {
    putaran: kuorum.putaran,
    hargaDitawarkan,
    totalDiundang: kuorum.totalDiundang,
    jumlahSetuju: daftar.filter((v) => v.statusVote === "SETUJU").length,
    jumlahBanding: banding.length,
    jumlahTolak: daftar.filter((v) => v.statusVote === "TOLAK" && typeof v.hargaBanding !== "number").length,
    jumlahTimeout: daftar.filter((v) => v.statusVote === "TIMEOUT").length,
    usulanMin: usulan.length ? Math.min(...usulan) : null,
    usulanMaks: usulan.length ? Math.max(...usulan) : null,
    usulanRata: rata,
    selisihRataPersen: rata !== null && hargaDitawarkan ? bulat2(((rata - hargaDitawarkan) / hargaDitawarkan) * 100) : null,
    daftar,
  };
}

export type RingkasanBanding = NonNullable<Awaited<ReturnType<typeof getRingkasanBanding>>>;

export type KeputusanBanding = "REVISI_MARGIN" | "PERTAHANKAN" | "TUTUP";

/**
 * Keputusan S&B Specialist atas tiket USULAN_KONTRAKTOR:
 * - REVISI_MARGIN: usulan masuk akal, harga disusun ulang lewat evaluasi margin
 *   (PENDING_SB_SPECIALIST) agar tetap konsisten dengan rincian AHSP.
 * - PERTAHANKAN: harga tetap, diteruskan ke Regional (PENDING_REGIONAL_MGR) untuk
 *   putaran berikutnya; rekanan yang sudah banding hanya dapat setuju/tolak.
 * - TUTUP: negosiasi tidak disepakati (DITOLAK).
 */
export async function putuskanBanding(params: {
  tiketId: string;
  userId: string;
  keputusan: KeputusanBanding;
  catatan: string;
}) {
  const catatan = params.catatan.trim();
  if (catatan.length < 5) {
    throw new DomainError("Catatan evaluasi wajib diisi (minimal 5 karakter) sebagai dasar keputusan.");
  }
  const tujuan = {
    REVISI_MARGIN: { status: "PENDING_SB_SPECIALIST", aksi: "BANDING_REVISI_MARGIN" },
    PERTAHANKAN: { status: "PENDING_REGIONAL_MGR", aksi: "BANDING_PERTAHANKAN_HARGA" },
    TUTUP: { status: "DITOLAK", aksi: "TOLAK_PENGAJUAN" },
  } as const;
  const t = tujuan[params.keputusan];
  if (!t) throw new DomainError("Keputusan tidak valid.");

  await prisma.$transaction(async (tx) => {
    await kunciTiket(tx, params.tiketId);
    const tiket = await tx.pengajuanHarga.findUnique({ where: { id: params.tiketId }, select: { status: true } });
    if (!tiket) throw new DomainError("Tiket tidak ditemukan.", 404);
    if (tiket.status !== "USULAN_KONTRAKTOR") {
      throw new DomainError("Evaluasi banding hanya dapat dilakukan saat tiket berstatus USULAN_KONTRAKTOR.", 409);
    }
    await ubahStatusTiket(tx, {
      tiketId: params.tiketId,
      dariStatus: "USULAN_KONTRAKTOR",
      keStatus: t.status,
      userId: params.userId,
      roleActor: "SB_SPECIALIST",
      aksi: t.aksi,
      catatan,
    });
  });
  return { status: t.status };
}
