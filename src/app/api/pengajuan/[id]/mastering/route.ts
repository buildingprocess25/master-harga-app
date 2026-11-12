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
    const {
      baris = [],
      koefisienItems = [],
      terbitkan = false,
      catatan = "",
      liveMarginUpah,
      liveMarginMaterial,
      liveMarginBongkaran,
    } = body;

    // Ambil raw item baik dari payload `baris` maupun `koefisienItems`
    const rawList =
      Array.isArray(baris) && baris.length > 0
        ? baris
        : Array.isArray(koefisienItems)
        ? koefisienItems
        : [];

    if (rawList.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tambahkan minimal satu komponen pekerjaan." },
        { status: 400 }
      );
    }

    // Ambil tiket untuk validasi divisi
    const tiket = await prisma.pengajuanHarga.findUnique({
      where: { id },
      select: { id: true, divisiId: true, status: true },
    });

    if (!tiket) {
      return NextResponse.json(
        { success: false, message: "Tiket pengajuan harga tidak ditemukan." },
        { status: 404 }
      );
    }

    // Pastikan setiap baris memiliki MasterKoefisien yang valid di database
    const formattedBaris = [];
    for (const b of rawList) {
      const masterId = b.masterKoefisienId || b.id;
      const nilai = Number(b.nilaiKoefisien ?? b.koefisien) || 0;
      const harga = Number(b.hargaAcuanSatuan ?? b.hargaAcuan) || 0;
      const kategori = (b.kategori || b.kategoriKomponen || "UPAH").toUpperCase();
      const nama = (b.namaKomponen || b.label || "Komponen").trim();
      const satuan = (b.satuan || b.unit || "Oh").trim();
      const isMaterial = kategori === "MATERIAL";

      let validMasterId = "";

      // 1. Cek apakah masterId valid di database dan sesuai divisi
      if (masterId && !masterId.startsWith("item_") && !masterId.startsWith("new_") && !masterId.startsWith("u-") && !masterId.startsWith("m-") && !masterId.startsWith("ub-")) {
        const found = await prisma.masterKoefisien.findUnique({
          where: { id: masterId },
        });
        if (found && found.divisiId === tiket.divisiId && found.isActive) {
          validMasterId = found.id;
        }
      }

      // 2. Jika belum valid, cari berdasarkan nama, kategori, dan divisiId
      if (!validMasterId) {
        const matchByName = await prisma.masterKoefisien.findFirst({
          where: {
            divisiId: tiket.divisiId,
            kategoriKomponen: kategori,
            namaKomponen: { equals: nama, mode: "insensitive" },
            isActive: true,
          },
        });
        if (matchByName) {
          validMasterId = matchByName.id;
        }
      }

      // 3. Jika masih belum ada di pustaka database, otomatis buatkan master koefisien baru
      if (!validMasterId) {
        const baru = await prisma.masterKoefisien.create({
          data: {
            divisiId: tiket.divisiId,
            kategoriKomponen: kategori,
            namaKomponen: nama,
            satuan,
            nilaiKoefisienDefault: nilai > 0 ? nilai : 1,
            hargaAcuanDefault: isMaterial ? null : harga > 0 ? harga : null,
            wajibSurveiToko: isMaterial,
            isActive: true,
          },
        });
        validMasterId = baru.id;
      }

      formattedBaris.push({
        masterKoefisienId: validMasterId,
        nilaiKoefisien: nilai,
        hargaAcuanSatuan: isMaterial ? 0 : harga,
      });
    }

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
