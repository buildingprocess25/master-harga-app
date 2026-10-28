"use client";

import React from "react";
import {
  Building2,
  MapPin,
  Tag,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { PengajuanHargaItem } from "@/types";
import { cn, formatTanggal } from "@/lib/utils";

export interface DetailSpesifikasiCardProps {
  item: PengajuanHargaItem;
  className?: string;
  showPricingSummary?: boolean;
}

export function DetailSpesifikasiCard({
  item,
  className = "",
  showPricingSummary = false,
}: DetailSpesifikasiCardProps) {
  // Mapping Warna Badge Divisi
  const getDivisiBadgeClass = (divisi?: string) => {
    const d = divisi?.toLowerCase() || "";
    if (d.includes("bld") || d.includes("building") || d.includes("sipil")) {
      return "bg-blue-50 text-[#005BAC] border-blue-200";
    }
    if (d.includes("eng") || d.includes("engineering")) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    if (d.includes("mnt") || d.includes("maintenance")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (d.includes("dc") || d.includes("distribution")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const isKhususWilayah = item.cakupanHarga === "KHUSUS_WILAYAH";

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Top Banner Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
            {item.kodeItem}
          </span>
          <h2 className="text-base font-bold text-slate-900 leading-snug">
            {item.namaItem}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge Divisi */}
          <span
            className={cn(
              "px-2.5 py-0.5 rounded text-xs font-semibold border",
              getDivisiBadgeClass(item.namaDivisi || item.kodeDivisi)
            )}
          >
            {item.namaDivisi || "Divisi Building"}
          </span>

          {/* Badge Cakupan Harga */}
          {isKhususWilayah ? (
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#FFD100] text-slate-900 border border-amber-300 flex items-center gap-1 shadow-xs">
              <MapPin className="w-3 h-3 text-slate-900" />
              Khusus Wilayah: {item.namaWilayah || "Sub-Cabang"}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-500" />
              Induk Cabang ({item.namaCabang || "Nasional"})
            </span>
          )}
        </div>
      </div>

      {/* Grid Spesifikasi Teknis */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 block mb-0.5">Kategori Pekerjaan</span>
          <span className="font-semibold text-slate-800">
            {item.kategori || "Pekerjaan Standar"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Merk / Brand</span>
          <span className="font-semibold text-slate-800">
            {item.merk || "Standar SNI"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Ukuran / Dimensi</span>
          <span className="font-semibold text-slate-800">
            {item.ukuran || "-"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Tipe / Varian</span>
          <span className="font-semibold text-slate-800">
            {item.tipe || "-"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Warna / Permukaan</span>
          <span className="font-semibold text-slate-800">
            {item.warna || "-"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Area Implementasi</span>
          <span className="font-semibold text-slate-800">
            {item.lokasi || "Area Toko"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Cabang Pemohon</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-[#005BAC]" />
            {item.namaCabang || "Cabang Cikokol"}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Tanggal Permohonan</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatTanggal(item.tanggalPengajuan)}
          </span>
        </div>
      </div>

      {/* Alasan Permohonan (Jika ada) */}
      {item.alasanPengajuan && (
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700">Latar Belakang: </span>
            <span>{item.alasanPengajuan}</span>
          </div>
        </div>
      )}
    </div>
  );
}
