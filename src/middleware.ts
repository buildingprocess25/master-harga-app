import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ambil sesi resmi terotentikasi dari cookie
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

  const roleRoutes: Record<string, string> = {
    BUILDING_COORDINATOR: "/building-coordinator",
    BM_MANAGER: "/bm-manager",
    PP_MANAGER: "/bm-manager",
    SB_SPECIALIST: "/sb-specialist",
    REGIONAL_MANAGER: "/regional-manager",
    KONTRAKTOR: "/kontraktor",
    ADMIN: "/master-harga",
  };

  // 2. Rute Publik: Lewatkan aset statis dan API auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/public") ||
    pathname === "/login" ||
    pathname.includes(".")
  ) {
    // Jika sudah terotentikasi dan membuka /login, langsung arahkan ke workspace peran
    if (pathname === "/login" && role) {
      const targetRoute = roleRoutes[role] || "/";
      return NextResponse.redirect(new URL(targetRoute, request.url));
    }
    return NextResponse.next();
  }

  // 3. Jika belum terotentikasi dan mencoba mengakses rute internal, redirect ke /login
  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Auto-Redirect pada rute root ("/") ke workspace peran masing-masing
  if (pathname === "/" && role) {
    const targetRoute = roleRoutes[role];
    if (targetRoute) {
      return NextResponse.redirect(new URL(targetRoute, request.url));
    }
  }

  // 5. Isolasi Akses Peran Khusus Rekanan Kontraktor
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
