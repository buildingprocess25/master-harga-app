import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { advanceTicketStatus } from "@/lib/services/state-machine";

interface StoreSurveyInput {
  noToko: number;
  namaToko: string;
  alamatToko?: string;
  volumeAcuan?: number;
  hargaSatuan: number;
  tanggalSurvei?: string;
  catatanSurvei?: string;
  buktiSurveiUrl?: string;
  buktiSurveiName?: string;
  lampiranList?: Array<{
    id?: string;
    tipe?: string;
    jenisLampiran?: string;
    namaFile: string;
    url?: string;
    fileUrl?: string;
    ukuranFile?: string;
  }>;
}

interface MaterialSurveyInput {
  id?: string;
  rincianAhspId?: string;
  label?: string;
  namaKomponen?: string;
  unit?: string;
  satuan?: string;
  value?: string | number;
  koefisien?: number;
  surveyToko: StoreSurveyInput[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user = await getSessionUser();
    // Fallback user di dev/preview
    if (!user) {
      const defaultBc = await prisma.user.findFirst({
        where: { role: "BUILDING_COORDINATOR" },
        include: { cabang: true },
      });
      if (defaultBc) {
        user = {
          id: defaultBc.id,
          email: defaultBc.email,
          fullName: defaultBc.fullName,
          role: defaultBc.role,
          cabangId: defaultBc.cabangId,
          namaCabang: defaultBc.cabang?.namaCabang || "Cikokol",
          divisiId: defaultBc.divisiId,
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    if (user.role !== "BUILDING_COORDINATOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Wewenang ditolak. Hanya Building Coordinator yang berhak menginput survei pasar.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const {
      materialItems = [],
      surveyToko = [],
      catatan,
    }: {
      materialItems?: MaterialSurveyInput[];
      surveyToko?: StoreSurveyInput[];
      catatan?: string;
    } = body;

    // Ambil tiket aktif
    const existing = await prisma.pengajuanHarga.findFirst({
      where: {
        OR: [{ id }, { nomorTiket: id }],
      },
      include: {
        cabang: true,
        rincianAHSP: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Pengajuan harga tidak ditemukan." },
        { status: 404 }
      );
    }

    // Validasi pembatasan cabang ketat
    if (user.role === "BUILDING_COORDINATOR" && user.cabangId) {
      if (existing.cabangId !== user.cabangId) {
        return NextResponse.json(
          {
            success: false,
            message: `Wewenang cabang ditolak. Anda hanya berwenang untuk ${user.namaCabang || "cabang terdaftar"}.`,
          },
          { status: 403 }
        );
      }
    }

    // Validasi status tiket (harus SIAP_SURVEI atau RETURNED_TO_BC)
    const validStatuses = ["SIAP_SURVEI", "RETURNED_TO_BC", "DIAJUKAN"];
    if (!validStatuses.includes(existing.status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Status tiket saat ini (${existing.status}) tidak dapat disurvei. Hanya tiket SIAP_SURVEI atau RETURNED_TO_BC yang dapat diinput survei.`,
        },
        { status: 400 }
      );
    }

    // Jika materialItems kosong tapi surveyToko ada (single material)
    let processedMaterials: MaterialSurveyInput[] = [...materialItems];
    if (processedMaterials.length === 0 && surveyToko.length > 0) {
      processedMaterials = [
        {
          rincianAhspId: existing.rincianAHSP[0]?.id,
          namaKomponen: "Material Utama",
          satuan: "Unit",
          koefisien: 1.0,
          surveyToko,
        },
      ];
    }

    if (processedMaterials.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data survei toko material tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Validasi setiap komponen material harus memiliki minimal 3 toko dengan harga > 0
    for (const mat of processedMaterials) {
      const stores = mat.surveyToko || [];
      const validStores = stores.filter(
        (s) => s.namaToko?.trim() && Number(s.hargaSatuan) > 0
      );
      if (validStores.length < 3) {
        return NextResponse.json(
          {
            success: false,
            message: `Komponen "${mat.label || mat.namaKomponen || "Material"}" harus memiliki 3 data survei toko fisik yang valid dan berharga > 0.`,
          },
          { status: 400 }
        );
      }
    }

    const isRevisi = existing.status === "RETURNED_TO_BC";

    // Simpan data survei ke dalam database secara transaksional
    const result = await prisma.$transaction(async (tx) => {
      let totalSurveiAvgSum = 0;

      for (const mat of processedMaterials) {
        const stores = mat.surveyToko || [];
        const h1 = Number(stores[0]?.hargaSatuan) || 0;
        const h2 = Number(stores[1]?.hargaSatuan) || 0;
        const h3 = Number(stores[2]?.hargaSatuan) || 0;
        const avg = Math.round((h1 + h2 + h3) / 3);
        const koefVal = Number(mat.value || mat.koefisien) || 1.0;
        const subtotal = Math.round(avg * koefVal);

        totalSurveiAvgSum += avg;

        let rincianId = mat.rincianAhspId || mat.id;

        // Cek apakah rincianAhspPengajuan ada
        if (rincianId) {
          const rincianExists = await tx.rincianAhspPengajuan.findUnique({
            where: { id: rincianId },
          });

          if (rincianExists) {
            await tx.rincianAhspPengajuan.update({
              where: { id: rincianId },
              data: {
                hargaAcuanSatuan: avg,
                subtotal,
              },
            });
          } else {
            rincianId = undefined;
          }
        }

        // Jika belum ada record rincian, buat baru atau hubungkan ke koefisien baku
        if (!rincianId) {
          const defaultKoef = await tx.masterKoefisien.findFirst({
            where: { kategoriKomponen: "MATERIAL" },
          });

          const newRincian = await tx.rincianAhspPengajuan.create({
            data: {
              pengajuanHargaId: existing.id,
              masterKoefisienId: defaultKoef?.id || "koef-mat-01",
              namaKomponen: mat.label || mat.namaKomponen || "Material Lapangan",
              kategoriKomponen: "MATERIAL",
              satuan: mat.unit || mat.satuan || "Unit",
              nilaiKoefisien: koefVal,
              hargaAcuanSatuan: avg,
              subtotal,
            },
          });
          rincianId = newRincian.id;
        }

        // Hapus survei lama pada rincian ini agar digantikan dengan data terkini
        await tx.surveiTokoItem.deleteMany({
          where: { rincianAhspId: rincianId },
        });

        // Simpan 3 toko survei
        for (let i = 0; i < 3; i++) {
          const s = stores[i];
          if (!s) continue;

          const createdStore = await tx.surveiTokoItem.create({
            data: {
              rincianAhspId: rincianId,
              urutanToko: i + 1,
              namaToko: s.namaToko.trim(),
              alamatToko: (s.alamatToko || "").trim(),
              volumeAcuan: s.volumeAcuan || 1.0,
              hargaSatuanSurvei: Number(s.hargaSatuan),
              tanggalSurvei: s.tanggalSurvei ? new Date(s.tanggalSurvei) : new Date(),
              catatanSurvei: s.catatanSurvei || null,
            },
          });

          // Simpan seluruh berkas lampiran (mendukung multi-upload: nota, tampak toko, sampel material)
          const attachments =
            Array.isArray(s.lampiranList) && s.lampiranList.length > 0
              ? s.lampiranList
              : s.buktiSurveiUrl
              ? [
                  {
                    jenisLampiran: "NOTA_PEMBELIAN",
                    namaFile: s.buktiSurveiName || `nota_toko_${i + 1}.jpg`,
                    fileUrl: s.buktiSurveiUrl,
                    ukuranFile: "Valid Geo-Tag",
                  },
                ]
              : [];

          for (const att of attachments) {
            const fileUrl = att.url || att.fileUrl;
            if (!fileUrl) continue;

            await tx.lampiranSurvei.create({
              data: {
                surveiTokoId: createdStore.id,
                jenisLampiran: att.jenisLampiran || att.tipe || "NOTA_PEMBELIAN",
                namaFile: att.namaFile || `lampiran_toko_${i + 1}.jpg`,
                fileUrl,
                ukuranFile: att.ukuranFile || "Valid Geo-Tag",
              },
            });
          }
        }
      }

      // Hitung rata-rata material keseluruhan untuk tiket
      const firstMatAvg = Math.round(
        (Number(processedMaterials[0]?.surveyToko?.[0]?.hargaSatuan || 0) +
          Number(processedMaterials[0]?.surveyToko?.[1]?.hargaSatuan || 0) +
          Number(processedMaterials[0]?.surveyToko?.[2]?.hargaSatuan || 0)) /
          3
      );

      // Update tiket status ke PENDING_BM_MGR
      const updatedTiket = await tx.pengajuanHarga.update({
        where: { id: existing.id },
        data: {
          status: "PENDING_BM_MGR",
          rataRataSurveiMaterial: firstMatAvg > 0 ? firstMatAvg : null,
          catatanReview: catatan || `Hasil survei 3 toko fisik diajukan oleh ${user.fullName}`,
        },
        include: {
          masterItem: true,
          cabang: true,
          divisi: true,
        },
      });

      // Audit Log
      await tx.approvalAuditLog.create({
        data: {
          pengajuanHargaId: existing.id,
          userId: user.id,
          roleActor: user.role,
          action: isRevisi ? "REVISE_SURVEI" : "SUBMIT_SURVEI",
          catatan:
            catatan ||
            `Survei 3 toko selesai diinput untuk ${processedMaterials.length} komponen. Tiket diteruskan ke B&M Manager.`,
        },
      });

      return updatedTiket;
    });

    return NextResponse.json({
      success: true,
      message: `Survei 3 toko fisik tiket #${result.nomorTiket} berhasil diajukan ke B&M Manager.`,
      data: result,
    });
  } catch (error: any) {
    console.error("POST Submit Survey Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal menyimpan hasil survei toko.",
      },
      { status: 500 }
    );
  }
}
