import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { bacaBerkasLokal } from "@/lib/storage/lampiran-storage";
import { ROLE_INTERNAL_KUORUM, requireRole } from "../../_lib/guard";

const POLA_NAMA = /^[a-f0-9-]{36}\.(pdf|jpg|jpeg|png)$/;

/**
 * GET /api/kuorum/lampiran/[nama]
 * Menyajikan berkas bukti banding fallback lokal (untuk berkas tanpa URL Google Drive).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nama: string }> }
) {
  const guard = await requireRole([...ROLE_INTERNAL_KUORUM, "KONTRAKTOR"]);
  if (!guard.ok) return guard.response;

  const { nama } = await params;
  if (!POLA_NAMA.test(nama)) {
    return NextResponse.json({ success: false, message: "Berkas tidak ditemukan." }, { status: 404 });
  }

  const fileUrl = `/api/kuorum/lampiran/${nama}`;
  const lampiran = await prisma.lampiranBanding.findFirst({
    where: { fileUrl },
    select: {
      namaFile: true,
      votingKontraktor: { select: { kontraktorCabang: { select: { kontraktorId: true } } } },
    },
  });

  // Berkas yang belum melekat ke vote mana pun tidak disajikan.
  const pemilik = lampiran?.votingKontraktor.kontraktorCabang.kontraktorId;
  const bolehAkses =
    !!lampiran && (guard.user.role !== "KONTRAKTOR" || pemilik === guard.user.kontraktorId);
  if (!bolehAkses) {
    return NextResponse.json({ success: false, message: "Berkas tidak ditemukan." }, { status: 404 });
  }

  const loaded = await bacaBerkasLokal("lampiran-banding", nama);
  if (!loaded) {
    return NextResponse.json({ success: false, message: "Berkas tidak tersedia di server." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(loaded.buffer), {
    headers: {
      "Content-Type": loaded.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(lampiran.namaFile)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
