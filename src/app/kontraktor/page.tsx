import { redirect } from "next/navigation";
import { KontenPenawaran } from "./_components/KontenPenawaran";

export default async function PenawaranAktifPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Tautan lama ?tab=riwayat dialihkan ke rute riwayat sesuai menu sidebar.
  const { tab } = await searchParams;
  if (tab === "riwayat") redirect("/kontraktor/riwayat");
  return <KontenPenawaran mode="aktif" />;
}
