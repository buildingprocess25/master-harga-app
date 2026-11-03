import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { CakupanHarga, StatusPengajuanHarga } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const divisiId = searchParams.get("divisiId");
    const status = searchParams.get("status");
    const cakupan = searchParams.get("cakupan");
    const search = searchParams.get("q")?.trim() || "";

    const where: any = {};

    // Filter lingkup cabang pengguna (kecuali HO / Admin yang melihat semua)
    if (user.role === "BM_MANAGER" || user.role === "PP_MANAGER" || user.role === "BUILDING_COORDINATOR") {
      if (user.cabangId) {
        where.cabangId = user.cabangId;
      }
    }

    if (divisiId && divisiId !== "ALL") {
      where.divisiId = divisiId;
    }

    if (status && status !== "ALL") {
      where.status = status as StatusPengajuanHarga;
    }

    if (cakupan && cakupan !== "ALL") {
      where.cakupanHarga = cakupan as CakupanHarga;
    }

    if (search) {
      where.OR = [
        { nomorTiket: { contains: search, mode: "insensitive" } },
        { masterItem: { namaItem: { contains: search, mode: "insensitive" } } },
        { masterItem: { kodeItem: { contains: search, mode: "insensitive" } } },
        { masterItem: { merk: { contains: search, mode: "insensitive" } } },
      ];
    }

    const items = await prisma.pengajuanHarga.findMany({
      where,
      orderBy: { tanggalPengajuan: "desc" },
      include: {
        divisi: { select: { id: true, kodeDivisi: true, namaDivisi: true } },
        cabang: { select: { id: true, kodeCabang: true, namaCabang: true } },
        wilayahCabang: { select: { id: true, kodeWilayah: true, namaWilayah: true } },
        masterItem: true,
        pembuatUser: { select: { id: true, fullName: true, role: true } },
        _count: {
          select: {
            rincianAHSP: true,
            votingKontraktorList: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("GET Pengajuan Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar pengajuan." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    // Hanya BM Manager, PP Manager, atau Admin yang berhak inisiasi
    if (user.role !== "BM_MANAGER" && user.role !== "PP_MANAGER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki wewenang menginisiasi pengajuan harga." },
        { status: 403 }
      );
    }

    if (!user.cabangId && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Pengguna belum terhubung ke cabang manapun." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      mode, // 'new' | 'existing'
      divisiId,
      cakupanHarga, // 'INDUK_CABANG' | 'KHUSUS_WILAYAH'
      wilayahCabangId,
      alasanPengajuan,
      isTermasukBongkaran,
      // Jika mode === 'existing'
      masterItemId,
      // Jika mode === 'new'
      kodeItem,
      namaItem,
      kategori,
      merk,
      ukuran,
      tipe,
      warna,
      permukaan,
      tebal,
      toleransi,
      lokasi,
      satuan,
    } = body;

    if (!divisiId) {
      return NextResponse.json(
        { success: false, message: "Divisi wajib dipilih." },
        { status: 400 }
      );
    }

    if (cakupanHarga === "KHUSUS_WILAYAH" && !wilayahCabangId) {
      return NextResponse.json(
        { success: false, message: "Sub-wilayah wajib dipilih untuk cakupan harga khusus wilayah." },
        { status: 400 }
      );
    }

    const cabangId = user.cabangId!;

    // Eksekusi transaksional pembuatan tiket
    const result = await prisma.$transaction(async (tx) => {
      let resolvedItemId = masterItemId;

      // 1. Jika mode === 'new', buat record MasterItem terlebih dahulu
      if (mode === "new" || !resolvedItemId) {
        if (!namaItem || !kategori || !satuan) {
          throw new Error("Nama item, kategori, dan satuan wajib diisi untuk spesifikasi baru.");
        }

        const cleanKodeItem = (kodeItem || `ITEM-${Date.now().toString().slice(-4)}`).toUpperCase();
        const kodeMaster = `${cleanKodeItem}-01`;

        const autoDesc = [
          namaItem,
          merk,
          ukuran,
          tipe,
          warna,
          permukaan,
          tebal ? `Tebal ${tebal}` : "",
        ]
          .filter(Boolean)
          .join(" ");

        const newItem = await tx.masterItem.create({
          data: {
            divisiId,
            kodeItem: cleanKodeItem,
            kodeVarian: "01",
            kodeMaster,
            kategori,
            namaItem,
            ukuran: ukuran || "-",
            merk: merk || "Standar Alfamart",
            tipe: tipe || null,
            warna: warna || null,
            permukaan: permukaan || null,
            tebal: tebal || null,
            toleransi: toleransi || null,
            lokasi: lokasi || "Area Toko",
            satuan: satuan.toUpperCase(),
            deskripsiOtomatis: autoDesc,
          },
        });

        resolvedItemId = newItem.id;
      }

      // 2. Buat Nomor Tiket Unik (Format: REQ-2026-XXX)
      const count = await tx.pengajuanHarga.count();
      const currentYear = new Date().getFullYear();
      let nomorTiket = `REQ-${currentYear}-${String(count + 1).padStart(3, "0")}`;

      // Cek kemungkinan duplikasi nomor tiket
      const existingTiket = await tx.pengajuanHarga.findUnique({
        where: { nomorTiket },
      });
      if (existingTiket) {
        nomorTiket = `REQ-${currentYear}-${String(count + 1).padStart(3, "0")}-${Math.floor(10 + Math.random() * 90)}`;
      }

      // 3. Buat PengajuanHarga
      const pengajuan = await tx.pengajuanHarga.create({
        data: {
          nomorTiket,
          divisiId,
          cabangId,
          wilayahCabangId: cakupanHarga === "KHUSUS_WILAYAH" ? wilayahCabangId : null,
          masterItemId: resolvedItemId,
          pembuatUserId: user.id,
          cakupanHarga: (cakupanHarga as CakupanHarga) || "INDUK_CABANG",
          status: "DIAJUKAN",
          isTermasukBongkaran: Boolean(isTermasukBongkaran),
          marginAwalPersen: 8.0,
          catatanReview: alasanPengajuan || null,
        },
        include: {
          masterItem: true,
          divisi: true,
          cabang: true,
          wilayahCabang: true,
        },
      });

      // 4. Catat Riwayat Audit
      await tx.approvalAuditLog.create({
        data: {
          pengajuanHargaId: pengajuan.id,
          userId: user.id,
          roleActor: user.role,
          action: "SUBMIT_PENGAJUAN",
          catatan: alasanPengajuan || `Inisiasi permohonan harga satuan baru oleh ${user.fullName}`,
        },
      });

      return pengajuan;
    });

    return NextResponse.json({
      success: true,
      message: `Permohonan harga #${result.nomorTiket} berhasil diajukan ke S&B Specialist.`,
      data: result,
    });
  } catch (error: any) {
    console.error("POST Pengajuan Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuat pengajuan harga." },
      { status: 500 }
    );
  }
}
