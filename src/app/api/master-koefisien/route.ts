import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { cariKoefisien, buatKoefisienBaru } from "@/lib/services/ahsp-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const divisiId = searchParams.get("divisiId");
    const kategori = searchParams.get("kategori") || undefined;
    const q = searchParams.get("q") || undefined;

    if (!divisiId) {
      // Jika divisiId tidak diberikan, coba ambil dari divisi pertama atau query semua
      const all = await prisma.masterKoefisien.findMany({
        where: {
          isActive: true,
          ...(kategori ? { kategoriKomponen: kategori } : {}),
          ...(q ? { namaKomponen: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: [{ kategoriKomponen: "asc" }, { namaKomponen: "asc" }],
        take: 150,
      });

      return NextResponse.json({
        success: true,
        data: all.map((k) => ({
          id: k.id,
          divisiId: k.divisiId,
          kategori: k.kategoriKomponen,
          namaKomponen: k.namaKomponen,
          satuan: k.satuan,
          nilaiKoefisienDefault: Number(k.nilaiKoefisienDefault),
          hargaAcuanDefault: k.hargaAcuanDefault ? Number(k.hargaAcuanDefault) : null,
          wajibSurveiToko: k.wajibSurveiToko,
        })),
      });
    }

    const items = await cariKoefisien({ divisiId, kategori, q });
    return NextResponse.json({ success: true, data: items });
  } catch (err: any) {
    console.error("Gagal memuat master koefisien:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memuat pustaka koefisien." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();

    const {
      divisiId,
      kategori,
      namaKomponen,
      satuan,
      nilaiKoefisienDefault,
      hargaAcuanDefault,
      wajibSurveiToko,
    } = body;

    if (!divisiId || !kategori || !namaKomponen || !satuan) {
      return NextResponse.json(
        { success: false, message: "Semua kolom wajib diisi dengan lengkap." },
        { status: 400 }
      );
    }

    const baru = await buatKoefisienBaru({
      divisiId,
      kategori,
      namaKomponen,
      satuan,
      nilaiKoefisienDefault: Number(nilaiKoefisienDefault) || 1,
      hargaAcuanDefault: hargaAcuanDefault !== null && hargaAcuanDefault !== undefined ? Number(hargaAcuanDefault) : null,
      wajibSurveiToko: Boolean(wajibSurveiToko),
    });

    return NextResponse.json({
      success: true,
      message: `Komponen "${namaKomponen}" berhasil ditambahkan ke pustaka.`,
      data: baru,
    });
  } catch (err: any) {
    console.error("Gagal menambah koefisien baru:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal menambah koefisien baru." },
      { status: 400 }
    );
  }
}
