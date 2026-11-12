import { Ban } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { KontenRekananParked } from "@/components/kuorum/KontenRekananParked";
import { requireRolePage } from "@/lib/auth/require-role";

export default async function RekananParkedRegionalPage() {
  const user = await requireRolePage(["REGIONAL_MANAGER"]);
  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "Regional Manager", href: "/regional-manager" }, { label: "Kontraktor Nonaktif" }]}>
      <HeaderHalaman
        icon={Ban}
        judul="Kontraktor Nonaktif"
        deskripsi="Daftar kontraktor yang dinonaktifkan sementara karena menolak penawaran berturut-turut."
      />
      <KontenRekananParked user={user} tampilJudul={false} />
    </AppLayoutShell>
  );
}
