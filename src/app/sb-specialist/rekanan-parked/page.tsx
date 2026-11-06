import { Ban } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { KontenRekananParked } from "@/components/kuorum/KontenRekananParked";
import { requireRolePage } from "@/lib/auth/require-role";

export default async function RekananParkedSnbPage() {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "S&B Specialist" }, { label: "Rekanan Nonaktif (Parked)" }]}>
      <HeaderHalaman
        icon={Ban}
        judul="Rekanan Nonaktif (Parked)"
        deskripsi="Rekanan yang otomatis dinonaktifkan setelah menolak dua putaran berturut-turut. S&B Specialist (HO) berwenang mengaktifkan kembali rekanan di seluruh cabang setelah mediasi."
      />
      <KontenRekananParked user={user} tampilJudul={false} />
    </AppLayoutShell>
  );
}
