import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from "lucide-react";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import {
  getKatalogHarga,
  getOpsiFilterKatalog,
  parseFilterKatalog,
  UKURAN_HALAMAN_KATALOG,
} from "@/lib/services/master-harga-service";
import { cn } from "@/lib/utils";
import { FilterKatalog } from "./FilterKatalog";
import { TabelKatalogHierarki } from "./TabelKatalogHierarki";

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
 * Isi Katalog Harga Resmi (ringkasan, filter, tabel hierarki, paging, ekspor & cetak).
 * Dipakai di /master-harga (seluruh cabang) dan /regional-manager/katalog-harga
 * (dibatasi cabangIds wewenang; ekspor/cetak membawa ?lingkup=wewenang).
 * tampilJudul=false bila halaman sudah punya HeaderHalaman sendiri.
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

  const metrik = (
    <div className="flex flex-wrap items-center gap-2">
      <Metrik label="Harga Induk" nilai={total} kelas="text-slate-800" />
      <Metrik label="Harga Wilayah" nilai={totalOverride} kelas="text-[#B45309]" />
      <Metrik label="Cabang" nilai={totalCabang} kelas="text-[#005BAC]" />
    </div>
  );

  return (
    <div className="space-y-5">
      {tampilJudul ? (
        <HeaderHalaman
          icon={BookOpen}
          judul="Katalog Master Harga"
          deskripsi="Harga satuan resmi yang sudah lolos kuorum rekanan (RELEASED) dan berlaku aktif per cabang induk, lengkap dengan harga khusus wilayah (override)."
          aksi={metrik}
        />
      ) : (
        metrik
      )}

      <div className="bg-white p-3 rounded-xl border-2 border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <FilterKatalog opsi={opsi} />
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={`/master-harga/ekspor${qsEkspor}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#0F8A5F] bg-white text-xs font-bold text-[#0F8A5F] hover:bg-[#E7F6F0]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Ekspor Excel
          </a>
          <a
            href={`/master-harga/cetak${qsEkspor}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-xs font-bold text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC]"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak / PDF
          </a>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-slate-200 py-14 text-center">
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
        <TabelKatalogHierarki rows={rows} nomorAwal={nomorAwal} />
      )}

      {jumlahHalaman > 1 && (
        <div className="flex items-center justify-between gap-3 px-1 text-xs">
          <span className="text-slate-600">
            Menampilkan harga induk {nomorAwal} sampai {nomorAwal + rows.length - 1} dari {total}
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
    </div>
  );
}

function Metrik({ label, nilai, kelas }: { label: string; nilai: number; kelas: string }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg px-3.5 py-1.5 text-center min-w-24">
      <span className="text-[11px] text-slate-500 font-semibold block">{label}</span>
      <span className={cn("text-base font-bold font-mono tabular-nums", kelas)}>{nilai.toLocaleString("id-ID")}</span>
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
  const cls = "inline-flex items-center justify-center w-7 h-7 rounded-lg border-2";
  if (nonaktif) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(cls, "border-slate-200 text-slate-300")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(cls, "border-slate-300 bg-white text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC]")}>
      {children}
    </Link>
  );
}
