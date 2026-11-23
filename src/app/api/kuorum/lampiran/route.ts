import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireRole } from "../_lib/guard";
import {
  DIR_LAMPIRAN_BANDING,
  MAKS_UKURAN_LAMPIRAN,
  TIPE_LAMPIRAN,
  cocokSignature,
  formatUkuran,
} from "./_lib/storage";

/**
 * POST /api/kuorum/lampiran (multipart/form-data, field "file")
 * Unggah satu berkas bukti pembanding pasar untuk usulan banding.
 * Mengembalikan { namaFile, fileUrl, ukuranFile } untuk dikirim bersama vote.
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

    const namaSimpan = `${randomUUID()}.${tipe.ext}`;
    await mkdir(DIR_LAMPIRAN_BANDING, { recursive: true });
    await writeFile(path.join(DIR_LAMPIRAN_BANDING, namaSimpan), buf);

    return NextResponse.json({
      success: true,
      data: {
        namaFile: file.name.slice(0, 200),
        fileUrl: `/api/kuorum/lampiran/${namaSimpan}`,
        ukuranFile: formatUkuran(file.size),
      },
    });
  } catch (error) {
    return errorResponse(error, "Kuorum Upload Lampiran Error");
  }
}
