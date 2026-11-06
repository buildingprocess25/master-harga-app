import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    let user = await getSessionUser();
    // Fallback user di dev/preview
    if (!user) {
      const url = new URL(request.url);
      const referer = request.headers.get("referer") || "";
      const requestedRole = url.searchParams.get("role");

      const isBuildingCoord =
        requestedRole === "BUILDING_COORDINATOR" ||
        referer.includes("building-coordinator");

      const targetRole = isBuildingCoord ? "BUILDING_COORDINATOR" : "BM_MANAGER";

      const defaultUser = await prisma.user.findFirst({
        where: { role: targetRole },
        include: { cabang: true, divisi: true },
      });

      if (defaultUser) {
        user = {
          id: defaultUser.id,
          email: defaultUser.email,
          fullName: defaultUser.fullName,
          role: defaultUser.role,
          cabangId: defaultUser.cabangId,
          namaCabang: defaultUser.cabang?.namaCabang || "Cikokol",
          divisiId: defaultUser.divisiId,
          namaDivisi: defaultUser.divisi?.namaDivisi || "Building & Maintenance",
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Belum login." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Gagal mengambil sesi." },
      { status: 500 }
    );
  }
}
