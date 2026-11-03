"use client";

import React, { useState } from "react";
import {
  Store,
  Calendar,
  Phone,
  MapPin,
  Paperclip,
  Eye,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { SurveyTokoItem, LampiranSurveiItem } from "@/types";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

export interface RincianSurvei3TokoCardProps {
  surveiList: SurveyTokoItem[];
  className?: string;
  readonly?: boolean;
  onEditStore?: (noToko: number) => void;
}

export function RincianSurvei3TokoCard({
  surveiList = [],
  className = "",
  readonly = true,
  onEditStore,
}: RincianSurvei3TokoCardProps) {
  // Modal State untuk Penampil Lampiran (File Viewer Modal)
  const [activeLampiranModal, setActiveLampiranModal] = useState<{
    tokoNama: string;
    lampiranList: LampiranSurveiItem[];
  } | null>(null);

  // Pastikan selalu ada representasi 3 slot toko
  const stores = [1, 2, 3].map((num) => {
    const existing = surveiList.find((s) => s.noToko === num);
    return (
      existing || {
        id: `empty-${num}`,
        noToko: num,
        namaToko: `Toko Survei ${num}`,
        tanggalSurvei: "",
        harga: 0,
        lampiranList: [],
      }
    );
  });

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Header Card */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-[#005BAC]" />
          <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Hasil Survei 3 Toko Pasar Lokal
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          Wajib 3 toko valid berjarak radius wajar
        </span>
      </div>

      {/* Grid 3 Toko */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {stores.map((store) => {
          const isFilled = store.harga > 0 && !!store.tanggalSurvei;
          const lampiranCount = store.lampiranList?.length || 0;

          return (
            <div
              key={store.noToko}
              className={cn(
                "rounded-md border p-3 flex flex-col justify-between transition-all",
                isFilled
                  ? "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                  : "bg-slate-50 border-dashed border-slate-300"
              )}
            >
              <div>
                {/* Header Toko */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#005BAC] text-white flex items-center justify-center text-[10px]">
                      {store.noToko}
                    </span>
                    {store.namaToko}
                  </span>

                  {isFilled ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#008A00] bg-emerald-50 px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      Terverifikasi
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">
                      Belum Survei
                    </span>
                  )}
                </div>

                {/* Detail Data Toko */}
                {isFilled ? (
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Harga Survei:</span>
                      <span className="font-bold text-slate-900 font-mono text-sm tabular-nums">
                        {formatRupiah(store.harga)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Tanggal:
                      </span>
                      <span className="font-medium text-slate-700">
                        {formatTanggal(store.tanggalSurvei)}
                      </span>
                    </div>

                    {store.alamat && (
                      <div className="flex items-start justify-between text-[11px] pt-1 border-t border-slate-50">
                        <span className="text-slate-400 flex items-center gap-1 shrink-0">
                          <MapPin className="w-3 h-3" /> Lokasi:
                        </span>
                        <span className="text-slate-700 text-right truncate max-w-[150px]">
                          {store.alamat}
                        </span>
                      </div>
                    )}

                    {store.catatan && (
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        &quot;{store.catatan}&quot;
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Slot survei toko {store.noToko} masih kosong.
                  </div>
                )}
              </div>

              {/* Action Buttons di Bawah Kartu */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                {isFilled && lampiranCount > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveLampiranModal({
                        tokoNama: store.namaToko,
                        lampiranList: store.lampiranList,
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005BAC] hover:text-blue-800 transition-colors"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>Lihat {lampiranCount} Bukti Nota & Foto</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    {isFilled ? "Tanpa Lampiran" : ""}
                  </span>
                )}

                {!readonly && onEditStore && (
                  <button
                    type="button"
                    onClick={() => onEditStore(store.noToko)}
                    className="text-[11px] font-bold text-[#005BAC] hover:underline"
                  >
                    {isFilled ? "Edit" : "+ Isi Survei"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal File Viewer Lampiran */}
      {activeLampiranModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Bukti Survei: {activeLampiranModal.tokoNama}
                </h4>
                <p className="text-xs text-slate-500">
                  Foto Nota/Kwitansi, Foto Fisik Toko, dan Sampel Barang
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLampiranModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {activeLampiranModal.lampiranList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Tidak ada berkas bukti yang dilampirkan.
                </p>
              ) : (
                activeLampiranModal.lampiranList.map((lampiran) => (
                  <div
                    key={lampiran.id}
                    className="flex items-center justify-between p-2.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-blue-100 text-[#005BAC] flex items-center justify-center shrink-0">
                        {lampiran.tipe === "FOTO_TOKO" ||
                        lampiran.tipe === "FOTO_MATERIAL" ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-[240px]">
                          {lampiran.namaFile}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {lampiran.tipe.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <a
                      href={lampiran.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#005BAC] bg-white border border-slate-200 rounded hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Buka
                    </a>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLampiranModal(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
