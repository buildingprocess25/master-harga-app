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

      let targetRole: any = "BM_MANAGER";
      if (requestedRole) {
        targetRole = requestedRole;
      } else if (referer.includes("sb-specialist")) {
        targetRole = "SB_SPECIALIST";
      } else if (referer.includes("regional-manager")) {
        targetRole = "REGIONAL_MANAGER";
      } else if (referer.includes("building-coordinator")) {
        targetRole = "BUILDING_COORDINATOR";
      } else if (referer.includes("kontraktor")) {
        targetRole = "KONTRAKTOR";
      }

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
