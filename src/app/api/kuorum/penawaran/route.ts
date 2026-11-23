import { NextResponse } from "next/server";
import { getPenawaranKontraktor } from "@/lib/services/kuorum-service";
import { errorResponse, requireRole } from "../_lib/guard";

/**
 * GET /api/kuorum/penawaran
 * Daftar penawaran harga untuk PT rekanan yang sedang login (isolasi per kontraktorId).
 */
export async function GET() {
  const guard = await requireRole(["KONTRAKTOR"]);
  if (!guard.ok) return guard.response;

  if (!guard.user.kontraktorId) {
    return NextResponse.json(
      { success: false, message: "Akun rekanan belum terhubung ke data PT Kontraktor." },
      { status: 403 }
    );
  }

  try {
    const data = await getPenawaranKontraktor(guard.user.kontraktorId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error, "Kuorum Penawaran Error");
  }
}
