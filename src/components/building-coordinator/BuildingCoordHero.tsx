"use client";

import React from "react";
import { HardHat, Building2, Store } from "lucide-react";

interface BuildingCoordHeroProps {
  countSiapSurvei: number;
  countRevisi: number;
  countDiproses: number;
  countSelesai: number;
  userCabang?: string;
}

export function BuildingCoordHero({
  countSiapSurvei,
  countRevisi,
  countDiproses,
  countSelesai,
  userCabang = "Cikokol",
}: BuildingCoordHeroProps) {
  // Selalu bersihkan semua prefix "Cabang" berulang secara tuntas (regex greedy)
  const cleanBranch = (userCabang || "Cikokol")
    .replace(/^(cabang\s*)+/i, "")
    .trim();
  const displayCabang = `Cabang ${cleanBranch || "Cikokol"}`;

  return (
    <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500 border-2 border-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <HardHat className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              Building Coordinator
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#005BAC] text-white">
              <Building2 className="w-3.5 h-3.5" />
              <span>{displayCabang}</span>
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Pelaksanaan survei lapangan ke 3 toko material lokal terstandarisasi untuk penyusunan HPP
          </p>
        </div>
      </div>

      {/* Quick Metrics (Solid Standard) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border-2 border-amber-400 rounded-xl px-3.5 py-2 text-center min-w-[95px] shadow-2xs">
          <span className="text-[11px] text-amber-800 font-extrabold block uppercase tracking-wider">
            Siap Survei
          </span>
          <span className="text-xl font-black text-amber-900 leading-tight">
            {countSiapSurvei}
          </span>
        </div>

        <div className="bg-white border-2 border-rose-400 rounded-xl px-3.5 py-2 text-center min-w-[95px] shadow-2xs">
          <span className="text-[11px] text-rose-800 font-extrabold block uppercase tracking-wider">
            Perlu Revisi
          </span>
          <span className="text-xl font-black text-rose-900 leading-tight">
            {countRevisi}
          </span>
        </div>

        <div className="bg-white border-2 border-blue-400 rounded-xl px-3.5 py-2 text-center min-w-[95px] shadow-2xs">
          <span className="text-[11px] text-blue-800 font-extrabold block uppercase tracking-wider">
            Diproses
          </span>
          <span className="text-xl font-black text-blue-900 leading-tight">
            {countDiproses}
          </span>
        </div>

        <div className="bg-white border-2 border-emerald-400 rounded-xl px-3.5 py-2 text-center min-w-[95px] shadow-2xs">
          <span className="text-[11px] text-emerald-800 font-extrabold block uppercase tracking-wider">
            Selesai
          </span>
          <span className="text-xl font-black text-emerald-900 leading-tight">
            {countSelesai}
          </span>
        </div>
      </div>
    </div>
  );
}
