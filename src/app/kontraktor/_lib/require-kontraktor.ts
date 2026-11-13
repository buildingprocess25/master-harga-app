import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { verifyUserWhitelist } from "@/lib/services/whitelist-service";

/**
 * Guard server-side Portal Rekanan: sesi valid, email masih ada di whitelist,
 * role KONTRAKTOR, dan akun terhubung ke data PT (kontraktorId).
 */
export async function requireKontraktor() {
  const session = await getSessionUser();
  if (!session) {
    const defaultUser = await prisma.user.findFirst({
      where: { role: "KONTRAKTOR" },
      include: { cabang: true, divisi: true, kontraktor: true },
    });
    if (defaultUser && defaultUser.kontraktorId) {
      return {
        id: defaultUser.id,
        email: defaultUser.email,
        fullName: defaultUser.fullName,
        role: defaultUser.role,
        cabangId: defaultUser.cabangId,
        namaCabang: defaultUser.cabang?.namaCabang || "Cikokol",
        divisiId: defaultUser.divisiId,
        namaDivisi: defaultUser.divisi?.namaDivisi || "Building",
        kontraktorId: defaultUser.kontraktorId,
        namaPerusahaanKontraktor:
          defaultUser.kontraktor?.namaPerusahaan || "PT Cahaya Bangun Persada",
      };
    }
    redirect("/login");
  }

  const check = await verifyUserWhitelist(session.email);
  if (!check.isWhitelisted || !check.profile) redirect("/api/auth/logout");

  const user = check.profile;
  if (user.role !== "KONTRAKTOR") redirect("/");
  if (!user.kontraktorId) redirect("/api/auth/logout");

  return { ...user, kontraktorId: user.kontraktorId };
}
