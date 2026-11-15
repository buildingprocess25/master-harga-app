import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));

import {
  canTransitionStatus,
  VALID_STATUS_TRANSITIONS,
} from "@/lib/services/state-machine";
import { StatusPengajuanHarga } from "@/types";

describe("Unit: State Machine Alur Tiket SPARTA-PRICING", () => {
  it("mengizinkan jalur happy-path lengkap dari DRAFT hingga RELEASED", () => {
    const happyPath: [StatusPengajuanHarga, StatusPengajuanHarga][] = [
      ["DRAFT", "DIAJUKAN"],
      ["DIAJUKAN", "SIAP_SURVEI"],
      ["SIAP_SURVEI", "PENDING_BM_MGR"],
      ["PENDING_BM_MGR", "PENDING_SB_SPECIALIST"],
      ["PENDING_SB_SPECIALIST", "PENDING_REGIONAL_MGR"],
      ["PENDING_REGIONAL_MGR", "PENDING_KONTRAKTOR"],
      ["PENDING_KONTRAKTOR", "RELEASED"],
    ];

    for (const [from, to] of happyPath) {
      expect(canTransitionStatus(from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it("mengizinkan jalur revisi dan pengembalian berjenjang", () => {
    expect(canTransitionStatus("DIAJUKAN", "PERLU_REVISI")).toBe(true);
    expect(canTransitionStatus("PERLU_REVISI", "DIAJUKAN")).toBe(true);
    expect(canTransitionStatus("SIAP_SURVEI", "RETURNED_TO_BC")).toBe(true);
    expect(canTransitionStatus("PENDING_BM_MGR", "RETURNED_TO_BC")).toBe(true);
    expect(canTransitionStatus("RETURNED_TO_BC", "PENDING_BM_MGR")).toBe(true);
    expect(canTransitionStatus("PENDING_REGIONAL_MGR", "PENDING_SB_SPECIALIST")).toBe(true);
  });

  it("mengizinkan jalur banding dan penolakan kontraktor hingga buka ulang", () => {
    expect(canTransitionStatus("PENDING_KONTRAKTOR", "USULAN_KONTRAKTOR")).toBe(true);
    expect(canTransitionStatus("USULAN_KONTRAKTOR", "PENDING_SB_SPECIALIST")).toBe(true);
    expect(canTransitionStatus("USULAN_KONTRAKTOR", "PENDING_REGIONAL_MGR")).toBe(true);
    expect(canTransitionStatus("PENDING_KONTRAKTOR", "DITOLAK_KONTRAKTOR")).toBe(true);
    expect(canTransitionStatus("DITOLAK_KONTRAKTOR", "PENDING_REGIONAL_MGR")).toBe(true);
  });

  it("melarang lompat tahap tanpa persetujuan berjenjang", () => {
    const illegalTransitions: [StatusPengajuanHarga, StatusPengajuanHarga][] = [
      ["DRAFT", "RELEASED"],
      ["DIAJUKAN", "PENDING_BM_MGR"],
      ["DIAJUKAN", "RELEASED"],
      ["SIAP_SURVEI", "PENDING_REGIONAL_MGR"],
      ["PENDING_BM_MGR", "PENDING_KONTRAKTOR"],
      ["PENDING_SB_SPECIALIST", "RELEASED"],
      ["PENDING_REGIONAL_MGR", "RELEASED"],
    ];

    for (const [from, to] of illegalTransitions) {
      expect(canTransitionStatus(from, to), `${from} -x-> ${to}`).toBe(false);
    }
  });

  it("menjadikan RELEASED dan DITOLAK sebagai terminal state tanpa transisi lanjutan", () => {
    expect(VALID_STATUS_TRANSITIONS.RELEASED).toEqual([]);
    expect(VALID_STATUS_TRANSITIONS.DITOLAK).toEqual([]);
    expect(canTransitionStatus("RELEASED", "DIAJUKAN")).toBe(false);
    expect(canTransitionStatus("DITOLAK", "DIAJUKAN")).toBe(false);
  });
});
