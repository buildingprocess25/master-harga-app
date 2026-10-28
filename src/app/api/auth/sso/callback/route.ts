import { NextRequest, NextResponse } from "next/server";
import { verifyUserWhitelist } from "@/lib/services/whitelist-service";
import { setSessionCookie } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  return handleSsoExchange(request);
}

export async function POST(request: NextRequest) {
  return handleSsoExchange(request);
}

async function handleSsoExchange(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const launchToken =
    searchParams.get("launchToken") || searchParams.get("token");

  // Jika tidak ada launchToken
  if (!launchToken) {
    return new NextResponse(renderErrorPage("Parameter launchToken tidak ditemukan."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    let email = "";
    let fullName = "";

    const ssoServiceUrl =
      process.env.SPARTA_AUTH_SERVICE_URL || "http://localhost:4000";

    try {
      // Pertukaran launchToken ke SSO portal login-sparta
      const res = await fetch(`${ssoServiceUrl}/v1/sso/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: "harga",
          launchToken,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        email = json?.data?.user?.email || "";
        fullName = json?.data?.user?.fullName || "";
      }
    } catch {
      // Jika di development dan SSO offline, izinkan token mock berformat mock:email
      if (
        process.env.NODE_ENV === "development" &&
        launchToken.startsWith("mock:")
      ) {
        email = launchToken.replace("mock:", "");
        fullName = "Mock Dev User";
      }
    }

    if (!email) {
      return new NextResponse(
        renderErrorPage("Verifikasi launchToken gagal atau sesi portal SPARTA telah kedaluwarsa."),
        { status: 401, headers: { "Content-Type": "text/html" } }
      );
    }

    // Pengecekan Whitelist Lokal (Zero Auto-Provisioning)
    const check = await verifyUserWhitelist(email);

    if (!check.isWhitelisted || !check.profile) {
      return new NextResponse(
        renderForbiddenPage(email, check.reason || "Akses tidak diizinkan."),
        { status: 403, headers: { "Content-Type": "text/html" } }
      );
    }

    // Simpan sesi ke HTTP-Only Cookie
    await setSessionCookie(check.profile);

    // Redirect ke root (middleware akan mengarahkan ke workspace peran)
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("SSO Callback Error:", error);
    return new NextResponse(
      renderErrorPage("Terjadi kendala internal saat memproses autentikasi."),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

// Template HTML Halaman 403 Forbidden Resmi Alfamart
function renderForbiddenPage(email: string, message: string) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>403 Akses Ditolak - SPARTA HARGA</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F8FAFC; color: #1E293B; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
    .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; max-width: 480px; width: 100%; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center; }
    .badge { display: inline-block; background: #FEF2F2; color: #ED1C24; border: 1px solid #FECACA; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
    h1 { font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 12px 0; }
    p { font-size: 13px; line-height: 1.6; color: #64748B; margin: 0 0 20px 0; }
    .email-box { background: #F1F5F9; border-radius: 6px; padding: 8px 12px; font-family: monospace; font-size: 12px; color: #334155; margin-bottom: 24px; word-break: break-all; }
    .btn { display: inline-block; background: #005BAC; color: #FFFFFF; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 20px; border-radius: 6px; transition: background 0.2s; }
    .btn:hover { background: #004582; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">403 FORBIDDEN - AKSES DITOLAK</div>
    <h1>Akun Belum Terdaftar</h1>
    <p>${message}</p>
    <div class="email-box">Identitas SSO: ${email}</div>
    <a href="javascript:history.back()" class="btn">Kembali ke Portal SPARTA</a>
  </div>
</body>
</html>`;
}

function renderErrorPage(message: string) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Error Autentikasi - SPARTA HARGA</title>
  <style>
    body { font-family: sans-serif; background: #F8FAFC; color: #1E293B; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; max-width: 420px; padding: 24px; text-align: center; }
    h2 { color: #ED1C24; font-size: 18px; margin-top: 0; }
    p { font-size: 13px; color: #64748B; }
    a { color: #005BAC; font-size: 12px; font-weight: bold; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Kendala Autentikasi</h2>
    <p>${message}</p>
    <a href="/">Ke Halaman Utama</a>
  </div>
</body>
</html>`;
}
