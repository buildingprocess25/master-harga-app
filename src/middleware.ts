import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewatkan aset statis dan API publik
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1. Ambil sesi resmi terotentikasi
  let role: string | null = null;
  const sessionCookie = request.cookies.get("sparta_harga_session");

  if (sessionCookie?.value) {
    try {
      const parts = sessionCookie.value.split(".");
      if (parts.length === 2) {
        const jsonStr = atob(
          parts[0].replace(/-/g, "+").replace(/_/g, "/")
        );
        const payload = JSON.parse(jsonStr);
        role = payload.role;
      }
    } catch {
      // Abaikan parse error
    }
  }

  // 2. Auto-Redirect pada rute root ("/") jika sudah terotentikasi
  if (pathname === "/" && role) {
    const roleRoutes: Record<string, string> = {
      BUILDING_COORDINATOR: "/building-coordinator",
      BM_MANAGER: "/bm-manager",
      SB_SPECIALIST: "/sb-specialist",
      REGIONAL_MANAGER: "/regional-manager",
      KONTRAKTOR: "/kontraktor",
      ADMIN: "/master-harga",
    };

    const targetRoute = roleRoutes[role];
    if (targetRoute) {
      return NextResponse.redirect(new URL(targetRoute, request.url));
    }
  }

  // 3. Isolasi Akses Peran Khusus Rekanan Kontraktor
  if (role === "KONTRAKTOR") {
    const forbiddenInternalPaths = [
      "/sb-specialist",
      "/bm-manager",
      "/building-coordinator",
      "/regional-manager",
    ];

    if (forbiddenInternalPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/kontraktor", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
