"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string;
  isTrial?: boolean;
  className?: string;
}

export function StatusBadge({ status, isTrial = false, className = "" }: StatusBadgeProps) {
  const baseClasses =
    "inline-flex items-center justify-center px-3 py-1 rounded-full text-white text-[11px] font-black uppercase tracking-wider shadow-xs select-none leading-tight whitespace-normal text-center";

  switch (status) {
    // 1. Status Disetujui / Released
    case "DISETUJUI":
    case "DISETUJUI_MASTERING":
    case "APPROVED_ACTIVE":
    case "RELEASED":
      return (
        <span className={cn(baseClasses, "bg-[#0F8A5F] border border-emerald-900", className)}>
          Resmi Rilis
        </span>
      );

    // 2. Siap Survei Pasar (BC)
    case "SIAP_SURVEI":
      return (
        <span className={cn(baseClasses, "bg-[#D97706] text-white border border-amber-900", className)}>
          Siap Survei
        </span>
      );

    // 3. Jalur Uji Coba (Trial 3 Bulan)
    case "TRIAL_RELEASED":
      return (
        <span className={cn(baseClasses, "bg-[#4338CA] border border-indigo-900", className)}>
          (Trial) Aktif
        </span>
      );

    case "TRIAL_PENDING_REGIONAL_MGR":
      return (
        <span className={cn(baseClasses, "bg-[#D97706] border border-amber-900", className)}>
          (Trial) Menunggu Reg. Mgr
        </span>
      );

    case "TRIAL_PROMOSI_BM_MGR":
    case "TRIAL_PROMOSI_REGIONAL_MGR":
    case "TRIAL_PROMOSI_KONTRAKTOR":
      return (
        <span className={cn(baseClasses, "bg-[#7E22CE] border border-purple-900", className)}>
          Evaluasi Trial
        </span>
      );

    case "TRIAL_REVISI":
      return (
        <span className={cn(baseClasses, "bg-[#D97706] border border-amber-900", className)}>
          (Trial) Revisi Trial
        </span>
      );

    case "TRIAL_DITOLAK":
      return (
        <span className={cn(baseClasses, "bg-[#DC2626] border border-red-900", className)}>
          (Trial) Ditolak
        </span>
      );

    // 4. Status Ditolak & Kembalian
    case "DITOLAK":
    case "DITOLAK_SB":
    case "DITOLAK_KONTRAKTOR":
      return (
        <span className={cn(baseClasses, "bg-[#DC2626] border border-red-900", className)}>
          Ditolak
        </span>
      );

    case "RETURNED_TO_BC":
      return (
        <span className={cn(baseClasses, "bg-[#ED1C24] border border-red-900", className)}>
          Perlu Revisi Survei
        </span>
      );

    // 5. Status Perlu Revisi
    case "REVISI":
    case "PERLU_REVISI":
      return (
        <span className={cn(baseClasses, "bg-[#DC2626] border border-red-900", className)}>
          Perlu Revisi
        </span>
      );

    // 6. Status Pending Review Berjenjang
    case "PENDING_VALIDASI_SB":
    case "PENDING_SB_SPECIALIST":
      return (
        <span className={cn(baseClasses, "bg-[#005BAC] border border-blue-900", className)}>
          Kalkulasi SNB
        </span>
      );

    case "PENDING_BM_MGR":
      return (
        <span className={cn(baseClasses, "bg-[#ED1C24] border border-red-900", className)}>
          Review Survei
        </span>
      );

    case "PENDING_REGIONAL_MGR":
      return (
        <span className={cn(baseClasses, "bg-[#005BAC] border border-blue-900", className)}>
          Review Regional
        </span>
      );

    case "PENDING_KONTRAKTOR":
      return (
        <span className={cn(baseClasses, "bg-[#334155] border border-slate-900", className)}>
          Kuorum Rekanan
        </span>
      );

    case "USULAN_KONTRAKTOR":
      return (
        <span className={cn(baseClasses, "bg-[#EA580C] border border-orange-900", className)}>
          Usulan Banding
        </span>
      );

    case "DIAJUKAN":
      return (
        <span className={cn(baseClasses, "bg-[#005BAC] border border-blue-900", className)}>
          Diajukan
        </span>
      );

    case "DRAFT":
      return (
        <span className={cn(baseClasses, "bg-[#64748B] border border-slate-800", className)}>
          Draft
        </span>
      );

    default:
      return (
        <span className={cn(baseClasses, "bg-slate-700 border border-slate-900", className)}>
          {status || "Draft"}
        </span>
      );
  }
}
