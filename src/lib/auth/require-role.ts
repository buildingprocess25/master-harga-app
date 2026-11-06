import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { verifyUserWhitelist } from "@/lib/services/whitelist-service";
import { DomainError } from "@/lib/services/transisi-tiket";
import { RoleUser, UserSessionProfile } from "@/types";

/** Workspace default tiap role (selaras dengan middleware dan login API). */
export const WORKSPACE_ROLE: Record<RoleUser, string> = {
  BUILDING_COORDINATOR: "/building-coordinator",
  BM_MANAGER: "/bm-manager",
  PP_MANAGER: "/bm-manager",
  SB_SPECIALIST: "/sb-specialist",
  REGIONAL_MANAGER: "/regional-manager",
  KONTRAKTOR: "/kontraktor",
  ADMIN: "/master-harga",
};

/**
 * Sesi valid dan email masih aktif di whitelist (Zero-Trust: akun bisa dinonaktifkan
 * di tengah sesi 8 jam). Mengembalikan profil terbaru dari database, bukan isi cookie.
 */
export async function getUserTerverifikasi(): Promise<UserSessionProfile | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const check = await verifyUserWhitelist(session.email);
  return check.isWhitelisted && check.profile ? check.profile : null;
}

/** Guard untuk Server Component / layout: arahkan ulang bila tidak berwenang. */
export async function requireRolePage(allowed: RoleUser[]): Promise<UserSessionProfile> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const user = await getUserTerverifikasi();
  if (!user) redirect("/api/auth/logout");
  if (!allowed.includes(user.role)) redirect(WORKSPACE_ROLE[user.role] ?? "/");
  return user;
}

/** Guard untuk Server Action / Route Handler: lempar DomainError 401/403. */
export async function requireRoleAction(allowed: RoleUser[]): Promise<UserSessionProfile> {
  const user = await getUserTerverifikasi();
  if (!user) throw new DomainError("Sesi tidak valid. Silakan login kembali.", 401);
  if (!allowed.includes(user.role)) {
    throw new DomainError("Peran Anda tidak berwenang untuk aksi ini.", 403);
  }
  return user;
}
