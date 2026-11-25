import { describe, expect, it } from "vitest";
import {
  getInisialDivisi,
  getLokasiUnitLabel,
  getRoleDisplayName,
  jenisMitraUntukDivisi,
  labelMitraUntukDivisi,
} from "@/lib/utils";

describe("Unit: Pemetaan Jenis Mitra Kontraktor vs Rekanan per Divisi", () => {
  it("memetakan DIV-BLD (Building) dan DIV-DC (DC) ke KONTRAKTOR", () => {
    expect(jenisMitraUntukDivisi("DIV-BLD", "Building")).toBe("KONTRAKTOR");
    expect(jenisMitraUntukDivisi("DIV-DC", "DC")).toBe("KONTRAKTOR");
    expect(labelMitraUntukDivisi("DIV-BLD", "Building")).toBe("Kontraktor");
    expect(labelMitraUntukDivisi("DIV-DC", "DC")).toBe("Kontraktor");
  });

  it("memetakan DIV-MNT (Maintenance) dan DIV-ENG (Engineering) ke REKANAN", () => {
    expect(jenisMitraUntukDivisi("DIV-MNT", "Maintenance")).toBe("REKANAN");
    expect(jenisMitraUntukDivisi("DIV-ENG", "Engineering")).toBe("REKANAN");
    expect(labelMitraUntukDivisi("DIV-MNT", "Maintenance")).toBe("Rekanan");
    expect(labelMitraUntukDivisi("DIV-ENG", "Engineering")).toBe("Rekanan");
  });

  it("menangani fallback berbasis nama divisi dan case-insensitive", () => {
    expect(jenisMitraUntukDivisi(null, "Divisi Maintenance")).toBe("REKANAN");
    expect(jenisMitraUntukDivisi(null, "Perawatan Toko")).toBe("REKANAN");
    expect(jenisMitraUntukDivisi(null, "Engineering M/E")).toBe("REKANAN");
    expect(jenisMitraUntukDivisi(undefined, "Building Sipil")).toBe("KONTRAKTOR");
    expect(jenisMitraUntukDivisi(null, null)).toBe("KONTRAKTOR");
  });

  it("memetakan inisial divisi resmi termasuk Maintenance (DIV-MNT) menjadi MTC", () => {
    expect(getInisialDivisi("DIV-BLD", "Building")).toBe("BLD");
    expect(getInisialDivisi("DIV-MNT", "Maintenance")).toBe("MTC");
    expect(getInisialDivisi("DIV-ENG", "Engineering")).toBe("ENG");
    expect(getInisialDivisi("DIV-DC", "Distribution Center")).toBe("DC");
    expect(getInisialDivisi("DIV-LAIN", "Maintenance Gedung")).toBe("MTC");
  });

  it("menampilkan label jabatan ramah pengguna & unit cabang/HO sesuai role", () => {
    expect(getRoleDisplayName("REGIONAL_MANAGER")).toBe("Regional Manager");
    expect(getRoleDisplayName("BM_MANAGER")).toBe("B&M Manager");
    expect(
      getLokasiUnitLabel({ role: "REGIONAL_MANAGER", namaCabang: null })
    ).toBe("Head Office (HO)");
    expect(
      getLokasiUnitLabel({ role: "SB_SPECIALIST", namaCabang: undefined })
    ).toBe("Head Office (HO)");
    expect(
      getLokasiUnitLabel({ role: "BM_MANAGER", namaCabang: "Cabang Cikokol" })
    ).toBe("Cabang Cikokol");
    expect(
      getLokasiUnitLabel({
        role: "KONTRAKTOR",
        namaPerusahaanKontraktor: "PT Sinar Mitra Konstruksi",
      })
    ).toBe("PT Sinar Mitra Konstruksi");
  });
});
