import { AppLayoutShell } from "@/components/global";
import { KontenKatalog, SearchParams } from "@/components/katalog/KontenKatalog";
import { requireInternal } from "./_lib/require-internal";

export default async function KatalogMasterHargaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireInternal();
  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "Master Harga" }, { label: "Katalog Master Harga" }]}>
      <KontenKatalog sp={await searchParams} basePath="/master-harga" />
    </AppLayoutShell>
  );
}
