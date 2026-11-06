import prisma from "@/lib/prisma";
import { DomainError, kunciTiket, ubahStatusTiket } from "@/lib/services/transisi-tiket";
import { teruskanKeKontraktor } from "@/lib/services/kuorum-service";

/** Jumlah rekanan AKTIF yang akan diundang kuorum (cabang + divisi tiket). */
export async function hitungRekananAktif(cabangId: string, divisiId: string) {
  return prisma.kontraktorCabang.count({ where: { cabangId, divisiId, statusKeaktifan: "AKTIF" } });
}

/**
 * Pembanding disparitas: harga resmi aktif item yang sama di seluruh cabang dalam
 * regional yang sama dengan cabang tiket, untuk menilai kewajaran rekomendasi S&B.
 */
export async function getPerbandinganRegional(params: { masterItemId: string | null; cabangId: string }) {
  if (!params.masterItemId) return null;
  const cabang = await prisma.cabang.findUnique({ where: { id: params.cabangId }, select: { regional: true } });
  if (!cabang) return null;

  const rows = await prisma.masterHargaCabang.findMany({
    where: { masterItemId: params.masterItemId, statusHarga: "AKTIF", cabang: { regional: cabang.regional } },
    include: { cabang: { select: { id: true, namaCabang: true } } },
    orderBy: { hargaFinalInduk: "asc" },
  });
  const harga = rows.map((r) => r.hargaFinalInduk.toNumber());
  return {
    regional: cabang.regional,
    daftar: rows.map((r) => ({
      cabangId: r.cabang.id,
      namaCabang: r.cabang.namaCabang,
      harga: r.hargaFinalInduk.toNumber(),
      berlakuSejak: r.berlakuSejak.toISOString(),
      cabangTiket: r.cabang.id === params.cabangId,
    })),
    min: harga.length ? Math.min(...harga) : null,
    maks: harga.length ? Math.max(...harga) : null,
    rata: harga.length ? Math.round(harga.reduce((a, b) => a + b, 0) / harga.length) : null,
  };
}

/** Prasyarat pembukaan kuorum yang bisa dicek sebelum tombol ditekan (untuk ditampilkan di layar). */
export async function cekPrasyaratKuorum(tiketId: string) {
  const t = await prisma.pengajuanHarga.findUnique({
    where: { id: tiketId },
    select: { cabangId: true, divisiId: true, masterItemId: true, hargaDitetapkanSNB: true, cakupanHarga: true },
  });
  if (!t) return { rekananAktif: 0, masalah: ["Tiket tidak ditemukan."] };
  const masalah: string[] = [];
  if (!t.masterItemId) masalah.push("Tiket belum terhubung ke Master Item.");
  if (!t.hargaDitetapkanSNB) masalah.push("Harga rekomendasi S&B belum ada.");
  if (t.cakupanHarga === "KHUSUS_WILAYAH" && t.masterItemId) {
    const induk = await prisma.masterHargaCabang.findUnique({
      where: { masterItemId_cabangId: { masterItemId: t.masterItemId, cabangId: t.cabangId } },
      select: { id: true },
    });
    if (!induk) masalah.push("Harga induk cabang untuk item ini belum dirilis, harga khusus wilayah belum dapat ditawarkan.");
  }
  const rekananAktif = await hitungRekananAktif(t.cabangId, t.divisiId);
  if (rekananAktif === 0) masalah.push("Tidak ada rekanan kontraktor aktif di cabang dan divisi ini.");
  return { rekananAktif, masalah };
}

function cekCatatan(catatan: string) {
  const c = catatan.trim();
  if (c.length < 5) throw new DomainError("Catatan wajib diisi (minimal 5 karakter).");
  return c;
}

export type KeputusanRegional = "SETUJU" | "KEMBALI_SNB" | "TOLAK";

/**
 * Keputusan Layer 3 Regional Manager atas tiket PENDING_REGIONAL_MGR:
 * - SETUJU: buka kuorum rekanan (teruskanKeKontraktor, SLA 3x24 jam).
 * - KEMBALI_SNB: minta tinjauan ulang margin ke S&B (PENDING_SB_SPECIALIST).
 * - TOLAK: tutup permanen (DITOLAK).
 */
export async function putuskanLayer3(params: {
  tiketId: string;
  userId: string;
  keputusan: KeputusanRegional;
  catatan: string;
}) {
  if (params.keputusan === "SETUJU") {
    const hasil = await teruskanKeKontraktor({
      tiketId: params.tiketId,
      userId: params.userId,
      roleActor: "REGIONAL_MANAGER",
      catatan: params.catatan.trim() || undefined,
    });
    if (hasil.sudahTerbuka) throw new DomainError("Kuorum untuk tiket ini sudah terbuka sebelumnya.", 409);
    return { status: "PENDING_KONTRAKTOR" as const, putaran: hasil.putaran, totalDiundang: hasil.totalDiundang };
  }

  const catatan = cekCatatan(params.catatan);
  const keStatus = params.keputusan === "KEMBALI_SNB" ? "PENDING_SB_SPECIALIST" : "DITOLAK";
  await prisma.$transaction(async (tx) => {
    await kunciTiket(tx, params.tiketId);
    const t = await tx.pengajuanHarga.findUnique({ where: { id: params.tiketId }, select: { status: true } });
    if (!t) throw new DomainError("Tiket tidak ditemukan.", 404);
    if (t.status !== "PENDING_REGIONAL_MGR") {
      throw new DomainError("Keputusan Layer 3 hanya dapat diambil saat tiket berstatus PENDING_REGIONAL_MGR.", 409);
    }
    await ubahStatusTiket(tx, {
      tiketId: params.tiketId,
      dariStatus: "PENDING_REGIONAL_MGR",
      keStatus,
      userId: params.userId,
      roleActor: "REGIONAL_MANAGER",
      aksi: params.keputusan === "KEMBALI_SNB" ? "KEMBALIKAN_TINJAUAN_MARGIN" : "TOLAK_PENGAJUAN",
      catatan,
    });
  });
  return { status: keStatus };
}

/**
 * Tindak lanjut kuorum gagal (DITOLAK_KONTRAKTOR) setelah mediasi:
 * - BUKA_ULANG: kembali ke PENDING_REGIONAL_MGR lalu langsung membuka putaran voting baru.
 * - TOLAK: tutup permanen (DITOLAK).
 */
export async function putuskanKuorumGagal(params: {
  tiketId: string;
  userId: string;
  keputusan: "BUKA_ULANG" | "TOLAK";
  catatan: string;
}) {
  const catatan = cekCatatan(params.catatan);
  await prisma.$transaction(async (tx) => {
    await kunciTiket(tx, params.tiketId);
    const t = await tx.pengajuanHarga.findUnique({ where: { id: params.tiketId }, select: { status: true } });
    if (!t) throw new DomainError("Tiket tidak ditemukan.", 404);
    if (t.status !== "DITOLAK_KONTRAKTOR") {
      throw new DomainError("Aksi ini hanya untuk tiket berstatus DITOLAK_KONTRAKTOR.", 409);
    }
    await ubahStatusTiket(tx, {
      tiketId: params.tiketId,
      dariStatus: "DITOLAK_KONTRAKTOR",
      keStatus: params.keputusan === "BUKA_ULANG" ? "PENDING_REGIONAL_MGR" : "DITOLAK",
      userId: params.userId,
      roleActor: "REGIONAL_MANAGER",
      aksi: params.keputusan === "BUKA_ULANG" ? "BUKA_ULANG_SETELAH_MEDIASI" : "TOLAK_PENGAJUAN",
      catatan,
    });
  });

  if (params.keputusan === "TOLAK") return { status: "DITOLAK" as const };

  // Status sudah PENDING_REGIONAL_MGR; bila pembukaan putaran gagal (mis. tidak ada
  // rekanan aktif), tiket tetap di antrean approval dan dapat dicoba lagi.
  const hasil = await teruskanKeKontraktor({
    tiketId: params.tiketId,
    userId: params.userId,
    roleActor: "REGIONAL_MANAGER",
  });
  return { status: "PENDING_KONTRAKTOR" as const, putaran: hasil.putaran, totalDiundang: hasil.totalDiundang };
}
