"use client";

import React from "react";
import { PackageOpen, RotateCcw } from "lucide-react";

interface TableEmptyStateProps {
  title?: string;
  description?: string;
  colSpan?: number;
  onReset?: () => void;
}

export function TableEmptyState({
  title = "Data tidak ditemukan",
  description = "Coba sesuaikan kata kunci pencarian atau bersihkan filter yang aktif.",
  colSpan = 8,
  onReset,
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-14 text-center bg-white">
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3 border-2 border-slate-300 shadow-xs">
            <PackageOpen className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed text-center font-medium">
            {description}
          </p>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="mt-4 px-4 py-2 text-xs rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
