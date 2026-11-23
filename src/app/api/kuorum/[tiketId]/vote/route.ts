import { NextRequest, NextResponse } from "next/server";
import {
  LampiranBandingInput,
  submitVoteKontraktor,
} from "@/lib/services/kuorum-service";
import { errorResponse, requireRole } from "../../_lib/guard";

/**
 * POST /api/kuorum/[tiketId]/vote
 * Body: {
 *   keputusan: "SETUJU" | "TOLAK",
 *   usulanHarga?: number,      // wajib saat banding (penolakan pertama)
 *   catatan?: string,          // wajib saat TOLAK
 *   lampiranList?: { namaFile, fileUrl, ukuranFile? }[]
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tiketId: string }> }
) {
  const guard = await requireRole(["KONTRAKTOR"]);
  if (!guard.ok) return guard.response;
  const { user } = guard;

  if (!user.kontraktorId) {
    return NextResponse.json(
      { success: false, message: "Akun rekanan belum terhubung ke data PT Kontraktor." },
      { status: 403 }
    );
  }

  try {
    const { tiketId } = await params;
    const body = await request.json().catch(() => null);

    const keputusan = body?.keputusan;
    if (keputusan !== "SETUJU" && keputusan !== "TOLAK") {
      return NextResponse.json(
        { success: false, message: "Keputusan harus SETUJU atau TOLAK." },
        { status: 400 }
      );
    }

    const usulanHarga =
      body?.usulanHarga === undefined || body?.usulanHarga === null
        ? undefined
        : Number(body.usulanHarga);
    if (usulanHarga !== undefined && !Number.isFinite(usulanHarga)) {
      return NextResponse.json(
        { success: false, message: "Format harga usulan tidak valid." },
        { status: 400 }
      );
    }

    const lampiranList: LampiranBandingInput[] = Array.isArray(body?.lampiranList)
      ? body.lampiranList
          .filter(
            (l: unknown): l is LampiranBandingInput =>
              typeof l === "object" &&
              l !== null &&
              typeof (l as LampiranBandingInput).namaFile === "string" &&
              typeof (l as LampiranBandingInput).fileUrl === "string"
          )
          .map((l: LampiranBandingInput) => ({
            namaFile: l.namaFile,
            fileUrl: l.fileUrl,
            ukuranFile: typeof l.ukuranFile === "string" ? l.ukuranFile : undefined,
          }))
      : [];

    const hasil = await submitVoteKontraktor({
      tiketId,
      kontraktorId: user.kontraktorId,
      userId: user.id,
      keputusan,
      usulanHarga,
      catatan: typeof body?.catatan === "string" ? body.catatan : undefined,
      lampiranList,
    });

    return NextResponse.json({ success: true, data: hasil });
  } catch (error) {
    return errorResponse(error, "Kuorum Vote Error");
  }
}
