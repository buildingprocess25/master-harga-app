"use client";

import React from "react";
import {
  Check,
  Clock,
  AlertTriangle,
  X,
  Shield,
  FlaskConical,
} from "lucide-react";
import { PengajuanHargaItem } from "@/types";
import { cn } from "@/lib/utils";

export type TimelineFlowType = "pengajuan_baru" | "pengajuan_trial" | "trial_permanen";

export interface TimelineStep {
  id: string;
  label: string;
  role?: string;
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
  const st: string = item.status;
  const isDone = st === "RELEASED";
  const isRevisiBC = st === "RETURNED_TO_BC" || st === "PERLU_REVISI";
  const isReject = st === "DITOLAK";

  // 1. Tentukan Jenis Alur (Baru vs Trial vs Promosi Trial Permanen)
  const flowType: TimelineFlowType = (() => {
    if (
      item.isTrial &&
      (st === "TRIAL_PROMOSI_REGIONAL_MGR" ||
        st === "TRIAL_PROMOSI_BM_MGR" ||
        st === "TRIAL_PROMOSI_KONTRAKTOR")
    ) {
      return "trial_permanen";
    }
    if (item.isTrial) {
      return "pengajuan_trial";
    }
    return "pengajuan_baru";
  })();

  // 2. Susun 8 Tahapan Alur Sesuai Standar Bisnis SPARTA-HARGA
  let steps: TimelineStep[] = [];
  let flowTitle = "Alur Pengajuan Baru";
  let flowIcon = <Shield className="w-4 h-4 text-[#005BAC]" />;

  if (flowType === "pengajuan_baru") {
    flowTitle = "Alur Pengajuan Baru";
    flowIcon = <Shield className="w-4 h-4 text-[#005BAC]" />;

    // 8 Steps:
    // 1. Pengajuan Spesifikasi
    // 2. Review S&B Controller Spesialist
    // 3. Survei
    // 4. Review B&M Manager
    // 5. Review S&B
    // 6. Review B&M Regional Manager
    // 7. Review Kontraktor
    // 8. Selesai
    steps = [
      {
        id: "step-1",
        label: "Pengajuan Spesifikasi",
        role: "B&M Manager",
        state: "completed",
      },
      {
        id: "step-2",
        label: "Review",
        role: "S&B Controller Spesialist",
        state: isDone
          ? "completed"
          : [
              "SIAP_SURVEI",
              "RETURNED_TO_BC",
              "PERLU_REVISI",
              "PENDING_BM_MGR",
              "PENDING_SB_SPECIALIST",
              "PENDING_REGIONAL_MGR",
              "PENDING_KONTRAKTOR",
              "USULAN_KONTRAKTOR",
              "DITOLAK_KONTRAKTOR",
            ].includes(st)
          ? "completed"
          : st === "DIAJUKAN" || st === "DRAFT" || st === "PENDING_VALIDASI_SB"
          ? "current"
          : isReject
          ? "rejected"
          : "pending",
      },
      {
        id: "step-3",
        label: "Survei",
        role: "Building Coordinator",
        state: isDone
          ? "completed"
          : [
              "PENDING_BM_MGR",
              "PENDING_SB_SPECIALIST",
              "PENDING_REGIONAL_MGR",
              "PENDING_KONTRAKTOR",
              "USULAN_KONTRAKTOR",
              "DITOLAK_KONTRAKTOR",
            ].includes(st)
          ? "completed"
          : isRevisiBC
          ? "revision"
          : st === "SIAP_SURVEI"
          ? "current"
          : "pending",
      },
      {
        id: "step-4",
        label: "Review",
        role: "B&M Manager",
        state: isDone
          ? "completed"
          : [
              "PENDING_SB_SPECIALIST",
              "PENDING_REGIONAL_MGR",
              "PENDING_KONTRAKTOR",
              "USULAN_KONTRAKTOR",
              "DITOLAK_KONTRAKTOR",
            ].includes(st)
          ? "completed"
          : st === "PENDING_BM_MGR"
          ? "current"
          : "pending",
      },
      {
        id: "step-5",
        label: "Review",
        role: "S&B Controller Spesialist",
        state: isDone
          ? "completed"
          : [
              "PENDING_REGIONAL_MGR",
              "PENDING_KONTRAKTOR",
              "DITOLAK_KONTRAKTOR",
            ].includes(st)
          ? "completed"
          : st === "PENDING_SB_SPECIALIST" || st === "USULAN_KONTRAKTOR"
          ? "current"
          : "pending",
      },
      {
        id: "step-6",
        label: "Review ",
        role: "B&M Regional Manager",
        state: isDone
          ? "completed"
          : [
              "PENDING_KONTRAKTOR",
              "USULAN_KONTRAKTOR",
              "DITOLAK_KONTRAKTOR",
            ].includes(st)
          ? "completed"
          : st === "PENDING_REGIONAL_MGR"
          ? "current"
          : "pending",
      },
      {
        id: "step-7",
        label: "Review",
        role: "Kontraktor",
        state: isDone
          ? "completed"
          : st === "DITOLAK_KONTRAKTOR"
          ? "rejected"
          : st === "USULAN_KONTRAKTOR"
          ? "revision"
          : st === "PENDING_KONTRAKTOR"
          ? "current"
          : "pending",
      },
      {
        id: "step-8",
        label: "Selesai",
        role: "Rilis Master",
        state: isDone
          ? "completed"
          : st === "DITOLAK_KONTRAKTOR" || isReject
          ? "rejected"
          : "pending",
      },
    ];
  } else if (flowType === "pengajuan_trial") {
    flowTitle = "Alur Pengajuan Trial";
    flowIcon = <FlaskConical className="w-4 h-4 text-amber-600" />;

    steps = [
      {
        id: "step-trial-1",
        label: "Pengajuan",
        role: "Inisiator",
        state: isRevisiBC ? "revision" : "completed",
      },
      {
        id: "step-trial-2",
        label: "Review B&M Regional Manager",
        role: "Regional Manager",
        state: isDone
          ? "completed"
          : isReject
          ? "rejected"
          : "current",
      },
      {
        id: "step-trial-3",
        label: "Selesai",
        role: "Rilis Trial (3 Bulan)",
        state: isDone ? "completed" : "pending",
      },
    ];
  } else {
    // flowType === 'trial_permanen'
    flowTitle = "Alur Penetapan Trial ke Master";
    flowIcon = <Shield className="w-4 h-4 text-emerald-600" />;

    steps = [
      {
        id: "step-perm-1",
        label: "Pengajuan",
        role: "Evaluasi 3 Bulan",
        state: "completed",
      },
      {
        id: "step-perm-2",
        label: "Review B&M Regional Manager",
        role: "Regional Manager",
        state: isDone ? "completed" : "current",
      },
      {
        id: "step-perm-3",
        label: "Selesai",
        role: "Rilis Permanen",
        state: isDone ? "completed" : "pending",
      },
    ];
  }

  // Temukan step aktif saat ini
  const activeStep = steps.find((s) => s.state === "current" || s.state === "revision");
  const isAllComplete = steps.every((s) => s.state === "completed");

  return (
    <div
      className={cn(
        "border-2 border-slate-300 rounded-2xl bg-white p-4 shadow-xs space-y-4",
        className
      )}
    >
      {/* 1. Header Bar Timeline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center shrink-0">
            {flowIcon}
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
              {flowTitle}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Pelacakan progres tahapan dan persetujuan pengajuan
            </p>
          </div>
        </div>

        {/* 2. Status Tracker Pill di Kanan Atas */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAllComplete ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0F8A5F] px-3 py-1 rounded-full border border-emerald-900 shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Selesai &amp; Resmi Aktif</span>
            </span>
          ) : activeStep ? (
            <span
              className={cn(
                "inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border-2 shadow-xs",
                activeStep.state === "revision"
                  ? "text-amber-900 bg-amber-50 border-amber-300"
                  : "text-[#005BAC] bg-blue-50 border-blue-200"
              )}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={cn(
                    "hidden",
                    activeStep.state === "revision" ? "bg-amber-500" : "bg-[#005BAC]"
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    activeStep.state === "revision" ? "bg-amber-600" : "bg-[#005BAC]"
                  )}
                />
              </span>
              <span>
                {activeStep.state === "revision" ? "Perlu Revisi: " : "Saat ini: "}
                <strong className="font-extrabold">{activeStep.label}</strong>
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Menunggu Tindakan</span>
            </span>
          )}
        </div>
      </div>

      {/* 3. Bar Stepper / Horizontal Nodes */}
      <div className="overflow-x-auto pb-2 pt-1">
        <div className="min-w-[760px] px-3 flex items-start justify-between relative">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const nextStep = steps[idx + 1];

            // Garis penghubung: hijau jika langkah saat ini sudah selesai dan langkah berikutnya minimal aktif/selesai
            let lineBg = "bg-slate-200";
            if (step.state === "completed") {
              if (
                nextStep &&
                (nextStep.state === "completed" || nextStep.state === "current")
              ) {
                lineBg = "bg-emerald-500";
              } else {
                lineBg = "bg-slate-200";
              }
            }

            return (
              <div
                key={step.id}
                className="flex-1 flex flex-col items-center relative group"
              >
                {/* Garis Penghubung Horizontal antar Node */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute top-3.5 left-1/2 w-full h-0.5 transition-colors z-0",
                      lineBg
                    )}
                  />
                )}

                {/* Titik Lingkaran Node Langkah */}
                <div className="relative z-10 flex items-center justify-center">
                  {step.state === "completed" && (
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 border-2 border-emerald-700">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}

                  {step.state === "current" && (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center ring-4 ring-blue-100 shadow-xs transition-transform group-hover:scale-105 border-2 border-blue-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                    </div>
                  )}

                  {step.state === "revision" && (
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center ring-4 ring-amber-100 shadow-xs transition-transform group-hover:scale-105 border-2 border-amber-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {step.state === "rejected" && (
                    <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center ring-4 ring-red-100 shadow-xs transition-transform group-hover:scale-105 border-2 border-red-700">
                      <X className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}

                  {step.state === "pending" && (
                    <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    </div>
                  )}
                </div>

                {/* Label Informasi Langkah */}
                <div className="mt-2.5 text-center px-1">
                  <span
                    className={cn(
                      "text-[11px] font-bold leading-tight block max-w-[105px]",
                      step.state === "completed"
                        ? "text-emerald-800"
                        : step.state === "current"
                        ? "text-blue-700"
                        : step.state === "revision"
                        ? "text-amber-800"
                        : step.state === "rejected"
                        ? "text-red-700"
                        : "text-slate-500"
                    )}
                  >
                    {step.label}
                  </span>
                  {!compact && step.role && (
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5 leading-tight">
                      {step.role}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Alert Box Catatan Penolakan / Revisi Terakhir (Jika ada) */}
      {(isRevisiBC || isReject || item.catatanReviewTerakhir) && (
        <div
          className={cn(
            "p-3 rounded-lg border-2 text-xs flex items-start gap-2.5 font-medium leading-relaxed",
            isRevisiBC
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : isReject
              ? "bg-red-50 border-red-300 text-red-900"
              : "bg-slate-50 border-slate-300 text-slate-800"
          )}
        >
          <AlertTriangle
            className={cn(
              "w-4 h-4 shrink-0 mt-0.5",
              isRevisiBC
                ? "text-amber-600"
                : isReject
                ? "text-red-600"
                : "text-slate-500"
            )}
          />
          <div>
            <span className="font-extrabold">
              {isRevisiBC
                ? "Catatan Perbaikan / Revisi: "
                : isReject
                ? "Alasan Penolakan: "
                : "Catatan Review Terakhir: "}
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
