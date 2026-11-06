import { KontenKatalog, SearchParams } from "@/components/katalog/KontenKatalog";
import { requireInternal } from "./_lib/require-internal";

export default async function KatalogMasterHargaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireInternal();
  return <KontenKatalog sp={await searchParams} basePath="/master-harga" />;
}
