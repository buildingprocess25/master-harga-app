"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { PengajuanHargaItem } from "@/types";

interface ModalCatatanApproverProps {
  isOpen: boolean;
  onClose: () => void;
  item: PengajuanHargaItem | null;
}

export function ModalCatatanApprover({
  isOpen,
  onClose,
  item,
}: ModalCatatanApproverProps) {
  if (!isOpen || !item) return null;

  const kode = item.kode || item.kodeItem || item.noTiket;
  const namaItem = item.item || item.namaItem || "Material";
  const merk = item.merk ? ` (${item.merk})` : "";
  const catatan =
    item.catatanReview ||
    item.catatanReviewTerakhir ||
    "Tidak ada catatan pengembalian tertulis.";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-none flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border-2 border-slate-300 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-rose-50 border-b-2 border-rose-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-900">
                Catatan Pengembalian Survei
              </h3>
              <p className="text-xs text-rose-700 font-semibold truncate max-w-[260px]">
                {kode} &bull; {namaItem} {merk}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Keterangan dari B&M Manager / Approver:
          </label>
          <div className="bg-white border-2 border-rose-300 rounded-xl p-4 text-xs font-medium text-slate-900 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
            {catatan}
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Silakan lakukan perbaikan harga survei toko atau lampirkan foto nota yang lebih jelas sesuai catatan di atas.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t-2 border-slate-200 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
