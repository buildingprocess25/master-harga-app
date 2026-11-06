import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { verifyUserWhitelist } from "@/lib/services/whitelist-service";
import { DomainError } from "@/lib/services/transisi-tiket";
import { RoleUser, UserSessionProfile } from "@/types";

type GuardResult =
  | { ok: true; user: UserSessionProfile }
  | { ok: false; response: NextResponse };

/**
 * Zero-Trust guard untuk endpoint kuorum: sesi wajib valid, email dicek ulang
 * ke whitelist (akun bisa dinonaktifkan di tengah sesi), lalu role dicocokkan.
 */
export async function requireRole(allowed: RoleUser[]): Promise<GuardResult> {
  const session = await getSessionUser();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Sesi tidak valid. Silakan login kembali." },
        { status: 401 }
      ),
    };
  }

  const check = await verifyUserWhitelist(session.email);
  if (!check.isWhitelisted || !check.profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: check.reason ?? "Akses ditolak." },
        { status: 403 }
      ),
    };
  }

  if (!allowed.includes(check.profile.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Peran Anda tidak berwenang untuk aksi ini." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: check.profile };
}

/** Ubah error service menjadi respon JSON yang konsisten. */
export function errorResponse(error: unknown, konteks: string) {
  if (error instanceof DomainError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status }
    );
  }
  console.error(`${konteks}:`, error);
  return NextResponse.json(
    { success: false, message: "Terjadi kesalahan internal pada layanan kuorum." },
    { status: 500 }
  );
}

export const ROLE_INTERNAL_KUORUM: RoleUser[] = [
  "BM_MANAGER",
  "PP_MANAGER",
  "SB_SPECIALIST",
  "REGIONAL_MANAGER",
  "ADMIN",
];
