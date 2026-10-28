"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Send,
  Loader2,
  ShieldCheck,
  Building2,
  FileText,
} from "lucide-react";
import { RoleUser, StatusPengajuanHarga } from "@/types";
import { cn } from "@/lib/utils";

export interface ApprovalActionPanelProps {
  role: RoleUser;
  status: StatusPengajuanHarga;
  onApprove: (catatan: string) => Promise<void> | void;
  onReject?: (catatan: string) => Promise<void> | void;
  onReturn?: (catatan: string) => Promise<void> | void;
  loading?: boolean;
  className?: string;
}

export function ApprovalActionPanel({
  role,
  status,
  onApprove,
  onReject,
  onReturn,
  loading = false,
  className = "",
}: ApprovalActionPanelProps) {
  const [catatan, setCatatan] = useState("");
  const [errorCatatan, setErrorCatatan] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "approve" | "return" | "reject";
    title: string;
    description: string;
    actionLabel: string;
  } | null>(null);

  // Validasi sebelum aksi
  const handleTriggerAction = (type: "approve" | "return" | "reject") => {
    setErrorCatatan("");

    // Catatan wajib diisi jika revisi atau tolak
    if ((type === "return" || type === "reject") && !catatan.trim()) {
      setErrorCatatan(
        "Alasan keputusan atau catatan perbaikan wajib diisi agar pengaju dapat menindaklanjuti."
      );
      return;
    }

    if (type === "approve") {
      setConfirmDialog({
        isOpen: true,
        type: "approve",
        title: "Konfirmasi Persetujuan",
        description:
          "Apakah Anda yakin ingin menyetujui pengajuan harga ini dan meneruskannya ke tahap selanjutnya?",
        actionLabel: "Ya, Setujui",
      });
    } else if (type === "return") {
      setConfirmDialog({
        isOpen: true,
        type: "return",
        title: "Konfirmasi Pengembalian / Revisi",
        description:
          "Tiket akan dikembalikan ke tahap sebelumnya dengan catatan revisi yang Anda masukkan.",
        actionLabel: "Kembalikan Tiket",
      });
    } else if (type === "reject") {
      setConfirmDialog({
        isOpen: true,
        type: "reject",
        title: "Konfirmasi Penolakan Pengajuan",
        description:
          "Tiket pengajuan harga ini akan ditolak secara permanen. Tindakan ini tidak dapat dibatalkan.",
        actionLabel: "Tolak Permanen",
      });
    }
  };

  const handleExecuteConfirmedAction = async () => {
    if (!confirmDialog) return;
    const { type } = confirmDialog;
    setConfirmDialog(null);

    if (type === "approve") {
      await onApprove(catatan.trim());
    } else if (type === "return" && onReturn) {
      await onReturn(catatan.trim());
    } else if (type === "reject" && onReject) {
      await onReject(catatan.trim());
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 shadow-sm p-4",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
        <ShieldCheck className="w-4 h-4 text-[#005BAC]" />
        <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
          Panel Keputusan & Approval ({role.replace("_", " ")})
        </h3>
      </div>

      {/* Input Catatan Keputusan */}
      <div className="mb-4">
        <label
          htmlFor="catatan-approval"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          Catatan Keputusan / Instruksi Perbaikan:
        </label>
        <textarea
          id="catatan-approval"
          rows={3}
          value={catatan}
          onChange={(e) => {
            setCatatan(e.target.value);
            if (errorCatatan) setErrorCatatan("");
          }}
          placeholder="Tuliskan catatan persetujuan, rekomendasi penyesuaian, atau alasan jika dikembalikan..."
          className={cn(
            "w-full text-xs p-2.5 rounded-md border text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 transition-all",
            errorCatatan
              ? "border-red-400 bg-red-50/30"
              : "border-slate-300 bg-white hover:border-slate-400"
          )}
          disabled={loading}
        />
        {errorCatatan && (
          <p className="text-[11px] font-medium text-red-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {errorCatatan}
          </p>
        )}
      </div>

      {/* Tombol Aksi Adaptif Sesuai Role & Status */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
        {/* Tombol Revisi / Kembalikan */}
        {onReturn && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleTriggerAction("return")}
            className="px-3 py-2 rounded-md text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Kembalikan Revisi</span>
          </button>
        )}

        {/* Tombol Tolak */}
        {onReject && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleTriggerAction("reject")}
            className="px-3 py-2 rounded-md text-xs font-bold text-red-700 bg-red-50 border border-red-300 hover:bg-red-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Tolak Pengajuan</span>
          </button>
        )}

        {/* Tombol Setujui Utama */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleTriggerAction("approve")}
          className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#005BAC] hover:bg-blue-800 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>
            {role === "REGIONAL_MANAGER"
              ? "Tetapkan Harga & Rilis ke Kontraktor"
              : role === "BM_MANAGER"
              ? "Teruskan ke S&B Specialist"
              : role === "SB_SPECIALIST" && status === "DIAJUKAN"
              ? "Setujui Spesifikasi & Lanjut AHSP"
              : role === "SB_SPECIALIST"
              ? "Kunci AHSP & Teruskan ke Regional"
              : "Setujui Pengajuan"}
          </span>
        </button>
      </div>

      {/* Dialog Konfirmasi Aksi */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 p-5">
            <h4 className="text-sm font-bold text-slate-900 mb-2">
              {confirmDialog.title}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded text-white transition-colors",
                  confirmDialog.type === "reject"
                    ? "bg-[#ED1C24] hover:bg-red-700"
                    : confirmDialog.type === "return"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-[#005BAC] hover:bg-blue-800"
                )}
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
