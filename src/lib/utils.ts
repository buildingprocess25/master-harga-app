import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Menggabungkan class Tailwind secara dinamis dan menyelesaikan konflik utility.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format angka menjadi mata uang Rupiah (Rp) standar Indonesia.
 */
export function formatRupiah(nominal?: number | null): string {
  if (nominal === undefined || nominal === null || isNaN(nominal)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nominal);
}

/**
 * Format angka desimal untuk koefisien AHSP (standar 4 digit desimal).
 */
export function formatKoefisien(val?: number | null, decimals = 4): string {
  if (val === undefined || val === null || isNaN(val)) return "0.0000";
  return Number(val).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format tanggal ISO ke format Indonesia ringkas (e.g. 28 Okt 2026).
 */
export function formatTanggal(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}
