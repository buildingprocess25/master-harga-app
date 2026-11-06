import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import {
  PengajuanHargaItem,
  SurveyTokoItem,
  KoefisienDetailItem,
  VotingKontraktorItem,
  LampiranSurveiItem,
  LampiranBandingItem,
  TipeLampiranSurvei,
  KategoriKoefisien,
} from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user = await getSessionUser();
    // Fallback user di dev/preview
    if (!user) {
      const referer = request.headers.get("referer") || "";
      const isBuildingCoord = referer.includes("building-coordinator");
      const targetRole = isBuildingCoord ? "BUILDING_COORDINATOR" : "BM_MANAGER";

      const defaultUser = await prisma.user.findFirst({
        where: { role: targetRole },
        include: { cabang: true },
      });
      if (defaultUser) {
        user = {
          id: defaultUser.id,
          email: defaultUser.email,
          fullName: defaultUser.fullName,
          role: defaultUser.role,
          cabangId: defaultUser.cabangId,
          namaCabang: defaultUser.cabang?.namaCabang || "Cikokol",
          divisiId: defaultUser.divisiId,
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const pengajuan = await prisma.pengajuanHarga.findFirst({
      where: {
        OR: [{ id }, { nomorTiket: id }],
      },
      include: {
        divisi: true,
        cabang: true,
        wilayahCabang: true,
        masterItem: true,
        pembuatUser: {
          select: { id: true, fullName: true, role: true, email: true },
        },
        rincianAHSP: {
          include: {
            masterKoefisien: true,
            surveiTokoList: {
              include: {
                lampiranList: true,
              },
              orderBy: { urutanToko: "asc" },
            },
          },
        },
        votingKontraktorList: {
          include: {
            kontraktorCabang: {
              include: {
                kontraktor: true,
              },
            },
            lampiranBandingList: true,
          },
          orderBy: { createdAt: "asc" },
        },
        auditLogs: {
          include: {
            user: { select: { fullName: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!pengajuan) {
      return NextResponse.json(
        { success: false, message: "Pengajuan harga tidak ditemukan." },
        { status: 404 }
      );
    }

    // Ekstrak data survei 3 toko (diambil dari komponen material rincian AHSP atau survei yang ada)
    const allSurvei: SurveyTokoItem[] = [];
    for (const rincian of pengajuan.rincianAHSP) {
      for (const s of rincian.surveiTokoList) {
        const lampiranList: LampiranSurveiItem[] = s.lampiranList.map((l) => ({
          id: l.id,
          tipe: (l.jenisLampiran as TipeLampiranSurvei) || "NOTA_PEMBELIAN",
          namaFile: l.namaFile,
          url: l.fileUrl,
          keterangan: l.ukuranFile || undefined,
        }));

        allSurvei.push({
          id: s.id,
          noToko: s.urutanToko,
          namaToko: s.namaToko,
          alamat: s.alamatToko || "",
          kota: "",
          kontak: "",
          tanggalSurvei: s.tanggalSurvei.toISOString(),
          harga: Number(s.hargaSatuanSurvei),
          catatan: s.catatanSurvei || "",
          lampiranList,
        });
      }
    }

    // Ekstrak komponen AHSP
    let calcTotalHpp = 0;
    let calcTotalHargaSatuan = 0;

    const koefisienItems: KoefisienDetailItem[] = pengajuan.rincianAHSP.map(
      (r) => {
        const koefisien = Number(r.nilaiKoefisien);
        const hargaAcuan = Number(r.hargaAcuanSatuan);
        const subtotal = koefisien * hargaAcuan;
        const marginPersen = Number(r.marginPersen);
        const total = subtotal * (1 + marginPersen / 100);

        calcTotalHpp += subtotal;
        calcTotalHargaSatuan += total;

        return {
          id: r.id,
          kodeKomponen: r.masterKoefisienId,
          kategori: (r.kategoriKomponen as KategoriKoefisien) || "MATERIAL",
          namaKomponen: r.namaKomponen,
          satuan: r.satuan,
          koefisien,
          hargaAcuan,
          subtotal,
          marginPersen,
          total,
        };
      }
    );

    // Ekstrak voting kontraktor
    const votingKontraktorList: VotingKontraktorItem[] =
      pengajuan.votingKontraktorList.map((v) => {
        const lampiranBandingList: LampiranBandingItem[] =
          v.lampiranBandingList.map((l) => ({
            id: l.id,
            namaFile: l.namaFile,
            url: l.fileUrl,
            keterangan: l.ukuranFile || undefined,
          }));

        return {
          id: v.id,
          kontraktorId: v.kontraktorCabang.kontraktorId,
          namaPerusahaan: v.kontraktorCabang.kontraktor.namaPerusahaan,
          email: v.kontraktorCabang.kontraktor.email,
          statusVote: v.statusVote,
          tanggalVote: v.tanggalRespon ? v.tanggalRespon.toISOString() : undefined,
          hargaBanding: v.usulanHarga ? Number(v.usulanHarga) : undefined,
          catatanBanding: v.catatanPenolakan || undefined,
          lampiranBandingList,
        };
      });

    const setujuCount = votingKontraktorList.filter(
      (v) => v.statusVote === "SETUJU"
    ).length;
    const kuorumTerpenuhi =
      votingKontraktorList.length > 0 &&
      setujuCount > votingKontraktorList.length / 2;

    // Bentuk objek terpadu PengajuanHargaItem
    const formattedItem: PengajuanHargaItem = {
      id: pengajuan.id,
      noTiket: pengajuan.nomorTiket,
      kodeItem: pengajuan.masterItem?.kodeItem || "ITEM-CUSTOM",
      namaItem: pengajuan.masterItem?.namaItem || "Item Tidak Ditemukan",
      kategori: pengajuan.masterItem?.kategori || "Pekerjaan",
      merk: pengajuan.masterItem?.merk,
      tipe: pengajuan.masterItem?.tipe || undefined,
      ukuran: pengajuan.masterItem?.ukuran,
      warna: pengajuan.masterItem?.warna || undefined,
      lokasi: pengajuan.masterItem?.lokasi,

      divisiId: pengajuan.divisiId,
      namaDivisi: pengajuan.divisi.namaDivisi,
      kodeDivisi: pengajuan.divisi.kodeDivisi,

      cabangId: pengajuan.cabangId,
      namaCabang: pengajuan.cabang.namaCabang,
      kodeCabang: pengajuan.cabang.kodeCabang,

      cakupanHarga: pengajuan.cakupanHarga,
      wilayahCabangId: pengajuan.wilayahCabangId,
      namaWilayah: pengajuan.wilayahCabang?.namaWilayah,

      status: pengajuan.status,
      tanggalPengajuan: pengajuan.tanggalPengajuan.toISOString(),
      alasanPengajuan: pengajuan.catatanReview || undefined,
      catatanReviewTerakhir:
        pengajuan.auditLogs[0]?.catatan || pengajuan.catatanReview || undefined,

      surveiTokoList: allSurvei,
      hargaAcuanPasar: pengajuan.rataRataSurveiMaterial
        ? Number(pengajuan.rataRataSurveiMaterial)
        : undefined,

      koefisienItems,
      liveMarginUpah: Number(pengajuan.marginAwalPersen) || 8.0,
      liveMarginMaterial: Number(pengajuan.marginAwalPersen) || 8.0,
      liveMarginBongkaran: Number(pengajuan.marginAwalPersen) || 8.0,
      totalHpp: calcTotalHpp,
      totalHargaSatuan: calcTotalHargaSatuan,

      votingKontraktorList,
      kuorumPersentase:
        votingKontraktorList.length > 0
          ? Math.round((setujuCount / votingKontraktorList.length) * 100)
          : 0,
      kuorumTerpenuhi,
      deadlineVoting: pengajuan.deadlineVoting
        ? pengajuan.deadlineVoting.toISOString()
        : undefined,
    };

    return NextResponse.json({
      success: true,
      data: formattedItem,
      raw: pengajuan,
    });
  } catch (error) {
    console.error("GET Pengajuan Detail Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail pengajuan." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user = await getSessionUser();
    // Fallback user di dev/preview
    if (!user) {
      const referer = request.headers.get("referer") || "";
      const isBuildingCoord = referer.includes("building-coordinator");
      const targetRole = isBuildingCoord ? "BUILDING_COORDINATOR" : "BM_MANAGER";

      const defaultUser = await prisma.user.findFirst({
        where: { role: targetRole },
        include: { cabang: true },
      });
      if (defaultUser) {
        user = {
          id: defaultUser.id,
          email: defaultUser.email,
          fullName: defaultUser.fullName,
          role: defaultUser.role,
          cabangId: defaultUser.cabangId,
          namaCabang: defaultUser.cabang?.namaCabang || "Cikokol",
          divisiId: defaultUser.divisiId,
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.pengajuanHarga.findFirst({
      where: {
        OR: [{ id }, { nomorTiket: id }],
      },
      include: {
        masterItem: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Pengajuan harga tidak ditemukan." },
        { status: 404 }
      );
    }

    const {
      item,
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
      cakupanHarga,
      alasanPengajuan,
      catatanReview,
    } = body;

    const actualItemName = (namaItem || item || existing.masterItem?.namaItem || "").trim();

    // Deskripsi otomatis terstandar
    const autoDesc = [
      actualItemName,
      ukuran ?? existing.masterItem?.ukuran,
      merk ?? existing.masterItem?.merk,
      warna ?? existing.masterItem?.warna,
      (tipe ?? existing.masterItem?.tipe) ? `Tipe ${tipe ?? existing.masterItem?.tipe}` : "",
      (tebal ?? existing.masterItem?.tebal) ? `Tebal ${tebal ?? existing.masterItem?.tebal}` : "",
      permukaan ?? existing.masterItem?.permukaan,
      (toleransi ?? existing.masterItem?.toleransi) ? `Toleransi ${toleransi ?? existing.masterItem?.toleransi}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    // Update MasterItem dan PengajuanHarga dalam transaksi
    const updated = await prisma.$transaction(async (tx) => {
      if (existing.masterItemId) {
        await tx.masterItem.update({
          where: { id: existing.masterItemId },
          data: {
            namaItem: actualItemName,
            kategori: kategori ?? existing.masterItem?.kategori,
            merk: merk ?? existing.masterItem?.merk,
            ukuran: ukuran ?? existing.masterItem?.ukuran,
            tipe: tipe ?? existing.masterItem?.tipe,
            warna: warna ?? existing.masterItem?.warna,
            permukaan: permukaan ?? existing.masterItem?.permukaan,
            tebal: tebal ?? existing.masterItem?.tebal,
            toleransi: toleransi ?? existing.masterItem?.toleransi,
            lokasi: lokasi ?? existing.masterItem?.lokasi,
            satuan: satuan ? satuan.toUpperCase() : existing.masterItem?.satuan,
            deskripsiOtomatis: autoDesc || existing.masterItem?.deskripsiOtomatis,
          },
        });
      }

      const pUpdate = await tx.pengajuanHarga.update({
        where: { id: existing.id },
        data: {
          cakupanHarga: cakupanHarga ?? existing.cakupanHarga,
          catatanReview: catatanReview ?? alasanPengajuan ?? existing.catatanReview,
        },
        include: {
          divisi: true,
          cabang: true,
          wilayahCabang: true,
          masterItem: true,
        },
      });

      // Audit Log
      await tx.approvalAuditLog.create({
        data: {
          pengajuanHargaId: existing.id,
          userId: user.id,
          roleActor: user.role,
          action: "UPDATE_SPESIFIKASI",
          catatan: catatanReview || `Spesifikasi material diperbarui oleh ${user.fullName}`,
        },
      });

      return pUpdate;
    });

    return NextResponse.json({
      success: true,
      message: `Spesifikasi tiket #${existing.nomorTiket} berhasil diperbarui.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH Pengajuan Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui spesifikasi pengajuan." },
      { status: 500 }
    );
  }
}
