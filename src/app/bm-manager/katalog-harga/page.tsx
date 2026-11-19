import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import prisma from "@/lib/prisma";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { FilterKatalog } from "@/components/katalog/FilterKatalog";
import { KatalogHargaBmClient } from "@/components/bm-manager/KatalogHargaBmClient";
import { requireRolePage } from "@/lib/auth/require-role";
import {
  getMasterHargaUntukBm,
  getOpsiFilterKatalog,
  parseFilterKatalog,
  UKURAN_HALAMAN_KATALOG,
} from "@/lib/services/master-harga-service";

type SP = Record<string, string | string[] | undefined>;

function queryTanpaPage(sp: SP) {
  const p = new URLSearchParams();
  for (const k of ["q", "kelompok", "divisi", "kategori", "status"]) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) p.set(k, s);
  }
  return p;
}

export default async function KatalogHargaBmPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireRolePage(["BM_MANAGER", "PP_MANAGER"]);
  const sp = await searchParams;
  const filter = parseFilterKatalog(sp);
  const pageParam = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1;

  let resolvedCabangId = user.cabangId;
  let resolvedNamaCabang = user.namaCabang || "Cabang";
  if (!resolvedCabangId) {
    const fallback = await prisma.cabang.findFirst({
      where: { isActive: true },
      orderBy: { kodeCabang: "asc" },
      select: { id: true, namaCabang: true },
    });
    if (fallback) {
      resolvedCabangId = fallback.id;
      resolvedNamaCabang = fallback.namaCabang;
    }
  }
  const cleanCabangName = resolvedNamaCabang.replace(/^Cabang\s+/i, "");

  const [katalog, opsi] = await Promise.all([
    resolvedCabangId
      ? getMasterHargaUntukBm(resolvedCabangId, filter, pageParam)
      : Promise.resolve({
          rows: [],
          totalItems: 0,
          totalKatalogRilis: 0,
          totalAktifDiCabang: 0,
          totalBelumAktifDiCabang: 0,
          halaman: 1,
          jumlahHalaman: 1,
        }),
    getOpsiFilterKatalog(),
  ]);

  const {
    rows,
    totalItems,
    totalKatalogRilis,
    totalAktifDiCabang,
    totalBelumAktifDiCabang,
    halaman,
    jumlahHalaman,
  } = katalog;

  const qs = queryTanpaPage(sp);
  const hrefHalaman = (n: number) => {
    const p = new URLSearchParams(qs);
    if (n > 1) p.set("page", String(n));
    return `/bm-manager/katalog-harga${p.size ? `?${p}` : ""}`;
  };
  const nomorAwal = (halaman - 1) * UKURAN_HALAMAN_KATALOG + 1;

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "B&M Manager", href: "/bm-manager" },
        { label: "Katalog Harga Rilis" },
      ]}
    >
      <div className="space-y-5">
        <HeaderHalaman
          icon={Tag}
          judul={`Master Harga Item (Cabang ${cleanCabangName})`}
          deskripsi="Seluruh item SIP & ME yang telah rilis. Harga yang tampil hanya untuk cabang Anda sendiri; item atau divisi yang belum aktif dapat langsung diajukan aktivasinya."
        />

        {/* Kartu Metrik Solid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border-2 border-slate-300 p-4 bg-white shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Item Katalog (SIP &amp; ME)
            </span>
            <span className="mt-1 text-2xl font-black font-mono tabular-nums text-slate-900 block">
              {totalKatalogRilis.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="rounded-2xl border-2 border-emerald-600 p-4 bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Aktif di Cabang {cleanCabangName}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase">
                AKTIF
              </span>
            </div>
            <span className="mt-1 text-2xl font-black font-mono tabular-nums text-emerald-700 block">
              {totalAktifDiCabang.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="rounded-2xl border-2 border-[#005BAC] p-4 bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Belum Aktif di Cabang Ini
              </span>
              <span className="px-2 py-0.5 rounded bg-[#005BAC] text-white text-[10px] font-black uppercase">
                TERSEDIA
              </span>
            </div>
            <span className="mt-1 text-2xl font-black font-mono tabular-nums text-[#005BAC] block">
              {totalBelumAktifDiCabang.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        <section className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-slate-50 border-b-2 border-slate-200">
            <FilterKatalog
              opsi={opsi}
              tampilFilterCabang={false}
              tampilFilterOverride={false}
              tampilStatusCabangSaya={true}
            />
          </div>

          {rows.length === 0 ? (
            <div className="py-14 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                {totalKatalogRilis === 0 && qs.size === 0
                  ? "Belum ada item yang dinyatakan rilis di Master Harga"
                  : "Tidak ada item yang cocok dengan filter"}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {qs.size === 0
                  ? "Item akan tampil di sini setelah ada minimal satu harga resmi yang disetujui."
                  : "Ubah kata kunci atau reset filter untuk melihat seluruh katalog."}
              </p>
            </div>
          ) : (
            <KatalogHargaBmClient
              rows={rows}
              namaCabang={cleanCabangName}
              nomorAwal={nomorAwal}
            />
          )}

          {jumlahHalaman > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t-2 border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">
                Menampilkan {nomorAwal} sampai {nomorAwal + rows.length - 1} dari{" "}
                {totalItems} item
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
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-slate-300 text-slate-700 bg-white hover:border-[#005BAC] hover:bg-[#005BAC] hover:text-white transition-colors"
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
