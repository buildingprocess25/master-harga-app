import { cookies } from "next/headers";
import { UserSessionProfile, RoleUser } from "@/types";

const SESSION_COOKIE_NAME = "sparta_harga_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "sparta-harga-enterprise-zero-trust-secret-key-2026-sumber-alfaria-trijaya";

// TTL Sesi: 8 Jam (Standar shift operasional Alfamart)
const SESSION_MAX_AGE = 8 * 60 * 60;

/**
 * Membuat token sesi terenkripsi sederhana berbasis Base64 & HMAC signature menggunakan Web Crypto.
 */
async function getSigningKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Sign payload sesi menjadi token yang tahan manipulasi (tamper-evident).
 */
export async function signSessionToken(
  payload: UserSessionProfile
): Promise<string> {
  const enc = new TextEncoder();
  const data = JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  });

  const encodedData = Buffer.from(data).toString("base64url");
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(encodedData)
  );
  const encodedSignature = Buffer.from(signature).toString("base64url");

  return `${encodedData}.${encodedSignature}`;
}

/**
 * Verifikasi signature token dan pastikan belum kedaluwarsa.
 */
export async function verifySessionToken(
  token: string
): Promise<UserSessionProfile | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedData, encodedSignature] = parts;

    const key = await getSigningKey();
    const enc = new TextEncoder();
    const signature = Buffer.from(encodedSignature, "base64url");

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      enc.encode(encodedData)
    );

    if (!isValid) return null;

    const jsonStr = Buffer.from(encodedData, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr);

    // Cek kadaluarsa
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload as UserSessionProfile;
  } catch {
    return null;
  }
}

/**
 * Simpan token sesi ke HTTP-only cookie.
 */
export async function setSessionCookie(profile: UserSessionProfile) {
  const token = await signSessionToken(profile);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Ambil sesi pengguna aktif dari cookie resmi terotentikasi.
 */
export async function getSessionUser(): Promise<UserSessionProfile | null> {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (sessionCookie?.value) {
    const verified = await verifySessionToken(sessionCookie.value);
    if (verified) return verified;
  }

  return null;
}

/**
 * Hapus cookie sesi saat logout.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
