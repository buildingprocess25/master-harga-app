import prisma from "@/lib/prisma";
import { UKURAN_HALAMAN_KATALOG, type FilterKatalog } from "@/lib/services/master-harga-service";
import { DomainError, TX_OPTIONS, type Tx } from "@/lib/services/transisi-tiket";
import { buatNomorTiketUnik } from "@/lib/services/wilayah-pengajuan-service";
import {
  evaluasiSurveiNovember,
  getInfoPeriodeSurveiNovember,
} from "@/lib/survei-tahunan";
import { buatKodePaket } from "@/lib/utils";

export interface SlotSurveiUlangItem {
  slotKey: string;
  cakupanHarga: "INDUK_CABANG" | "KHUSUS_WILAYAH";
  masterHargaCabangId: string;
  masterHargaWilayahId: string | null;
  masterItemId: string;
  kelompokKode: "SIP" | "ME";
  kodeItem: string;
  kodeMaster: string;
  namaItem: string;
  spesifikasi: string;
  kategori: string;
  satuan: string;
  divisiId: string;
  kodeDivisi: string;
  namaDivisi: string;
  wilayahCabangId: string | null;
  namaWilayah: string | null;
  hargaAktif: number;
  berlakuSejak: string;
  nomorTiketTerakhir: string | null;
  tahunPeriode: number;
  umurHari: number;
  labelUmur: string;
  sedangDiproses: boolean;
  nomorTiketProses: string | null;
  statusTiketProses: string | null;
}

export interface HasilDaftarSurveiUlang {
  rows: SlotSurveiUlangItem[];
  isPeriodeNovember: boolean;
  tahunPeriode: number;
  labelPeriodeBerikutnya: string;
  totalItems: number;
  totalPerluSurveiTanpaProses: number;
  totalWajibSurvei: number;
  totalSedangDiproses: number;
  halaman: number;
  jumlahHalaman: number;
}

export interface SlotSurveiUlangInput {
  cakupanHarga: "INDUK_CABANG" | "KHUSUS_WILAYAH";
  masterHargaCabangId: string;
  masterHargaWilayahId?: string | null;
}

function cocokFilterSlot(slot: SlotSurveiUlangItem, filter: FilterKatalog): boolean {
  if (filter.divisiId && slot.divisiId !== filter.divisiId) return false;
  if (filter.kategori && slot.kategori !== filter.kategori) return false;
  if (filter.kelompok && slot.kelompokKode !== filter.kelompok) return false;

  if (filter.q) {
    const q = filter.q.trim().toLowerCase();
    const cocokText =
      slot.namaItem.toLowerCase().includes(q) ||
      slot.kodeItem.toLowerCase().includes(q) ||
      slot.kodeMaster.toLowerCase().includes(q) ||
      slot.spesifikasi.toLowerCase().includes(q) ||
      (slot.namaWilayah && slot.namaWilayah.toLowerCase().includes(q));
    if (!cocokText) return false;
  }

  return true;
}

/**
 * Mengambil daftar slot harga aktif cabang (Induk Cabang & Khusus Wilayah) yang wajib disurvei ulang
 * pada periode November (semua slot aktif dengan `berlakuSejak` sebelum 1 November tahun berjalan).
 * Di luar bulan November, mengembalikan daftar & badge 0 beserta info jadwal November berikutnya.
 */
export async function getDaftarSurveiUlangCabang(
  cabangId: string,
  filter: FilterKatalog = {},
  page = 1,
  sekarang: Date = new Date()
): Promise<HasilDaftarSurveiUlang> {
  const infoPeriode = getInfoPeriodeSurveiNovember(sekarang);

  if (!infoPeriode.aktif) {
    return {
      rows: [],
      isPeriodeNovember: false,
      tahunPeriode: infoPeriode.tahun,
      labelPeriodeBerikutnya: infoPeriode.labelPeriodeBerikutnya,
      totalItems: 0,
      totalPerluSurveiTanpaProses: 0,
      totalWajibSurvei: 0,
      totalSedangDiproses: 0,
      halaman: 1,
      jumlahHalaman: 1,
    };
  }

  const [cabangRows, inFlightTickets] = await Promise.all([
    prisma.masterHargaCabang.findMany({
      where: { cabangId, statusHarga: "AKTIF" },
      include: {
        masterItem: true,
        divisi: { select: { id: true, kodeDivisi: true, namaDivisi: true } },
        pengajuanTerakhir: { select: { nomorTiket: true } },
        masterHargaWilayah: {
          where: { statusHarga: "AKTIF" },
          include: {
            wilayahCabang: { select: { id: true, kodeWilayah: true, namaWilayah: true } },
            pengajuanTerakhir: { select: { nomorTiket: true } },
          },
        },
      },
    }),
    prisma.pengajuanHarga.findMany({
      where: {
        cabangId,
        status: { notIn: ["DITOLAK", "RELEASED"] },
      },
      select: {
        nomorTiket: true,
        status: true,
        masterItemId: true,
        divisiId: true,
        cakupanHarga: true,
        wilayahCabangId: true,
      },
    }),
  ]);

  const inFlightMap = new Map<string, { nomorTiket: string; status: string }>();
  for (const t of inFlightTickets) {
    if (!t.masterItemId) continue;
    const key = `${t.masterItemId}:${t.divisiId}:${t.cakupanHarga}:${t.wilayahCabangId ?? "INDUK"}`;
    if (!inFlightMap.has(key)) {
      inFlightMap.set(key, { nomorTiket: t.nomorTiket, status: t.status });
    }
  }

  const semuaSlot: SlotSurveiUlangItem[] = [];

  const pushIfDue = (params: {
    cakupanHarga: "INDUK_CABANG" | "KHUSUS_WILAYAH";
    masterHargaCabangId: string;
    masterHargaWilayahId: string | null;
    cabangRow: (typeof cabangRows)[number];
    wilayahCabangId: string | null;
    namaWilayah: string | null;
    hargaAktif: number;
    berlakuSejak: Date;
    nomorTiketTerakhir: string | null;
  }) => {
    const evalNov = evaluasiSurveiNovember(params.berlakuSejak, sekarang);
    if (!evalNov.perluSurveiUlang) return;

    const m = params.cabangRow.masterItem;
    const spesifikasi = [m.jenisCor, m.merk, m.ukuran, m.tipe, m.warna]
      .filter(Boolean)
      .join(", ");
    const kelompokKode: "SIP" | "ME" = m.kodeItem.toUpperCase().startsWith("ME-") ? "ME" : "SIP";

    const processKey = `${m.id}:${params.cabangRow.divisiId}:${params.cakupanHarga}:${
      params.wilayahCabangId ?? "INDUK"
    }`;
    const activeTicket = inFlightMap.get(processKey);

    semuaSlot.push({
      slotKey:
        params.cakupanHarga === "INDUK_CABANG"
          ? `INDUK:${params.masterHargaCabangId}`
          : `WILAYAH:${params.masterHargaWilayahId}`,
      cakupanHarga: params.cakupanHarga,
      masterHargaCabangId: params.masterHargaCabangId,
      masterHargaWilayahId: params.masterHargaWilayahId,
      masterItemId: m.id,
      kelompokKode,
      kodeItem: m.kodeItem,
      kodeMaster: m.kodeMaster,
      namaItem: m.namaItem,
      spesifikasi,
      kategori: m.kategori,
      satuan: m.satuan,
      divisiId: params.cabangRow.divisiId,
      kodeDivisi: params.cabangRow.divisi.kodeDivisi,
      namaDivisi: params.cabangRow.divisi.namaDivisi,
      wilayahCabangId: params.wilayahCabangId,
      namaWilayah: params.namaWilayah,
      hargaAktif: params.hargaAktif,
      berlakuSejak: params.berlakuSejak.toISOString(),
      nomorTiketTerakhir: params.nomorTiketTerakhir,
      tahunPeriode: evalNov.tahunPeriode,
      umurHari: evalNov.umurHari,
      labelUmur: evalNov.labelUmur,
      sedangDiproses: Boolean(activeTicket),
      nomorTiketProses: activeTicket?.nomorTiket ?? null,
      statusTiketProses: activeTicket?.status ?? null,
    });
  };

  for (const row of cabangRows) {
    pushIfDue({
      cakupanHarga: "INDUK_CABANG",
      masterHargaCabangId: row.id,
      masterHargaWilayahId: null,
      cabangRow: row,
      wilayahCabangId: null,
      namaWilayah: null,
      hargaAktif: row.hargaFinalInduk.toNumber(),
      berlakuSejak: row.berlakuSejak,
      nomorTiketTerakhir: row.pengajuanTerakhir?.nomorTiket ?? null,
    });

    for (const wil of row.masterHargaWilayah) {
      pushIfDue({
        cakupanHarga: "KHUSUS_WILAYAH",
        masterHargaCabangId: row.id,
        masterHargaWilayahId: wil.id,
        cabangRow: row,
        wilayahCabangId: wil.wilayahCabangId,
        namaWilayah: wil.wilayahCabang.namaWilayah,
        hargaAktif: wil.hargaFinalWilayah.toNumber(),
        berlakuSejak: wil.berlakuSejak,
        nomorTiketTerakhir: wil.pengajuanTerakhir?.nomorTiket ?? null,
      });
    }
  }

  let totalPerluSurveiTanpaProses = 0;
  let totalSedangDiproses = 0;

  for (const slot of semuaSlot) {
    if (slot.sedangDiproses) {
      totalSedangDiproses++;
    } else {
      totalPerluSurveiTanpaProses++;
    }
  }

  const filtered = semuaSlot
    .filter((s) => cocokFilterSlot(s, filter))
    .sort((a, b) => {
      if (a.sedangDiproses !== b.sedangDiproses) {
        return a.sedangDiproses ? 1 : -1;
      }
      if (a.berlakuSejak !== b.berlakuSejak) {
        return a.berlakuSejak.localeCompare(b.berlakuSejak);
      }
      return a.namaItem.localeCompare(b.namaItem, "id-ID");
    });

  const halamanRaw = Math.max(1, Math.floor(page) || 1);
  const totalItems = filtered.length;
  const jumlahHalaman = Math.max(1, Math.ceil(totalItems / UKURAN_HALAMAN_KATALOG));
  const halaman = Math.min(halamanRaw, jumlahHalaman);
  const start = (halaman - 1) * UKURAN_HALAMAN_KATALOG;

  return {
    rows: filtered.slice(start, start + UKURAN_HALAMAN_KATALOG),
    isPeriodeNovember: true,
    tahunPeriode: infoPeriode.tahun,
    labelPeriodeBerikutnya: infoPeriode.labelPeriodeBerikutnya,
    totalItems,
    totalPerluSurveiTanpaProses,
    totalWajibSurvei: semuaSlot.length,
    totalSedangDiproses,
    halaman,
    jumlahHalaman,
  };
}

interface SourceAhspRow {
  masterKoefisienId: string;
  namaKomponen: string;
  kategoriKomponen: string;
  satuan: string;
  nilaiKoefisien: number;
  hargaAcuanSatuan: number;
  marginPersen: number;
  subtotal: number;
}

async function cloneAhspSiapSurvei(
  tx: Tx,
  pengajuanHargaId: string,
  divisiId: string,
  sourceRows: SourceAhspRow[]
) {
  let rowsToCreate = sourceRows;

  // Fallback jika tiket rilis lama belum menyimpan rincian AHSP
  if (rowsToCreate.length === 0) {
    const [koefUpah, koefMat] = await Promise.all([
      tx.masterKoefisien.findFirst({
        where: { divisiId, kategoriKomponen: "UPAH", isActive: true },
        orderBy: { namaKomponen: "asc" },
      }),
      tx.masterKoefisien.findFirst({
        where: { divisiId, kategoriKomponen: "MATERIAL", isActive: true },
        orderBy: { namaKomponen: "asc" },
      }),
    ]);

    const fallback: SourceAhspRow[] = [];
    if (koefMat) {
      fallback.push({
        masterKoefisienId: koefMat.id,
        namaKomponen: koefMat.namaKomponen,
        kategoriKomponen: "MATERIAL",
        satuan: koefMat.satuan,
        nilaiKoefisien: Number(koefMat.nilaiKoefisienDefault) || 1,
        hargaAcuanSatuan: 0,
        marginPersen: 8,
        subtotal: 0,
      });
    }
    if (koefUpah) {
      const upahHarga = Number(koefUpah.hargaAcuanDefault ?? 150000);
      const koef = Number(koefUpah.nilaiKoefisienDefault) || 0.25;
      fallback.push({
        masterKoefisienId: koefUpah.id,
        namaKomponen: koefUpah.namaKomponen,
        kategoriKomponen: "UPAH",
        satuan: koefUpah.satuan,
        nilaiKoefisien: koef,
        hargaAcuanSatuan: upahHarga,
        marginPersen: 8,
        subtotal: Math.round(koef * upahHarga),
      });
    }
    rowsToCreate = fallback;
  }

  if (rowsToCreate.length === 0) return;

  await tx.rincianAhspPengajuan.createMany({
    data: rowsToCreate.map((r) => {
      const isUpah = r.kategoriKomponen === "UPAH";
      return {
        pengajuanHargaId,
        masterKoefisienId: r.masterKoefisienId,
        namaKomponen: r.namaKomponen,
        kategoriKomponen: r.kategoriKomponen,
        satuan: r.satuan,
        nilaiKoefisien: r.nilaiKoefisien,
        hargaAcuanSatuan: isUpah ? r.hargaAcuanSatuan : 0,
        marginPersen: r.marginPersen,
        subtotal: isUpah ? r.subtotal : 0,
      };
    }),
  });
}

/**
 * Mengajukan paket survei ulang periode November secara massal (status `SIAP_SURVEI`) ke
 * Building Coordinator dalam 1 kodePaket. Dibatasi hanya dapat dipanggil pada bulan November (WIB).
 */
export async function ajukanSurveiUlangTahunanMassal(params: {
  cabangId: string;
  pembuatUserId: string;
  catatan?: string;
  slots: SlotSurveiUlangInput[];
  sekarang?: Date;
}) {
  const sekarang = params.sekarang ?? new Date();
  const infoPeriode = getInfoPeriodeSurveiNovember(sekarang);
  if (!infoPeriode.aktif) {
    throw new DomainError(
      `Pengajuan survei ulang tahunan hanya dibuka pada bulan November. Periode berikutnya: ${infoPeriode.labelPeriodeBerikutnya}.`,
      400
    );
  }

  if (!Array.isArray(params.slots) || params.slots.length === 0) {
    throw new DomainError("Minimal 1 item harga aktif harus dipilih untuk survei ulang.", 400);
  }

  const deduped = new Map<string, SlotSurveiUlangInput>();
  for (const s of params.slots) {
    if (!s?.masterHargaCabangId) continue;
    const cakupan = s.cakupanHarga === "KHUSUS_WILAYAH" ? "KHUSUS_WILAYAH" : "INDUK_CABANG";
    const wilId = cakupan === "KHUSUS_WILAYAH" ? s.masterHargaWilayahId || "" : "";
    if (cakupan === "KHUSUS_WILAYAH" && !wilId) {
      throw new DomainError("ID harga wilayah tidak lengkap pada pengajuan khusus wilayah.", 400);
    }
    deduped.set(`${cakupan}:${s.masterHargaCabangId}:${wilId}`, {
      cakupanHarga: cakupan,
      masterHargaCabangId: s.masterHargaCabangId,
      masterHargaWilayahId: wilId || null,
    });
  }

  if (deduped.size === 0) {
    throw new DomainError("Slot survei ulang tidak valid.", 400);
  }

  const catatanTrim =
    (params.catatan || "").trim() || `Survei ulang November ${infoPeriode.tahun}`;

  return prisma.$transaction(async (tx) => {
    const cabang = await tx.cabang.findUnique({
      where: { id: params.cabangId },
      select: { id: true, kodeCabang: true, namaCabang: true },
    });
    if (!cabang) {
      throw new DomainError("Cabang pengguna tidak ditemukan.", 404);
    }

    const kodePaket = buatKodePaket(cabang.kodeCabang, sekarang);
    let ticketOffset = 0;

    const created: Array<{
      id: string;
      nomorTiket: string;
      namaItem: string;
      namaDivisi: string;
      namaWilayah: string | null;
      cakupanHarga: "INDUK_CABANG" | "KHUSUS_WILAYAH";
    }> = [];
    const skipped: Array<{
      slotKey: string;
      nomorTiketProses: string | null;
      alasan: string;
      namaItem: string;
      namaDivisi: string;
      namaWilayah: string | null;
    }> = [];

    for (const slot of deduped.values()) {
      const induk = await tx.masterHargaCabang.findFirst({
        where: {
          id: slot.masterHargaCabangId,
          cabangId: params.cabangId,
          statusHarga: "AKTIF",
        },
        include: {
          masterItem: { select: { id: true, namaItem: true } },
          divisi: { select: { id: true, namaDivisi: true } },
          pengajuanTerakhir: {
            select: {
              isTermasukBongkaran: true,
              rincianAHSP: {
                select: {
                  masterKoefisienId: true,
                  namaKomponen: true,
                  kategoriKomponen: true,
                  satuan: true,
                  nilaiKoefisien: true,
                  hargaAcuanSatuan: true,
                  marginPersen: true,
                  subtotal: true,
                },
              },
            },
          },
        },
      });

      if (!induk) {
        throw new DomainError("Slot harga aktif cabang tidak ditemukan.", 404);
      }

      let wilayahCabangId: string | null = null;
      let namaWilayah: string | null = null;
      let targetBerlakuSejak = induk.berlakuSejak;
      let sourceRincianRaw = induk.pengajuanTerakhir?.rincianAHSP ?? [];
      let isTermasukBongkaran = Boolean(induk.pengajuanTerakhir?.isTermasukBongkaran);

      if (slot.cakupanHarga === "KHUSUS_WILAYAH" && slot.masterHargaWilayahId) {
        const wil = await tx.masterHargaWilayah.findFirst({
          where: {
            id: slot.masterHargaWilayahId,
            masterHargaCabangId: induk.id,
            statusHarga: "AKTIF",
          },
          include: {
            wilayahCabang: { select: { id: true, namaWilayah: true } },
            pengajuanTerakhir: {
              select: {
                isTermasukBongkaran: true,
                rincianAHSP: {
                  select: {
                    masterKoefisienId: true,
                    namaKomponen: true,
                    kategoriKomponen: true,
                    satuan: true,
                    nilaiKoefisien: true,
                    hargaAcuanSatuan: true,
                    marginPersen: true,
                    subtotal: true,
                  },
                },
              },
            },
          },
        });

        if (!wil) {
          throw new DomainError(
            `Slot harga wilayah untuk "${induk.masterItem.namaItem}" tidak ditemukan atau tidak aktif.`,
            404
          );
        }

        wilayahCabangId = wil.wilayahCabangId;
        namaWilayah = wil.wilayahCabang.namaWilayah;
        targetBerlakuSejak = wil.berlakuSejak;
        if (wil.pengajuanTerakhir) {
          isTermasukBongkaran = Boolean(wil.pengajuanTerakhir.isTermasukBongkaran);
          if (wil.pengajuanTerakhir.rincianAHSP.length > 0) {
            sourceRincianRaw = wil.pengajuanTerakhir.rincianAHSP;
          }
        }
      }

      const slotKey =
        slot.cakupanHarga === "INDUK_CABANG"
          ? `INDUK:${induk.id}`
          : `WILAYAH:${slot.masterHargaWilayahId}`;

      const evalNov = evaluasiSurveiNovember(targetBerlakuSejak, sekarang);
      if (!evalNov.perluSurveiUlang) {
        skipped.push({
          slotKey,
          nomorTiketProses: null,
          alasan: `Sudah diperbarui pada November ${infoPeriode.tahun}`,
          namaItem: induk.masterItem.namaItem,
          namaDivisi: induk.divisi.namaDivisi,
          namaWilayah,
        });
        continue;
      }

      const existingInFlight = await tx.pengajuanHarga.findFirst({
        where: {
          cabangId: params.cabangId,
          divisiId: induk.divisiId,
          masterItemId: induk.masterItemId,
          cakupanHarga: slot.cakupanHarga,
          wilayahCabangId,
          status: { notIn: ["DITOLAK", "RELEASED"] },
        },
        select: { nomorTiket: true },
      });

      if (existingInFlight) {
        skipped.push({
          slotKey,
          nomorTiketProses: existingInFlight.nomorTiket,
          alasan: `Sedang diproses (${existingInFlight.nomorTiket})`,
          namaItem: induk.masterItem.namaItem,
          namaDivisi: induk.divisi.namaDivisi,
          namaWilayah,
        });
        continue;
      }

      const nomorTiket = await buatNomorTiketUnik(tx, ticketOffset++);
      const tiketBaru = await tx.pengajuanHarga.create({
        data: {
          nomorTiket,
          kodePaket,
          divisiId: induk.divisiId,
          cabangId: params.cabangId,
          wilayahCabangId,
          masterItemId: induk.masterItemId,
          pembuatUserId: params.pembuatUserId,
          cakupanHarga: slot.cakupanHarga,
          status: "SIAP_SURVEI",
          isTermasukBongkaran,
          marginAwalPersen: induk.marginTotalPersen,
          catatanReview: catatanTrim,
        },
        select: { id: true, nomorTiket: true },
      });

      await cloneAhspSiapSurvei(
        tx,
        tiketBaru.id,
        induk.divisiId,
        sourceRincianRaw.map((r) => ({
          masterKoefisienId: r.masterKoefisienId,
          namaKomponen: r.namaKomponen,
          kategoriKomponen: r.kategoriKomponen,
          satuan: r.satuan,
          nilaiKoefisien: r.nilaiKoefisien.toNumber(),
          hargaAcuanSatuan: r.hargaAcuanSatuan.toNumber(),
          marginPersen: r.marginPersen.toNumber(),
          subtotal: r.subtotal.toNumber(),
        }))
      );

      const labelWilayah = namaWilayah ? ` (${namaWilayah})` : " (Induk Cabang)";
      await tx.approvalAuditLog.create({
        data: {
          pengajuanHargaId: tiketBaru.id,
          userId: params.pembuatUserId,
          roleActor: "BM_MANAGER",
          action: "SURVEI_ULANG_TAHUNAN",
          catatan: `Survei ulang November ${infoPeriode.tahun}: ${induk.masterItem.namaItem} - ${induk.divisi.namaDivisi}${labelWilayah} [Paket ${kodePaket}]. ${catatanTrim}`,
        },
      });

      created.push({
        id: tiketBaru.id,
        nomorTiket: tiketBaru.nomorTiket,
        namaItem: induk.masterItem.namaItem,
        namaDivisi: induk.divisi.namaDivisi,
        namaWilayah,
        cakupanHarga: slot.cakupanHarga,
      });
    }

    if (created.length === 0 && skipped.length > 0) {
      throw new DomainError(
        `Tidak ada slot yang diajukan: ${skipped[0].alasan}.`,
        409
      );
    }

    return {
      kodePaket,
      created,
      skipped,
    };
  }, TX_OPTIONS);
}
