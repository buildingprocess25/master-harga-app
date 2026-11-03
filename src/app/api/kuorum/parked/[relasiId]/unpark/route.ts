import { NextRequest, NextResponse } from "next/server";
import { unparkKontraktorCabang } from "@/lib/services/kuorum-service";
import { errorResponse, requireRole } from "../../../_lib/guard";

/**
 * POST /api/kuorum/parked/[relasiId]/unpark
 * Aksi "Aktifkan Kembali" rekanan Parked. Body: { alasan: string }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ relasiId: string }> }
) {
  const guard = await requireRole(["SB_SPECIALIST", "REGIONAL_MANAGER"]);
  if (!guard.ok) return guard.response;

  try {
    const { relasiId } = await params;
    const body = await request.json().catch(() => ({}));

    const data = await unparkKontraktorCabang({
      relasiId,
      userId: guard.user.id,
      role: guard.user.role,
      alasan: typeof body?.alasan === "string" ? body.alasan : "",
    });

    return NextResponse.json({
      success: true,
      message: "Rekanan berhasil diaktifkan kembali.",
      data,
    });
  } catch (error) {
    return errorResponse(error, "Kuorum Unpark Error");
  }
}
