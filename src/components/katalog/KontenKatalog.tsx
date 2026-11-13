import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from "lucide-react";
import {
  getKatalogHarga,
  getOpsiFilterKatalog,
  parseFilterKatalog,
  UKURAN_HALAMAN_KATALOG,
} from "@/lib/services/master-harga-service";
import { cn } from "@/lib/utils";
import { FilterKatalog } from "./FilterKatalog";
import { TabelKatalog } from "./TabelKatalog";

export type SearchParams = Record<string, string | string[] | undefined>;

function queryTanpaPage(sp: SearchParams) {
  const p = new URLSearchParams();
  for (const k of ["q", "cabang", "divisi", "kategori", "override"]) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) p.set(k, s);
  }
  return p;
}

/**
 * Isi Katalog Harga Resmi (filter, ringkasan, tabel hierarki, paging, ekspor & cetak).
 * Dipakai di /master-harga (seluruh cabang) dan /regional-manager/katalog-harga
 * (dibatasi cabangIds wewenang; ekspor/cetak membawa ?lingkup=wewenang).
 */
export async function KontenKatalog({
  sp,
  basePath,
  cabangIds,
  tampilJudul = true,
}: {
  sp: SearchParams;
  basePath: string;
  cabangIds?: string[];
  tampilJudul?: boolean;
}) {
  const filter = { ...parseFilterKatalog(sp), cabangIds };
  const pageParam = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1;

  const [katalog, opsi] = await Promise.all([getKatalogHarga(filter, pageParam), getOpsiFilterKatalog(cabangIds)]);
  const { rows, total, totalOverride, totalCabang, halaman, jumlahHalaman } = katalog;

  const qs = queryTanpaPage(sp);
  const hrefHalaman = (n: number) => {
    const p = new URLSearchParams(qs);
    if (n > 1) p.set("page", String(n));
    return `${basePath}${p.size ? `?${p}` : ""}`;
  };
  const qsEksporParams = new URLSearchParams(qs);
  if (cabangIds) qsEksporParams.set("lingkup", "wewenang");
  const qsEkspor = qsEksporParams.size ? `?${qsEksporParams}` : "";
  const nomorAwal = (halaman - 1) * UKURAN_HALAMAN_KATALOG + 1;

  return (
    <div className="space-y-5">
      <div className={cn("flex flex-wrap items-end gap-3", tampilJudul ? "justify-between" : "justify-end")}>
        {tampilJudul && (
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Katalog Harga Satuan Resmi</h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5 max-w-2xl">
              Harga satuan yang telah disetujui kuorum rekanan dan berlaku aktif.
              Harga khusus wilayah ditampilkan di bawah harga induk cabang.
            </p>
          </div>
        )}
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Metrik label="Item harga induk" nilai={total} />
        <Metrik label="Harga khusus wilayah" nilai={totalOverride} tone="yellow" />
        <Metrik label="Cabang aktif" nilai={totalCabang} />
      </div>

      <section className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50 border-b-2 border-slate-200">
          <FilterKatalog opsi={opsi} />
        </div>

        {rows.length === 0 ? (
          <div className="py-14 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">
              {total === 0 && qs.size === 0 ? "Belum ada harga resmi yang terbit" : "Tidak ada harga yang cocok"}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {qs.size === 0
                ? "Harga akan muncul di sini setelah kuorum rekanan menyetujui."
                : "Ubah kata kunci atau reset filter untuk melihat katalog lengkap."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TabelKatalog rows={rows} nomorAwal={nomorAwal} />
          </div>
        )}

        {jumlahHalaman > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t-2 border-slate-200 text-xs">
            <span className="text-slate-600 font-medium">
              Menampilkan {nomorAwal} sampai {nomorAwal + rows.length - 1} dari {total} item
            </span>
            <div className="flex items-center gap-1">
              <LinkHalaman href={hrefHalaman(halaman - 1)} nonaktif={halaman <= 1} label="Sebelumnya">
                <ChevronLeft className="w-4 h-4" />
              </LinkHalaman>
              <span className="px-2 font-mono font-bold text-slate-800">
                {halaman} / {jumlahHalaman}
              </span>
              <LinkHalaman href={hrefHalaman(halaman + 1)} nonaktif={halaman >= jumlahHalaman} label="Berikutnya">
                <ChevronRight className="w-4 h-4" />
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
        "rounded-2xl border-2 p-4 bg-white shadow-2xs",
        tone === "yellow" ? "border-amber-400" : "border-slate-300"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {tone === "yellow" && (
          <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-black uppercase">KHUSUS</span>
        )}
      </div>
      <div className="mt-1 text-2xl font-black font-mono tabular-nums text-slate-900">{nilai.toLocaleString("id-ID")}</div>
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
  const cls = "inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 font-bold transition-colors";
  if (nonaktif) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(cls, "border-slate-200 text-slate-300 cursor-not-allowed")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(cls, "border-slate-300 text-slate-700 bg-white hover:border-[#005BAC] hover:bg-[#005BAC] hover:text-white cursor-pointer")}>
      {children}
    </Link>
  );
}
