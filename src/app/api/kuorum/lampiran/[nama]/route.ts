import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ROLE_INTERNAL_KUORUM, requireRole } from "../../_lib/guard";
import { DIR_LAMPIRAN_BANDING, MIME_DARI_EXT } from "../_lib/storage";

const POLA_NAMA = /^[a-f0-9-]{36}\.(pdf|jpg|jpeg|png)$/;

/**
 * GET /api/kuorum/lampiran/[nama]
 * Menyajikan berkas bukti banding. Internal boleh melihat seluruh lampiran;
 * kontraktor hanya lampiran yang melekat pada vote perusahaannya sendiri.
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

  try {
    const isi = await readFile(path.join(DIR_LAMPIRAN_BANDING, nama));
    const ext = nama.split(".").pop() ?? "";
    return new NextResponse(new Uint8Array(isi), {
      headers: {
        "Content-Type": MIME_DARI_EXT[ext] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(lampiran.namaFile)}`,
        "X-Content-Type-Options": "nosniff",
        // Jangan cache: akses berkas dicek per pengguna, sedangkan browser bisa dipakai bergantian.
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Berkas tidak tersedia di server." }, { status: 404 });
  }
}
