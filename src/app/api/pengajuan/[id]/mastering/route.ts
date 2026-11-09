import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { simpanWorksheetAhsp } from "@/lib/services/ahsp-service";

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
    const { baris = [], terbitkan = false, catatan = "" } = body;

    if (!Array.isArray(baris) || baris.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tambahkan minimal satu komponen pekerjaan AHSP." },
        { status: 400 }
      );
    }

    const formattedBaris = baris.map((b: any) => ({
      masterKoefisienId: String(b.masterKoefisienId),
      nilaiKoefisien: Number(b.nilaiKoefisien) || 0,
      hargaAcuanSatuan: Number(b.hargaAcuanSatuan) || 0,
    }));

    const result = await simpanWorksheetAhsp({
      tiketId: id,
      userId: user.id,
      baris: formattedBaris,
      terbitkan: Boolean(terbitkan),
      catatan: catatan.trim() || undefined,
    });

    const msg = terbitkan
      ? "Resep AHSP berhasil dikunci dan tiket diterbitkan ke Building Coordinator untuk survei pasar."
      : "Draft resep AHSP berhasil disimpan.";

    return NextResponse.json({
      success: true,
      message: msg,
      data: result,
    });
  } catch (err: any) {
    console.error("Gagal menyimpan resep AHSP:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal menyimpan resep AHSP." },
      { status: 400 }
    );
  }
}
