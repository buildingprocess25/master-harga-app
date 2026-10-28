import { NextRequest, NextResponse } from "next/server";
import { verifyUserWhitelist } from "@/lib/services/whitelist-service";
import { setSessionCookie } from "@/lib/auth/session";
import { RoleUser } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email wajib diisi." },
        { status: 400 }
      );
    }

    // Verifikasi Whitelist Tabel User di Database Lokal (Zero Auto-Provisioning)
    const check = await verifyUserWhitelist(email);

    if (!check.isWhitelisted || !check.profile) {
      return NextResponse.json(
        {
          success: false,
          message:
            check.reason ||
            "Akun belum terdaftar pada Whitelist SPARTA-HARGA. Silakan hubungi Administrator S&B Controlling HO.",
        },
        { status: 403 }
      );
    }

    // Buat dan simpan session cookie resmi terenkripsi (8 jam)
    await setSessionCookie(check.profile);

    // Tentukan URL tujuan berdasarkan role wewenang
    const roleRoutes: Record<RoleUser, string> = {
      BUILDING_COORDINATOR: "/building-coordinator",
      BM_MANAGER: "/bm-manager",
      PP_MANAGER: "/bm-manager",
      SB_SPECIALIST: "/sb-specialist",
      REGIONAL_MANAGER: "/regional-manager",
      KONTRAKTOR: "/kontraktor",
      ADMIN: "/master-harga",
    };

    const targetUrl = roleRoutes[check.profile.role] || "/";

    return NextResponse.json({
      success: true,
      message: "Autentikasi berhasil.",
      targetUrl,
      user: check.profile,
    });
  } catch (error) {
    console.error("Local Login API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan internal saat memproses autentikasi.",
      },
      { status: 500 }
    );
  }
}
