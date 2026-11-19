import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { FilterKatalog } from "@/components/katalog/FilterKatalog";
import { MasterHargaClient } from "@/components/sb-specialist/MasterHargaClient";
import { requireRolePage } from "@/lib/auth/require-role";
import {
  getMasterHargaPerItem,
  getOpsiFilterKatalog,
  parseFilterKatalog,
  UKURAN_HALAMAN_SNB,
} from "@/lib/services/master-harga-service";
import { cn } from "@/lib/utils";

type SP = Record<string, string | string[] | undefined>;

function queryTanpaPage(sp: SP) {
  const p = new URLSearchParams();
  for (const k of ["q", "kelompok", "cabang", "divisi", "kategori", "override"]) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) p.set(k, s);
  }
  return p;
}

export default async function MasterHargaSnbPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  const sp = await searchParams;
  const filter = parseFilterKatalog(sp);
  const pageParam = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1;

  const [katalog, opsi] = await Promise.all([
    getMasterHargaPerItem(filter, pageParam),
    getOpsiFilterKatalog(),
  ]);
  const { rows, totalItems, totalSlotAktif, totalOverride, totalCabang, halaman, jumlahHalaman } =
    katalog;

  const qs = queryTanpaPage(sp);
  const hrefHalaman = (n: number) => {
    const p = new URLSearchParams(qs);
    if (n > 1) p.set("page", String(n));
    return `/sb-specialist/master-harga${p.size ? `?${p}` : ""}`;
  };
  const nomorAwal = (halaman - 1) * UKURAN_HALAMAN_SNB + 1;

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[{ label: "S&B Specialist", href: "/sb-specialist" }, { label: "Master Harga" }]}
    >
      <div className="space-y-5">
        <HeaderHalaman
          icon={Tag}
          judul="Master Harga Resmi (Rilis)"
          deskripsi="Daftar item SIP & ME yang sudah dinyatakan rilis beserta rincian harga aktif per cabang, per divisi, dan khusus wilayah."
        />

        {/* Kartu Metrik Solid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border-2 border-slate-300 p-4 bg-white shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Item Rilis (SIP &amp; ME)
            </span>
            <span className="mt-1 text-2xl font-black font-mono tabular-nums text-slate-900 block">
              {totalItems.toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
              {totalSlotAktif.toLocaleString("id-ID")} kombinasi cabang &amp; divisi aktif
            </span>
          </div>
          <div className="rounded-2xl border-2 border-amber-400 p-4 bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Harga Khusus Wilayah
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-black uppercase">
                KHUSUS
              </span>
            </div>
            <span className="mt-1 text-2xl font-black font-mono tabular-nums text-slate-900 block">
              {totalOverride.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="rounded-2xl border-2 border-slate-300 p-4 bg-white shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Cabang Aktif
            </span>
            <span className="mt-1 text-2xl font-black font-mono tabular-nums text-[#005BAC] block">
              {totalCabang.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        <section className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-slate-50 border-b-2 border-slate-200">
            <FilterKatalog opsi={opsi} />
          </div>

          {rows.length === 0 ? (
            <div className="py-14 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                {totalItems === 0 && qs.size === 0
                  ? "Belum ada harga resmi yang dinyatakan rilis"
                  : "Tidak ada harga rilis yang cocok"}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {qs.size === 0
                  ? "Harga akan otomatis masuk ke sini setelah pengajuan disetujui kuorum vendor (RELEASED)."
                  : "Ubah kata kunci atau reset filter untuk melihat seluruh harga rilis."}
              </p>
            </div>
          ) : (
            <MasterHargaClient
              rows={rows}
              nomorAwal={nomorAwal}
              opsiCabang={opsi.cabangList}
              opsiDivisi={opsi.divisiList}
              initialModalFilter={{
                cabangId: filter.cabangId ?? "",
                divisiId: filter.divisiId ?? "",
                hanyaOverride: Boolean(filter.hanyaOverride),
              }}
            />
          )}

          {jumlahHalaman > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t-2 border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">
                Menampilkan {nomorAwal} sampai {nomorAwal + rows.length - 1} dari {totalItems} item
              </span>
              <div className="flex items-center gap-1">
                {halaman <= 1 ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-slate-200 text-slate-300 cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </span>
                ) : (
                  <Link
                    href={hrefHalaman(halaman - 1)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-slate-300 text-slate-700 bg-white hover:border-[#005BAC] hover:bg-[#005BAC] hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                )}
                <span className="px-2 font-mono font-bold text-slate-800">
                  {halaman} / {jumlahHalaman}
                </span>
                {halaman >= jumlahHalaman ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-slate-200 text-slate-300 cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </span>
                ) : (
                  <Link
                    href={hrefHalaman(halaman + 1)}
                    className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-slate-300 text-slate-700 bg-white hover:border-[#005BAC] hover:bg-[#005BAC] hover:text-white transition-colors"
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayoutShell>
  );
}
