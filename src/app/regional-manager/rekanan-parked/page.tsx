import { Ban } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { KontenRekananParked } from "@/components/kuorum/KontenRekananParked";
import { requireRolePage } from "@/lib/auth/require-role";

export default async function RekananParkedRegionalPage() {
  const user = await requireRolePage(["REGIONAL_MANAGER"]);
  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "Regional Manager" }, { label: "Rekanan Parked" }]}>
      <HeaderHalaman
        icon={Ban}
        judul="Rekanan Nonaktif (Parked)"
        deskripsi="Rekanan yang otomatis dinonaktifkan setelah menolak dua putaran berturut-turut di cabang wewenang Anda. Aktifkan kembali setelah mediasi selesai."
      />
      <KontenRekananParked user={user} tampilJudul={false} />
    </AppLayoutShell>
  );
}
