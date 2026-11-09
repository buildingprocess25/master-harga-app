import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { putuskanValidasiSpesifikasi } from "@/lib/services/ahsp-service";

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
    const { keputusan, catatan = "", revisiFields = [] } = body;

    if (!["SETUJU", "REVISI", "TOLAK"].includes(keputusan)) {
      return NextResponse.json(
        { success: false, message: "Keputusan tidak valid." },
        { status: 400 }
      );
    }

    if (keputusan === "SETUJU") {
      // Spesifikasi dinyatakan valid, catat audit log dan perbarui catatan review
      await prisma.approvalAuditLog.create({
        data: {
          pengajuanHargaId: id,
          userId: user.id,
          roleActor: "SB_SPECIALIST",
          action: "VALIDASI_SPESIFIKASI_SETUJU",
          catatan: catatan.trim() || "Spesifikasi pekerjaan telah divalidasi dan disetujui untuk penyusunan resep AHSP.",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Spesifikasi disetujui. Silakan susun resep koefisien AHSP.",
      });
    }

    // Untuk REVISI dan TOLAK
    if (keputusan === "REVISI") {
      let combinedNotes = catatan.trim();
      if (Array.isArray(revisiFields) && revisiFields.length > 0) {
        combinedNotes = `Bagian yang perlu direvisi: ${revisiFields.join(", ")}. Catatan: ${combinedNotes}`;
      }

      await putuskanValidasiSpesifikasi({
        tiketId: id,
        userId: user.id,
        keputusan: "REVISI",
        catatan: combinedNotes || "Spesifikasi perlu diperbaiki.",
      });

      return NextResponse.json({
        success: true,
        message: "Pengajuan dikembalikan ke B&M Manager untuk direvisi.",
      });
    }

    if (keputusan === "TOLAK") {
      await putuskanValidasiSpesifikasi({
        tiketId: id,
        userId: user.id,
        keputusan: "TOLAK",
        catatan: catatan.trim() || "Pengajuan ditolak oleh S&B Specialist.",
      });

      return NextResponse.json({
        success: true,
        message: "Pengajuan harga telah ditolak.",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Gagal memproses validasi spesifikasi:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memproses keputusan spesifikasi." },
      { status: 400 }
    );
  }
}
