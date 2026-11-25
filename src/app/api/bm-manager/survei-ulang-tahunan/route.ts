import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRoleAction } from "@/lib/auth/require-role";
import { DomainError } from "@/lib/services/transisi-tiket";
import {
  ajukanSurveiUlangTahunanMassal,
  type SlotSurveiUlangInput,
} from "@/lib/services/survei-tahunan-service";

async function resolveCabangBm(cabangIdUser: string | null | undefined) {
  if (cabangIdUser) return cabangIdUser;
  const fallback = await prisma.cabang.findFirst({
    where: { isActive: true },
    orderBy: { kodeCabang: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRoleAction(["BM_MANAGER", "PP_MANAGER"]);
    const cabangId = await resolveCabangBm(user.cabangId);
    if (!cabangId) {
      return NextResponse.json(
        { success: false, message: "Cabang pengguna tidak ditemukan." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const slots = Array.isArray(body?.slots) ? (body.slots as SlotSurveiUlangInput[]) : [];
    if (slots.length === 0) {
      return NextResponse.json(
        { success: false, message: "Pilih minimal 1 item untuk diajukan survei ulang." },
        { status: 400 }
      );
    }

    const catatan = typeof body?.catatan === "string" ? body.catatan : undefined;
    const result = await ajukanSurveiUlangTahunanMassal({
      cabangId,
      pembuatUserId: user.id,
      catatan,
      slots,
    });

    const ringkasLewati =
      result.skipped.length > 0 ? ` (${result.skipped.length} sudah diproses)` : "";

    return NextResponse.json(
      {
        success: true,
        message: `${result.created.length} pengajuan survei ulang dikirim ke Building Coordinator (Paket ${result.kodePaket})${ringkasLewati}.`,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const status = error instanceof DomainError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Gagal mengajukan paket survei ulang tahunan.";
    return NextResponse.json({ success: false, message }, { status });
  }
}
