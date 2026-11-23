import { ROLE_UNPARK, requireInternal } from "./_lib/require-internal";
import { MasterHargaNav } from "./_components/MasterHargaNav";
import { AppHeader } from "@/components/global/AppHeader";

export default async function MasterHargaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireInternal();

  const navItems = [{ href: "/master-harga", label: "Katalog Harga Resmi" }];
  if (ROLE_UNPARK.includes(user.role)) {
    navItems.push({ href: "/master-harga/rekanan", label: "Rekanan Parked" });
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <AppHeader
        standalone
        homeHref="/master-harga"
        title="SPARTA-PRICING"
        badgeTitle="Master Harga"
        user={user}
        subNavigation={<MasterHargaNav items={navItems} />}
      />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
