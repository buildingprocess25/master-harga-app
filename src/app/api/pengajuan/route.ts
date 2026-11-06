import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { CakupanHarga, StatusPengajuanHarga, PengajuanHargaItem } from "@/types";

export async function GET(request: NextRequest) {
  try {
    let user = await getSessionUser();
    // Jika sesi belum ada di dev/preview, fallback ke user BM default agar antrean tetap tampil
    if (!user) {
      const defaultBm = await prisma.user.findFirst({
        where: { role: "BM_MANAGER" },
        include: { cabang: true },
      });
      if (defaultBm) {
        user = {
          id: defaultBm.id,
          email: defaultBm.email,
          fullName: defaultBm.fullName,
          role: defaultBm.role,
          cabangId: defaultBm.cabangId,
          namaCabang: defaultBm.cabang?.namaCabang || "Cikokol",
          divisiId: defaultBm.divisiId,
        };
      }
    }

    const { searchParams } = new URL(request.url);
    const divisiId = searchParams.get("divisiId");
    const status = searchParams.get("status");
    const cakupan = searchParams.get("cakupan");
    const cabangParam = searchParams.get("cabang");
    const search = searchParams.get("q")?.trim() || "";

    const where: any = {};

    // Jika role adalah BM_MANAGER atau BUILDING_COORDINATOR, wajib dikunci ke cabang pengguna saja
    if (user && (user.role === "BM_MANAGER" || user.role === "BUILDING_COORDINATOR")) {
      if (user.cabangId) {
        where.cabangId = user.cabangId;
      }
    } else if (cabangParam && cabangParam !== "all") {
      where.cabang = {
        namaCabang: { contains: cabangParam, mode: "insensitive" },
      };
    } else if (
      user &&
      user.role !== "ADMIN" &&
      user.role !== "SB_SPECIALIST" &&
      user.role !== "REGIONAL_MANAGER" &&
      user.cabangId
    ) {
      // Jika tidak ada query spesifik, default ke cabang pengguna
      where.cabangId = user.cabangId;
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

    // Petakan ke antarmuka PengajuanHargaItem yang komprehensif
    const formattedData: PengajuanHargaItem[] = items.map((t) => {
      const cleanCabang = (t.cabang?.namaCabang || "").replace(/^Cabang\s+/i, "");
      return {
        id: t.id,
        noTiket: t.nomorTiket,
        kodeItem: t.masterItem?.kodeItem || "ITEM",
        namaItem: t.masterItem?.namaItem || "Material",
        kategori: t.masterItem?.kategori || "Pekerjaan",
        merk: t.masterItem?.merk || "",
        tipe: t.masterItem?.tipe || "",
        ukuran: t.masterItem?.ukuran || "",
        warna: t.masterItem?.warna || "",
        lokasi: t.masterItem?.lokasi || "",
        divisiId: t.divisiId,
        namaDivisi: t.divisi?.namaDivisi,
        kodeDivisi: t.divisi?.kodeDivisi,
        cabangId: t.cabangId,
        namaCabang: t.cabang?.namaCabang,
        kodeCabang: t.cabang?.kodeCabang,
        cakupanHarga: t.cakupanHarga,
        wilayahCabangId: t.wilayahCabangId,
        namaWilayah: t.wilayahCabang?.namaWilayah,
        status: t.status,
        tanggalPengajuan: t.tanggalPengajuan.toISOString().slice(0, 10),
        alasanPengajuan: t.catatanReview || undefined,
        catatanReviewTerakhir: t.catatanReview || undefined,
        surveiTokoList: [],
        hargaAcuanPasar: t.rataRataSurveiMaterial ? Number(t.rataRataSurveiMaterial) : undefined,
        koefisienItems: [],
        liveMarginUpah: Number(t.marginAwalPersen) || 8.0,
        liveMarginMaterial: Number(t.marginAwalPersen) || 8.0,
        liveMarginBongkaran: Number(t.marginAwalPersen) || 8.0,
        totalHpp: 0,
        totalHargaSatuan: 0,

        // Aliases untuk kesesuaian tabel
        kode: t.masterItem?.kodeItem || "ITEM",
        kodeMaster: t.masterItem?.kodeMaster || "",
        item: t.masterItem?.namaItem || "Material",
        cabang: cleanCabang || "Cikokol",
        deskripsiOtomatis: t.masterItem?.deskripsiOtomatis || "",
        satuan: t.masterItem?.satuan || "m2",
        tebal: t.masterItem?.tebal || "",
        permukaan: t.masterItem?.permukaan || "",
        toleransi: t.masterItem?.toleransi || "",
        implementasi: "Lantai",
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
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

    const body = await request.json();
    const {
      mode, // 'new' | 'existing'
      divisiId,
      cakupanHarga, // 'INDUK_CABANG' | 'KHUSUS_WILAYAH'
      wilayahCabangId,
      alasanPengajuan,
      isTermasukBongkaran,
      masterItemId,
      kodeItem,
      namaItem,
      item,
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
      cabang,
    } = body;

    const actualItemName = (namaItem || item || "").trim();
    if (!actualItemName) {
      return NextResponse.json(
        { success: false, message: "Nama item material wajib diisi." },
        { status: 400 }
      );
    }

    // Resolve divisi
    let resolvedDivisiId = divisiId || user.divisiId;
    if (!resolvedDivisiId) {
      const defaultDiv = await prisma.divisi.findFirst({ where: { isActive: true } });
      resolvedDivisiId = defaultDiv?.id;
    }
    if (!resolvedDivisiId) {
      return NextResponse.json(
        { success: false, message: "Divisi tidak ditemukan di sistem." },
        { status: 400 }
      );
    }

    // Resolve cabang
    let resolvedCabangId = user.cabangId;
    if (!resolvedCabangId && cabang) {
      const foundCabang = await prisma.cabang.findFirst({
        where: { namaCabang: { contains: cabang, mode: "insensitive" } },
      });
      resolvedCabangId = foundCabang?.id;
    }
    if (!resolvedCabangId) {
      const firstCabang = await prisma.cabang.findFirst();
      resolvedCabangId = firstCabang?.id;
    }
    if (!resolvedCabangId) {
      return NextResponse.json(
        { success: false, message: "Cabang operasional tidak ditemukan di sistem." },
        { status: 400 }
      );
    }

    // Eksekusi transaksional pembuatan tiket
    const result = await prisma.$transaction(async (tx) => {
      let resolvedItemId = masterItemId;

      // 1. Jika mode === 'new' atau belum ada masterItemId, buat MasterItem
      if (mode === "new" || !resolvedItemId) {
        const cleanKodeItem = (kodeItem || `SIP-${Date.now().toString().slice(-3)}`).toUpperCase();
        const cleanKodeMaster = `${cleanKodeItem}-01-${(kategori || "Umum").replace(/\s+/g, "")}`;

        const autoDesc = [
          actualItemName,
          ukuran,
          merk,
          warna,
          tipe ? `Tipe ${tipe}` : "",
          tebal ? `Tebal ${tebal}` : "",
          permukaan,
          toleransi ? `Toleransi ${toleransi}` : "",
        ]
          .filter(Boolean)
          .join(" ");

        const newItem = await tx.masterItem.create({
          data: {
            divisiId: resolvedDivisiId,
            kodeItem: cleanKodeItem,
            kodeVarian: "01",
            kodeMaster: cleanKodeMaster,
            kategori: kategori || "Pekerjaan Konstruksi",
            namaItem: actualItemName,
            ukuran: ukuran || "-",
            merk: merk || "Standar Alfamart",
            tipe: tipe || null,
            warna: warna || null,
            permukaan: permukaan || null,
            tebal: tebal || null,
            toleransi: toleransi || null,
            lokasi: lokasi || "Area Toko",
            satuan: (satuan || "m2").toUpperCase(),
            deskripsiOtomatis: autoDesc,
          },
        });

        resolvedItemId = newItem.id;
      }

      // 2. Buat Nomor Tiket Unik (Format: REQ-2026-XXX)
      const count = await tx.pengajuanHarga.count();
      const currentYear = new Date().getFullYear();
      let nomorTiket = `REQ-${currentYear}-${String(count + 1).padStart(3, "0")}`;

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
          divisiId: resolvedDivisiId,
          cabangId: resolvedCabangId,
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
          catatan: alasanPengajuan || `Inisiasi spesifikasi material baru oleh ${user.fullName}`,
        },
      });

      return pengajuan;
    });

    return NextResponse.json({
      success: true,
      message: `Permohonan spesifikasi #${result.nomorTiket} berhasil diajukan ke server.`,
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
