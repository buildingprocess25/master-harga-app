import prisma from "@/lib/prisma";
import { DomainError, kunciTiket, TX_OPTIONS, type Tx } from "@/lib/services/transisi-tiket";
import { canTransitionStatus } from "@/lib/services/state-machine";
import {
  susunRincianWilayahDariInduk,
  type BarisAhspWilayahTersusun,
  type InputHargaKomponenWilayah,
  type KomponenAhspIndukInput,
  type StoreSurveiWilayahInput,
} from "@/lib/wilayah-ahsp";
import { buatKodePaket } from "@/lib/utils";
import type { KategoriKoefisien } from "@/types";

const URUTAN_KAT: KategoriKoefisien[] = ["UPAH", "MATERIAL", "ALAT", "BONGKARAN"];

function sortKomponen<T extends { kategori: KategoriKoefisien; namaKomponen: string }>(list: T[]) {
  return [...list].sort((a, b) => {
    const rankA = URUTAN_KAT.indexOf(a.kategori);
    const rankB = URUTAN_KAT.indexOf(b.kategori);
    if (rankA !== rankB) return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
    return a.namaKomponen.localeCompare(b.namaKomponen, "id-ID");
  });
}

async function simpanRincianDanSurveiWilayah(
  tx: Tx,
  pengajuanHargaId: string,
  barisList: BarisAhspWilayahTersusun[]
) {
  for (const b of barisList) {
    const rincian = await tx.rincianAhspPengajuan.create({
      data: {
        pengajuanHargaId,
        masterKoefisienId: b.masterKoefisienId,
        namaKomponen: b.namaKomponen,
        kategoriKomponen: b.kategoriKomponen,
        satuan: b.satuan,
        nilaiKoefisien: b.nilaiKoefisien,
        hargaAcuanSatuan: b.hargaAcuanSatuan,
        marginPersen: b.marginPersen,
        subtotal: b.subtotal,
      },
      select: { id: true },
    });

    for (let i = 0; i < b.surveyToko.length; i++) {
      const s = b.surveyToko[i];
      const createdStore = await tx.surveiTokoItem.create({
        data: {
          rincianAhspId: rincian.id,
          urutanToko: s.noToko ?? i + 1,
          namaToko: s.namaToko.trim(),
          alamatToko: (s.alamatToko ?? s.alamat ?? "").trim(),
          volumeAcuan: Number(s.volumeAcuan) || 1,
          hargaSatuanSurvei: Number(s.hargaSatuan),
          tanggalSurvei: s.tanggalSurvei ? new Date(s.tanggalSurvei) : new Date(),
          catatanSurvei: (s.catatanSurvei ?? s.catatan ?? "").trim() || null,
        },
        select: { id: true },
      });

      const attachments =
        Array.isArray(s.lampiranList) && s.lampiranList.length > 0
          ? s.lampiranList
          : s.buktiSurveiUrl
            ? [
                {
                  jenisLampiran: "NOTA_PEMBELIAN",
                  namaFile: s.buktiSurveiName || `nota_toko_${i + 1}.jpg`,
                  fileUrl: s.buktiSurveiUrl,
                  ukuranFile: "Valid Geo-Tag",
                },
              ]
            : [];

      for (const att of attachments) {
        const fileUrl = att.url || att.fileUrl;
        if (!fileUrl) continue;
        await tx.lampiranSurvei.create({
          data: {
            surveiTokoId: createdStore.id,
            jenisLampiran: att.jenisLampiran || att.tipe || "NOTA_PEMBELIAN",
            namaFile: att.namaFile || `lampiran_toko_${i + 1}.jpg`,
            fileUrl,
            ukuranFile: att.ukuranFile || "Valid Geo-Tag",
          },
        });
      }
    }
  }
}

/**
 * Mengambil template AHSP dari harga induk cabang beserta daftar wilayah dan
 * master toko cabang untuk pengajuan harga wilayah oleh B&M Manager.
 */
export async function getTemplatePengajuanWilayah(params: {
  masterItemId: string;
  cabangId: string;
  divisiId: string;
  tiketRevisiId?: string | null;
}) {
  const induk = await prisma.masterHargaCabang.findUnique({
    where: {
      masterItemId_cabangId_divisiId: {
        masterItemId: params.masterItemId,
        cabangId: params.cabangId,
        divisiId: params.divisiId,
      },
    },
    include: {
      masterItem: true,
      cabang: { select: { id: true, kodeCabang: true, namaCabang: true } },
      divisi: { select: { id: true, kodeDivisi: true, namaDivisi: true } },
      masterHargaWilayah: {
        where: { statusHarga: "AKTIF" },
        select: {
          wilayahCabangId: true,
          hargaFinalWilayah: true,
          pengajuanTerakhir: { select: { nomorTiket: true } },
        },
      },
      pengajuanTerakhir: {
        select: {
          id: true,
          nomorTiket: true,
          marginAwalPersen: true,
          rincianAHSP: {
            select: {
              id: true,
              masterKoefisienId: true,
              kategoriKomponen: true,
              namaKomponen: true,
              satuan: true,
              nilaiKoefisien: true,
              hargaAcuanSatuan: true,
              marginPersen: true,
            },
          },
        },
      },
    },
  });

  if (!induk || induk.statusHarga !== "AKTIF") {
    throw new DomainError(
      "Harga induk cabang untuk item dan divisi ini belum aktif.",
      400
    );
  }

  const [wilayahRows, masterTokoList, tiketBerjalanRows, revisiTiket] = await Promise.all([
    prisma.wilayahCabang.findMany({
      where: { cabangId: params.cabangId, isActive: true },
      orderBy: { namaWilayah: "asc" },
      select: { id: true, kodeWilayah: true, namaWilayah: true },
    }),
    prisma.masterToko.findMany({
      where: { cabangId: params.cabangId, isActive: true },
      orderBy: { namaToko: "asc" },
      select: { id: true, namaToko: true, alamat: true },
    }),
    prisma.pengajuanHarga.findMany({
      where: {
        cabangId: params.cabangId,
        divisiId: params.divisiId,
        masterItemId: params.masterItemId,
        cakupanHarga: "KHUSUS_WILAYAH",
        wilayahCabangId: { not: null },
        status: { notIn: ["DITOLAK", "RELEASED"] },
        ...(params.tiketRevisiId ? { id: { not: params.tiketRevisiId } } : {}),
      },
      select: { id: true, nomorTiket: true, status: true, wilayahCabangId: true },
    }),
    params.tiketRevisiId
      ? prisma.pengajuanHarga.findUnique({
          where: { id: params.tiketRevisiId },
          include: {
            rincianAHSP: {
              select: {
                masterKoefisienId: true,
                hargaAcuanSatuan: true,
                surveiTokoList: {
                  orderBy: { urutanToko: "asc" },
                  include: { lampiranList: true },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const activePriceMap = new Map(
    induk.masterHargaWilayah.map((w) => [
      w.wilayahCabangId,
      {
        hargaAktif: w.hargaFinalWilayah.toNumber(),
        nomorTiket: w.pengajuanTerakhir?.nomorTiket ?? null,
      },
    ])
  );
  const inFlightMap = new Map(
    tiketBerjalanRows.map((t) => [t.wilayahCabangId as string, t])
  );

  const revisiSurveiMap = new Map<string, StoreSurveiWilayahInput[]>(
    (revisiTiket?.rincianAHSP ?? []).map((r) => [
      r.masterKoefisienId,
      r.surveiTokoList.map((s) => ({
        noToko: s.urutanToko,
        namaToko: s.namaToko,
        alamatToko: s.alamatToko || "",
        volumeAcuan: s.volumeAcuan.toNumber(),
        hargaSatuan: s.hargaSatuanSurvei.toNumber(),
        tanggalSurvei: s.tanggalSurvei.toISOString().slice(0, 10),
        catatanSurvei: s.catatanSurvei || "",
        lampiranList: s.lampiranList.map((l) => ({
          tipe: l.jenisLampiran,
          jenisLampiran: l.jenisLampiran,
          namaFile: l.namaFile,
          url: l.fileUrl,
          fileUrl: l.fileUrl,
          ukuranFile: l.ukuranFile || "Valid Geo-Tag",
        })),
      })),
    ])
  );

  const rawRincian = induk.pengajuanTerakhir?.rincianAHSP ?? [];
  const komponenInduk = sortKomponen(
    rawRincian.map((r) => ({
      id: r.id,
      masterKoefisienId: r.masterKoefisienId,
      kategori: r.kategoriKomponen as KategoriKoefisien,
      namaKomponen: r.namaKomponen,
      satuan: r.satuan,
      nilaiKoefisien: r.nilaiKoefisien.toNumber(),
      hargaAcuanSatuan: r.hargaAcuanSatuan.toNumber(),
      marginPersen: r.marginPersen.toNumber(),
      surveiTokoAwal: revisiSurveiMap.get(r.masterKoefisienId) ?? [],
    }))
  );

  return {
    item: {
      id: induk.masterItem.id,
      kodeItem: induk.masterItem.kodeItem,
      kodeMaster: induk.masterItem.kodeMaster,
      namaItem: induk.masterItem.namaItem,
      kategori: induk.masterItem.kategori,
      satuan: induk.masterItem.satuan,
      spesifikasi: [
        induk.masterItem.jenisCor,
        induk.masterItem.merk,
        induk.masterItem.ukuran,
        induk.masterItem.tipe,
        induk.masterItem.warna,
      ]
        .filter(Boolean)
        .join(", "),
    },
    cabang: induk.cabang,
    divisi: induk.divisi,
    hargaFinalInduk: induk.hargaFinalInduk.toNumber(),
    marginTotalPersen: induk.marginTotalPersen.toNumber(),
    nomorTiketInduk: induk.pengajuanTerakhir?.nomorTiket ?? null,
    komponenInduk,
    masterTokoList,
    wilayahOpsi: wilayahRows.map((w) => {
      const aktif = activePriceMap.get(w.id);
      const proses = inFlightMap.get(w.id);
      return {
        id: w.id,
        kodeWilayah: w.kodeWilayah,
        namaWilayah: w.namaWilayah,
        hargaAktifSekarang: aktif?.hargaAktif ?? null,
        tiketAktifNomor: aktif?.nomorTiket ?? null,
        sedangDiproses: Boolean(proses),
        tiketProsesNomor: proses?.nomorTiket ?? null,
      };
    }),
    revisi: revisiTiket
      ? {
          id: revisiTiket.id,
          nomorTiket: revisiTiket.nomorTiket,
          wilayahCabangId: revisiTiket.wilayahCabangId ?? "",
          catatanReview: revisiTiket.catatanReview ?? "",
        }
      : null,
  };
}

export interface AjukanHargaWilayahParams {
  masterItemId: string;
  cabangId: string;
  divisiId: string;
  wilayahCabangId: string;
  hargaKomponen: InputHargaKomponenWilayah[];
  alasan?: string;
  pembuatUserId: string;
  tiketRevisiId?: string | null;
}

/**
 * Mengajukan harga wilayah oleh B&M Manager (atau mengirim revisi tiket wilayah)
 * dengan input survei 3 toko langsung untuk komponen Bahan & Peralatan, lalu
 * melompat ke status Approval S&B Specialist (PENDING_SB_SPECIALIST).
 */
export async function ajukanHargaWilayahLangsung(params: AjukanHargaWilayahParams) {
  if (!params.wilayahCabangId) {
    throw new DomainError("Silakan pilih 1 wilayah terlebih dahulu.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const [induk, wilayah, duplikatProses] = await Promise.all([
      tx.masterHargaCabang.findUnique({
        where: {
          masterItemId_cabangId_divisiId: {
            masterItemId: params.masterItemId,
            cabangId: params.cabangId,
            divisiId: params.divisiId,
          },
        },
        include: {
          cabang: { select: { kodeCabang: true, namaCabang: true } },
          pengajuanTerakhir: {
            select: {
              id: true,
              marginAwalPersen: true,
              rincianAHSP: {
                select: {
                  id: true,
                  masterKoefisienId: true,
                  kategoriKomponen: true,
                  namaKomponen: true,
                  satuan: true,
                  nilaiKoefisien: true,
                  hargaAcuanSatuan: true,
                  marginPersen: true,
                },
              },
            },
          },
        },
      }),
      tx.wilayahCabang.findUnique({
        where: { id: params.wilayahCabangId },
        select: { id: true, cabangId: true, namaWilayah: true, isActive: true },
      }),
      tx.pengajuanHarga.findFirst({
        where: {
          cabangId: params.cabangId,
          divisiId: params.divisiId,
          masterItemId: params.masterItemId,
          cakupanHarga: "KHUSUS_WILAYAH",
          wilayahCabangId: params.wilayahCabangId,
          status: { notIn: ["DITOLAK", "RELEASED"] },
          ...(params.tiketRevisiId ? { id: { not: params.tiketRevisiId } } : {}),
        },
        select: { id: true, nomorTiket: true },
      }),
    ]);

    if (!induk || induk.statusHarga !== "AKTIF") {
      throw new DomainError("Harga induk cabang untuk item dan divisi ini belum aktif.", 400);
    }
    if (!wilayah || !wilayah.isActive || wilayah.cabangId !== params.cabangId) {
      throw new DomainError("Wilayah yang dipilih tidak valid untuk cabang ini.", 400);
    }
    if (duplikatProses) {
      throw new DomainError(
        `Sudah ada pengajuan yang sedang diproses untuk ${wilayah.namaWilayah} (${duplikatProses.nomorTiket}).`,
        409
      );
    }

    const komponenInduk: KomponenAhspIndukInput[] = (
      induk.pengajuanTerakhir?.rincianAHSP ?? []
    ).map((r) => ({
      id: r.id,
      masterKoefisienId: r.masterKoefisienId,
      kategori: r.kategoriKomponen as KategoriKoefisien,
      namaKomponen: r.namaKomponen,
      satuan: r.satuan,
      nilaiKoefisien: r.nilaiKoefisien.toNumber(),
      hargaAcuanSatuan: r.hargaAcuanSatuan.toNumber(),
      marginPersen: r.marginPersen.toNumber(),
    }));

    let susunan;
    try {
      susunan = susunRincianWilayahDariInduk(
        komponenInduk,
        params.hargaKomponen,
        induk.marginTotalPersen.toNumber()
      );
    } catch (err: any) {
      throw new DomainError(err?.message || "Data komponen wilayah tidak valid.", 400);
    }

    const catatanTrim = (params.alasan || "").trim();
    const ringkasAudit =
      `Pengajuan harga wilayah ${wilayah.namaWilayah}: Rp ${susunan.hargaFinal.toLocaleString("id-ID")} ` +
      `(HPP Rp ${Math.round(susunan.hpp).toLocaleString("id-ID")}).` +
      (catatanTrim ? ` Alasan: ${catatanTrim}` : "");

    if (params.tiketRevisiId) {
      await kunciTiket(tx, params.tiketRevisiId);
      const existing = await tx.pengajuanHarga.findUnique({
        where: { id: params.tiketRevisiId },
        select: { id: true, nomorTiket: true, status: true, cabangId: true, cakupanHarga: true },
      });
      if (!existing) throw new DomainError("Tiket revisi tidak ditemukan.", 404);
      if (existing.cabangId !== params.cabangId || existing.cakupanHarga !== "KHUSUS_WILAYAH") {
        throw new DomainError("Tiket bukan pengajuan wilayah milik cabang ini.", 403);
      }
      if (!canTransitionStatus(existing.status as any, "PENDING_SB_SPECIALIST")) {
        throw new DomainError("Tiket tidak dalam status revisi untuk dikirim ke Approval S&B.", 409);
      }

      await tx.rincianAhspPengajuan.deleteMany({
        where: { pengajuanHargaId: existing.id },
      });

      const updated = await tx.pengajuanHarga.update({
        where: { id: existing.id },
        data: {
          status: "PENDING_SB_SPECIALIST",
          wilayahCabangId: wilayah.id,
          rataRataSurveiMaterial: susunan.rataRataSurveiMaterial,
          hargaDitetapkanSNB: susunan.hargaFinal,
          marginSNBPersen: Math.min(susunan.marginEfektif, 999.99),
          catatanReview: catatanTrim || null,
        },
        select: { id: true, nomorTiket: true, status: true },
      });

      await simpanRincianDanSurveiWilayah(tx, existing.id, susunan.baris);

      await tx.approvalAuditLog.create({
        data: {
          pengajuanHargaId: existing.id,
          userId: params.pembuatUserId,
          roleActor: "BM_MANAGER",
          action: "REVISI_HARGA_WILAYAH",
          catatan: ringkasAudit,
        },
      });

      return { ...updated, hargaFinal: susunan.hargaFinal, namaWilayah: wilayah.namaWilayah };
    }

    const currentYear = new Date().getFullYear();
    let seq = (await tx.pengajuanHarga.count()) + 1;
    let nomorTiket = `REQ-${currentYear}-${String(seq).padStart(3, "0")}`;
    const conflict = await tx.pengajuanHarga.findUnique({
      where: { nomorTiket },
      select: { id: true },
    });
    if (conflict) {
      seq++;
      nomorTiket = `REQ-${currentYear}-${String(seq).padStart(3, "0")}-${Math.floor(10 + Math.random() * 90)}`;
    }

    const created = await tx.pengajuanHarga.create({
      data: {
        nomorTiket,
        kodePaket: buatKodePaket(induk.cabang.kodeCabang, new Date()),
        divisiId: params.divisiId,
        cabangId: params.cabangId,
        wilayahCabangId: wilayah.id,
        masterItemId: params.masterItemId,
        pembuatUserId: params.pembuatUserId,
        cakupanHarga: "KHUSUS_WILAYAH",
        status: "PENDING_SB_SPECIALIST",
        rataRataSurveiMaterial: susunan.rataRataSurveiMaterial,
        marginAwalPersen: induk.marginTotalPersen,
        marginSNBPersen: Math.min(susunan.marginEfektif, 999.99),
        hargaDitetapkanSNB: susunan.hargaFinal,
        catatanReview: catatanTrim || null,
      },
      select: { id: true, nomorTiket: true, status: true },
    });

    await simpanRincianDanSurveiWilayah(tx, created.id, susunan.baris);

    await tx.approvalAuditLog.create({
      data: {
        pengajuanHargaId: created.id,
        userId: params.pembuatUserId,
        roleActor: "BM_MANAGER",
        action: "AJUKAN_HARGA_WILAYAH",
        catatan: ringkasAudit,
      },
    });

    return { ...created, hargaFinal: susunan.hargaFinal, namaWilayah: wilayah.namaWilayah };
  }, TX_OPTIONS);
}
