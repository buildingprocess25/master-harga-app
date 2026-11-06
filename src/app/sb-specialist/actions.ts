"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/auth/require-role";
import {
  BarisWorksheet,
  buatKoefisienBaru,
  putuskanValidasiSpesifikasi,
  simpanWorksheetAhsp,
} from "@/lib/services/ahsp-service";
import { getPengajuanDetail } from "@/lib/services/pengajuan-service";
import { putuskanPascaSurvei, simpanEvaluasiMargin } from "@/lib/services/margin-service";
import { putuskanBanding } from "@/lib/services/banding-service";
import { setStatusKoefisien, ubahKoefisien } from "@/lib/services/pustaka-service";
import { buatMasterItem, SpesifikasiItem, ubahMasterItem } from "@/lib/services/master-item-service";
import { DomainError } from "@/lib/services/transisi-tiket";

export type HasilAksi = { success: true; message: string } | { success: false; message: string };

async function jalankan(fn: () => Promise<string>): Promise<HasilAksi> {
  try {
    return { success: true, message: await fn() };
  } catch (error) {
    if (error instanceof DomainError) return { success: false, message: error.message };
    console.error("Aksi S&B Specialist gagal:", error);
    return { success: false, message: "Terjadi kesalahan internal. Coba lagi beberapa saat." };
  }
}

/** Pastikan tiket berada dalam cakupan S&B yang login (divisi) sebelum diubah. */
async function pastikanAkses(tiketId: string) {
  const user = await requireRoleAction(["SB_SPECIALIST"]);
  const detail = await getPengajuanDetail(user, tiketId);
  if (!detail) throw new DomainError("Tiket tidak ditemukan atau di luar cakupan Anda.", 404);
  return user;
}

export async function simpanWorksheetAction(input: {
  tiketId: string;
  baris: BarisWorksheet[];
  terbitkan: boolean;
  catatan?: string;
}): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await pastikanAkses(input.tiketId);
    const baris = Array.isArray(input.baris)
      ? input.baris.map((b) => ({
          masterKoefisienId: String(b.masterKoefisienId),
          nilaiKoefisien: Number(b.nilaiKoefisien),
          hargaAcuanSatuan: Number(b.hargaAcuanSatuan),
        }))
      : [];
    const hasil = await simpanWorksheetAhsp({
      tiketId: input.tiketId,
      userId: user.id,
      baris,
      terbitkan: input.terbitkan === true,
      catatan: typeof input.catatan === "string" ? input.catatan.slice(0, 1000) : undefined,
    });
    revalidatePath("/sb-specialist");
    revalidatePath(`/sb-specialist/${input.tiketId}`);
    return hasil.status === "SIAP_SURVEI"
      ? "Resep AHSP dikunci dan tiket diterbitkan ke Building Coordinator untuk survei 3 toko."
      : "Draft resep AHSP tersimpan.";
  });
}

export async function putuskanValidasiAction(input: {
  tiketId: string;
  keputusan: "REVISI" | "TOLAK";
  catatan: string;
}): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await pastikanAkses(input.tiketId);
    if (input.keputusan !== "REVISI" && input.keputusan !== "TOLAK") {
      throw new DomainError("Keputusan tidak valid.");
    }
    await putuskanValidasiSpesifikasi({
      tiketId: input.tiketId,
      userId: user.id,
      keputusan: input.keputusan,
      catatan: String(input.catatan ?? "").slice(0, 1000),
    });
    revalidatePath("/sb-specialist");
    revalidatePath(`/sb-specialist/${input.tiketId}`);
    return input.keputusan === "REVISI"
      ? "Tiket dikembalikan ke B&M Manager untuk perbaikan spesifikasi."
      : "Pengajuan ditolak permanen.";
  });
}

export async function simpanEvaluasiMarginAction(input: {
  tiketId: string;
  margin: { upah: number; material: number; bongkaran: number };
  teruskan: boolean;
  catatan?: string;
}): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await pastikanAkses(input.tiketId);
    const m = input.margin ?? { upah: NaN, material: NaN, bongkaran: NaN };
    const hasil = await simpanEvaluasiMargin({
      tiketId: input.tiketId,
      userId: user.id,
      margin: { upah: Number(m.upah), material: Number(m.material), bongkaran: Number(m.bongkaran) },
      teruskan: input.teruskan === true,
      catatan: typeof input.catatan === "string" ? input.catatan.slice(0, 1000) : undefined,
    });
    revalidatePath("/sb-specialist/evaluasi-margin");
    revalidatePath(`/sb-specialist/${input.tiketId}`);
    const harga = `Rp ${hasil.hargaFinal.toLocaleString("id-ID")}`;
    return input.teruskan
      ? `Rekomendasi harga ${harga} dikirim ke Regional Manager untuk persetujuan Layer 3.`
      : `Draft margin tersimpan. Harga rekomendasi sementara ${harga}.`;
  });
}

export async function putuskanPascaSurveiAction(input: {
  tiketId: string;
  keputusan: "REVISI" | "TOLAK";
  catatan: string;
}): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await pastikanAkses(input.tiketId);
    if (input.keputusan !== "REVISI" && input.keputusan !== "TOLAK") {
      throw new DomainError("Keputusan tidak valid.");
    }
    await putuskanPascaSurvei({
      tiketId: input.tiketId,
      userId: user.id,
      keputusan: input.keputusan,
      catatan: String(input.catatan ?? "").slice(0, 1000),
    });
    revalidatePath("/sb-specialist/evaluasi-margin");
    revalidatePath(`/sb-specialist/${input.tiketId}`);
    return input.keputusan === "REVISI"
      ? "Tiket dikembalikan untuk revisi (PERLU_REVISI)."
      : "Pengajuan ditolak permanen.";
  });
}

export async function putuskanBandingAction(input: {
  tiketId: string;
  keputusan: "REVISI_MARGIN" | "PERTAHANKAN" | "TUTUP";
  catatan: string;
}): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await pastikanAkses(input.tiketId);
    if (!["REVISI_MARGIN", "PERTAHANKAN", "TUTUP"].includes(input.keputusan)) {
      throw new DomainError("Keputusan tidak valid.");
    }
    const hasil = await putuskanBanding({
      tiketId: input.tiketId,
      userId: user.id,
      keputusan: input.keputusan,
      catatan: String(input.catatan ?? "").slice(0, 1000),
    });
    revalidatePath("/sb-specialist/banding-rekanan");
    revalidatePath("/sb-specialist/evaluasi-margin");
    revalidatePath(`/sb-specialist/${input.tiketId}`);
    return hasil.status === "PENDING_SB_SPECIALIST"
      ? "Usulan diterima untuk ditinjau. Silakan susun ulang margin di halaman ini lalu kirim ke Regional."
      : hasil.status === "PENDING_REGIONAL_MGR"
        ? "Harga dipertahankan dan diteruskan ke Regional Manager untuk membuka putaran berikutnya."
        : "Pengajuan ditutup (DITOLAK).";
  });
}

// ============================================================================
// PUSTAKA KOEFISIEN & MASTER ITEM
// ============================================================================

export async function simpanKoefisienAction(input: {
  id?: string;
  divisiId: string;
  kategori: string;
  namaKomponen: string;
  satuan: string;
  nilaiKoefisienDefault: number;
  hargaAcuanDefault: number | null;
  wajibSurveiToko: boolean;
}): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await requireRoleAction(["SB_SPECIALIST"]);
    const data = {
      namaKomponen: String(input.namaKomponen ?? ""),
      satuan: String(input.satuan ?? ""),
      nilaiKoefisienDefault: Number(input.nilaiKoefisienDefault),
      hargaAcuanDefault:
        input.hargaAcuanDefault === null || input.hargaAcuanDefault === undefined ? null : Number(input.hargaAcuanDefault),
      wajibSurveiToko: input.wajibSurveiToko === true,
    };
    if (input.id) {
      await ubahKoefisien(String(input.id), data, user.divisiId);
    } else {
      if (user.divisiId && user.divisiId !== input.divisiId) {
        throw new DomainError("Anda hanya dapat menambah komponen untuk divisi Anda.", 403);
      }
      await buatKoefisienBaru({ ...data, divisiId: String(input.divisiId), kategori: String(input.kategori) });
    }
    revalidatePath("/sb-specialist/master-koefisien");
    return input.id ? "Komponen pustaka diperbarui." : "Komponen baru ditambahkan ke pustaka.";
  });
}

export async function setStatusKoefisienAction(input: { id: string; aktif: boolean }): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await requireRoleAction(["SB_SPECIALIST"]);
    await setStatusKoefisien(String(input.id), input.aktif === true, user.divisiId);
    revalidatePath("/sb-specialist/master-koefisien");
    return input.aktif ? "Komponen diaktifkan kembali." : "Komponen dinonaktifkan dan tidak muncul lagi di worksheet.";
  });
}

export async function simpanMasterItemAction(input: {
  id?: string;
  divisiId: string;
  kodeItem: string;
  kodeVarian: string;
  spesifikasi: SpesifikasiItem;
}): Promise<HasilAksi> {
  return jalankan(async () => {
    const user = await requireRoleAction(["SB_SPECIALIST"]);
    const s = input.spesifikasi ?? ({} as SpesifikasiItem);
    const spesifikasi: SpesifikasiItem = {
      kategori: String(s.kategori ?? ""),
      namaItem: String(s.namaItem ?? ""),
      ukuran: String(s.ukuran ?? ""),
      merk: String(s.merk ?? ""),
      tipe: s.tipe ? String(s.tipe) : null,
      warna: s.warna ? String(s.warna) : null,
      permukaan: s.permukaan ? String(s.permukaan) : null,
      tebal: s.tebal ? String(s.tebal) : null,
      toleransi: s.toleransi ? String(s.toleransi) : null,
      lokasi: String(s.lokasi ?? ""),
      satuan: String(s.satuan ?? ""),
    };
    if (input.id) {
      await ubahMasterItem(String(input.id), spesifikasi, user.divisiId);
      revalidatePath("/sb-specialist/master-item");
      return "Spesifikasi item diperbarui.";
    }
    const baru = await buatMasterItem(
      { ...spesifikasi, divisiId: String(input.divisiId), kodeItem: String(input.kodeItem ?? ""), kodeVarian: String(input.kodeVarian ?? "") },
      user.divisiId
    );
    revalidatePath("/sb-specialist/master-item");
    return `Item ${baru.kodeMaster} ditambahkan ke master.`;
  });
}
