import { NextResponse } from "next/server";
import { evaluasiKuorumKedaluwarsa } from "@/lib/services/kuorum-service";
import { errorResponse, requireRole } from "../_lib/guard";

/**
 * POST /api/kuorum/evaluasi
 * Menutup seluruh putaran voting yang SLA-nya sudah lewat (TIMEOUT).
 * Evaluasi juga berjalan otomatis saat tiket dibuka atau ada vote masuk,
 * endpoint ini disiapkan untuk pemicu manual atau job terjadwal.
 */
export async function POST() {
  const guard = await requireRole(["SB_SPECIALIST", "REGIONAL_MANAGER", "ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const hasil = await evaluasiKuorumKedaluwarsa();
    return NextResponse.json({ success: true, data: hasil });
  } catch (error) {
    return errorResponse(error, "Kuorum Evaluasi Error");
  }
}
