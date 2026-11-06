import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ItemTab {
  key: string;
  label: string;
  jumlah: number;
  /** Warna badge jumlah: merah untuk antrean yang butuh tindakan. */
  urgen?: boolean;
}

/**
 * Tab segmented berbasis URL (?tab=) + kotak pencarian (?q=), dirender di server.
 * Form GET agar tetap berfungsi tanpa JavaScript.
 */
export function TabAntrean({
  basePath,
  tabs,
  tabAktif,
  q,
}: {
  basePath: string;
  tabs: ItemTab[];
  tabAktif: string;
  q?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
      <nav className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold" aria-label="Filter antrean">
        {tabs.map((t) => {
          const aktif = t.key === tabAktif;
          const params = new URLSearchParams({ tab: t.key });
          if (q) params.set("q", q);
          return (
            <Link
              key={t.key}
              href={`${basePath}?${params}`}
              aria-current={aktif ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors",
                aktif ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "min-w-5 px-1 rounded text-[10px] font-bold font-mono text-center",
                  t.urgen && t.jumlah > 0 ? "bg-[#ED1C24] text-white" : aktif ? "bg-[#005BAC] text-white" : "bg-slate-200 text-slate-600"
                )}
              >
                {t.jumlah}
              </span>
            </Link>
          );
        })}
      </nav>
      <form method="get" action={basePath} className="relative w-full sm:w-64" role="search">
        <input type="hidden" name="tab" value={tabAktif} />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nomor tiket atau item"
          aria-label="Cari tiket"
          className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]"
        />
      </form>
    </div>
  );
}
