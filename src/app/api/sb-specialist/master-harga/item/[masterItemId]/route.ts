import { NextRequest, NextResponse } from "next/server";
import { requireRoleAction } from "@/lib/auth/require-role";
import { DomainError } from "@/lib/services/transisi-tiket";
import {
  getDaftarHargaCabangPerItem,
  UKURAN_HALAMAN_CABANG_MODAL,
} from "@/lib/services/master-harga-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ masterItemId: string }> }
) {
  try {
    await requireRoleAction(["SB_SPECIALIST", "ADMIN"]);
    const { masterItemId } = await params;
    const sp = request.nextUrl.searchParams;

    const q = sp.get("q")?.trim() || undefined;
    const cabangId = sp.get("cabangId")?.trim() || undefined;
    const divisiId = sp.get("divisiId")?.trim() || undefined;
    const hanyaOverride = sp.get("override") === "1";
    const page = Number(sp.get("page")) || 1;
    const pageSize = Number(sp.get("pageSize")) || UKURAN_HALAMAN_CABANG_MODAL;

    const data = await getDaftarHargaCabangPerItem(masterItemId, {
      q,
      cabangId,
      divisiId,
      hanyaOverride,
      page,
      pageSize,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Master item tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const status = error instanceof DomainError ? error.status : 500;
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat daftar harga cabang." },
      { status }
    );
  }
}
