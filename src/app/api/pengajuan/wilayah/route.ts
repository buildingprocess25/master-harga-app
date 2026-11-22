import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRoleAction } from "@/lib/auth/require-role";
import { DomainError } from "@/lib/services/transisi-tiket";
import {
  ajukanHargaWilayahLangsung,
  getTemplatePengajuanWilayah,
} from "@/lib/services/wilayah-pengajuan-service";

async function resolveCabangBm(cabangIdUser: string | null | undefined) {
  if (cabangIdUser) return cabangIdUser;
  const fallback = await prisma.cabang.findFirst({
    where: { isActive: true },
    orderBy: { kodeCabang: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRoleAction(["BM_MANAGER", "PP_MANAGER"]);
    const cabangId = await resolveCabangBm(user.cabangId);
    if (!cabangId) {
      return NextResponse.json(
        { success: false, message: "Cabang pengguna tidak ditemukan." },
        { status: 400 }
      );
    }

    const sp = request.nextUrl.searchParams;
    const masterItemId = sp.get("masterItemId")?.trim() || "";
    const divisiId = sp.get("divisiId")?.trim() || "";
    const tiketRevisiId = sp.get("tiketRevisiId")?.trim() || null;

    if (!masterItemId || !divisiId) {
      return NextResponse.json(
        { success: false, message: "Parameter item dan divisi wajib diisi." },
        { status: 400 }
      );
    }

    const data = await getTemplatePengajuanWilayah({
      masterItemId,
      cabangId,
      divisiId,
      tiketRevisiId,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const status = error instanceof DomainError ? error.status : 500;
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal memuat template harga wilayah." },
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
    const {
      masterItemId,
      divisiId,
      wilayahCabangId,
      hargaKomponen,
      alasan,
      tiketRevisiId,
    } = body ?? {};

    if (!masterItemId || !divisiId || !wilayahCabangId || !Array.isArray(hargaKomponen)) {
      return NextResponse.json(
        { success: false, message: "Data pengajuan harga wilayah belum lengkap." },
        { status: 400 }
      );
    }

    const result = await ajukanHargaWilayahLangsung({
      masterItemId: String(masterItemId),
      cabangId,
      divisiId: String(divisiId),
      wilayahCabangId: String(wilayahCabangId),
      hargaKomponen,
      alasan: typeof alasan === "string" ? alasan : undefined,
      pembuatUserId: user.id,
      tiketRevisiId: tiketRevisiId ? String(tiketRevisiId) : null,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Tiket ${result.nomorTiket} untuk ${result.namaWilayah} dikirim ke Approval S&B.`,
        data: result,
      },
      { status: tiketRevisiId ? 200 : 201 }
    );
  } catch (error: any) {
    const status = error instanceof DomainError ? error.status : 500;
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal mengajukan harga wilayah." },
      { status }
    );
  }
}
