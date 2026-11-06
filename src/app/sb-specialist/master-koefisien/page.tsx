import Link from "next/link";
import { BookOpenCheck, Search } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { KelolaPustaka } from "@/components/sb-specialist/KelolaPustaka";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/components/sb-specialist/worksheet-util";
import { requireRolePage } from "@/lib/auth/require-role";
import { daftarPustakaKoefisien, getDivisiKelola } from "@/lib/services/pustaka-service";
import { cn } from "@/lib/utils";

type SP = { divisi?: string; kategori?: string; q?: string; nonaktif?: string };

export default async function PustakaKoefisienPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  const sp = await searchParams;
  const divisiList = await getDivisiKelola(user.divisiId);
  const divisiId = divisiList.find((d) => d.id === sp.divisi)?.id ?? divisiList[0]?.id;
  const kategori = sp.kategori && (URUTAN_KATEGORI as string[]).includes(sp.kategori) ? sp.kategori : undefined;
  const q = sp.q?.trim() || undefined;
  const termasukNonaktif = sp.nonaktif === "1";

  const rows = divisiId ? await daftarPustakaKoefisien({ divisiId, kategori, q, termasukNonaktif }) : [];

  const href = (ubah: Partial<SP>) => {
    const p = new URLSearchParams();
    const gabung = { divisi: divisiId, kategori, q, nonaktif: termasukNonaktif ? "1" : undefined, ...ubah };
    for (const [k, v] of Object.entries(gabung)) if (v) p.set(k, v);
    return `/sb-specialist/master-koefisien${p.size ? `?${p}` : ""}`;
  };

  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "S&B Specialist" }, { label: "Pustaka Koefisien" }]}>
      <HeaderHalaman
        icon={BookOpenCheck}
        judul="Pustaka Koefisien Baku"
        deskripsi="Komponen upah, material, alat, dan bongkaran yang dipilih saat menyusun resep AHSP. Komponen nonaktif tidak muncul di worksheet, tetapi resep tiket lama tetap utuh."
      />

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <nav className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold" aria-label="Filter kategori">
            {[undefined, ...URUTAN_KATEGORI].map((k) => (
              <Link
                key={k ?? "semua"}
                href={href({ kategori: k })}
                aria-current={kategori === k ? "page" : undefined}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  kategori === k ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {k ? LABEL_KATEGORI[k] : "Semua"}
              </Link>
            ))}
          </nav>
          <form method="get" action="/sb-specialist/master-koefisien" className="flex flex-wrap items-center gap-2" role="search">
            {divisiList.length > 1 ? (
              <select name="divisi" defaultValue={divisiId} aria-label="Divisi" className="px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white">
                {divisiList.map((d) => (
                  <option key={d.id} value={d.id}>{d.namaDivisi}</option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="divisi" value={divisiId ?? ""} />
            )}
            {kategori && <input type="hidden" name="kategori" value={kategori} />}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input name="q" defaultValue={q} placeholder="Cari komponen" aria-label="Cari komponen" className="w-48 pl-8 pr-3 py-1.5 rounded-md border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]" />
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
              <input type="checkbox" name="nonaktif" value="1" defaultChecked={termasukNonaktif} className="accent-[#005BAC]" />
              Tampilkan nonaktif
            </label>
            <button type="submit" className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              Terapkan
            </button>
          </form>
        </div>

        {divisiId ? (
          <KelolaPustaka rows={rows} divisiId={divisiId} />
        ) : (
          <p className="py-10 text-center text-xs text-slate-500">Belum ada divisi aktif yang dapat dikelola.</p>
        )}
      </section>
    </AppLayoutShell>
  );
}
