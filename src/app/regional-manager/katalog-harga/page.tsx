import { AppLayoutShell } from "@/components/global";
import { MasterHargaNasionalView } from "@/components/sb-specialist/MasterHargaNasionalView";
import { requireRolePage } from "@/lib/auth/require-role";
import { getCabangWewenang } from "@/lib/services/kuorum-service";
import {
  getMasterHargaPerItem,
  getOpsiFilterKatalog,
  parseFilterKatalog,
} from "@/lib/services/master-harga-service";

type SP = Record<string, string | string[] | undefined>;

export default async function KatalogRegionalPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireRolePage(["REGIONAL_MANAGER"]);
  const sp = await searchParams;
  const wewenang = await getCabangWewenang(user.id, user.role);
  const cabangIds = wewenang === "SEMUA" ? undefined : wewenang;
  const filter = { ...parseFilterKatalog(sp), cabangIds };
  const pageParam = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1;

  const [katalog, opsi] = await Promise.all([
    getMasterHargaPerItem(filter, pageParam),
    getOpsiFilterKatalog(cabangIds),
  ]);

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "Regional Manager", href: "/regional-manager" },
        { label: "Master Harga" },
      ]}
    >
      <MasterHargaNasionalView
        katalog={katalog}
        opsi={opsi}
        filter={filter}
        sp={sp}
        basePath="/regional-manager/katalog-harga"
        readonly={true}
      />
    </AppLayoutShell>
  );
}
