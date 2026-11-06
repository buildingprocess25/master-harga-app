import { Package, Search } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { KelolaMasterItem } from "@/components/sb-specialist/KelolaMasterItem";
import { requireRolePage } from "@/lib/auth/require-role";
import { daftarKategoriItem, daftarMasterItem } from "@/lib/services/master-item-service";
import { getDivisiKelola } from "@/lib/services/pustaka-service";

type SP = { divisi?: string; kategori?: string; q?: string };

export default async function MasterItemPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  const sp = await searchParams;
  const divisiList = await getDivisiKelola(user.divisiId);
  const divisiIds = divisiList.map((d) => d.id);
  const q = sp.q?.trim() || undefined;

  const [rows, kategoriList] = await Promise.all([
    divisiIds.length ? daftarMasterItem({ divisiIds, divisiId: sp.divisi, kategori: sp.kategori || undefined, q }) : Promise.resolve([]),
    divisiIds.length ? daftarKategoriItem(divisiIds) : Promise.resolve([]),
  ]);

  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "S&B Specialist" }, { label: "Master Item Spek" }]}>
      <HeaderHalaman
        icon={Package}
        judul="Master Item Spesifikasi"
        deskripsi="Direktori spesifikasi item pekerjaan dan material yang menjadi acuan pengajuan harga, resep AHSP, dan katalog harga resmi."
      />

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden pb-2">
        <form method="get" action="/sb-specialist/master-item" role="search" className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-200">
          <div className="relative flex-1 min-w-48 sm:max-w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input name="q" defaultValue={q} placeholder="Cari nama item, kode master, merk" aria-label="Cari item" className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]" />
          </div>
          {divisiList.length > 1 && (
            <select name="divisi" defaultValue={sp.divisi ?? ""} aria-label="Divisi" className="px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white">
              <option value="">Semua divisi</option>
              {divisiList.map((d) => (
                <option key={d.id} value={d.id}>{d.namaDivisi}</option>
              ))}
            </select>
          )}
          <select name="kategori" defaultValue={sp.kategori ?? ""} aria-label="Kategori" className="px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white">
            <option value="">Semua kategori</option>
            {kategoriList.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button type="submit" className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
            Terapkan
          </button>
          <span className="ml-auto text-[11px] text-slate-500">{rows.length} item{rows.length >= 300 ? " (300 pertama)" : ""}</span>
        </form>

        <KelolaMasterItem rows={rows} divisiList={divisiList} />
      </section>
    </AppLayoutShell>
  );
}
