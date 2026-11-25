import { describe, expect, it } from "vitest";
import {
  evaluasiSurveiNovember,
  getInfoPeriodeSurveiNovember,
} from "@/lib/survei-tahunan";

describe("survei ulang wajib setiap bulan November", () => {
  it("nonaktif di luar bulan November (Jan–Okt & Des) dengan jadwal berikutnya yang tepat", () => {
    const oktober = getInfoPeriodeSurveiNovember(new Date("2026-10-31T08:00:00Z"));
    expect(oktober.aktif).toBe(false);
    expect(oktober.labelPeriodeBerikutnya).toBe("November 2026");

    const desember = getInfoPeriodeSurveiNovember(new Date("2026-12-01T08:00:00Z"));
    expect(desember.aktif).toBe(false);
    expect(desember.labelPeriodeBerikutnya).toBe("November 2027");

    const evalOkt = evaluasiSurveiNovember(
      new Date("2025-06-01T00:00:00Z"),
      new Date("2026-10-31T08:00:00Z")
    );
    expect(evalOkt.statusPeriode).toBe("DI_LUAR_PERIODE");
    expect(evalOkt.perluSurveiUlang).toBe(false);
  });

  it("mewajibkan semua harga dengan berlakuSejak sebelum 1 November tahun ini terlepas dari umurnya", () => {
    const sekarangNov = new Date("2026-11-25T08:00:00Z");

    // Baru rilis 2 bulan lalu (Sep 2026, < 1 tahun) -> tetap wajib survei di November
    const baruSep = evaluasiSurveiNovember(new Date("2026-09-15T00:00:00Z"), sekarangNov);
    expect(baruSep.statusPeriode).toBe("WAJIB_SURVEI_NOVEMBER");
    expect(baruSep.perluSurveiUlang).toBe(true);
    expect(baruSep.tahunPeriode).toBe(2026);

    // Baru rilis akhir Oktober 2026 (< 1 bulan) -> tetap wajib survei di November
    const akhirOkt = evaluasiSurveiNovember(new Date("2026-10-31T10:00:00Z"), sekarangNov);
    expect(akhirOkt.statusPeriode).toBe("WAJIB_SURVEI_NOVEMBER");
    expect(akhirOkt.perluSurveiUlang).toBe(true);

    // Rilis tahun sebelumnya -> wajib survei di November
    const tahunLalu = evaluasiSurveiNovember(new Date("2025-11-20T00:00:00Z"), sekarangNov);
    expect(tahunLalu.statusPeriode).toBe("WAJIB_SURVEI_NOVEMBER");
    expect(tahunLalu.perluSurveiUlang).toBe(true);
  });

  it("menganggap selesai untuk periode berjalan jika berlakuSejak sudah di bulan November tahun ini", () => {
    const sekarangNov = new Date("2026-11-25T08:00:00Z");

    const awalNov = evaluasiSurveiNovember(new Date("2026-11-01T00:00:00Z"), sekarangNov);
    expect(awalNov.statusPeriode).toBe("SUDAH_PERIODE_INI");
    expect(awalNov.perluSurveiUlang).toBe(false);

    const baruRilisUlang = evaluasiSurveiNovember(new Date("2026-11-24T12:00:00Z"), sekarangNov);
    expect(baruRilisUlang.statusPeriode).toBe("SUDAH_PERIODE_INI");
    expect(baruRilisUlang.perluSurveiUlang).toBe(false);
  });

  it("menghitung batas 1 November berdasarkan kalender Asia/Jakarta (UTC+7)", () => {
    // 2026-10-31T17:30:00Z = 2026-11-01 00:30 WIB -> masuk November 2026
    const masukNovWib = getInfoPeriodeSurveiNovember(new Date("2026-10-31T17:30:00Z"));
    expect(masukNovWib.aktif).toBe(true);
    expect(masukNovWib.bulan).toBe(11);
    expect(masukNovWib.hari).toBe(1);

    const evalRilisNovWib = evaluasiSurveiNovember(
      new Date("2026-10-31T17:30:00Z"),
      new Date("2026-11-25T08:00:00Z")
    );
    expect(evalRilisNovWib.statusPeriode).toBe("SUDAH_PERIODE_INI");
    expect(evalRilisNovWib.perluSurveiUlang).toBe(false);
  });
});
