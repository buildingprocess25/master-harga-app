import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const DIR_LAMPIRAN_SURVEI = path.join(
  process.env.STORAGE_DIR || path.join(process.cwd(), "storage"),
  "lampiran-survei"
);

const MAKS_UKURAN_LAMPIRAN = 10 * 1024 * 1024; // 10 MB per file

const TIPE_LAMPIRAN: Record<string, { ext: string; mime: string }> = {
  "application/pdf": { ext: "pdf", mime: "application/pdf" },
  "image/jpeg": { ext: "jpg", mime: "image/jpeg" },
  "image/png": { ext: "png", mime: "image/png" },
  "image/webp": { ext: "webp", mime: "image/webp" },
};

function formatUkuran(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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

    await mkdir(DIR_LAMPIRAN_SURVEI, { recursive: true });

    const results = [];

    for (const file of rawFiles) {
      const tipe = TIPE_LAMPIRAN[file.type];
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
      const namaSimpan = `${randomUUID()}.${tipe.ext}`;
      await writeFile(path.join(DIR_LAMPIRAN_SURVEI, namaSimpan), buf);

      // Tentukan tipe lampiran (NOTA_PEMBELIAN, FOTO_TOKO, FOTO_MATERIAL)
      const fileNameLower = file.name.toLowerCase();
      let jenisLampiran = "NOTA_PEMBELIAN";
      if (fileNameLower.includes("toko") || fileNameLower.includes("plang") || fileNameLower.includes("depan")) {
        jenisLampiran = "FOTO_TOKO";
      } else if (fileNameLower.includes("material") || fileNameLower.includes("barang") || fileNameLower.includes("sampel")) {
        jenisLampiran = "FOTO_MATERIAL";
      }

      results.push({
        id: `lampiran-${randomUUID()}`,
        tipe: jenisLampiran,
        jenisLampiran,
        namaFile: file.name.slice(0, 200),
        url: `/api/pengajuan/lampiran/${namaSimpan}`,
        fileUrl: `/api/pengajuan/lampiran/${namaSimpan}`,
        ukuranFile: formatUkuran(file.size),
      });
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} berkas berhasil diunggah.`,
      data: results.length === 1 ? results[0] : results,
      items: results,
    });
  } catch (error: any) {
    console.error("Upload Multi Lampiran Survei Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengunggah berkas lampiran." },
      { status: 500 }
    );
  }
}
