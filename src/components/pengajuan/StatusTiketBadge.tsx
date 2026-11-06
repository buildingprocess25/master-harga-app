import { StatusPengajuanHarga } from "@/types";
import { cn } from "@/lib/utils";

interface MetaStatus {
  label: string;
  badge: string;
  dot: string;
}

/** Label & warna status tiket (pastel Alfamart + titik indikator). */
export const META_STATUS: Record<StatusPengajuanHarga, MetaStatus> = {
  DRAFT: { label: "Draft", badge: "bg-slate-100 text-slate-700 border-slate-300", dot: "bg-slate-400" },
  DIAJUKAN: { label: "Diajukan", badge: "bg-[#EAF3FB] text-[#003A70] border-[#B8D8F3]", dot: "bg-[#005BAC]" },
  PERLU_REVISI: { label: "Perlu Revisi", badge: "bg-[#FFF8DB] text-[#6E4B00] border-[#F3D56B]", dot: "bg-[#D99B00]" },
  SIAP_SURVEI: { label: "Siap Survei", badge: "bg-[#EAF3FB] text-[#003A70] border-[#B8D8F3]", dot: "bg-[#005BAC]" },
  RETURNED_TO_BC: { label: "Survei Dikembalikan", badge: "bg-[#FFF8DB] text-[#6E4B00] border-[#F3D56B]", dot: "bg-[#D99B00]" },
  PENDING_BM_MGR: { label: "Review BM", badge: "bg-[#EAF3FB] text-[#003A70] border-[#B8D8F3]", dot: "bg-[#005BAC]" },
  PENDING_SB_SPECIALIST: { label: "Evaluasi Margin S&B", badge: "bg-[#FFF8DB] text-[#6E4B00] border-[#F3D56B]", dot: "bg-[#D99B00]" },
  PENDING_REGIONAL_MGR: { label: "Approval Regional", badge: "bg-[#EFEBFD] text-[#362387] border-[#CFC5F5]", dot: "bg-[#4F39B8]" },
  PENDING_KONTRAKTOR: { label: "Kuorum Rekanan", badge: "bg-[#EFEBFD] text-[#362387] border-[#CFC5F5]", dot: "bg-[#4F39B8]" },
  USULAN_KONTRAKTOR: { label: "Banding Rekanan", badge: "bg-[#FDECEE] text-[#990F14] border-[#F7C1C5]", dot: "bg-[#D91920]" },
  DITOLAK_KONTRAKTOR: { label: "Kuorum Gagal", badge: "bg-[#FDECEE] text-[#990F14] border-[#F7C1C5]", dot: "bg-[#D91920]" },
  DITOLAK: { label: "Ditolak", badge: "bg-[#FDECEE] text-[#990F14] border-[#F7C1C5]", dot: "bg-[#D91920]" },
  RELEASED: { label: "Released", badge: "bg-[#E7F6F0] text-[#085438] border-[#B2DFCC]", dot: "bg-[#0F8A5F]" },
};

export function StatusTiketBadge({ status, className }: { status: StatusPengajuanHarga; className?: string }) {
  const meta = META_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap",
        meta.badge,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
