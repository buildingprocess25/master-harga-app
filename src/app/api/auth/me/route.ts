import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    let user = await getSessionUser();
    // Fallback user di dev/preview
    if (!user) {
      const defaultBm = await prisma.user.findFirst({
        where: { role: "BM_MANAGER" },
        include: { cabang: true, divisi: true },
      });
      if (defaultBm) {
        user = {
          id: defaultBm.id,
          email: defaultBm.email,
          fullName: defaultBm.fullName,
          role: defaultBm.role,
          cabangId: defaultBm.cabangId,
          namaCabang: defaultBm.cabang?.namaCabang || "Cikokol",
          divisiId: defaultBm.divisiId,
          namaDivisi: defaultBm.divisi?.namaDivisi || "Building & Maintenance",
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
