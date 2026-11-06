import { BookOpen } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { KontenKatalog, SearchParams } from "@/components/katalog/KontenKatalog";
import { requireRolePage } from "@/lib/auth/require-role";
import { getCabangWewenang } from "@/lib/services/kuorum-service";

export default async function KatalogRegionalPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireRolePage(["REGIONAL_MANAGER"]);
  const wewenang = await getCabangWewenang(user.id, user.role);
  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "Regional Manager" }, { label: "Katalog Harga Regional" }]}>
      <HeaderHalaman
        icon={BookOpen}
        judul="Katalog Harga Regional"
        deskripsi="Harga satuan resmi yang berlaku di cabang wewenang Anda, lengkap dengan harga khusus wilayah (override)."
      />
      <KontenKatalog
        sp={await searchParams}
        basePath="/regional-manager/katalog-harga"
        cabangIds={wewenang === "SEMUA" ? undefined : wewenang}
        tampilJudul={false}
      />
    </AppLayoutShell>
  );
}
