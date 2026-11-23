import { NextRequest, NextResponse } from "next/server";
import { requireRoleAction } from "@/lib/auth/require-role";
import { getCabangWewenang } from "@/lib/services/kuorum-service";
import { getDetailHargaWilayahRilis } from "@/lib/services/master-harga-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRoleAction([
      "SB_SPECIALIST",
      "REGIONAL_MANAGER",
      "BM_MANAGER",
      "PP_MANAGER",
      "ADMIN",
    ]);
    const { id } = await params;
    const detail = await getDetailHargaWilayahRilis(id);

    if (!detail) {
      return NextResponse.json(
        { success: false, message: "Data master harga wilayah tidak ditemukan." },
        { status: 404 }
      );
    }

    if (
      (user.role === "BM_MANAGER" || user.role === "PP_MANAGER") &&
      user.cabangId &&
      detail.item.cabangId !== user.cabangId
    ) {
      return NextResponse.json(
        { success: false, message: "Tidak berwenang melihat rincian wilayah cabang lain." },
        { status: 403 }
      );
    }

    if (user.role === "REGIONAL_MANAGER") {
      const wewenang = await getCabangWewenang(user.id, user.role);
      if (wewenang !== "SEMUA" && !wewenang.includes(detail.item.cabangId)) {
        return NextResponse.json(
          { success: false, message: "Cabang di luar wewenang Regional Manager." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: detail });
  } catch (error: any) {
    console.error("GET MasterHargaWilayah Detail Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat rincian harga wilayah." },
      { status: 500 }
    );
  }
}
