import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const DIR_LAMPIRAN_SURVEI = path.join(
  process.env.STORAGE_DIR || path.join(process.cwd(), "storage"),
  "lampiran-survei"
);

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nama: string }> }
) {
  try {
    const { nama } = await params;
    const sanitized = path.basename(nama);
    const targetPath = path.join(DIR_LAMPIRAN_SURVEI, sanitized);

    const s = await stat(targetPath).catch(() => null);
    if (!s || !s.isFile()) {
      return NextResponse.json(
        { success: false, message: "Berkas tidak ditemukan." },
        { status: 404 }
      );
    }

    const ext = path.extname(sanitized).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const data = await readFile(targetPath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error: any) {
    console.error("GET Lampiran Survei Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membaca berkas." },
      { status: 500 }
    );
  }
}
