import { AppLayoutShell } from "@/components/global";
import { MasterHargaNasionalView } from "@/components/sb-specialist/MasterHargaNasionalView";
import { requireRolePage } from "@/lib/auth/require-role";
import {
  getMasterHargaPerItem,
  getOpsiFilterKatalog,
  parseFilterKatalog,
} from "@/lib/services/master-harga-service";

type SP = Record<string, string | string[] | undefined>;

export default async function MasterHargaSnbPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  const sp = await searchParams;
  const filter = parseFilterKatalog(sp);
  const pageParam = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1;

  const [katalog, opsi] = await Promise.all([
    getMasterHargaPerItem(filter, pageParam),
    getOpsiFilterKatalog(),
  ]);

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[{ label: "S&B Specialist", href: "/sb-specialist" }, { label: "Master Harga" }]}
    >
      <MasterHargaNasionalView
        katalog={katalog}
        opsi={opsi}
        filter={filter}
        sp={sp}
        basePath="/sb-specialist/master-harga"
      />
    </AppLayoutShell>
  );
}
