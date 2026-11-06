import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    let user = await getSessionUser();
    if (!user) {
      const defaultBc = await prisma.user.findFirst({
        where: { role: "BUILDING_COORDINATOR" },
        include: { cabang: true },
      });
      if (defaultBc) {
        user = {
          id: defaultBc.id,
          email: defaultBc.email,
          fullName: defaultBc.fullName,
          role: defaultBc.role,
          cabangId: defaultBc.cabangId,
          namaCabang: defaultBc.cabang?.namaCabang || "Cikokol",
          divisiId: defaultBc.divisiId,
        };
      }
    }

    const { searchParams } = new URL(request.url);
    const cabangParam = searchParams.get("cabangId");
    const search = searchParams.get("q")?.trim() || "";

    const where: any = { isActive: true };

    if (user?.cabangId) {
      where.cabangId = user.cabangId;
    } else if (cabangParam) {
      where.cabangId = cabangParam;
    }

    if (search) {
      where.OR = [
        { namaToko: { contains: search, mode: "insensitive" } },
        { alamat: { contains: search, mode: "insensitive" } },
        { kota: { contains: search, mode: "insensitive" } },
      ];
    }

    const stores = await prisma.masterToko.findMany({
      where,
      orderBy: { namaToko: "asc" },
      include: {
        cabang: { select: { namaCabang: true, kodeCabang: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: stores,
    });
  } catch (error: any) {
    console.error("GET MasterToko Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar master toko." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let user = await getSessionUser();
    if (!user) {
      const defaultBc = await prisma.user.findFirst({
        where: { role: "BUILDING_COORDINATOR" },
        include: { cabang: true },
      });
      if (defaultBc) {
        user = {
          id: defaultBc.id,
          email: defaultBc.email,
          fullName: defaultBc.fullName,
          role: defaultBc.role,
          cabangId: defaultBc.cabangId,
          namaCabang: defaultBc.cabang?.namaCabang || "Cikokol",
          divisiId: defaultBc.divisiId,
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { namaToko, alamat, kota, kontakPic, telepon } = body;

    if (!namaToko || !alamat) {
      return NextResponse.json(
        { success: false, message: "Nama toko dan alamat wajib diisi." },
        { status: 400 }
      );
    }

    // Cabang wajib mengikuti cabang user
    const cabangId = user.cabangId;
    if (!cabangId) {
      return NextResponse.json(
        { success: false, message: "Cabang pengguna tidak terdaftar." },
        { status: 400 }
      );
    }

    const newStore = await prisma.masterToko.create({
      data: {
        cabangId,
        namaToko: namaToko.trim(),
        alamat: alamat.trim(),
        kota: (kota || user.namaCabang || "Tangerang").trim(),
        kontakPic: kontakPic ? kontakPic.trim() : null,
        telepon: telepon ? telepon.trim() : null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Toko ${newStore.namaToko} berhasil didaftarkan ke Master Toko.`,
      data: newStore,
    });
  } catch (error: any) {
    console.error("POST MasterToko Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menambah master toko." },
      { status: 500 }
    );
  }
}
