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
    const divisiId = searchParams.get("divisiId");
    const search = searchParams.get("q")?.trim() || "";

    const where: any = {};
    if (divisiId) {
      where.divisiId = divisiId;
    }

    if (search) {
      where.OR = [
        { namaItem: { contains: search, mode: "insensitive" } },
        { kodeItem: { contains: search, mode: "insensitive" } },
        { merk: { contains: search, mode: "insensitive" } },
        { kategori: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.masterItem.findMany({
      where,
      orderBy: { kodeItem: "asc" },
      take: 50,
      include: {
        divisi: {
          select: { kodeDivisi: true, namaDivisi: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("GET Master Item Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil master item." },
      { status: 500 }
    );
  }
}
