import prisma from "@/lib/prisma";
import { UserSessionProfile, RoleUser } from "@/types";

export interface WhitelistCheckResult {
  isWhitelisted: boolean;
  profile?: UserSessionProfile;
  reason?: string;
}

/**
 * Memvalidasi apakah email yang masuk dari SSO terdaftar di whitelist lokal database.
 * Kebijakan Zero-Trust: Zero Auto-Provisioning (pengguna baru tidak dibuat otomatis).
 */
export async function verifyUserWhitelist(
  email: string
): Promise<WhitelistCheckResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      divisi: true,
      cabang: true,
      kontraktor: true,
    },
  });

  if (!user) {
    return {
      isWhitelisted: false,
      reason:
        "Akun Anda belum didaftarkan di modul SPARTA-HARGA oleh Administrator. Silakan hubungi Tim S&B Controlling HO.",
    };
  }

  if (!user.isActive) {
    return {
      isWhitelisted: false,
      reason:
        "Status akun Anda telah dinonaktifkan di modul SPARTA-HARGA. Silakan hubungi atasan atau Administrator HO.",
    };
  }

  const profile: UserSessionProfile = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as RoleUser,
    divisiId: user.divisiId,
    namaDivisi: user.divisi?.namaDivisi,
    cabangId: user.cabangId,
    namaCabang: user.cabang?.namaCabang,
    kontraktorId: user.kontraktorId,
    namaPerusahaanKontraktor: user.kontraktor?.namaPerusahaan,
  };

  return {
    isWhitelisted: true,
    profile,
  };
}
