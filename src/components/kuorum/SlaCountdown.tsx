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

  const tone = habis || kritis
    ? "bg-[#FDECEE] text-[#990F14] border-[#F7C1C5]"
    : mendesak
      ? "bg-[#FFF8DB] text-[#6E4B00] border-[#F3D56B]"
      : "bg-[#EAF3FB] text-[#003A70] border-[#B8D8F3]";

  const label =
    sisa === null
      ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(target)
      : habis
        ? "Waktu habis"
        : `Sisa ${formatSisa(sisa)}`;

  if (variant === "full") {
    return (
      <div className={cn("rounded-lg border px-3 py-2.5", tone, className)}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
          <Clock className="w-3.5 h-3.5" />
          Batas respon SLA 3x24 jam
        </div>
        <div className="mt-1 text-lg font-bold font-mono tabular-nums">{label}</div>
        <div className="text-[11px] opacity-80">
          {new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(target)}
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold font-mono tabular-nums whitespace-nowrap",
        tone,
        className
      )}
    >
      <Clock className="w-3 h-3" />
      {label}
    </span>
  );
}
