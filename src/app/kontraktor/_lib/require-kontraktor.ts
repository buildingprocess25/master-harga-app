import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { verifyUserWhitelist } from "@/lib/services/whitelist-service";

/**
 * Guard server-side Portal Rekanan: sesi valid, email masih ada di whitelist,
 * role KONTRAKTOR, dan akun terhubung ke data PT (kontraktorId).
 */
export async function requireKontraktor() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const check = await verifyUserWhitelist(session.email);
  if (!check.isWhitelisted || !check.profile) redirect("/api/auth/logout");

  const user = check.profile;
  if (user.role !== "KONTRAKTOR") redirect("/");
  if (!user.kontraktorId) redirect("/api/auth/logout");

  return { ...user, kontraktorId: user.kontraktorId };
}
