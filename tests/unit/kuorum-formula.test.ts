import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));

import { hitungTargetKuorum } from "@/lib/services/kuorum-service";
import { signSessionToken, verifySessionToken } from "@/lib/auth/session";
import { UserSessionProfile } from "@/types";

describe("Unit: Rumus Kuorum & Token Sesi Auth", () => {
  it("menghitung kuorum 50% + 1 sesuai aturan Alfamart", () => {
    expect(hitungTargetKuorum(0)).toBe(1);
    expect(hitungTargetKuorum(1)).toBe(1);
    expect(hitungTargetKuorum(2)).toBe(2);
    expect(hitungTargetKuorum(3)).toBe(2);
    expect(hitungTargetKuorum(4)).toBe(3);
    expect(hitungTargetKuorum(5)).toBe(3);
    expect(hitungTargetKuorum(6)).toBe(4);
    expect(hitungTargetKuorum(7)).toBe(4);
  });

  it("menandatangani dan memverifikasi token sesi HMAC-SHA256 serta menolak manipulasi", async () => {
    const profile: UserSessionProfile = {
      id: "usr-test-1",
      email: "bm.cikokol@alfamart.co.id",
      fullName: "BM Manager Test",
      role: "BM_MANAGER",
      cabangId: "cab-cikokol",
      namaCabang: "Cabang Cikokol",
      divisiId: "div-bld",
    };

    const token = await signSessionToken(profile);
    expect(token.split(".")).toHaveLength(2);

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.email).toBe(profile.email);
    expect(decoded?.role).toBe("BM_MANAGER");

    // Manipulasi payload harus gagal verifikasi signature
    const [payloadB64, sigB64] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...profile, role: "ADMIN" })
    ).toString("base64url");
    expect(await verifySessionToken(`${tamperedPayload}.${sigB64}`)).toBeNull();
    expect(await verifySessionToken(`${payloadB64}.invalid-sig`)).toBeNull();
  });
});
