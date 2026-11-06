"use client";

import React, { useMemo } from "react";
import { Calculator, CheckCircle2, Info } from "lucide-react";
import { SurveyTokoItem } from "@/types";
import { cn, formatRupiah } from "@/lib/utils";

export interface RingkasanBiayaMaterialProps {
  materialItems?: any[];
  totalBiayaMaterial?: number;
  surveiList?: SurveyTokoItem[];
  namaMaterial?: string;
  className?: string;
  title?: string;
}

export function RingkasanBiayaMaterial({
  materialItems,
  totalBiayaMaterial,
  surveiList = [],
  namaMaterial = "Item Material Utama",
  className = "",
  title = "Ringkasan Biaya Material",
}: RingkasanBiayaMaterialProps) {
  // JIKA DIPANGGIL DENGAN LIST MATERIAL ITEMS (seperti di BM review & Building Coord):
  if (materialItems && materialItems.length > 0) {
    const calculatedTotal =
      totalBiayaMaterial !== undefined
        ? totalBiayaMaterial
        : materialItems.reduce((acc, curr) => {
            const avg = curr.hargaSurveiRataRata || curr.hargaAcuan || 0;
            const sub = curr.subtotal !== undefined ? curr.subtotal : Math.round((Number(curr.value || curr.koefisien) || 0) * avg);
            return acc + sub;
          }, 0);

    return (
      <div
        className={cn(
          "border-2 border-slate-300 rounded-2xl p-4 bg-white space-y-3 shadow-xs",
          className
        )}
      >
        <div className="border-b-2 border-slate-100 pb-2.5 flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            {title}
          </h4>
          <span className="text-[11px] text-slate-500 font-bold">
            {materialItems.length} Komponen
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200">
                <th className="py-2.5 px-3 text-center w-10">No</th>
                <th className="py-2.5 px-3">Nama Komponen</th>
                <th className="py-2.5 px-3 text-center">Koefisien</th>
                <th className="py-2.5 px-3 text-right">Rata-Rata</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">
                  Total Biaya Material
                </th>
                <th className="py-2.5 px-3 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {materialItems.map((mat, idx) => {
                const stores = mat.surveyToko || [];
                const validCount = stores.filter(
                  (s: any) =>
                    s.namaToko?.trim() &&
                    Number(s.hargaSatuan || s.harga) > 0
                ).length;
                const isComplete = validCount === 3;
                const avg = mat.hargaSurveiRataRata || mat.hargaAcuan || 0;
                const subtotal = mat.subtotal !== undefined ? mat.subtotal : Math.round((Number(mat.value || mat.koefisien) || 0) * avg);

                return (
                  <tr key={mat.id || idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {mat.label || mat.namaKomponen || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                      {mat.value || mat.koefisien || "1.0000"} {mat.unit || mat.satuan || ""}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#005BAC]">
                      {formatRupiah(avg)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                      {formatRupiah(subtotal)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          <span>3/3 Toko</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded-full shadow-2xs">
                          {validCount}/3 Toko
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                <td colSpan={4} className="py-3 px-3 text-right text-slate-700 uppercase tracking-wider font-extrabold">
                  Grand Total Biaya Material:
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-800">
                  {formatRupiah(calculatedTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // JIKA DIPANGGIL DENGAN SURVEILIST 3 TOKO TUNGGAL:
  const validPrices = surveiList
    .map((s) => s.harga)
    .filter((p) => p !== undefined && p !== null && !isNaN(p) && p > 0);

  const count = validPrices.length;
  const lowest = count > 0 ? Math.min(...validPrices) : 0;
  const highest = count > 0 ? Math.max(...validPrices) : 0;
  const average =
    count > 0 ? Math.round(validPrices.reduce((a, b) => a + b, 0) / count) : 0;
  const disparityPercent =
    lowest > 0 ? (((highest - lowest) / lowest) * 100).toFixed(1) : "0.0";

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Header Card */}
      <div className="bg-slate-50 border-b-2 border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#005BAC]" />
          <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
            Ringkasan Harga Acuan Pasar ({namaMaterial})
          </h3>
        </div>
        <span className="text-[11px] font-bold text-slate-500">
          {count} dari 3 Toko Terinput
        </span>
      </div>

      {/* Tabel Komparasi Dense */}
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 font-bold">
                <th className="pb-2">Toko 1</th>
                <th className="pb-2">Toko 2</th>
                <th className="pb-2">Toko 3</th>
                <th className="pb-2 text-right">Harga Terendah</th>
                <th className="pb-2 text-right">Harga Tertinggi</th>
                <th className="pb-2 text-right">Disparitas</th>
                <th className="pb-2 text-right font-extrabold text-[#005BAC]">
                  Rata-Rata Acuan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-800 tabular-nums">
              <tr>
                <td className="py-2.5">
                  {formatRupiah(surveiList.find((s) => s.noToko === 1)?.harga)}
                </td>
                <td className="py-2.5">
                  {formatRupiah(surveiList.find((s) => s.noToko === 2)?.harga)}
                </td>
                <td className="py-2.5">
                  {formatRupiah(surveiList.find((s) => s.noToko === 3)?.harga)}
                </td>
                <td className="py-2.5 text-right font-bold text-emerald-700">
                  {formatRupiah(lowest)}
                </td>
                <td className="py-2.5 text-right font-bold text-amber-700">
                  {formatRupiah(highest)}
                </td>
                <td className="py-2.5 text-right font-bold text-slate-600">
                  {disparityPercent}%
                </td>
                <td className="py-2.5 text-right font-black text-base text-white bg-[#005BAC] px-2.5 rounded shadow-2xs">
                  {formatRupiah(average)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Info Note */}
        <div className="mt-3 text-[11px] text-slate-600 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium">
          <Info className="w-3.5 h-3.5 text-[#005BAC] shrink-0" />
          <span>
            Nilai <strong>Rata-Rata Acuan Pasar ({formatRupiah(average)})</strong>{" "}
            dihitung otomatis dari 3 toko material survei fisik.
          </span>
        </div>
      </div>
    </div>
  );
}
