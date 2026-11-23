import { NextRequest, NextResponse } from "next/server";
import { bacaBerkasLokal } from "@/lib/storage/lampiran-storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nama: string }> }
) {
  try {
    const { nama } = await params;
    const loaded = await bacaBerkasLokal("lampiran-survei", nama);

    if (!loaded) {
      return NextResponse.json(
        { success: false, message: "Berkas tidak ditemukan." },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(loaded.buffer), {
      status: 200,
      headers: {
        "Content-Type": loaded.mimeType,
        "Content-Length": String(loaded.buffer.length),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error: unknown) {
    console.error("GET Lampiran Survei Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membaca berkas." },
      { status: 500 }
    );
  }
}
