"use client";

import React from "react";
import { X, FileText, AlertCircle } from "lucide-react";
import { PengajuanHargaItem } from "@/types/pengajuan";

interface ModalCatatanReviewProps {
  isOpen: boolean;
  onClose: () => void;
  item: PengajuanHargaItem | null;
}

export function ModalCatatanReview({
  isOpen,
  onClose,
  item,
}: ModalCatatanReviewProps) {
  if (!isOpen || !item) return null;

  const isRevisi =
    item.status === "PERLU_REVISI" ||
    item.status === "RETURNED_TO_BC" ||
    (item.status as string) === "REVISI";

  const sbLog = item.historyLog
    ?.slice()
    .reverse()
    .find(
      (l) =>
        l.role === "S&B Specialist" ||
        l.action === "REVISE" ||
        l.action === "REJECT"
    );

  const catatanText =
    sbLog?.catatan ||
    item.catatanReviewTerakhir ||
    item.catatanReview ||
    "Tidak ada catatan review.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-none">
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                isRevisi ? "bg-amber-600" : "bg-red-600"
              }`}
            >
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Catatan {isRevisi ? "Revisi" : "Penolakan"} S&amp;B
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {item.kode || item.kodeItem || item.noTiket} - {item.item || item.namaItem}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Sumber Evaluasi:</span>
            <span>{sbLog?.role || "S&B Controller Specialist"}</span>
          </div>
          {sbLog?.tanggal && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Waktu:</span>
              <span className="font-mono">{sbLog.tanggal}</span>
            </div>
          )}

          <div className="mt-2 bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
            {catatanText}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
