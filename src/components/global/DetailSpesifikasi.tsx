"use client";

import React, { useState } from "react";
import { Layers, FileText, Copy, Check } from "lucide-react";
import { PengajuanHargaItem } from "@/types";

export interface DetailSpesifikasiProps {
  item: PengajuanHargaItem;
  className?: string;
  showHeader?: boolean;
  showCodes?: boolean;
  showDeskripsi?: boolean;
}

export function DetailSpesifikasi({
  item,
  className = "",
  showHeader = true,
  showCodes = false,
  showDeskripsi = true,
}: DetailSpesifikasiProps) {
  const [copied, setCopied] = useState(false);

  const deskripsi =
    item.deskripsiOtomatis ||
    `${item.item || item.namaItem} ${item.merk ? `Merk: ${item.merk}` : ""} ${item.ukuran ? `Ukuran: ${item.ukuran}` : ""}`.trim();

  const handleCopy = () => {
    if (!deskripsi) return;
    navigator.clipboard.writeText(deskripsi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const specFields: { label: string; value?: string | number }[] = [
    { label: "Cabang Pengaju", value: item.cabang || item.namaCabang },
    { label: "Tanggal Pengajuan", value: item.tanggalPengajuan },
    { label: "Kategori Pekerjaan", value: item.kategori },
    { label: "Nama Material", value: item.item || item.namaItem },
    { label: "Ukuran / Dimensi", value: item.ukuran },
    { label: "Merk / Brand", value: item.merk },
    { label: "Warna", value: item.warna },
    { label: "Tipe / Motif", value: item.tipe },
    { label: "Ketebalan", value: item.tebal },
    { label: "Finishing Permukaan", value: item.permukaan },
    { label: "Toleransi", value: (item as any).toleransi },
    { label: "Implementasi / Posisi", value: item.implementasi },
    { label: "Lokasi / Area Gerai", value: item.lokasi },
    { label: "Informasi Tambahan", value: item.informasiTambahan || item.alasanPengajuan },
  ];

  return (
    <div
      className={`border-2 border-slate-300 rounded-2xl bg-white shadow-xs overflow-hidden transition-all ${className}`}
    >
      {/* Header Kartu */}
      {showHeader && (
        <div className="p-4 sm:p-5 border-b-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-[#005BAC] border-2 border-blue-200 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-white bg-[#005BAC] px-2.5 py-0.5 rounded-md border border-blue-900 text-xs shadow-xs">
                  {item.kode || item.kodeItem || item.noTiket}
                </span>
                <span className="font-extrabold text-slate-900 text-base">
                  {item.item || item.namaItem} {item.merk ? `- ${item.merk}` : ""}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {item.kategori} &bull; {item.implementasi || "Building & Maintenance"} &bull;{" "}
                {item.lokasi || "Seluruh Area Gerai"}
                {item.ukuran ? ` \u2022 ${item.ukuran}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Konten Rincian Spesifikasi */}
      <div className="p-4 sm:p-5 space-y-4 bg-white">
        {!showHeader && (
          <div className="flex items-center gap-1.5 mb-1">
            <Layers className="w-4 h-4 text-slate-600" />
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">
              Spesifikasi Material
            </h3>
          </div>
        )}

        {/* Grid 12 Field Spesifikasi */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
          {showCodes && (
            <>
              <div>
                <span className="text-[11px] text-slate-500 block font-bold">
                  Kode Item
                </span>
                <span className="font-mono font-bold text-[#005BAC] text-xs">
                  {item.kode || item.kodeItem || "-"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-bold">
                  No Tiket
                </span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  #{item.noTiket || "-"}
                </span>
              </div>
            </>
          )}

          {specFields.map((field, idx) => (
            <div key={idx}>
              <span className="text-[11px] text-slate-500 block font-bold">
                {field.label}
              </span>
              <span className="font-bold text-slate-800 text-xs break-words">
                {field.value || "-"}
              </span>
            </div>
          ))}
        </div>

        {/* Deskripsi Otomatis / Spesifikasi Lengkap */}
        {showDeskripsi && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Deskripsi Otomatis</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="h-6 text-[11px] text-slate-600 hover:text-slate-900 px-2.5 gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 font-bold inline-flex items-center cursor-pointer shadow-xs transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700 font-bold">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-xs leading-relaxed font-medium select-all">
              {deskripsi || "-"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
