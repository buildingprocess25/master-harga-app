"use client";

import React from "react";
import { Calculator, TrendingDown, TrendingUp, Info } from "lucide-react";
import { SurveyTokoItem } from "@/types";
import { cn, formatRupiah } from "@/lib/utils";

export interface RingkasanBiayaMaterialProps {
  surveiList: SurveyTokoItem[];
  namaMaterial?: string;
  className?: string;
}

export function RingkasanBiayaMaterial({
  surveiList = [],
  namaMaterial = "Item Material Utama",
  className = "",
}: RingkasanBiayaMaterialProps) {
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
        "bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Header Card */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#005BAC]" />
          <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Ringkasan Harga Acuan Pasar ({namaMaterial})
          </h3>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          {count} dari 3 Toko Terinput
        </span>
      </div>

      {/* Tabel Komparasi Dense */}
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                <th className="pb-2">Toko 1</th>
                <th className="pb-2">Toko 2</th>
                <th className="pb-2">Toko 3</th>
                <th className="pb-2 text-right">Harga Terendah</th>
                <th className="pb-2 text-right">Harga Tertinggi</th>
                <th className="pb-2 text-right">Disparitas</th>
                <th className="pb-2 text-right font-bold text-[#005BAC]">
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
                <td className="py-2.5 text-right font-medium text-emerald-700">
                  {formatRupiah(lowest)}
                </td>
                <td className="py-2.5 text-right font-medium text-amber-700">
                  {formatRupiah(highest)}
                </td>
                <td className="py-2.5 text-right font-medium text-slate-600">
                  {disparityPercent}%
                </td>
                <td className="py-2.5 text-right font-bold text-base text-[#005BAC] bg-[#F0F7FD] px-2 rounded">
                  {formatRupiah(average)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Info Note */}
        <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-slate-100">
          <Info className="w-3.5 h-3.5 text-[#005BAC] shrink-0" />
          <span>
            Nilai <strong>Rata-Rata Acuan Pasar ({formatRupiah(average)})</strong>{" "}
            secara otomatis digunakan sebagai pengali dalam formula AHSP:{" "}
            <code>(Koefisien × Harga Acuan) × (1 + Margin)</code>.
          </span>
        </div>
      </div>
    </div>
  );
}
