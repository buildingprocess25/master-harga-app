import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { buatDeskripsiOtomatis } from "@/lib/services/master-item-service";
import { buatKodePaket } from "@/lib/utils";
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
      let targetRole: any = "BM_MANAGER";
      if (referer.includes("sb-specialist")) {
        targetRole = "SB_SPECIALIST";
      } else if (referer.includes("regional-manager")) {
        targetRole = "REGIONAL_MANAGER";
      } else if (referer.includes("building-coordinator")) {
        targetRole = "BUILDING_COORDINATOR";
      } else if (referer.includes("kontraktor")) {
        targetRole = "KONTRAKTOR";
      }

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

    // Ekstrak komponen AHSP sekaligus data survei 3 toko per komponen
    const allSurvei: SurveyTokoItem[] = [];
    let calcTotalHpp = 0;
    let calcTotalHargaSatuan = 0;

    const koefisienItems: KoefisienDetailItem[] = pengajuan.rincianAHSP.map(
      (r) => {
        const componentSurvei: SurveyTokoItem[] = [...r.surveiTokoList]
          .sort((a, b) => a.urutanToko - b.urutanToko)
          .map((s) => {
            const lampiranList: LampiranSurveiItem[] = s.lampiranList.map((l) => ({
              id: l.id,
              tipe: (l.jenisLampiran as TipeLampiranSurvei) || "NOTA_PEMBELIAN",
              namaFile: l.namaFile,
              url: l.fileUrl,
              keterangan: l.ukuranFile || undefined,
            }));

            return {
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
            };
          });

        allSurvei.push(...componentSurvei);

        const koefisien = Number(r.nilaiKoefisien);
        const hargaAcuan = Number(r.hargaAcuanSatuan);
        const subtotal = koefisien * hargaAcuan;
        const marginPersen = Number(r.marginPersen);
        const total = subtotal * (1 + marginPersen / 100);

        calcTotalHpp += subtotal;
        calcTotalHargaSatuan += total;

        return {
          id: r.id,
          masterKoefisienId: r.masterKoefisienId,
          kodeKomponen: r.masterKoefisienId,
          kategori: (r.kategoriKomponen as KategoriKoefisien) || "MATERIAL",
          namaKomponen: r.namaKomponen,
          satuan: r.satuan,
          koefisien,
          hargaAcuan,
          subtotal,
          marginPersen,
          wajibSurveiToko: r.masterKoefisien?.wajibSurveiToko ?? false,
          total,
          surveiTokoList: componentSurvei,
        };
      }
    );

    const koefisienMaterialItems = koefisienItems
      .filter((k) => k.kategori === "MATERIAL" || k.kategori === "ALAT")
      .map((k) => {
        const stores = k.surveiTokoList || [];
        const validHarga = stores.map((s) => s.harga).filter((h) => h > 0);
        const rataRata =
          validHarga.length > 0
            ? Math.round(validHarga.reduce((a, b) => a + b, 0) / validHarga.length)
            : k.hargaAcuan;
        return {
          id: k.id,
          rincianAhspId: k.id,
          label: k.namaKomponen,
          unit: k.satuan,
          value: String(k.koefisien),
          koefisien: k.koefisien,
          surveyToko: stores,
          hargaSurveiRataRata: rataRata,
          hargaAcuan: rataRata,
          subtotal: Math.round(rataRata * k.koefisien),
        };
      });

    // Ekstrak voting kontraktor pada putaran terakhir (jika ada)
    const maxPutaran = pengajuan.votingKontraktorList.reduce(
      (max, v) => Math.max(max, v.putaranVote),
      0
    );
    const latestRoundVotes =
      maxPutaran > 0
        ? pengajuan.votingKontraktorList.filter((v) => v.putaranVote === maxPutaran)
        : pengajuan.votingKontraktorList;

    const votingKontraktorList: VotingKontraktorItem[] = latestRoundVotes.map((v) => {
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

    const lastSignificantAuditLog = pengajuan.auditLogs.find(
      (l) => l.action !== "SIMPAN_DRAFT_MARGIN"
    );
    const isRevisiMargin =
      pengajuan.status === "PENDING_SB_SPECIALIST" &&
      (lastSignificantAuditLog?.action === "BANDING_REVISI_MARGIN" ||
        lastSignificantAuditLog?.action === "KEMBALIKAN_TINJAUAN_MARGIN");

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
      kodePaket:
        pengajuan.kodePaket ||
        buatKodePaket(pengajuan.cabang.kodeCabang, pengajuan.tanggalPengajuan),
      kodeItem: pengajuan.masterItem?.kodeItem || "ITEM-CUSTOM",
      kodeMaster: pengajuan.masterItem?.kodeMaster || undefined,
      namaItem: pengajuan.masterItem?.namaItem || "Item Tidak Ditemukan",
      kategori: pengajuan.masterItem?.kategori || "Pekerjaan",
      jenisCor: pengajuan.masterItem?.jenisCor || undefined,
      merk: pengajuan.masterItem?.merk,
      tipe: pengajuan.masterItem?.tipe || undefined,
      ukuran: pengajuan.masterItem?.ukuran,
      warna: pengajuan.masterItem?.warna || undefined,
      permukaan: pengajuan.masterItem?.permukaan || undefined,
      tebal: pengajuan.masterItem?.tebal || undefined,
      toleransi: pengajuan.masterItem?.toleransi || undefined,
      lokasi: pengajuan.masterItem?.lokasi,
      satuan: pengajuan.masterItem?.satuan || undefined,
      deskripsiOtomatis: pengajuan.masterItem?.deskripsiOtomatis || undefined,

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
      isRevisiMargin,

      surveiTokoList: allSurvei,
      hargaAcuanPasar: pengajuan.rataRataSurveiMaterial
        ? Number(pengajuan.rataRataSurveiMaterial)
        : undefined,

      koefisienItems,
      koefisienMaterialItems,
      liveMarginUpah:
        koefisienItems.find((k) => k.kategori === "UPAH")?.marginPersen ??
        (Number(pengajuan.marginAwalPersen) || 8.0),
      liveMarginMaterial:
        koefisienItems.find((k) => k.kategori === "MATERIAL")?.marginPersen ??
        (Number(pengajuan.marginAwalPersen) || 8.0),
      liveMarginBongkaran:
        koefisienItems.find((k) => k.kategori === "BONGKARAN")?.marginPersen ??
        (Number(pengajuan.marginAwalPersen) || 8.0),
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
      let targetRole: any = "BM_MANAGER";
      if (referer.includes("sb-specialist")) {
        targetRole = "SB_SPECIALIST";
      } else if (referer.includes("regional-manager")) {
        targetRole = "REGIONAL_MANAGER";
      } else if (referer.includes("building-coordinator")) {
        targetRole = "BUILDING_COORDINATOR";
      } else if (referer.includes("kontraktor")) {
        targetRole = "KONTRAKTOR";
      }

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

    if (user.role === "SB_SPECIALIST" && existing.status !== "DIAJUKAN") {
      return NextResponse.json(
        {
          success: false,
          message: "S&B Specialist hanya dapat mengubah redaksi spesifikasi saat tiket berstatus DIAJUKAN.",
        },
        { status: 409 }
      );
    }

    const {
      item,
      namaItem,
      kategori,
      jenisCor,
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
    const resolvedKategori = (kategori ?? existing.masterItem?.kategori ?? "").trim();
    const isKategoriCor = resolvedKategori.toLowerCase().includes("cor");
    const resolvedJenisCor = isKategoriCor
      ? jenisCor !== undefined
        ? jenisCor?.trim() || null
        : existing.masterItem?.jenisCor ?? null
      : null;
    const resolvedUkuran = ukuran ?? existing.masterItem?.ukuran ?? "-";
    const resolvedMerk = merk ?? existing.masterItem?.merk ?? "-";
    const resolvedTipe = tipe !== undefined ? tipe?.trim() || null : existing.masterItem?.tipe ?? null;
    const resolvedWarna = warna !== undefined ? warna?.trim() || null : existing.masterItem?.warna ?? null;
    const resolvedPermukaan = permukaan !== undefined ? permukaan?.trim() || null : existing.masterItem?.permukaan ?? null;
    const resolvedTebal = tebal !== undefined ? tebal?.trim() || null : existing.masterItem?.tebal ?? null;
    const resolvedToleransi = toleransi !== undefined ? toleransi?.trim() || null : existing.masterItem?.toleransi ?? null;
    const resolvedLokasi = lokasi ?? existing.masterItem?.lokasi ?? "Area Toko";
    const resolvedSatuan = satuan ? satuan.toUpperCase() : existing.masterItem?.satuan ?? "M2";

    // Deskripsi otomatis selalu dihasilkan dari kolom terstruktur (tidak boleh diedit bebas)
    const autoDesc = buatDeskripsiOtomatis({
      kategori: resolvedKategori,
      jenisCor: resolvedJenisCor,
      namaItem: actualItemName,
      ukuran: resolvedUkuran,
      merk: resolvedMerk,
      tipe: resolvedTipe,
      warna: resolvedWarna,
      permukaan: resolvedPermukaan,
      tebal: resolvedTebal,
      toleransi: resolvedToleransi,
      lokasi: resolvedLokasi,
      satuan: resolvedSatuan,
    });

    // Update MasterItem dan PengajuanHarga dalam transaksi
    const updated = await prisma.$transaction(async (tx) => {
      if (existing.masterItemId) {
        await tx.masterItem.update({
          where: { id: existing.masterItemId },
          data: {
            namaItem: actualItemName,
            kategori: resolvedKategori,
            jenisCor: resolvedJenisCor,
            merk: resolvedMerk,
            ukuran: resolvedUkuran,
            tipe: resolvedTipe,
            warna: resolvedWarna,
            permukaan: resolvedPermukaan,
            tebal: resolvedTebal,
            toleransi: resolvedToleransi,
            lokasi: resolvedLokasi,
            satuan: resolvedSatuan,
            deskripsiOtomatis: autoDesc || existing.masterItem?.deskripsiOtomatis,
          },
        });
      }

      const isResubmittingRevision = existing.status === "PERLU_REVISI";
      const pUpdate = await tx.pengajuanHarga.update({
        where: { id: existing.id },
        data: {
          ...(isResubmittingRevision ? { status: "DIAJUKAN" } : {}),
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
          action: isResubmittingRevision ? "AJUKAN_ULANG_REVISI" : "UPDATE_SPESIFIKASI",
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
