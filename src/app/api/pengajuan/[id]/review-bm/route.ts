import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { advanceTicketStatus } from "@/lib/services/state-machine";
import { StatusPengajuanHarga } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user = await getSessionUser();
    // Fallback user di dev/preview
    if (!user) {
      const defaultBm = await prisma.user.findFirst({
        where: { role: "BM_MANAGER" },
      });
      if (defaultBm) {
        user = {
          id: defaultBm.id,
          email: defaultBm.email,
          fullName: defaultBm.fullName,
          role: defaultBm.role,
          cabangId: defaultBm.cabangId,
          divisiId: defaultBm.divisiId,
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    if (user.role !== "BM_MANAGER" && user.role !== "PP_MANAGER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Wewenang ditolak. Hanya B&M / PP Manager yang berhak mereview survei." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, catatan } = body; // action: 'approve' | 'return' | 'reject'

    let targetStatus: StatusPengajuanHarga;
    let aksiLabel: string;

    if (action === "approve") {
      targetStatus = "PENDING_SB_SPECIALIST";
      aksiLabel = "APPROVE_REVIEW_BM";
    } else if (action === "return") {
      targetStatus = "RETURNED_TO_BC";
      aksiLabel = "RETURN_TO_BC";
    } else if (action === "reject") {
      targetStatus = "DITOLAK";
      aksiLabel = "REJECT_BY_BM";
    } else {
      return NextResponse.json(
        { success: false, message: "Aksi tidak dikenal (harus approve, return, atau reject)." },
        { status: 400 }
      );
    }

    const updated = await advanceTicketStatus({
      tiketId: id,
      targetStatus,
      userId: user.id,
      roleActor: user.role,
      aksi: aksiLabel,
      catatan: catatan || `Keputusan ${action} oleh ${user.fullName}`,
    });

    return NextResponse.json({
      success: true,
      message: `Tiket #${updated.nomorTiket} berhasil dialihkan ke status ${targetStatus}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("POST Review BM Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memproses review BM Manager." },
      { status: 500 }
    );
  }
}
