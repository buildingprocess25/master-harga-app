import { NextRequest, NextResponse } from "next/server";
import { requireRoleAction } from "@/lib/auth/require-role";
import { getDetailHargaRilis } from "@/lib/services/master-harga-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleAction(["SB_SPECIALIST", "REGIONAL_MANAGER", "ADMIN"]);
    const { id } = await params;
    const detail = await getDetailHargaRilis(id);
    if (!detail) {
      return NextResponse.json(
        { success: false, message: "Data master harga tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: detail });
  } catch (error: any) {
    console.error("GET MasterHarga Detail Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat rincian master harga." },
      { status: 500 }
    );
  }
}
