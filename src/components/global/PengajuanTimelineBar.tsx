"use client";

import React from "react";
import {
  Check,
  Clock,
  AlertTriangle,
  X,
  ShieldCheck,
  Store,
  Calculator,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { PengajuanHargaItem, StatusPengajuanHarga } from "@/types";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  id: string;
  label: string;
  role: string;
  state: "completed" | "current" | "pending" | "revision" | "rejected";
}

export interface PengajuanTimelineBarProps {
  item: PengajuanHargaItem;
  className?: string;
  compact?: boolean;
}

export function PengajuanTimelineBar({
  item,
  className = "",
  compact = false,
}: PengajuanTimelineBarProps) {
  const st: StatusPengajuanHarga = item.status;
  const isDone = st === "RELEASED";
  const isRevisi = st === "PERLU_REVISI" || st === "RETURNED_TO_BC";
  const isReject = st === "DITOLAK" || st === "DITOLAK_KONTRAKTOR";

  // Evaluasi 7 Tahapan Standar SPARTA-HARGA
  const steps: TimelineStep[] = [
    {
      id: "step-1",
      label: "Inisiasi Permohonan",
      role: "B&M Manager",
      state: "completed",
    },
    {
      id: "step-2",
      label: "Validasi & Koefisien AHSP",
      role: "S&B Specialist",
      state: isDone
        ? "completed"
        : [
            "SIAP_SURVEI",
            "PENDING_BM_MGR",
            "PENDING_SB_SPECIALIST",
            "PENDING_REGIONAL_MGR",
            "PENDING_KONTRAKTOR",
            "USULAN_KONTRAKTOR",
          ].includes(st)
        ? "completed"
        : st === "DIAJUKAN" || st === "DRAFT"
        ? "current"
        : st === "PERLU_REVISI"
        ? "revision"
        : isReject
        ? "rejected"
        : "pending",
    },
    {
      id: "step-3",
      label: "Survei 3 Toko Pasar",
      role: "Building Coord",
      state: isDone
        ? "completed"
        : [
            "PENDING_BM_MGR",
            "PENDING_SB_SPECIALIST",
            "PENDING_REGIONAL_MGR",
            "PENDING_KONTRAKTOR",
            "USULAN_KONTRAKTOR",
          ].includes(st)
        ? "completed"
        : st === "SIAP_SURVEI" || st === "RETURNED_TO_BC"
        ? st === "RETURNED_TO_BC"
          ? "revision"
          : "current"
        : ["DRAFT", "DIAJUKAN", "PERLU_REVISI"].includes(st)
        ? "pending"
        : isReject
        ? "rejected"
        : "pending",
    },
    {
      id: "step-4",
      label: "Review Cabang (Layer 1)",
      role: "B&M Manager",
      state: isDone
        ? "completed"
        : [
            "PENDING_SB_SPECIALIST",
            "PENDING_REGIONAL_MGR",
            "PENDING_KONTRAKTOR",
            "USULAN_KONTRAKTOR",
          ].includes(st)
        ? "completed"
        : st === "PENDING_BM_MGR"
        ? "current"
        : isReject
        ? "rejected"
        : "pending",
    },
    {
      id: "step-5",
      label: "Verifikasi & Live Margin",
      role: "S&B Specialist",
      state: isDone
        ? "completed"
        : [
            "PENDING_REGIONAL_MGR",
            "PENDING_KONTRAKTOR",
            "USULAN_KONTRAKTOR",
          ].includes(st)
        ? "completed"
        : st === "PENDING_SB_SPECIALIST"
        ? "current"
        : isReject
        ? "rejected"
        : "pending",
    },
    {
      id: "step-6",
      label: "Penetapan Harga (Layer 3)",
      role: "Regional Mgr",
      state: isDone
        ? "completed"
        : ["PENDING_KONTRAKTOR", "USULAN_KONTRAKTOR"].includes(st)
        ? "completed"
        : st === "PENDING_REGIONAL_MGR"
        ? "current"
        : isReject
        ? "rejected"
        : "pending",
    },
    {
      id: "step-7",
      label: "Kuorum Rekanan (50%+1)",
      role: "Kontraktor",
      state: isDone
        ? "completed"
        : st === "PENDING_KONTRAKTOR" || st === "USULAN_KONTRAKTOR"
        ? "current"
        : isReject
        ? "rejected"
        : "pending",
    },
  ];

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 p-4 shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#005BAC]" />
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Alur Penetapan Master Harga
          </span>
          <span className="text-xs text-slate-400 font-mono">
            #{item.noTiket}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isRevisi && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Perlu Revisi
            </span>
          )}
          {isReject && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <X className="w-3 h-3 text-red-600" />
              Ditolak
            </span>
          )}
          {isDone && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#008A00] border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Resmi Dirilis
            </span>
          )}
        </div>
      </div>

      {/* Stepper Grid Container */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[680px] flex items-center justify-between relative">
          {/* Connector Bar Background */}
          <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-slate-200 -z-0" />

          {steps.map((s, idx) => {
            const isCompleted = s.state === "completed";
            const isCurrent = s.state === "current";
            const isRev = s.state === "revision";
            const isRej = s.state === "rejected";

            return (
              <div
                key={s.id}
                className="flex flex-col items-center flex-1 relative z-10 text-center px-1"
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs",
                    isCompleted &&
                      "bg-[#008A00] text-white ring-2 ring-emerald-100",
                    isCurrent &&
                      "bg-[#005BAC] text-white ring-4 ring-blue-100 animate-pulse",
                    isRev &&
                      "bg-[#D97706] text-white ring-4 ring-amber-100",
                    isRej && "bg-[#ED1C24] text-white ring-4 ring-red-100",
                    !isCompleted &&
                      !isCurrent &&
                      !isRev &&
                      !isRej &&
                      "bg-white border-2 border-slate-300 text-slate-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isRev ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : isRej ? (
                    <X className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Labels */}
                <div className="mt-2 flex flex-col items-center">
                  <span
                    className={cn(
                      "text-[11px] leading-tight font-semibold max-w-[95px] line-clamp-2",
                      isCurrent
                        ? "text-[#005BAC] font-bold"
                        : isCompleted
                        ? "text-slate-800"
                        : isRev
                        ? "text-amber-700"
                        : isRej
                        ? "text-red-700"
                        : "text-slate-400"
                    )}
                  >
                    {s.label}
                  </span>
                  {!compact && (
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {s.role}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Catatan Revisi / Penolakan (Jika ada) */}
      {(isRevisi || isReject || item.catatanReviewTerakhir) && (
        <div
          className={cn(
            "mt-3 p-2.5 rounded border text-xs flex items-start gap-2",
            isRevisi
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : isReject
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-slate-50 border-slate-200 text-slate-700"
          )}
        >
          <AlertTriangle
            className={cn(
              "w-4 h-4 shrink-0 mt-0.5",
              isRevisi
                ? "text-amber-600"
                : isReject
                ? "text-red-600"
                : "text-slate-500"
            )}
          />
          <div>
            <span className="font-bold">
              {isRevisi
                ? "Catatan Revisi: "
                : isReject
                ? "Alasan Penolakan: "
                : "Catatan Terakhir: "}
            </span>
            <span>
              {item.catatanReviewTerakhir ||
                "Mohon periksa kembali kelengkapan spesifikasi dan survei harga."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
