import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { verifyUserWhitelist } from "@/lib/services/whitelist-service";
import { RoleUser } from "@/types";

/** Role internal yang boleh membuka Katalog Master Harga (rekanan kontraktor tidak). */
export const ROLE_KATALOG: RoleUser[] = [
  "BUILDING_COORDINATOR",
  "BM_MANAGER",
  "PP_MANAGER",
  "SB_SPECIALIST",
  "REGIONAL_MANAGER",
  "ADMIN",
];

/** Role yang berwenang mengaktifkan kembali (Unpark) rekanan. */
export const ROLE_UNPARK: RoleUser[] = ["SB_SPECIALIST", "REGIONAL_MANAGER"];

/**
 * Guard server-side modul Master Harga: sesi valid, email masih di whitelist,
 * dan role termasuk daftar yang diizinkan. Role lain dikembalikan ke workspace-nya.
 */
export async function requireInternal(allowed: RoleUser[] = ROLE_KATALOG) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const check = await verifyUserWhitelist(session.email);
  if (!check.isWhitelisted || !check.profile) redirect("/api/auth/logout");

  const user = check.profile;
  if (!allowed.includes(user.role)) {
    redirect(user.role === "KONTRAKTOR" ? "/kontraktor" : "/master-harga");
  }
  return user;
}
