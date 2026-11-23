import prisma from "@/lib/prisma";
import { DomainError, TX_OPTIONS } from "@/lib/services/transisi-tiket";
import {
  buatNomorTiketUnik,
  simpanRincianDanSurveiWilayah,
  sortKomponen,
} from "@/lib/services/wilayah-pengajuan-service";
import {
  susunRincianWilayahDariInduk,
  type InputHargaKomponenWilayah,
  type KomponenAhspIndukInput,
  type StoreSurveiWilayahInput,
} from "@/lib/wilayah-ahsp";
import { buatKodePaket } from "@/lib/utils";
import type { KategoriKoefisien } from "@/types";

export interface ReviewKomponenHargaInput extends InputHargaKomponenWilayah {
  namaKomponen?: string;
  kategori?: string;
}

export interface ReviewItemSubmissionPayload {
  masterItemId: string;
  divisiIds: string[];
  alasanReview?: string;
  hargaKomponen: ReviewKomponenHargaInput[];
}

const URUTAN_DIVISI_RESMI = ["DIV-BLD", "DIV-MNT", "DIV-ENG", "DIV-DC"];

/**
 * Mengambil seluruh item katalog yang sudah AKTIF di cabang B&M Manager
 * beserta divisi aktifnya, tiket berjalan (agar divisi tersebut dikunci),
 * resep AHSP + survei 3 toko terakhir untuk pre-fill, serta daftar master toko cabang.
 */
export async function getKatalogAktifUntukReview(cabangId: string) {
  const [cabang, divisiRaw, masterTokoList, hargaAktifRows, tiketBerjalanRows] =
    await Promise.all([
      prisma.cabang.findUnique({
        where: { id: cabangId },
        select: { id: true, kodeCabang: true, namaCabang: true },
      }),
      prisma.divisi.findMany({
        where: { isActive: true, kodeDivisi: { in: URUTAN_DIVISI_RESMI } },
        select: { id: true, kodeDivisi: true, namaDivisi: true },
      }),
      prisma.masterToko.findMany({
        where: { cabangId, isActive: true },
        orderBy: { namaToko: "asc" },
        select: { id: true, namaToko: true, alamat: true },
      }),
      prisma.masterHargaCabang.findMany({
        where: { cabangId, statusHarga: "AKTIF" },
        include: {
          divisi: { select: { id: true, kodeDivisi: true, namaDivisi: true } },
          masterItem: true,
          pengajuanTerakhir: {
            select: {
              id: true,
              nomorTiket: true,
              isTermasukBongkaran: true,
              marginAwalPersen: true,
              rincianAHSP: {
                include: {
                  surveiTokoList: {
                    orderBy: { urutanToko: "asc" },
                    include: { lampiranList: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ masterItem: { namaItem: "asc" } }],
      }),
      prisma.pengajuanHarga.findMany({
        where: {
          cabangId,
          cakupanHarga: "INDUK_CABANG",
          status: { notIn: ["DITOLAK", "RELEASED"] },
        },
        select: {
          id: true,
          nomorTiket: true,
          masterItemId: true,
          divisiId: true,
          status: true,
        },
      }),
    ]);

  const divisiList = [...divisiRaw].sort(
    (a, b) =>
      URUTAN_DIVISI_RESMI.indexOf(a.kodeDivisi.toUpperCase()) -
      URUTAN_DIVISI_RESMI.indexOf(b.kodeDivisi.toUpperCase())
  );

  const inFlightMap = new Map<string, { nomorTiket: string; status: string }>();
  for (const t of tiketBerjalanRows) {
    if (t.masterItemId) {
      inFlightMap.set(`${t.masterItemId}:${t.divisiId}`, {
        nomorTiket: t.nomorTiket,
        status: t.status,
      });
    }
  }

  const itemMap = new Map<
    string,
    {
      masterItem: (typeof hargaAktifRows)[number]["masterItem"];
      activeDivisions: Array<{
        divisiId: string;
        kodeDivisi: string;
        namaDivisi: string;
        hargaFinalInduk: number;
        marginTotalPersen: number;
        isTermasukBongkaran: boolean;
        nomorTiketInduk: string | null;
        inProgressTiketNomor: string | null;
        komponenInduk: Array<{
          id: string;
          masterKoefisienId: string;
          kategori: KategoriKoefisien;
          namaKomponen: string;
          satuan: string;
          nilaiKoefisien: number;
          hargaAcuanSatuan: number;
          marginPersen: number;
          surveiTokoAwal: StoreSurveiWilayahInput[];
        }>;
      }>;
    }
  >();

  for (const row of hargaAktifRows) {
    let entry = itemMap.get(row.masterItemId);
    if (!entry) {
      entry = { masterItem: row.masterItem, activeDivisions: [] };
      itemMap.set(row.masterItemId, entry);
    }

    const inFlight = inFlightMap.get(`${row.masterItemId}:${row.divisiId}`);
    const komponenInduk = sortKomponen(
      (row.pengajuanTerakhir?.rincianAHSP ?? []).map((r) => ({
        id: r.id,
        masterKoefisienId: r.masterKoefisienId,
        kategori: r.kategoriKomponen as KategoriKoefisien,
        namaKomponen: r.namaKomponen,
        satuan: r.satuan,
        nilaiKoefisien: r.nilaiKoefisien.toNumber(),
        hargaAcuanSatuan: r.hargaAcuanSatuan.toNumber(),
        marginPersen: r.marginPersen.toNumber(),
        surveiTokoAwal: r.surveiTokoList.map((s) => ({
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
      }))
    );

    entry.activeDivisions.push({
      divisiId: row.divisiId,
      kodeDivisi: row.divisi.kodeDivisi,
      namaDivisi: row.divisi.namaDivisi,
      hargaFinalInduk: row.hargaFinalInduk.toNumber(),
      marginTotalPersen: row.marginTotalPersen.toNumber(),
      isTermasukBongkaran: Boolean(row.pengajuanTerakhir?.isTermasukBongkaran),
      nomorTiketInduk: row.pengajuanTerakhir?.nomorTiket ?? null,
      inProgressTiketNomor: inFlight?.nomorTiket ?? null,
      komponenInduk,
    });
  }

  const catalogItems = Array.from(itemMap.values()).map(({ masterItem, activeDivisions }) => {
    const sortedDivs = [...activeDivisions].sort(
      (a, b) =>
        URUTAN_DIVISI_RESMI.indexOf(a.kodeDivisi.toUpperCase()) -
        URUTAN_DIVISI_RESMI.indexOf(b.kodeDivisi.toUpperCase())
    );
    const activeDivisiIds = sortedDivs.map((d) => d.divisiId);
    const activeDivisiCodes = sortedDivs.map((d) => d.kodeDivisi);
    const inProgressDivisions = sortedDivs.filter((d) => Boolean(d.inProgressTiketNomor));
    const inProgressDivisiIds = inProgressDivisions.map((d) => d.divisiId);
    const inProgressDivisiCodes = inProgressDivisions.map((d) => d.kodeDivisi);
    const selectableDivs = sortedDivs.filter((d) => !d.inProgressTiketNomor);
    const primaryDiv = selectableDivs[0] ?? sortedDivs[0];

    return {
      masterItemId: masterItem.id,
      kelompokKode: (masterItem.kodeItem.toUpperCase().startsWith("ME-") ? "ME" : "SIP") as
        | "SIP"
        | "ME",
      kodeItem: masterItem.kodeItem,
      kodeMaster: masterItem.kodeMaster,
      namaItem: masterItem.namaItem,
      kategori: masterItem.kategori,
      jenisCor: masterItem.jenisCor ?? "",
      ukuran: masterItem.ukuran,
      merk: masterItem.merk,
      tipe: masterItem.tipe ?? "",
      warna: masterItem.warna ?? "",
      permukaan: masterItem.permukaan ?? "",
      tebal: masterItem.tebal ?? "",
      toleransi: masterItem.toleransi ?? "",
      lokasi: masterItem.lokasi,
      satuan: masterItem.satuan,
      deskripsiOtomatis: masterItem.deskripsiOtomatis,
      isTermasukBongkaran: primaryDiv?.isTermasukBongkaran ?? false,
      activeDivisiIds,
      activeDivisiCodes,
      inProgressDivisiIds,
      inProgressDivisiCodes,
      activeDivisions: sortedDivs,
    };
  });

  return {
    cabang,
    divisiList,
    masterTokoList,
    catalogItems,
  };
}

function selaraskanHargaInputKeDivisi(
  komponenDivisi: KomponenAhspIndukInput[],
  hargaInput: ReviewKomponenHargaInput[]
): InputHargaKomponenWilayah[] {
  const byExactId = new Map<string, ReviewKomponenHargaInput>();
  const byName = new Map<string, ReviewKomponenHargaInput>();

  for (const h of hargaInput) {
    if (h.rincianId) byExactId.set(h.rincianId, h);
    if (h.masterKoefisienId) byExactId.set(h.masterKoefisienId, h);
    if (h.namaKomponen) {
      byName.set(
        `${(h.kategori || "").toUpperCase()}::${h.namaKomponen.trim().toLowerCase()}`,
        h
      );
    }
  }

  return komponenDivisi.map((k) => {
    const matched =
      byExactId.get(k.id) ||
      byExactId.get(k.masterKoefisienId) ||
      byName.get(`${k.kategori.toUpperCase()}::${k.namaKomponen.trim().toLowerCase()}`);
    return {
      rincianId: k.id,
      masterKoefisienId: k.masterKoefisienId,
      surveyToko: matched?.surveyToko ?? [],
    };
  });
}

/**
 * Mengajukan review ulang spesifikasi/harga massal oleh B&M Manager dengan input
 * survei 3 toko langsung untuk divisi yang sudah aktif, lalu melompat ke status
 * Approval S&B Specialist (PENDING_SB_SPECIALIST).
 */
export async function ajukanReviewUlangMassal(params: {
  cabangId: string;
  pembuatUserId: string;
  items: ReviewItemSubmissionPayload[];
}) {
  if (!Array.isArray(params.items) || params.items.length === 0) {
    throw new DomainError("Daftar pengajuan review tidak boleh kosong.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const createdTickets: Array<{
      id: string;
      nomorTiket: string;
      divisiId: string;
      namaItem: string;
      hargaFinal: number;
    }> = [];

    let ticketOffset = 0;

    for (const row of params.items) {
      if (!row.masterItemId || !Array.isArray(row.divisiIds) || row.divisiIds.length === 0) {
        throw new DomainError("Setiap baris review wajib memilih item dan minimal 1 divisi aktif.", 400);
      }

      const uniqueDivisiIds = Array.from(new Set(row.divisiIds));

      for (const divisiId of uniqueDivisiIds) {
        const [induk, duplikatProses] = await Promise.all([
          tx.masterHargaCabang.findUnique({
            where: {
              masterItemId_cabangId_divisiId: {
                masterItemId: row.masterItemId,
                cabangId: params.cabangId,
                divisiId,
              },
            },
            include: {
              cabang: { select: { kodeCabang: true } },
              divisi: { select: { namaDivisi: true } },
              masterItem: { select: { namaItem: true } },
              pengajuanTerakhir: {
                select: {
                  isTermasukBongkaran: true,
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
          tx.pengajuanHarga.findFirst({
            where: {
              cabangId: params.cabangId,
              divisiId,
              masterItemId: row.masterItemId,
              cakupanHarga: "INDUK_CABANG",
              status: { notIn: ["DITOLAK", "RELEASED"] },
            },
            select: { nomorTiket: true },
          }),
        ]);

        if (!induk || induk.statusHarga !== "AKTIF") {
          throw new DomainError(
            `Item "${induk?.masterItem.namaItem || row.masterItemId}" belum aktif di divisi tujuan.`,
            400
          );
        }
        if (duplikatProses) {
          throw new DomainError(
            `Item "${induk.masterItem.namaItem}" (${induk.divisi.namaDivisi}) sudah memiliki pengajuan berjalan (${duplikatProses.nomorTiket}).`,
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

        const inputDiselaraskan = selaraskanHargaInputKeDivisi(
          komponenInduk,
          row.hargaKomponen || []
        );

        let susunan;
        try {
          susunan = susunRincianWilayahDariInduk(
            komponenInduk,
            inputDiselaraskan,
            induk.marginTotalPersen.toNumber()
          );
        } catch (err: any) {
          throw new DomainError(
            err?.message || `Data survei untuk "${induk.masterItem.namaItem}" tidak valid.`,
            400
          );
        }

        const alasanTrim = (row.alasanReview || "").trim();
        const nomorTiket = await buatNomorTiketUnik(tx, ticketOffset++);

        const created = await tx.pengajuanHarga.create({
          data: {
            nomorTiket,
            kodePaket: buatKodePaket(induk.cabang.kodeCabang, new Date()),
            divisiId,
            cabangId: params.cabangId,
            wilayahCabangId: null,
            masterItemId: row.masterItemId,
            pembuatUserId: params.pembuatUserId,
            cakupanHarga: "INDUK_CABANG",
            status: "PENDING_SB_SPECIALIST",
            isTermasukBongkaran: Boolean(induk.pengajuanTerakhir?.isTermasukBongkaran),
            rataRataSurveiMaterial: susunan.rataRataSurveiMaterial,
            marginAwalPersen: induk.marginTotalPersen,
            marginSNBPersen: Math.min(susunan.marginEfektif, 999.99),
            hargaDitetapkanSNB: susunan.hargaFinal,
            catatanReview: alasanTrim || null,
          },
          select: { id: true, nomorTiket: true },
        });

        await simpanRincianDanSurveiWilayah(tx, created.id, susunan.baris);

        await tx.approvalAuditLog.create({
          data: {
            pengajuanHargaId: created.id,
            userId: params.pembuatUserId,
            roleActor: "BM_MANAGER",
            action: "REVIEW_ULANG_SPESIFIKASI",
            catatan:
              `Review ulang ${induk.masterItem.namaItem} (${induk.divisi.namaDivisi}): ` +
              `Rp ${susunan.hargaFinal.toLocaleString("id-ID")} (HPP Rp ${Math.round(susunan.hpp).toLocaleString("id-ID")}).` +
              (alasanTrim ? ` Alasan: ${alasanTrim}` : ""),
          },
        });

        createdTickets.push({
          id: created.id,
          nomorTiket: created.nomorTiket,
          divisiId,
          namaItem: induk.masterItem.namaItem,
          hargaFinal: susunan.hargaFinal,
        });
      }
    }

    return createdTickets;
  }, TX_OPTIONS);
}
