export const BULAN_SURVEI_TAHUNAN = 11; // November (1-indexed)
const MS_PER_DAY = 86_400_000;

export type StatusPeriodeSurvei =
  | "WAJIB_SURVEI_NOVEMBER"
  | "SUDAH_PERIODE_INI"
  | "DI_LUAR_PERIODE";

export interface InfoPeriodeSurvei {
  aktif: boolean;
  tahun: number;
  bulan: number;
  hari: number;
  labelPeriodeBerikutnya: string;
}

export interface EvaluasiSurveiNovember {
  statusPeriode: StatusPeriodeSurvei;
  perluSurveiUlang: boolean;
  tahunPeriode: number;
  umurHari: number;
  labelUmur: string;
}

const jakartaPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getJakartaDateParts(dateInput: Date | string): {
  year: number;
  month: number;
  day: number;
} {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const parts = jakartaPartsFormatter.formatToParts(d);
  const getNum = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: getNum("year"),
    month: getNum("month"),
    day: getNum("day"),
  };
}

function formatLabelUmur(umurHari: number): string {
  const totalBulan = Math.floor(umurHari / 30);
  if (totalBulan >= 12) {
    const tahun = Math.floor(totalBulan / 12);
    const sisaBulan = totalBulan % 12;
    return sisaBulan > 0 ? `${tahun} thn ${sisaBulan} bln` : `${tahun} thn`;
  }
  if (totalBulan >= 1) {
    return `${totalBulan} bln`;
  }
  return `${umurHari} hr`;
}

/**
 * Mengecek apakah tanggal saat ini (zona waktu Asia/Jakarta) berada di bulan November,
 * serta menentukan label periode November aktif/berikutnya.
 */
export function getInfoPeriodeSurveiNovember(
  sekarang: Date = new Date()
): InfoPeriodeSurvei {
  const { year, month, day } = getJakartaDateParts(sekarang);
  const aktif = month === BULAN_SURVEI_TAHUNAN;
  const tahunBerikutnya = month > BULAN_SURVEI_TAHUNAN ? year + 1 : year;

  return {
    aktif,
    tahun: year,
    bulan: month,
    hari: day,
    labelPeriodeBerikutnya: `November ${tahunBerikutnya}`,
  };
}

/**
 * Mengevaluasi apakah harga aktif wajib disurvei ulang pada periode November:
 * - Di luar bulan November: tidak wajib (`DI_LUAR_PERIODE`, `perluSurveiUlang: false`).
 * - Di bulan November: semua harga aktif dengan `berlakuSejak` sebelum 1 November tahun ini
 *   (terlepas dari umurnya < 1 tahun atau > 1 tahun) wajib disurvei (`WAJIB_SURVEI_NOVEMBER`).
 * - Jika `berlakuSejak` sudah di bulan November tahun ini (>= 1 Nov tahun berjalan),
 *   dianggap sudah selesai untuk periode tahun ini (`SUDAH_PERIODE_INI`).
 */
export function evaluasiSurveiNovember(
  berlakuSejak: Date | string,
  sekarang: Date = new Date()
): EvaluasiSurveiNovember {
  const periode = getInfoPeriodeSurveiNovember(sekarang);
  const mulai = getJakartaDateParts(berlakuSejak);
  const mulaiDate = berlakuSejak instanceof Date ? berlakuSejak : new Date(berlakuSejak);
  const umurHari = Math.max(
    0,
    Math.floor((sekarang.getTime() - mulaiDate.getTime()) / MS_PER_DAY)
  );
  const labelUmur = formatLabelUmur(umurHari);

  if (!periode.aktif) {
    return {
      statusPeriode: "DI_LUAR_PERIODE",
      perluSurveiUlang: false,
      tahunPeriode: periode.tahun,
      umurHari,
      labelUmur,
    };
  }

  const sebelumNovemberTahunIni =
    mulai.year < periode.tahun ||
    (mulai.year === periode.tahun && mulai.month < BULAN_SURVEI_TAHUNAN);

  if (sebelumNovemberTahunIni) {
    return {
      statusPeriode: "WAJIB_SURVEI_NOVEMBER",
      perluSurveiUlang: true,
      tahunPeriode: periode.tahun,
      umurHari,
      labelUmur,
    };
  }

  return {
    statusPeriode: "SUDAH_PERIODE_INI",
    perluSurveiUlang: false,
    tahunPeriode: periode.tahun,
    umurHari,
    labelUmur,
  };
}
