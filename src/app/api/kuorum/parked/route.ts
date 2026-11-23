import { NextResponse } from "next/server";
import {
  getCabangWewenang,
  getDaftarRekananParked,
} from "@/lib/services/kuorum-service";
import { errorResponse, requireRole } from "../_lib/guard";

/**
 * GET /api/kuorum/parked
 * Daftar rekanan berstatus NONAKTIF_SEMENTARA dalam cakupan cabang wewenang pengguna.
 */
export async function GET() {
  const guard = await requireRole(["SB_SPECIALIST", "REGIONAL_MANAGER"]);
  if (!guard.ok) return guard.response;

  try {
    const wewenang = await getCabangWewenang(guard.user.id, guard.user.role);
    const data = await getDaftarRekananParked(wewenang);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error, "Kuorum Parked Error");
  }
}
