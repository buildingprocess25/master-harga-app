import { NextRequest, NextResponse } from "next/server";
import { teruskanKeKontraktor } from "@/lib/services/kuorum-service";
import { errorResponse, requireRole } from "../../_lib/guard";

/**
 * POST /api/kuorum/[tiketId]/buka
 * Persetujuan Regional Manager: teruskan tiket ke kontraktor dan buka putaran voting
 * (SLA 3x24 jam). Body opsional: { catatan?: string }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tiketId: string }> }
) {
  const guard = await requireRole(["REGIONAL_MANAGER"]);
  if (!guard.ok) return guard.response;

  try {
    const { tiketId } = await params;
    const body = await request.json().catch(() => ({}));
    const catatan = typeof body?.catatan === "string" ? body.catatan : undefined;

    const hasil = await teruskanKeKontraktor({
      tiketId,
      userId: guard.user.id,
      roleActor: guard.user.role,
      catatan,
    });

    return NextResponse.json({
      success: true,
      message: hasil.sudahTerbuka
        ? "Putaran voting sudah terbuka sebelumnya."
        : `Putaran voting ${hasil.putaran} dibuka untuk ${hasil.totalDiundang} rekanan.`,
      data: hasil,
    });
  } catch (error) {
    return errorResponse(error, "Kuorum Buka Error");
  }
}
