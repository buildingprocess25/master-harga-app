import prisma from "@/lib/prisma";
import { DomainError, kunciTiket, ubahStatusTiket } from "@/lib/services/transisi-tiket";
import {
  bulat2,
  hitungAhsp,
  MarginKategori,
  marginUntuk,
  marginValid,
  MARGIN_MAKS,
  statistikSurvei,
} from "@/lib/kalkulasi-ahsp";
import { KategoriKoefisien } from "@/types";

const persen = (v: number) => `${v.toLocaleString("id-ID")}%`;

/** Asal harga acuan komponen saat evaluasi pasca-survei. */
export type SumberHarga = "SURVEI" | "PUSTAKA" | "SURVEI_KOSONG";

/**
 * Harga acuan efektif komponen: komponen wajib survei memakai rata-rata survei toko;
 * komponen lain memakai harga yang ditetapkan saat mastering.
 */
export function hargaAcuanEfektif(r: { wajibSurveiToko: boolean; hargaAcuanSatuan: number; hargaSurvei: number[] }) {
  if (!r.wajibSurveiToko) return { harga: r.hargaAcuanSatuan, sumber: "PUSTAKA" as SumberHarga, stat: null };
  const stat = statistikSurvei(r.hargaSurvei);
  if (!stat) return { harga: r.hargaAcuanSatuan, sumber: "SURVEI_KOSONG" as SumberHarga, stat: null };
  return { harga: stat.rata, sumber: "SURVEI" as SumberHarga, stat };
}

/** Margin tersimpan per kategori (draft sebelumnya), atau margin awal tiket. */
export function marginTersimpan(
  rincian: { kategori: KategoriKoefisien; marginPersen: number }[],
  marginAwal: number
): MarginKategori {
  const ambil = (k: KategoriKoefisien) => rincian.find((r) => r.kategori === k)?.marginPersen ?? marginAwal;
  return { upah: ambil("UPAH"), material: ambil("MATERIAL"), bongkaran: ambil("BONGKARAN") };
}

/** Harga resmi yang berlaku saat ini untuk item & cabang/wilayah tiket (pembanding). */
export async function getHargaBerlaku(tiket: {
  masterItemId: string | null;
  cabangId: string;
  wilayahCabangId: string | null;
  cakupanHarga: string;
}) {
  if (!tiket.masterItemId) return null;
  const induk = await prisma.masterHargaCabang.findUnique({
    where: { masterItemId_cabangId: { masterItemId: tiket.masterItemId, cabangId: tiket.cabangId } },
    include: {
      masterHargaWilayah: tiket.wilayahCabangId
        ? { where: { wilayahCabangId: tiket.wilayahCabangId, statusHarga: "AKTIF" } }
        : false,
    },
  });
  if (!induk || induk.statusHarga !== "AKTIF") return null;
  const wilayah = tiket.cakupanHarga === "KHUSUS_WILAYAH" ? induk.masterHargaWilayah?.[0] : undefined;
  return {
    hargaInduk: induk.hargaFinalInduk.toNumber(),
    hargaWilayah: wilayah ? wilayah.hargaFinalWilayah.toNumber() : null,
    berlakuSejak: (wilayah?.berlakuSejak ?? induk.berlakuSejak).toISOString(),
  };
}

export interface SimpanEvaluasiParams {
  tiketId: string;
  userId: string;
  margin: MarginKategori;
  /** true: kirim rekomendasi harga ke Regional Manager (PENDING_REGIONAL_MGR). */
  teruskan: boolean;
  catatan?: string;
}

/**
 * Evaluasi pasca-survei S&B: harga acuan material dihitung ulang di server dari data
 * survei (bukan dari klien), margin per kategori diterapkan ke setiap baris rincian,
 * lalu harga rekomendasi disimpan di PengajuanHarga.hargaDitetapkanSNB.
 */
export async function simpanEvaluasiMargin({ tiketId, userId, margin, teruskan, catatan }: SimpanEvaluasiParams) {
  for (const [nama, v] of Object.entries(margin)) {
    if (!marginValid(v)) {
      throw new DomainError(`Margin ${nama} harus 0 sampai ${MARGIN_MAKS}% dengan kelipatan 0,5.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    await kunciTiket(tx, tiketId);
    const tiket = await tx.pengajuanHarga.findUnique({
      where: { id: tiketId },
      select: {
        status: true,
        rincianAHSP: {
          include: {
            masterKoefisien: { select: { wajibSurveiToko: true } },
            surveiTokoList: { select: { hargaSatuanSurvei: true } },
          },
        },
      },
    });
    if (!tiket) throw new DomainError("Tiket tidak ditemukan.", 404);
    if (tiket.status !== "PENDING_SB_SPECIALIST") {
      throw new DomainError("Evaluasi margin hanya dapat dilakukan saat tiket berstatus PENDING_SB_SPECIALIST.", 409);
    }
    if (tiket.rincianAHSP.length === 0) throw new DomainError("Tiket belum memiliki resep AHSP.", 409);

    const baris = tiket.rincianAHSP.map((r) => {
      const ef = hargaAcuanEfektif({
        wajibSurveiToko: r.masterKoefisien.wajibSurveiToko,
        hargaAcuanSatuan: r.hargaAcuanSatuan.toNumber(),
        hargaSurvei: r.surveiTokoList.map((s) => s.hargaSatuanSurvei.toNumber()),
      });
      return { r, ef, kategori: r.kategoriKomponen as KategoriKoefisien, koefisien: r.nilaiKoefisien.toNumber() };
    });

    const kosong = baris.filter((b) => b.ef.sumber === "SURVEI_KOSONG");
    if (kosong.length > 0) {
      throw new DomainError(
        `Data survei belum ada untuk: ${kosong.map((b) => b.r.namaKomponen).join(", ")}. Kembalikan untuk survei ulang.`,
        409
      );
    }

    const kalk = hitungAhsp(
      baris.map((b) => ({ kategori: b.kategori, koefisien: b.koefisien, hargaAcuan: b.ef.harga })),
      margin
    );
    if (kalk.hargaFinal <= 0) throw new DomainError("Harga rekomendasi tidak valid (Rp 0).", 409);

    for (const b of baris) {
      const m = marginUntuk(b.kategori, margin);
      await tx.rincianAhspPengajuan.update({
        where: { id: b.r.id },
        data: {
          hargaAcuanSatuan: b.ef.harga,
          marginPersen: m,
          subtotal: bulat2(b.koefisien * b.ef.harga * (1 + m / 100)),
        },
      });
    }

    // Rata-rata survei "material utama": komponen survei dengan kontribusi HPP terbesar.
    const utama = baris
      .filter((b) => b.ef.sumber === "SURVEI")
      .sort((a, b) => b.koefisien * b.ef.harga - a.koefisien * a.ef.harga)[0];

    await tx.pengajuanHarga.update({
      where: { id: tiketId },
      data: {
        rataRataSurveiMaterial: utama ? utama.ef.harga : null,
        marginSNBPersen: Math.min(kalk.marginEfektif, 999.99),
        hargaDitetapkanSNB: kalk.hargaFinal,
      },
    });

    const ringkas =
      `Harga rekomendasi Rp ${kalk.hargaFinal.toLocaleString("id-ID")} ` +
      `(HPP Rp ${Math.round(kalk.hpp).toLocaleString("id-ID")}, margin efektif ${kalk.marginEfektif.toLocaleString("id-ID")}%; ` +
      `upah ${persen(margin.upah)}, material ${persen(margin.material)}, bongkaran ${persen(margin.bongkaran)}).`;

    if (teruskan) {
      await ubahStatusTiket(tx, {
        tiketId,
        dariStatus: "PENDING_SB_SPECIALIST",
        keStatus: "PENDING_REGIONAL_MGR",
        userId,
        roleActor: "SB_SPECIALIST",
        aksi: "REKOMENDASI_HARGA_KE_REGIONAL",
        catatan: [catatan?.trim(), ringkas].filter(Boolean).join(" "),
      });
    } else {
      await tx.approvalAuditLog.create({
        data: { pengajuanHargaId: tiketId, userId, roleActor: "SB_SPECIALIST", action: "SIMPAN_DRAFT_MARGIN", catatan: ringkas },
      });
    }

    return { hargaFinal: kalk.hargaFinal, marginEfektif: kalk.marginEfektif, status: teruskan ? "PENDING_REGIONAL_MGR" : "PENDING_SB_SPECIALIST" };
  });
}

/** Keputusan pasca-survei selain rekomendasi: minta revisi (PERLU_REVISI) atau tolak (DITOLAK). */
export async function putuskanPascaSurvei(params: {
  tiketId: string;
  userId: string;
  keputusan: "REVISI" | "TOLAK";
  catatan: string;
}) {
  const catatan = params.catatan.trim();
  if (catatan.length < 5) throw new DomainError("Catatan wajib diisi (minimal 5 karakter).");
  return prisma.$transaction(async (tx) => {
    await kunciTiket(tx, params.tiketId);
    const tiket = await tx.pengajuanHarga.findUnique({ where: { id: params.tiketId }, select: { status: true } });
    if (!tiket) throw new DomainError("Tiket tidak ditemukan.", 404);
    if (tiket.status !== "PENDING_SB_SPECIALIST") {
      throw new DomainError("Keputusan ini hanya dapat diambil saat tiket berstatus PENDING_SB_SPECIALIST.", 409);
    }
    await ubahStatusTiket(tx, {
      tiketId: params.tiketId,
      dariStatus: "PENDING_SB_SPECIALIST",
      keStatus: params.keputusan === "REVISI" ? "PERLU_REVISI" : "DITOLAK",
      userId: params.userId,
      roleActor: "SB_SPECIALIST",
      aksi: params.keputusan === "REVISI" ? "KEMBALIKAN_REVISI_PASCA_SURVEI" : "TOLAK_PENGAJUAN",
      catatan,
    });
  });
}
