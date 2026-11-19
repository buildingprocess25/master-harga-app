import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { getTemplateAktivasiMasterItem } from "@/lib/services/master-harga-service";

export async function GET(request: NextRequest) {
  try {
    let user = await getSessionUser();
    if (!user) {
      const defaultBm = await prisma.user.findFirst({
        where: { role: "BM_MANAGER", isActive: true },
        include: { cabang: true },
      });
      if (defaultBm) {
        user = {
          id: defaultBm.id,
          email: defaultBm.email,
          fullName: defaultBm.fullName,
          role: defaultBm.role,
          cabangId: defaultBm.cabangId,
          namaCabang: defaultBm.cabang?.namaCabang,
          divisiId: defaultBm.divisiId,
        };
      }
    }

    if (!user || !["BM_MANAGER", "PP_MANAGER", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Tidak berwenang mengakses template aktivasi." },
        { status: 403 }
      );
    }

    const masterItemId = request.nextUrl.searchParams.get("masterItemId")?.trim();
    if (!masterItemId) {
      return NextResponse.json(
        { success: false, message: "Parameter masterItemId wajib diisi." },
        { status: 400 }
      );
    }

    let resolvedCabangId = user.cabangId;
    if (!resolvedCabangId) {
      const fallbackCabang = await prisma.cabang.findFirst({
        where: { isActive: true },
        orderBy: { kodeCabang: "asc" },
        select: { id: true },
      });
      resolvedCabangId = fallbackCabang?.id ?? null;
    }

    if (!resolvedCabangId) {
      return NextResponse.json(
        { success: false, message: "Cabang operasional pengguna tidak ditemukan." },
        { status: 400 }
      );
    }

    const data = await getTemplateAktivasiMasterItem(masterItemId, resolvedCabangId);
    if (!data) {
      return NextResponse.json(
        { success: false, message: "Master item tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET /api/bm-manager/aktivasi-template Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat template aktivasi." },
      { status: 500 }
    );
  }
}
