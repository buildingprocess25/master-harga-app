import { requireKontraktor } from "./_lib/require-kontraktor";
import { AppHeader } from "@/components/global/AppHeader";

export default async function KontraktorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireKontraktor();
  const portalLabel =
    user.jenisMitra === "REKANAN" ? "Portal Rekanan" : "Portal Kontraktor";

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <AppHeader
        standalone
        homeHref="/kontraktor"
        title="SPARTA-PRICING"
        badgeTitle={portalLabel}
        user={user}
      />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
