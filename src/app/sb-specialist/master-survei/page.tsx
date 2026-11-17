import { Search, Store } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { MasterSurveiClient } from "@/components/sb-specialist/MasterSurveiClient";
import { requireRolePage } from "@/lib/auth/require-role";
import { getDivisiKelola } from "@/lib/services/pustaka-service";
import { getMasterSurveiData } from "@/lib/services/master-survei-service";

type SP = { divisi?: string; cabang?: string; kategori?: string; q?: string };

export default async function MasterSurveiSnbPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  const sp = await searchParams;
  const divisiList = await getDivisiKelola(user.divisiId);
  const divisiIds = divisiList.map((d) => d.id);

  const data = await getMasterSurveiData({
    divisiIds,
    divisiId: sp.divisi || undefined,
    cabangId: sp.cabang || undefined,
    kategori: sp.kategori || undefined,
    q: sp.q || undefined,
  });

  const totalKomponen = data.komponenSurvei.length;
  const sudahAdaSurvei = data.komponenSurvei.filter((k) => k.latestSurvei !== null).length;
  const tokoAktifCount = data.masterTokoList.filter((t) => t.isActive).length;

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[{ label: "S&B Specialist", href: "/sb-specialist" }, { label: "Master Survei" }]}
    >
      <div className="space-y-5">
        <HeaderHalaman
          icon={Store}
          judul="Master Survei Material & Peralatan"
          deskripsi="Pengelolaan komponen Material Bahan dan Peralatan Kerja yang menjadi acuan Master Koefisien beserta riwayat survei 3 toko pasar dan direktori toko lintas cabang."
        />

        {/* 3 Kartu Metrik Solid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Material &amp; Peralatan
            </span>
            <span className="mt-1 text-2xl font-black font-mono text-slate-900 block">
              {totalKomponen}
            </span>
          </div>
          <div className="rounded-2xl border-2 border-[#005BAC] bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#005BAC] block">
              Sudah Ada Survei 3 Toko
            </span>
            <span className="mt-1 text-2xl font-black font-mono text-[#005BAC] block">
              {sudahAdaSurvei}
            </span>
          </div>
          <div className="rounded-2xl border-2 border-emerald-600 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Toko Terdaftar Aktif
            </span>
            <span className="mt-1 text-2xl font-black font-mono text-emerald-600 block">
              {tokoAktifCount}
            </span>
          </div>
        </div>

        <section className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-2xs">
          {/* Toolbar Filter */}
          <form
            method="get"
            action="/sb-specialist/master-survei"
            role="search"
            className="flex flex-wrap items-center gap-2.5 px-4 py-3 border-b-2 border-slate-200 bg-white"
          >
            <div className="relative flex-1 min-w-52 sm:max-w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Cari komponen, no tiket, atau toko..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-[#005BAC]"
              />
            </div>

            {data.divisiList.length > 1 && (
              <select
                name="divisi"
                defaultValue={sp.divisi ?? ""}
                aria-label="Filter Divisi"
                className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#005BAC]"
              >
                <option value="">Semua Divisi</option>
                {data.divisiList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.namaDivisi}
                  </option>
                ))}
              </select>
            )}

            <select
              name="kategori"
              defaultValue={sp.kategori ?? ""}
              aria-label="Filter Kategori"
              className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#005BAC]"
            >
              <option value="">Semua (Material &amp; Peralatan)</option>
              <option value="MATERIAL">Material Bahan</option>
              <option value="ALAT">Peralatan Kerja</option>
            </select>

            <select
              name="cabang"
              defaultValue={sp.cabang ?? ""}
              aria-label="Filter Cabang"
              className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#005BAC]"
            >
              <option value="">Semua Cabang</option>
              {data.cabangList.map((c) => (
                <option key={c.id} value={c.id}>
                  Cabang {c.namaCabang}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Terapkan
            </button>
          </form>

          <MasterSurveiClient data={data} />
        </section>
      </div>
    </AppLayoutShell>
  );
}
