"use client";

import { Fragment, useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, CornerDownRight, Database, FolderTree, MapPin } from "lucide-react";
import { CodeBadge } from "@/components/global";
import type { BarisKatalog } from "@/lib/services/master-harga-service";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

interface Grup {
  kodeMaster: string;
  baris: BarisKatalog[];
}

/**
 * Tabel hierarki Katalog Harga Resmi (gaya katalog sparta-fe):
 * baris induk = varian item (kode master), baris anak = harga induk per cabang,
 * dan di bawahnya harga khusus wilayah (override) dengan badge penanda.
 */
export function TabelKatalogHierarki({ rows, nomorAwal = 1 }: { rows: BarisKatalog[]; nomorAwal?: number }) {
  const grup = useMemo(() => {
    const hasil: Grup[] = [];
    for (const r of rows) {
      const akhir = hasil[hasil.length - 1];
      if (akhir && akhir.kodeMaster === r.kodeMaster) akhir.baris.push(r);
      else hasil.push({ kodeMaster: r.kodeMaster, baris: [r] });
    }
    return hasil;
  }, [rows]);

  const [tertutup, setTertutup] = useState<Set<string>>(new Set());
  const jumlahWilayah = rows.reduce((n, r) => n + r.wilayahList.length, 0);

  const toggle = (kode: string) =>
    setTertutup((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode);
      else next.add(kode);
      return next;
    });

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <FolderTree className="w-3.5 h-3.5 text-[#005BAC]" />
            Struktur hierarki harga:
          </span>
          <span className="bg-slate-100 border border-slate-300 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {grup.length} varian item
          </span>
          <span className="bg-[#EAF3FB] text-[#003A70] px-2 py-0.5 rounded-full font-bold border border-[#B8D8F3]">
            {rows.length} harga induk cabang
          </span>
          {jumlahWilayah > 0 && (
            <span className="bg-[#FFF8DB] text-[#6E4B00] px-2 py-0.5 rounded-full font-bold border border-[#F3D56B]">
              {jumlahWilayah} harga wilayah
            </span>
          )}
        </div>
        {grup.length > 0 && (
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <button type="button" onClick={() => setTertutup(new Set())} className={KELAS_TOMBOL_KECIL}>
              Buka Semua
            </button>
            <button
              type="button"
              onClick={() => setTertutup(new Set(grup.map((g) => g.kodeMaster)))}
              className={KELAS_TOMBOL_KECIL}
            >
              Tutup Semua
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
              <th className="text-center px-3 py-3 border-r-2 border-slate-200 w-12">No</th>
              <th className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap min-w-44">Kode Master</th>
              <th className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">Material &amp; Spesifikasi</th>
              <th className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">Kategori &amp; Lokasi</th>
              <th className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">Cakupan Cabang</th>
              <th className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap text-right">Harga Satuan</th>
              <th className="px-3.5 py-3 whitespace-nowrap">Status / Berlaku Sejak</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {grup.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-500">
                  <Database className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-xs text-slate-600">Tidak ada harga resmi untuk filter yang dipilih.</p>
                </td>
              </tr>
            ) : (
              grup.map((g, gi) => {
                const induk = g.baris[0];
                const terbuka = !tertutup.has(g.kodeMaster);
                const harga = g.baris.map((b) => b.harga);
                const min = Math.min(...harga);
                const maks = Math.max(...harga);
                const wilayah = g.baris.reduce((n, b) => n + b.wilayahList.length, 0);
                const no = nomorAwal + rows.indexOf(induk);
                return (
                  <Fragment key={`${g.kodeMaster}-${gi}`}>
                    <tr className="bg-slate-100 hover:bg-slate-200 transition-colors border-t-2 border-slate-200 font-medium">
                      <td className="text-center px-3 py-3 border-r-2 border-slate-200 font-bold text-slate-600">{no}</td>
                      <td className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggle(g.kodeMaster)}
                          aria-expanded={terbuka}
                          aria-label={`${terbuka ? "Tutup" : "Buka"} harga ${induk.namaItem}`}
                          className="inline-flex items-center gap-2 cursor-pointer"
                        >
                          {terbuka ? (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                          <CodeBadge code={g.kodeMaster} />
                        </button>
                      </td>
                      <td className="px-3.5 py-3 border-r-2 border-slate-200 min-w-52">
                        <div className="font-bold text-slate-900">{induk.namaItem}</div>
                        {induk.spesifikasi && <div className="text-[11px] text-slate-600">{induk.spesifikasi}</div>}
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs mt-0.5" title={induk.deskripsi}>
                          {induk.deskripsi}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{induk.kategori}</div>
                        <div className="text-[11px] text-slate-500">
                          {induk.lokasi} &bull; {induk.namaDivisi}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white text-slate-700 border border-slate-300">
                          {g.baris.length} cabang aktif
                        </span>
                        {wilayah > 0 && (
                          <span className="ml-1.5 inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF8DB] text-[#6E4B00] border border-[#F3D56B]">
                            {wilayah} wilayah
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap text-right">
                        <div className="font-mono tabular-nums font-bold text-slate-900">
                          {min === maks ? formatRupiah(min) : `${formatRupiah(min)} s/d ${formatRupiah(maks)}`}
                        </div>
                        <div className="text-[11px] text-slate-500">per {induk.satuan}</div>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0F8A5F] text-white">
                          Aktif
                        </span>
                      </td>
                    </tr>

                    {terbuka &&
                      g.baris.map((r) => (
                        <Fragment key={r.id}>
                          <tr className="bg-white hover:bg-slate-50 transition-colors border-t border-slate-100 align-top">
                            <td className="text-center px-3 py-2.5 border-r-2 border-slate-100 text-slate-300">&bull;</td>
                            <td className="px-3.5 py-2.5 border-r-2 border-slate-100 whitespace-nowrap pl-8">
                              <span className="inline-flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                                <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                                {r.kodeCabang}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 border-r-2 border-slate-100" colSpan={2}>
                              <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                                <Building2 className="w-3.5 h-3.5 text-[#005BAC]" />
                                {r.namaCabang}
                              </div>
                              <div className="text-[11px] text-slate-500">{r.regional}</div>
                            </td>
                            <td className="px-3.5 py-2.5 border-r-2 border-slate-100 whitespace-nowrap">
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF3FB] text-[#003A70] border border-[#B8D8F3]">
                                Induk cabang
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 border-r-2 border-slate-100 whitespace-nowrap text-right">
                              <div className="font-mono tabular-nums font-bold text-slate-900">{formatRupiah(r.harga)}</div>
                              <div className="text-[11px] text-slate-500">per {r.satuan}</div>
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              <div className="font-mono text-slate-700">{formatTanggal(r.berlakuSejak)}</div>
                              {r.nomorTiket && <div className="font-mono text-[11px] text-slate-500">{r.nomorTiket}</div>}
                            </td>
                          </tr>
                          {r.wilayahList.map((w) => (
                            <tr key={w.id} className="bg-[#FFFDF3] hover:bg-[#FFF8DB] transition-colors align-top">
                              <td className="border-r-2 border-slate-100" />
                              <td className="px-3.5 py-2 border-r-2 border-slate-100 whitespace-nowrap pl-14">
                                <span className="inline-flex items-center gap-1.5 text-[#6E4B00] font-mono text-[11px]">
                                  <CornerDownRight className="w-3.5 h-3.5 text-[#D99B00]" />
                                  {w.kodeWilayah}
                                </span>
                              </td>
                              <td className="px-3.5 py-2 border-r-2 border-slate-100" colSpan={2}>
                                <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                                  <MapPin className="w-3.5 h-3.5 text-[#D99B00]" />
                                  Wilayah {w.namaWilayah}
                                </div>
                                <div className="text-[11px] text-slate-500">Harga khusus untuk wilayah di {r.namaCabang}</div>
                              </td>
                              <td className="px-3.5 py-2 border-r-2 border-slate-100 whitespace-nowrap">
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFD100] text-slate-900 border border-amber-300">
                                  Override wilayah
                                </span>
                              </td>
                              <td className="px-3.5 py-2 border-r-2 border-slate-100 whitespace-nowrap text-right">
                                <div className="font-mono tabular-nums font-bold text-slate-900">{formatRupiah(w.harga)}</div>
                                <Selisih rp={w.selisihRp} persen={w.selisihPersen} />
                              </td>
                              <td className="px-3.5 py-2 whitespace-nowrap">
                                <div className="font-mono text-slate-700">{formatTanggal(w.berlakuSejak)}</div>
                                {w.nomorTiket && <div className="font-mono text-[11px] text-slate-500">{w.nomorTiket}</div>}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const KELAS_TOMBOL_KECIL =
  "h-7 px-2.5 rounded-lg border-2 border-slate-300 bg-white text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer";

function Selisih({ rp, persen }: { rp: number; persen: number }) {
  const tanda = rp > 0 ? "+" : rp < 0 ? "-" : "";
  return (
    <div
      className={cn(
        "text-[11px] font-mono tabular-nums font-semibold",
        rp > 0 ? "text-[#990F14]" : rp < 0 ? "text-[#085438]" : "text-slate-500"
      )}
    >
      {tanda}
      {formatRupiah(Math.abs(rp))} ({tanda}
      {Math.abs(persen).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%) dari induk
    </div>
  );
}
