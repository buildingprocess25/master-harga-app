"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const JAM = 60 * 60 * 1000;

function formatSisa(ms: number) {
  const totalMenit = Math.max(0, Math.floor(ms / 60000));
  const hari = Math.floor(totalMenit / (24 * 60));
  const jam = Math.floor((totalMenit % (24 * 60)) / 60);
  const menit = totalMenit % 60;
  if (hari > 0) return `${hari}h ${jam}j ${menit}m`;
  if (jam > 0) return `${jam}j ${menit}m`;
  return `${menit}m`;
}

export interface SlaCountdownProps {
  deadline: string;
  /** "compact" untuk sel tabel, "full" untuk kartu detail. */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Hitung mundur SLA 3x24 jam. Warna mengikuti urgensi:
 * normal (> 24 jam), kuning (<= 24 jam), merah (<= 6 jam atau habis).
 */
export function SlaCountdown({ deadline, variant = "compact", className }: SlaCountdownProps) {
  const target = new Date(deadline).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Render awal di server tidak tahu waktu klien: tampilkan tanggal batas saja.
  const sisa = now === null ? null : target - now;
  const habis = sisa !== null && sisa <= 0;
  const kritis = sisa !== null && sisa <= 6 * JAM;
  const mendesak = sisa !== null && sisa <= 24 * JAM;

  const toneCompact = habis || kritis
    ? "bg-rose-600 text-white"
    : mendesak
      ? "bg-amber-600 text-white"
      : "bg-[#005BAC] text-white";

  const toneFull = habis || kritis
    ? "bg-white border-2 border-rose-600 text-rose-950"
    : mendesak
      ? "bg-white border-2 border-amber-500 text-amber-950"
      : "bg-white border-2 border-[#005BAC] text-slate-900";

  const label =
    sisa === null
      ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(target)
      : habis
        ? "Waktu Habis"
        : `Sisa ${formatSisa(sisa)}`;

  if (variant === "full") {
    return (
      <div className={cn("rounded-xl p-3.5 shadow-2xs", toneFull, className)}>
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide">
          <Clock className="w-4 h-4" />
          Batas Waktu Respon SLA 3x24 Jam
        </div>
        <div className="mt-1 text-xl font-black font-mono tabular-nums">{label}</div>
        <div className="text-xs font-medium text-slate-500 mt-0.5">
          {new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(target)}
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black font-mono tabular-nums whitespace-nowrap shadow-2xs",
        toneCompact,
        className
      )}
    >
      <Clock className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
