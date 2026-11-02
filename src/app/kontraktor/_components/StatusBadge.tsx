import { CheckCircle2, Clock, Hourglass, Scale, XCircle } from "lucide-react";
import { StatusPengajuanHarga, StatusVoteKontraktor } from "@/types";
import { cn } from "@/lib/utils";

const BADGE = "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap";

export function StatusVoteBadge({
  status,
  isBanding,
}: {
  status: StatusVoteKontraktor;
  isBanding?: boolean;
}) {
  switch (status) {
    case "SETUJU":
      return (
        <span className={cn(BADGE, "bg-[#E7F6F0] text-[#085438] border-[#B2DFCC]")}>
          <CheckCircle2 className="w-3 h-3" /> Setuju
        </span>
      );
    case "TOLAK":
      return isBanding ? (
        <span className={cn(BADGE, "bg-[#FFF8DB] text-[#6E4B00] border-[#F3D56B]")}>
          <Scale className="w-3 h-3" /> Usulan Banding
        </span>
      ) : (
        <span className={cn(BADGE, "bg-[#FDECEE] text-[#990F14] border-[#F7C1C5]")}>
          <XCircle className="w-3 h-3" /> Tolak
        </span>
      );
    case "TIMEOUT":
      return (
        <span className={cn(BADGE, "bg-slate-100 text-slate-600 border-slate-200")}>
          <Hourglass className="w-3 h-3" /> Tidak Merespons
        </span>
      );
    default:
      return (
        <span className={cn(BADGE, "bg-[#EAF3FB] text-[#003A70] border-[#B8D8F3]")}>
          <Clock className="w-3 h-3" /> Menunggu Respon
        </span>
      );
  }
}

/** Label status tiket dari sudut pandang rekanan (tanpa istilah alur internal). */
export function labelStatusTiket(status: StatusPengajuanHarga) {
  switch (status) {
    case "PENDING_KONTRAKTOR":
      return { label: "Voting berjalan", tone: "text-[#005BAC]" };
    case "RELEASED":
      return { label: "Harga resmi berlaku", tone: "text-[#085438]" };
    case "USULAN_KONTRAKTOR":
      return { label: "Usulan banding ditinjau", tone: "text-[#6E4B00]" };
    case "DITOLAK_KONTRAKTOR":
      return { label: "Kuorum tidak tercapai", tone: "text-[#990F14]" };
    case "DITOLAK":
      return { label: "Penawaran dibatalkan", tone: "text-[#990F14]" };
    default:
      return { label: "Ditinjau ulang internal", tone: "text-slate-600" };
  }
}
