import prisma from "@/lib/prisma";
import { StatusPengajuanHarga, RoleUser } from "@/types";

/**
 * Matriks Transisi Status Resmi SPARTA-HARGA
 * Mencegah tiket melompat tahap tanpa melalui rantai persetujuan berjenjang.
 */
export const VALID_STATUS_TRANSITIONS: Record<
  StatusPengajuanHarga,
  StatusPengajuanHarga[]
> = {
  DRAFT: ["DIAJUKAN"],
  DIAJUKAN: ["SIAP_SURVEI", "PERLU_REVISI", "DITOLAK"],
  PERLU_REVISI: ["DIAJUKAN", "DITOLAK"],
  SIAP_SURVEI: ["PENDING_BM_MGR", "RETURNED_TO_BC"],
  RETURNED_TO_BC: ["PENDING_BM_MGR", "DITOLAK"],
  PENDING_BM_MGR: ["PENDING_SB_SPECIALIST", "RETURNED_TO_BC", "DITOLAK"],
  PENDING_SB_SPECIALIST: [
    "PENDING_REGIONAL_MGR",
    "PERLU_REVISI",
    "DITOLAK",
  ],
  PENDING_REGIONAL_MGR: ["PENDING_KONTRAKTOR", "DITOLAK", "PERLU_REVISI"],
  PENDING_KONTRAKTOR: [
    "RELEASED",
    "USULAN_KONTRAKTOR",
    "DITOLAK_KONTRAKTOR",
  ],
  USULAN_KONTRAKTOR: ["PENDING_REGIONAL_MGR", "PENDING_SB_SPECIALIST", "DITOLAK"],
  DITOLAK_KONTRAKTOR: ["PENDING_REGIONAL_MGR", "DITOLAK"],
  DITOLAK: [],
  RELEASED: [],
};

/**
 * Cek apakah transisi dari status A ke status B diizinkan.
 */
export function canTransitionStatus(
  currentStatus: StatusPengajuanHarga,
  targetStatus: StatusPengajuanHarga
): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export interface AdvanceStatusParams {
  tiketId: string;
  targetStatus: StatusPengajuanHarga;
  userId: string;
  roleActor?: string;
  aksi: string;
  catatan?: string;
}

/**
 * Memperbarui status tiket secara transaksional dan mencatat riwayat audit.
 */
export async function advanceTicketStatus({
  tiketId,
  targetStatus,
  userId,
  roleActor = "SYSTEM",
  aksi,
  catatan,
}: AdvanceStatusParams) {
  return prisma.$transaction(async (tx) => {
    // 1. Ambil tiket aktif
    const tiket = await tx.pengajuanHarga.findUnique({
      where: { id: tiketId },
      select: { id: true, status: true, nomorTiket: true },
    });

    if (!tiket) {
      throw new Error(`Tiket dengan ID ${tiketId} tidak ditemukan.`);
    }

    const currentStatus = tiket.status as StatusPengajuanHarga;

    // 2. Validasi Transisi
    if (!canTransitionStatus(currentStatus, targetStatus)) {
      throw new Error(
        `Transisi status tidak sah dari ${currentStatus} ke ${targetStatus}.`
      );
    }

    // 3. Update Status Tiket
    const updated = await tx.pengajuanHarga.update({
      where: { id: tiketId },
      data: {
        status: targetStatus,
        catatanReview: catatan || null,
      },
    });

    // 4. Catat Audit Log
    await tx.approvalAuditLog.create({
      data: {
        pengajuanHargaId: tiketId,
        userId,
        roleActor,
        action: aksi,
        catatan: catatan || null,
      },
    });

    return updated;
  });
}
