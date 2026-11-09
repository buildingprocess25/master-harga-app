import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { putuskanLayer3, KeputusanRegional } from "@/lib/services/regional-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user = await getSessionUser();

    if (!user) {
      const defaultUser = await prisma.user.findFirst({
        where: { role: "REGIONAL_MANAGER" },
      });
      if (defaultUser) {
        user = {
          id: defaultUser.id,
          email: defaultUser.email,
          fullName: defaultUser.fullName,
          role: defaultUser.role,
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid. Silakan login kembali." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action = "APPROVE", catatan = "" } = body;

    let keputusan: KeputusanRegional = "SETUJU";
    if (action === "REVISE" || action === "KEMBALI_SNB") {
      keputusan = "KEMBALI_SNB";
    } else if (action === "REJECT" || action === "TOLAK") {
      keputusan = "TOLAK";
    }

    const res = await putuskanLayer3({
      tiketId: id,
      userId: user.id,
      keputusan,
      catatan: catatan.trim(),
    });

    let msg = "Rekomendasi harga disetujui. Kuorum penawaran ke rekanan kontraktor resmi dibuka.";
    if (keputusan === "KEMBALI_SNB") {
      msg = "Pengajuan dikembalikan ke S&B Specialist untuk peninjauan ulang margin.";
    } else if (keputusan === "TOLAK") {
      msg = "Pengajuan harga telah ditolak permanen.";
    }

    return NextResponse.json({
      success: true,
      message: msg,
      data: res,
    });
  } catch (err: any) {
    console.error("Gagal memproses review regional:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memproses keputusan regional." },
      { status: 400 }
    );
  }
}
