import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRoleAction } from "@/lib/auth/require-role";
import { DomainError } from "@/lib/services/transisi-tiket";
import {
  ajukanReviewUlangMassal,
  getKatalogAktifUntukReview,
} from "@/lib/services/review-pengajuan-service";

async function resolveCabangBm(cabangIdUser: string | null | undefined) {
  if (cabangIdUser) return cabangIdUser;
  const fallback = await prisma.cabang.findFirst({
    where: { isActive: true },
    orderBy: { kodeCabang: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

export async function GET() {
  try {
    const user = await requireRoleAction(["BM_MANAGER", "PP_MANAGER"]);
    const cabangId = await resolveCabangBm(user.cabangId);
    if (!cabangId) {
      return NextResponse.json(
        { success: false, message: "Cabang pengguna tidak ditemukan." },
        { status: 400 }
      );
    }

    const data = await getKatalogAktifUntukReview(cabangId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const status = error instanceof DomainError ? error.status : 500;
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal memuat katalog review ulang." },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRoleAction(["BM_MANAGER", "PP_MANAGER"]);
    const cabangId = await resolveCabangBm(user.cabangId);
    if (!cabangId) {
      return NextResponse.json(
        { success: false, message: "Cabang pengguna tidak ditemukan." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Minimal 1 item pengajuan review wajib diisi." },
        { status: 400 }
      );
    }

    const created = await ajukanReviewUlangMassal({
      cabangId,
      pembuatUserId: user.id,
      items,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${created.length} tiket review ulang dikirim ke Approval S&B.`,
        data: created,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error instanceof DomainError ? error.status : 500;
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengajukan review ulang." },
      { status }
    );
  }
}
