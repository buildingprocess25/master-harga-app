import { CheckCircle2, Clock, Hourglass, Scale, XCircle } from "lucide-react";
import { StatusPengajuanHarga, StatusVoteKontraktor } from "@/types";
import { cn } from "@/lib/utils";

const BADGE = "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-2xs";

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
        <span className={cn(BADGE, "bg-emerald-600 text-white")}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Setuju</span>
        </span>
      );
    case "TOLAK":
      return isBanding ? (
        <span className={cn(BADGE, "bg-amber-600 text-white")}>
          <Scale className="w-3.5 h-3.5" />
          <span>Usulan Banding</span>
        </span>
      ) : (
        <span className={cn(BADGE, "bg-rose-600 text-white")}>
          <XCircle className="w-3.5 h-3.5" />
          <span>Tolak</span>
        </span>
      );
    case "TIMEOUT":
      return (
        <span className={cn(BADGE, "bg-slate-600 text-white")}>
          <Hourglass className="w-3.5 h-3.5" />
          <span>Tidak Merespons</span>
        </span>
      );
    default:
      return (
        <span className={cn(BADGE, "bg-blue-600 text-white")}>
          <Clock className="w-3.5 h-3.5" />
          <span>Menunggu Respon</span>
        </span>
      );
  }
}

/** Label status tiket dari sudut pandang rekanan (ringkas, natural, & solid bold). */
export function labelStatusTiket(status: StatusPengajuanHarga) {
  switch (status) {
    case "PENDING_KONTRAKTOR":
      return { label: "Menunggu Respon Kontraktor", tone: "text-[#005BAC]", badge: "bg-[#005BAC] text-white" };
    case "RELEASED":
      return { label: "Harga Resmi Berlaku", tone: "text-emerald-700", badge: "bg-emerald-600 text-white" };
    case "USULAN_KONTRAKTOR":
      return { label: "Usulan Banding Ditinjau", tone: "text-amber-700", badge: "bg-amber-600 text-white" };
    case "DITOLAK_KONTRAKTOR":
      return { label: "Kuorum Belum Tercapai", tone: "text-rose-700", badge: "bg-rose-600 text-white" };
    case "DITOLAK":
      return { label: "Penawaran Dibatalkan", tone: "text-rose-700", badge: "bg-rose-600 text-white" };
    default:
      return { label: "Ditinjau Internal", tone: "text-slate-600", badge: "bg-slate-600 text-white" };
  }
}
