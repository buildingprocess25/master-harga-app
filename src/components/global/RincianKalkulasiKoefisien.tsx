"use client";

import React, { useState } from "react";
import {
  Calculator,
  SlidersHorizontal,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { KoefisienDetailItem, KategoriKoefisien } from "@/types";
import { cn, formatRupiah, formatKoefisien } from "@/lib/utils";

export interface RincianKalkulasiKoefisienProps {
  koefisienItems: KoefisienDetailItem[];
  mode?: "readonly" | "editable";
  liveMarginUpah?: number;
  liveMarginMaterial?: number;
  liveMarginBongkaran?: number;
  onMarginChange?: (upah: number, material: number, bongkaran: number) => void;
  onItemsChange?: (items: KoefisienDetailItem[]) => void;
  className?: string;
}

export function RincianKalkulasiKoefisien({
  koefisienItems = [],
  mode = "readonly",
  liveMarginUpah = 8,
  liveMarginMaterial = 8,
  liveMarginBongkaran = 8,
  onMarginChange,
  onItemsChange,
  className = "",
}: RincianKalkulasiKoefisienProps) {
  const isEditable = mode === "editable";

  // Filter per kategori
  const upahItems = koefisienItems.filter((i) => i.kategori === "UPAH");
  const materialItems = koefisienItems.filter((i) => i.kategori === "MATERIAL");
  const alatItems = koefisienItems.filter((i) => i.kategori === "ALAT");
  const bongkaranItems = koefisienItems.filter(
    (i) => i.kategori === "BONGKARAN"
  );

  // Kalkulasi Subtotal per Kategori
  const calculateGroupTotals = (
    items: KoefisienDetailItem[],
    marginPercent: number
  ) => {
    const hpp = items.reduce(
      (acc, i) => acc + (i.koefisien || 0) * (i.hargaAcuan || 0),
      0
    );
    const total = hpp * (1 + marginPercent / 100);
    return { hpp, total };
  };

  const upahTotals = calculateGroupTotals(upahItems, liveMarginUpah);
  const materialTotals = calculateGroupTotals(materialItems, liveMarginMaterial);
  const alatTotals = calculateGroupTotals(alatItems, 0); // Alat biasanya tanpa margin
  const bongkaranTotals = calculateGroupTotals(
    bongkaranItems,
    liveMarginBongkaran
  );

  const grandTotalHpp =
    upahTotals.hpp +
    materialTotals.hpp +
    alatTotals.hpp +
    bongkaranTotals.hpp;

  const grandTotalAkhir =
    upahTotals.total +
    materialTotals.total +
    alatTotals.total +
    bongkaranTotals.total;

  // Render Tabel Grup Komponen
  const renderGroup = (
    title: string,
    items: KoefisienDetailItem[],
    currentMargin: number,
    kategori: KategoriKoefisien
  ) => {
    if (items.length === 0 && !isEditable) return null;

    return (
      <div className="mb-4">
        <div className="bg-slate-100/80 px-3 py-1.5 border-y border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            {title}
          </span>
          <span className="text-[11px] font-semibold text-slate-600 font-mono tabular-nums">
            Margin: {currentMargin}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px]">
                <th className="py-2 pl-3 w-10">No</th>
                <th className="py-2">Komponen Pekerjaan</th>
                <th className="py-2 w-20">Satuan</th>
                <th className="py-2 text-right w-28">Koefisien</th>
                <th className="py-2 text-right w-36">Harga Acuan</th>
                <th className="py-2 text-right w-32">Subtotal</th>
                <th className="py-2 pr-3 text-right w-36 font-bold text-[#005BAC]">
                  Total (+{currentMargin}%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-800">
              {items.map((item, idx) => {
                const subtotal = (item.koefisien || 0) * (item.hargaAcuan || 0);
                const totalItem = subtotal * (1 + currentMargin / 100);

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-2 pl-3 text-slate-400 font-sans">
                      {idx + 1}
                    </td>
                    <td className="py-2 font-sans font-medium text-slate-800">
                      {item.namaKomponen}
                    </td>
                    <td className="py-2 text-slate-500">{item.satuan}</td>
                    <td className="py-2 text-right font-medium">
                      {formatKoefisien(item.koefisien)}
                    </td>
                    <td className="py-2 text-right text-slate-600">
                      {formatRupiah(item.hargaAcuan)}
                    </td>
                    <td className="py-2 text-right text-slate-700">
                      {formatRupiah(subtotal)}
                    </td>
                    <td className="py-2 pr-3 text-right font-bold text-slate-900">
                      {formatRupiah(totalItem)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Header Card */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#005BAC]" />
          <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Analisa Harga Satuan Pekerjaan (AHSP) & Live Margin
          </h3>
        </div>

        {isEditable && (
          <span className="text-[11px] font-semibold text-[#005BAC] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Mode Editor S&B Specialist
          </span>
        )}
      </div>

      {/* Kontrol Live Margin Slider (Jika Mode Editable S&B) */}
      {isEditable && onMarginChange && (
        <div className="bg-[#F0F7FD] border-b border-blue-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-[#005BAC]" />
            <h4 className="text-xs font-bold text-slate-800">
              Penyesuaian Live Margin S&B Specialist
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Margin Upah */}
            <div className="bg-white p-3 rounded border border-blue-200">
              <div className="flex justify-between items-center mb-1.5 font-bold">
                <span className="text-slate-700">Margin Upah Tenaga:</span>
                <span className="text-[#005BAC] font-mono text-sm">
                  {liveMarginUpah}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={liveMarginUpah}
                onChange={(e) =>
                  onMarginChange(
                    Number(e.target.value),
                    liveMarginMaterial,
                    liveMarginBongkaran
                  )
                }
                className="w-full accent-[#005BAC] cursor-pointer"
              />
            </div>

            {/* Margin Material */}
            <div className="bg-white p-3 rounded border border-blue-200">
              <div className="flex justify-between items-center mb-1.5 font-bold">
                <span className="text-slate-700">Margin Material/Bahan:</span>
                <span className="text-[#005BAC] font-mono text-sm">
                  {liveMarginMaterial}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={liveMarginMaterial}
                onChange={(e) =>
                  onMarginChange(
                    liveMarginUpah,
                    Number(e.target.value),
                    liveMarginBongkaran
                  )
                }
                className="w-full accent-[#005BAC] cursor-pointer"
              />
            </div>

            {/* Margin Bongkaran */}
            <div className="bg-white p-3 rounded border border-blue-200">
              <div className="flex justify-between items-center mb-1.5 font-bold">
                <span className="text-slate-700">Margin Bongkaran:</span>
                <span className="text-[#005BAC] font-mono text-sm">
                  {liveMarginBongkaran}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={liveMarginBongkaran}
                onChange={(e) =>
                  onMarginChange(
                    liveMarginUpah,
                    liveMarginMaterial,
                    Number(e.target.value)
                  )
                }
                className="w-full accent-[#005BAC] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Rincian Grup Tabel Komponen */}
      <div className="p-4">
        {renderGroup("A. Tenaga Kerja (Upah)", upahItems, liveMarginUpah, "UPAH")}
        {renderGroup(
          "B. Bahan / Material",
          materialItems,
          liveMarginMaterial,
          "MATERIAL"
        )}
        {renderGroup("C. Peralatan Kerja (Alat)", alatItems, 0, "ALAT")}
        {renderGroup(
          "D. Pekerjaan Bongkaran",
          bongkaranItems,
          liveMarginBongkaran,
          "BONGKARAN"
        )}

        {/* Ringkasan Total Akhir AHSP */}
        <div className="mt-4 pt-3 border-t-2 border-slate-300 bg-slate-50 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
            <span className="text-xs text-slate-500 block">
              Total HPP Murni (Tanpa Margin):
            </span>
            <span className="font-mono text-sm font-semibold text-slate-700">
              {formatRupiah(grandTotalHpp)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
              Grand Total AHSP Resmi (+Margin):
            </span>
            <span className="font-mono text-xl md:text-2xl font-bold text-[#005BAC] tabular-nums">
              {formatRupiah(grandTotalAkhir)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
