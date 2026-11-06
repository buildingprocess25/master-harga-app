"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/auth/require-role";
import { getPengajuanDetail } from "@/lib/services/pengajuan-service";
import { putuskanKuorumGagal, putuskanLayer3 } from "@/lib/services/regional-service";
import { DomainError } from "@/lib/services/transisi-tiket";

export type HasilAksi = { success: true; message: string } | { success: false; message: string };

async function jalankan(fn: () => Promise<string>): Promise<HasilAksi> {
  try {
    return { success: true, message: await fn() };
  } catch (error) {
    if (error instanceof DomainError) return { success: false, message: error.message };
    console.error("Aksi Regional Manager gagal:", error);
    return { success: false, message: "Terjadi kesalahan internal. Coba lagi beberapa saat." };
  }
}

/** Tiket harus berada di cabang induk/coverage Regional Manager yang login. */
async function pastikanAkses(tiketId: string) {
  const user = await requireRoleAction(["REGIONAL_MANAGER"]);
  const detail = await getPengajuanDetail(user, tiketId);
  if (!detail) throw new DomainError("Tiket tidak ditemukan atau di luar cakupan cabang Anda.", 404);
  return user;
}

function revalidasi(tiketId: string) {
  revalidatePath("/regional-manager");
  revalidatePath("/regional-manager/monitoring-kuorum");
  revalidatePath(`/regional-manager/${tiketId}`);
}

export async function putuskanLayer3Action(input: {
  tiketId: string;
  keputusan: "SETUJU" | "KEMBALI_SNB" | "TOLAK";
  catatan: string;
}): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await pastikanAkses(input.tiketId);
    if (!["SETUJU", "KEMBALI_SNB", "TOLAK"].includes(input.keputusan)) throw new DomainError("Keputusan tidak valid.");
    const hasil = await putuskanLayer3({
      tiketId: input.tiketId,
      userId: user.id,
      keputusan: input.keputusan,
      catatan: String(input.catatan ?? "").slice(0, 1000),
    });
    revalidasi(input.tiketId);
    if (hasil.status === "PENDING_KONTRAKTOR") {
      return `Harga disetujui. Kuorum putaran ${hasil.putaran} dibuka untuk ${hasil.totalDiundang} rekanan (SLA 3x24 jam).`;
    }
    return hasil.status === "PENDING_SB_SPECIALIST"
      ? "Tiket dikembalikan ke S&B Specialist untuk tinjauan ulang margin."
      : "Pengajuan ditolak permanen.";
  });
}

export async function putuskanKuorumGagalAction(input: {
  tiketId: string;
  keputusan: "BUKA_ULANG" | "TOLAK";
  catatan: string;
}): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await pastikanAkses(input.tiketId);
    if (input.keputusan !== "BUKA_ULANG" && input.keputusan !== "TOLAK") throw new DomainError("Keputusan tidak valid.");
    const hasil = await putuskanKuorumGagal({
      tiketId: input.tiketId,
      userId: user.id,
      keputusan: input.keputusan,
      catatan: String(input.catatan ?? "").slice(0, 1000),
    });
    revalidasi(input.tiketId);
    return hasil.status === "PENDING_KONTRAKTOR"
      ? `Kuorum dibuka ulang: putaran ${hasil.putaran} untuk ${hasil.totalDiundang} rekanan.`
      : "Pengajuan ditolak permanen.";
  });
}
