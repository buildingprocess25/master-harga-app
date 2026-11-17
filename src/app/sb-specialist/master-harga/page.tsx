import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, FileSpreadsheet, Printer, Tag } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { FilterKatalog } from "@/components/katalog/FilterKatalog";
import { MasterHargaClient } from "@/components/sb-specialist/MasterHargaClient";
import { requireRolePage } from "@/lib/auth/require-role";
import {
  getKatalogHarga,
  getOpsiFilterKatalog,
  parseFilterKatalog,
  UKURAN_HALAMAN_KATALOG,
} from "@/lib/services/master-harga-service";
import { cn } from "@/lib/utils";

type SP = Record<string, string | string[] | undefined>;

function queryTanpaPage(sp: SP) {
  const p = new URLSearchParams();
  for (const k of ["q", "cabang", "divisi", "kategori", "override"]) {
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
    getKatalogHarga(filter, pageParam),
    getOpsiFilterKatalog(),
  ]);
  const { rows, total, totalOverride, totalCabang, halaman, jumlahHalaman } = katalog;

  const qs = queryTanpaPage(sp);
  const hrefHalaman = (n: number) => {
    const p = new URLSearchParams(qs);
    if (n > 1) p.set("page", String(n));
    return `/sb-specialist/master-harga${p.size ? `?${p}` : ""}`;
  };
  const qsEkspor = qs.size ? `?${qs}` : "";
  const nomorAwal = (halaman - 1) * UKURAN_HALAMAN_KATALOG + 1;

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[{ label: "S&B Specialist", href: "/sb-specialist" }, { label: "Master Harga" }]}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <HeaderHalaman
            icon={Tag}
            judul="Master Harga Resmi (Rilis)"
            deskripsi="Direktori harga satuan resmi yang telah dinyatakan rilis (RELEASED) dan aktif berlaku per cabang induk maupun khusus wilayah."
          />
          <div className="flex gap-2">
            <a
              href={`/master-harga/ekspor${qsEkspor}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-700 hover:border-emerald-700 hover:bg-emerald-700 hover:text-white transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Ekspor Excel
            </a>
            <a
              href={`/master-harga/cetak${qsEkspor}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-700 hover:border-[#005BAC] hover:bg-[#005BAC] hover:text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF
            </a>
          </div>
        </div>

        {/* Kartu Metrik Solid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border-2 border-slate-300 p-4 bg-white shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Item Harga Induk Rilis
            </span>
            <span className="mt-1 text-2xl font-black font-mono tabular-nums text-slate-900 block">
              {total.toLocaleString("id-ID")}
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
                {total === 0 && qs.size === 0
                  ? "Belum ada harga resmi yang dinyatakan rilis"
                  : "Tidak ada harga rilis yang cocok"}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {qs.size === 0
                  ? "Harga akan otomatis masuk ke sini setelah pengajuan disetujui kuorum rekanan (RELEASED)."
                  : "Ubah kata kunci atau reset filter untuk melihat seluruh harga rilis."}
              </p>
            </div>
          ) : (
            <MasterHargaClient rows={rows} nomorAwal={nomorAwal} />
          )}

          {jumlahHalaman > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t-2 border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">
                Menampilkan {nomorAwal} sampai {nomorAwal + rows.length - 1} dari {total} item
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
