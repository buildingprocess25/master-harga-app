import { describe, expect, it } from "vitest";
import { jenisMitraUntukDivisi, labelMitraUntukDivisi } from "@/lib/utils";

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
});
