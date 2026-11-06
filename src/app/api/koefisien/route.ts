import { NextRequest, NextResponse } from "next/server";
import { requireRoleAction } from "@/lib/auth/require-role";
import { buatKoefisienBaru, cariKoefisien } from "@/lib/services/ahsp-service";
import { DomainError } from "@/lib/services/transisi-tiket";

function errorResponse(error: unknown, konteks: string) {
  if (error instanceof DomainError) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status });
  }
  console.error(`${konteks}:`, error);
  return NextResponse.json(
    { success: false, message: "Terjadi kesalahan internal pada layanan koefisien." },
    { status: 500 }
  );
}

/**
 * GET /api/koefisien?divisiId=&kategori=&q=
 * Pustaka koefisien baku aktif untuk combobox worksheet AHSP.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoleAction(["SB_SPECIALIST", "REGIONAL_MANAGER", "ADMIN"]);
    const sp = request.nextUrl.searchParams;
    const divisiId = sp.get("divisiId");
    if (!divisiId) {
      return NextResponse.json({ success: false, message: "Parameter divisiId wajib diisi." }, { status: 400 });
    }
    const data = await cariKoefisien({
      divisiId,
      kategori: sp.get("kategori") ?? undefined,
      q: sp.get("q") ?? undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error, "Koefisien GET Error");
  }
}

/**
 * POST /api/koefisien
 * Body: { divisiId, kategori, namaKomponen, satuan, nilaiKoefisienDefault, hargaAcuanDefault?, wajibSurveiToko }
 * Menambah komponen baru ke pustaka (fitur creatable pada combobox S&B Specialist).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRoleAction(["SB_SPECIALIST"]);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "Body tidak valid." }, { status: 400 });
    }
    // S&B yang terikat divisi hanya boleh menambah pustaka divisinya sendiri.
    if (user.divisiId && user.divisiId !== body.divisiId) {
      return NextResponse.json(
        { success: false, message: "Anda hanya dapat menambah komponen untuk divisi Anda." },
        { status: 403 }
      );
    }
    const harga = body.hargaAcuanDefault;
    const data = await buatKoefisienBaru({
      divisiId: String(body.divisiId ?? ""),
      kategori: String(body.kategori ?? ""),
      namaKomponen: String(body.namaKomponen ?? ""),
      satuan: String(body.satuan ?? ""),
      nilaiKoefisienDefault: Number(body.nilaiKoefisienDefault),
      hargaAcuanDefault: harga === null || harga === undefined || harga === "" ? null : Number(harga),
      wajibSurveiToko: body.wajibSurveiToko === true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Koefisien POST Error");
  }
}
