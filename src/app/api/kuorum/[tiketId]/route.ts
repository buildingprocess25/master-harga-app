import { NextResponse } from "next/server";
import {
  evaluasiJikaKedaluwarsa,
  getRingkasanKuorum,
} from "@/lib/services/kuorum-service";
import { ROLE_INTERNAL_KUORUM, errorResponse, requireRole } from "../_lib/guard";

/**
 * GET /api/kuorum/[tiketId]
 * Ringkasan kuorum putaran terakhir. Jika SLA sudah lewat, putaran dievaluasi
 * terlebih dahulu (lazy timeout) agar data yang tampil selalu final.
 * Kontraktor hanya dapat melihat tiket yang mengundang PT-nya, dan hanya baris miliknya.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tiketId: string }> }
) {
  const guard = await requireRole([...ROLE_INTERNAL_KUORUM, "KONTRAKTOR"]);
  if (!guard.ok) return guard.response;
  const { user } = guard;

  try {
    const { tiketId } = await params;

    let ringkasan = await getRingkasanKuorum(tiketId);
    const diundang = (r: typeof ringkasan) =>
      r.votingKontraktorList.some((v) => v.kontraktorId === user.kontraktorId);

    // Cek kepemilikan dulu agar rekanan tidak dapat memicu evaluasi tiket PT lain.
    if (user.role === "KONTRAKTOR" && !diundang(ringkasan)) {
      return NextResponse.json(
        { success: false, message: "Penawaran tidak ditemukan." },
        { status: 404 }
      );
    }

    if (await evaluasiJikaKedaluwarsa(tiketId)) {
      ringkasan = await getRingkasanKuorum(tiketId);
    }

    if (user.role === "KONTRAKTOR") {
      // Rekanan tidak boleh melihat respon dan usulan harga rekanan lain.
      ringkasan = {
        ...ringkasan,
        votingKontraktorList: ringkasan.votingKontraktorList.filter(
          (v) => v.kontraktorId === user.kontraktorId
        ),
      };
    }

    return NextResponse.json({ success: true, data: ringkasan });
  } catch (error) {
    return errorResponse(error, "Kuorum GET Error");
  }
}
