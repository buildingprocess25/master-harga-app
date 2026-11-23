import { NextRequest, NextResponse } from "next/server";
import { simpanBerkasLampiran } from "@/lib/storage/lampiran-storage";
import { errorResponse, requireRole } from "../_lib/guard";
import {
  MAKS_UKURAN_LAMPIRAN,
  TIPE_LAMPIRAN,
  cocokSignature,
} from "./_lib/storage";

/**
 * POST /api/kuorum/lampiran (multipart/form-data, field "file")
 * Unggah satu berkas bukti pembanding pasar untuk usulan banding (Google Drive / fallback lokal).
 * Mengembalikan { namaFile, fileUrl, ukuranFile, storageProvider, driveFileId } untuk dikirim bersama vote.
 */
export async function POST(request: NextRequest) {
  const guard = await requireRole(["KONTRAKTOR"]);
  if (!guard.ok) return guard.response;

  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "Berkas tidak ditemukan." }, { status: 400 });
    }

    const tipe = TIPE_LAMPIRAN[file.type];
    if (!tipe) {
      return NextResponse.json(
        { success: false, message: `${file.name}: format harus PDF, JPG, atau PNG.` },
        { status: 400 }
      );
    }
    if (file.size === 0 || file.size > MAKS_UKURAN_LAMPIRAN) {
      return NextResponse.json(
        { success: false, message: `${file.name}: ukuran berkas maksimal 5 MB.` },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (!cocokSignature(buf, tipe.mime)) {
      return NextResponse.json(
        { success: false, message: `${file.name}: isi berkas tidak sesuai formatnya.` },
        { status: 400 }
      );
    }

    const saved = await simpanBerkasLampiran({
      buffer: buf,
      originalName: file.name,
      mimeType: tipe.mime,
      ext: tipe.ext,
      size: file.size,
      bucket: "lampiran-banding",
      localUrlPrefix: "/api/kuorum/lampiran",
      driveFolderEnvKey: "GOOGLE_DRIVE_BANDING_FOLDER_ID",
      makePublic: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        namaFile: saved.namaFile,
        fileUrl: saved.fileUrl,
        ukuranFile: saved.ukuranFile,
        storageProvider: saved.storageProvider,
        driveFileId: saved.driveFileId,
      },
    });
  } catch (error) {
    return errorResponse(error, "Kuorum Upload Lampiran Error");
  }
}
