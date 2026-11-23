import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeWilayah = searchParams.get("includeWilayah") === "true";

    const divisiList = await prisma.divisi.findMany({
      where: { isActive: true },
      orderBy: { kodeDivisi: "asc" },
    });

    let wilayahList: any[] = [];
    if (includeWilayah && user.cabangId) {
      wilayahList = await prisma.wilayahCabang.findMany({
        where: {
          cabangId: user.cabangId,
          isActive: true,
        },
        orderBy: { namaWilayah: "asc" },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        divisi: divisiList,
        wilayah: wilayahList,
      },
    });
  } catch (error) {
    console.error("GET Divisi Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data divisi." },
      { status: 500 }
    );
  }
}
