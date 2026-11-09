import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { simpanEvaluasiMargin, putuskanPascaSurvei } from "@/lib/services/margin-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user = await getSessionUser();

    if (!user) {
      const defaultUser = await prisma.user.findFirst({
        where: { role: "SB_SPECIALIST" },
      });
      if (defaultUser) {
        user = {
          id: defaultUser.id,
          email: defaultUser.email,
          fullName: defaultUser.fullName,
          role: defaultUser.role,
          divisiId: defaultUser.divisiId,
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
    const { action = "APPROVE", margin = {}, catatan = "" } = body;

    // Jika aksinya KEMBALIKAN_KE_BC / REVISI
    if (action === "KEMBALIKAN_KE_BC" || action === "REVISI") {
      await putuskanPascaSurvei({
        tiketId: id,
        userId: user.id,
        keputusan: "REVISI",
        catatan: catatan.trim() || "Hasil survei pasar toko perlu ditinjau ulang.",
      });

      return NextResponse.json({
        success: true,
        message: "Tiket berhasil dikembalikan ke Building Coordinator untuk perbaikan survei.",
      });
    }

    // Aksi APPROVE atau SIMPAN_DRAFT
    const marginUpah = Number(margin.upah ?? margin.liveMarginUpah ?? 8);
    const marginMaterial = Number(margin.material ?? margin.liveMarginMaterial ?? 8);
    const marginBongkaran = Number(margin.bongkaran ?? margin.liveMarginBongkaran ?? 8);
    const teruskan = action === "APPROVE" || body.teruskan === true;

    const res = await simpanEvaluasiMargin({
      tiketId: id,
      userId: user.id,
      margin: {
        upah: marginUpah,
        material: marginMaterial,
        bongkaran: marginBongkaran,
      },
      teruskan,
      catatan: catatan.trim() || undefined,
    });

    const msg = teruskan
      ? "Evaluasi harga berhasil disimpan dan diteruskan ke Regional Manager."
      : "Draft evaluasi margin berhasil disimpan.";

    return NextResponse.json({
      success: true,
      message: msg,
      data: res,
    });
  } catch (err: any) {
    console.error("Gagal memproses evaluasi margin:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memproses evaluasi margin." },
      { status: 400 }
    );
  }
}
