import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  TIPE_LAMPIRAN_UMUM,
  cocokSignature,
  simpanBerkasLampiran,
} from "@/lib/storage/lampiran-storage";

const MAKS_UKURAN_LAMPIRAN = 10 * 1024 * 1024; // 10 MB per file

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json(
        { success: false, message: "Data form tidak valid." },
        { status: 400 }
      );
    }

    // Ambil semua berkas dari field "files" atau "file"
    const rawFiles: File[] = [];
    const filesAll = form.getAll("files");
    const fileAll = form.getAll("file");

    for (const item of [...filesAll, ...fileAll]) {
      if (item instanceof File && item.size > 0) {
        rawFiles.push(item);
      }
    }

    if (rawFiles.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada berkas yang diunggah." },
        { status: 400 }
      );
    }

    const results = [];

    for (const file of rawFiles) {
      const tipe = TIPE_LAMPIRAN_UMUM[file.type];
      if (!tipe) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name}: format harus berupa berkas PDF, JPG, PNG, atau WEBP.`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAKS_UKURAN_LAMPIRAN) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name}: ukuran berkas melebihi batas maksimal 10 MB.`,
          },
          { status: 400 }
        );
      }

      const buf = Buffer.from(await file.arrayBuffer());
      if (!cocokSignature(buf, tipe.mime)) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name}: isi berkas tidak sesuai dengan formatnya.`,
          },
          { status: 400 }
        );
      }

      const saved = await simpanBerkasLampiran({
        buffer: buf,
        originalName: file.name,
        mimeType: tipe.mime,
        ext: tipe.ext,
        size: file.size,
        bucket: "lampiran-survei",
        localUrlPrefix: "/api/pengajuan/lampiran",
        driveFolderEnvKey: "GOOGLE_DRIVE_SURVEI_FOLDER_ID",
        makePublic: true,
      });

      // Tentukan tipe lampiran (NOTA_PEMBELIAN, FOTO_TOKO, FOTO_MATERIAL)
      const fileNameLower = file.name.toLowerCase();
      let jenisLampiran = "NOTA_PEMBELIAN";
      if (
        fileNameLower.includes("toko") ||
        fileNameLower.includes("plang") ||
        fileNameLower.includes("depan")
      ) {
        jenisLampiran = "FOTO_TOKO";
      } else if (
        fileNameLower.includes("material") ||
        fileNameLower.includes("barang") ||
        fileNameLower.includes("sampel")
      ) {
        jenisLampiran = "FOTO_MATERIAL";
      }

      results.push({
        id: `lampiran-${randomUUID()}`,
        tipe: jenisLampiran,
        jenisLampiran,
        namaFile: saved.namaFile,
        url: saved.url,
        fileUrl: saved.fileUrl,
        ukuranFile: saved.ukuranFile,
        storageProvider: saved.storageProvider,
        driveFileId: saved.driveFileId,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} berkas berhasil diunggah.`,
      data: results.length === 1 ? results[0] : results,
      items: results,
    });
  } catch (error: unknown) {
    console.error("Upload Multi Lampiran Survei Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Gagal mengunggah berkas lampiran.",
      },
      { status: 500 }
    );
  }
}
