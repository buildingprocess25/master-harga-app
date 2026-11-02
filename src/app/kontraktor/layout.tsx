import Image from "next/image";
import Link from "next/link";
import { Building2, LogOut } from "lucide-react";
import { requireKontraktor } from "./_lib/require-kontraktor";

export default async function KontraktorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireKontraktor();

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/kontraktor" className="flex items-center gap-3 min-w-0">
            <Image
              src="/alfamart-logo.png"
              alt="Logo Alfamart"
              width={120}
              height={36}
              className="h-7 w-auto object-contain"
              priority
            />
            <span className="hidden sm:block h-6 w-px bg-slate-200" />
            <span className="hidden sm:block text-xs font-bold text-slate-800 tracking-wide">
              Portal Rekanan Kontraktor
            </span>
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="text-right min-w-0">
              <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-900 truncate">
                <Building2 className="w-3.5 h-3.5 text-[#005BAC] shrink-0" />
                <span className="truncate">{user.namaPerusahaanKontraktor ?? "Rekanan"}</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">{user.fullName}</div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#ED1C24] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
        {/* Motif pita ganda Alfamart */}
        <div className="h-[3px] bg-[#ED1C24]" />
        <div className="h-[3px] bg-[#FFD100]" />
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
