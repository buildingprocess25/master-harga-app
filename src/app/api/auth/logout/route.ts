import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  await clearSessionCookie();
  const redirectUrl = new URL("/", request.url);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  await clearSessionCookie();
  const redirectUrl = new URL("/", request.url);
  return NextResponse.redirect(redirectUrl);
}
