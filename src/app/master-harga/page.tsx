import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from "lucide-react";
import {
  getKatalogHarga,
  getOpsiFilterKatalog,
  parseFilterKatalog,
  UKURAN_HALAMAN_KATALOG,
} from "@/lib/services/master-harga-service";
import { cn } from "@/lib/utils";
import { requireInternal } from "./_lib/require-internal";
import { FilterKatalog } from "./_components/FilterKatalog";
import { TabelKatalog } from "./_components/TabelKatalog";

type SearchParams = Record<string, string | string[] | undefined>;

function queryTanpaPage(sp: SearchParams) {
  const p = new URLSearchParams();
  for (const k of ["q", "cabang", "divisi", "kategori", "override"]) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) p.set(k, s);
  }
  return p;
}

export default async function KatalogMasterHargaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireInternal();
  const sp = await searchParams;
  const filter = parseFilterKatalog(sp);
  const pageParam = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1;

  const [katalog, opsi] = await Promise.all([getKatalogHarga(filter, pageParam), getOpsiFilterKatalog()]);
  const { rows, total, totalOverride, totalCabang, halaman, jumlahHalaman } = katalog;

  const qs = queryTanpaPage(sp);
  const hrefHalaman = (n: number) => {
    const p = new URLSearchParams(qs);
    if (n > 1) p.set("page", String(n));
    return `/master-harga${p.size ? `?${p}` : ""}`;
  };
  const qsEkspor = qs.size ? `?${qs}` : "";
  const nomorAwal = (halaman - 1) * UKURAN_HALAMAN_KATALOG + 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Katalog Harga Satuan Resmi</h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            Harga yang sudah lolos kuorum rekanan (RELEASED) dan berlaku aktif per cabang induk.
            Wilayah dengan disparitas harga ditampilkan sebagai harga khusus (override) di bawah harga induknya.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/master-harga/ekspor${qsEkspor}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-[#0F8A5F] hover:text-[#085438]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Ekspor Excel
          </a>
          <a
            href={`/master-harga/cetak${qsEkspor}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC]"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak / PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metrik label="Item harga induk" nilai={total} />
        <Metrik label="Harga khusus wilayah" nilai={totalOverride} tone="yellow" />
        <Metrik label="Cabang" nilai={totalCabang} />
      </div>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <FilterKatalog opsi={opsi} />
        </div>

        {rows.length === 0 ? (
          <div className="py-14 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {total === 0 && qs.size === 0 ? "Belum ada harga resmi yang terbit" : "Tidak ada harga yang cocok dengan filter"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {qs.size === 0
                ? "Harga akan muncul di sini setelah kuorum 50% + 1 rekanan menyetujui."
                : "Ubah kata kunci atau reset filter untuk melihat seluruh katalog."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TabelKatalog rows={rows} nomorAwal={nomorAwal} />
          </div>
        )}

        {jumlahHalaman > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 text-xs">
            <span className="text-slate-600">
              Menampilkan {nomorAwal} sampai {nomorAwal + rows.length - 1} dari {total} item
            </span>
            <div className="flex items-center gap-1">
              <LinkHalaman href={hrefHalaman(halaman - 1)} nonaktif={halaman <= 1} label="Sebelumnya">
                <ChevronLeft className="w-3.5 h-3.5" />
              </LinkHalaman>
              <span className="px-2 font-mono text-slate-700">
                {halaman} / {jumlahHalaman}
              </span>
              <LinkHalaman href={hrefHalaman(halaman + 1)} nonaktif={halaman >= jumlahHalaman} label="Berikutnya">
                <ChevronRight className="w-3.5 h-3.5" />
              </LinkHalaman>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Metrik({ label, nilai, tone = "blue" }: { label: string; nilai: number; tone?: "blue" | "yellow" }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        tone === "yellow" ? "bg-[#FFF8DB] border-[#F3D56B] text-[#6E4B00]" : "bg-[#EAF3FB] border-[#B8D8F3] text-[#003A70]"
      )}
    >
      <div className="text-[11px] font-semibold">{label}</div>
      <div className="text-xl font-bold font-mono tabular-nums">{nilai.toLocaleString("id-ID")}</div>
    </div>
  );
}

function LinkHalaman({
  href,
  nonaktif,
  label,
  children,
}: {
  href: string;
  nonaktif: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const cls = "inline-flex items-center justify-center w-7 h-7 rounded-md border";
  if (nonaktif) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(cls, "border-slate-200 text-slate-300")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(cls, "border-slate-300 text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC]")}>
      {children}
    </Link>
  );
}
