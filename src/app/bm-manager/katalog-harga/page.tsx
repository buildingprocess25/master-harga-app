import Link from "next/link";
import { BookOpen, CalendarClock, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import prisma from "@/lib/prisma";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { FilterKatalog } from "@/components/katalog/FilterKatalog";
import { KatalogHargaBmClient } from "@/components/bm-manager/KatalogHargaBmClient";
import { SurveiUlangTahunanClient } from "@/components/bm-manager/SurveiUlangTahunanClient";
import { requireRolePage } from "@/lib/auth/require-role";
import {
  getMasterHargaUntukBm,
  getOpsiFilterKatalog,
  parseFilterKatalog,
  UKURAN_HALAMAN_KATALOG,
} from "@/lib/services/master-harga-service";
import { getDaftarSurveiUlangCabang } from "@/lib/services/survei-tahunan-service";

type SP = Record<string, string | string[] | undefined>;

function queryTanpaPage(sp: SP) {
  const p = new URLSearchParams();
  for (const k of ["tab", "q", "kelompok", "divisi", "kategori", "status"]) {
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
  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const activeTab: "semua" | "survei_ulang" =
    tabRaw === "survei_ulang" ? "survei_ulang" : "semua";

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

  const [katalog, surveiUlang, opsi] = await Promise.all([
    resolvedCabangId
      ? getMasterHargaUntukBm(
          resolvedCabangId,
          activeTab === "semua" ? filter : {},
          activeTab === "semua" ? pageParam : 1
        )
      : Promise.resolve({
          rows: [],
          totalItems: 0,
          totalKatalogRilis: 0,
          totalAktifDiCabang: 0,
          totalBelumAktifDiCabang: 0,
          halaman: 1,
          jumlahHalaman: 1,
        }),
    resolvedCabangId
      ? getDaftarSurveiUlangCabang(
          resolvedCabangId,
          activeTab === "survei_ulang" ? filter : {},
          activeTab === "survei_ulang" ? pageParam : 1
        )
      : Promise.resolve({
          rows: [],
          isPeriodeNovember: false,
          tahunPeriode: new Date().getFullYear(),
          labelPeriodeBerikutnya: `November ${new Date().getFullYear()}`,
          totalItems: 0,
          totalPerluSurveiTanpaProses: 0,
          totalWajibSurvei: 0,
          totalSedangDiproses: 0,
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
  const adaFilterAktif = ["q", "kelompok", "divisi", "kategori", "status"].some((k) => qs.has(k));
  const hrefHalaman = (n: number) => {
    const p = new URLSearchParams(qs);
    if (n > 1) p.set("page", String(n));
    return `/bm-manager/katalog-harga${p.size ? `?${p}` : ""}`;
  };
  const aktifHalaman = activeTab === "survei_ulang" ? surveiUlang.halaman : halaman;
  const aktifJumlahHalaman =
    activeTab === "survei_ulang" ? surveiUlang.jumlahHalaman : jumlahHalaman;
  const aktifTotalItems = activeTab === "survei_ulang" ? surveiUlang.totalItems : totalItems;
  const aktifJumlahBaris = activeTab === "survei_ulang" ? surveiUlang.rows.length : rows.length;
  const nomorAwal = (aktifHalaman - 1) * UKURAN_HALAMAN_KATALOG + 1;

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
          deskripsi={`Katalog item SIP & ME Cabang ${cleanCabangName}. Ajukan aktivasi langsung untuk item atau divisi yang belum aktif.`}
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
                Belum Aktif
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

        {/* Tab Pemisah Katalog & Pantauan Survei Ulang Tahunan */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/bm-manager/katalog-harga"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${
              activeTab === "semua"
                ? "bg-[#005BAC] text-white border-[#005BAC]"
                : "bg-white text-slate-700 border-slate-300 hover:border-[#005BAC] hover:text-[#005BAC]"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Semua Katalog</span>
          </Link>
          <Link
            href="/bm-manager/katalog-harga?tab=survei_ulang"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${
              activeTab === "survei_ulang"
                ? "bg-[#005BAC] text-white border-[#005BAC]"
                : "bg-white text-slate-700 border-slate-300 hover:border-[#005BAC] hover:text-[#005BAC]"
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Perlu Survei Ulang</span>
            {surveiUlang.isPeriodeNovember &&
              surveiUlang.totalPerluSurveiTanpaProses > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums bg-[#ED1C24] text-white">
                  {surveiUlang.totalPerluSurveiTanpaProses}
                </span>
              )}
          </Link>
        </div>

        <section className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-slate-50 border-b-2 border-slate-200">
            <FilterKatalog
              opsi={opsi}
              tampilFilterCabang={false}
              tampilFilterOverride={false}
              tampilStatusCabangSaya={activeTab === "semua"}
            />
          </div>

          {activeTab === "survei_ulang" ? (
            !surveiUlang.isPeriodeNovember ? (
              <div className="py-14 text-center px-4">
                <CalendarClock className="w-9 h-9 text-[#005BAC] mx-auto mb-2.5" />
                <p className="text-sm font-black text-slate-900">
                  Di Luar Periode Survei Ulang Tahunan
                </p>
                <p className="text-xs text-slate-600 font-medium mt-1 max-w-md mx-auto">
                  Survei ulang seluruh item aktif cabang dilakukan setiap bulan November. Periode
                  berikutnya dibuka pada{" "}
                  <span className="font-bold text-slate-900">
                    {surveiUlang.labelPeriodeBerikutnya}
                  </span>
                  .
                </p>
              </div>
            ) : surveiUlang.rows.length === 0 ? (
              <div className="py-14 text-center px-4">
                <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  {adaFilterAktif
                    ? "Tidak ada item yang cocok dengan filter"
                    : `Semua harga aktif cabang sudah terbarui untuk November ${surveiUlang.tahunPeriode}`}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {adaFilterAktif
                    ? "Ubah kata kunci atau reset filter untuk melihat daftar survei ulang cabang."
                    : "Seluruh item aktif telah memiliki harga rilis per November tahun ini."}
                </p>
              </div>
            ) : (
              <SurveiUlangTahunanClient
                rows={surveiUlang.rows}
                nomorAwal={nomorAwal}
                tahunPeriode={surveiUlang.tahunPeriode}
                totalWajibSurvei={surveiUlang.totalWajibSurvei}
                totalSedangDiproses={surveiUlang.totalSedangDiproses}
              />
            )
          ) : rows.length === 0 ? (
            <div className="py-14 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                {totalKatalogRilis === 0 && !adaFilterAktif
                  ? "Belum ada item yang dinyatakan rilis di Master Harga"
                  : "Tidak ada item yang cocok dengan filter"}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {!adaFilterAktif
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

          {aktifJumlahHalaman > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t-2 border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">
                Menampilkan {nomorAwal} sampai {nomorAwal + aktifJumlahBaris - 1} dari{" "}
                {aktifTotalItems} {activeTab === "survei_ulang" ? "slot harga" : "item"}
              </span>
              <div className="flex items-center gap-1">
                {aktifHalaman <= 1 ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-slate-200 text-slate-300 cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </span>
                ) : (
                  <Link
                    href={hrefHalaman(aktifHalaman - 1)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-slate-300 text-slate-700 bg-white hover:border-[#005BAC] hover:bg-[#005BAC] hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                )}
                <span className="px-2 font-mono font-bold text-slate-800">
                  {aktifHalaman} / {aktifJumlahHalaman}
                </span>
                {aktifHalaman >= aktifJumlahHalaman ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 border-slate-200 text-slate-300 cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </span>
                ) : (
                  <Link
                    href={hrefHalaman(aktifHalaman + 1)}
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
