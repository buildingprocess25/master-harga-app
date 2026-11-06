import { Prisma } from "@/generated/prisma/client";
import { canTransitionStatus } from "@/lib/services/state-machine";
import { StatusPengajuanHarga } from "@/types";

export type Tx = Prisma.TransactionClient;

/**
 * Error domain dengan HTTP status, agar route handler / server action dapat
 * meneruskan pesan yang jelas ke pengguna tanpa membocorkan error internal.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * Mengunci baris tiket (SELECT ... FOR UPDATE) agar aksi pada tiket yang sama
 * diproses berurutan dan tidak saling menimpa.
 */
export async function kunciTiket(tx: Tx, tiketId: string) {
  await tx.$queryRaw`SELECT id FROM pengajuan_harga WHERE id = ${tiketId} FOR UPDATE`;
}

export interface UbahStatusParams {
  tiketId: string;
  dariStatus: StatusPengajuanHarga;
  keStatus: StatusPengajuanHarga;
  userId: string | null;
  roleActor: string;
  aksi: string;
  catatan?: string;
}

/**
 * Versi transaksional dari advanceTicketStatus (state-machine.ts) agar perubahan
 * data tiket, perubahan status, dan audit log tercatat dalam satu transaksi.
 * Update bersyarat (status lama harus cocok) mencegah dua aksi bersamaan sama-sama lolos.
 */
export async function ubahStatusTiket(tx: Tx, params: UbahStatusParams) {
  const { tiketId, dariStatus, keStatus, userId, roleActor, aksi, catatan } = params;

  if (!canTransitionStatus(dariStatus, keStatus)) {
    throw new DomainError(`Transisi status tidak sah dari ${dariStatus} ke ${keStatus}.`, 409);
  }

  const updated = await tx.pengajuanHarga.updateMany({
    where: { id: tiketId, status: dariStatus },
    data: { status: keStatus, catatanReview: catatan || null },
  });
  if (updated.count === 0) {
    throw new DomainError("Status tiket telah berubah. Muat ulang halaman.", 409);
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
