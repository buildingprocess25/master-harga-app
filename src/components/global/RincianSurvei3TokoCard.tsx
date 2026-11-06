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
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

export interface RincianSurvei3TokoCardProps {
  surveiList?: any[];
  surveyToko?: any[];
  className?: string;
  readonly?: boolean;
  mode?: "edit" | "readonly";
  hideHeader?: boolean;
  satuan?: string;
  materialCode?: string;
  materialName?: string;
  onEditStore?: (noToko: number) => void;
  onChangeToko?: (index: number, updated: any) => void;
}

export function RincianSurvei3TokoCard({
  surveiList,
  surveyToko,
  className = "",
  readonly = true,
  mode = "readonly",
  hideHeader = false,
  satuan = "m2",
  materialName,
  onEditStore,
}: RincianSurvei3TokoCardProps) {
  const [activeLampiranModal, setActiveLampiranModal] = useState<{
    tokoNama: string;
    lampiranList: any[];
  } | null>(null);

  // Normalize inputs: either surveyToko or surveiList
  const rawList = surveyToko || surveiList || [];

  // Pastikan selalu ada representasi 3 slot toko
  const stores = [1, 2, 3].map((num, idx) => {
    const raw = rawList[idx] || rawList.find((s: any) => s.noToko === num);
    const harga = Number(raw?.hargaSatuan ?? raw?.harga) || 0;
    const namaToko = raw?.namaToko || `Toko Survei ${num}`;
    const alamat = raw?.alamatToko || raw?.alamat || "";
    const tanggalSurvei = raw?.tanggalSurvei || "";
    const buktiUrl = raw?.buktiSurveiUrl || raw?.url;
    const lampiranList =
      raw?.lampiranList ||
      (buktiUrl
        ? [
            {
              id: `l-${num}`,
              tipe: "NOTA_PEMBELIAN",
              namaFile: `Bukti_Survei_Toko_${num}.jpg`,
              url: buktiUrl,
            },
          ]
        : []);

    return {
      noToko: num,
      namaToko,
      alamat,
      tanggalSurvei,
      harga,
      catatan: raw?.catatan || "",
      lampiranList,
    };
  });

  return (
    <div
      className={cn(
        "bg-white rounded-xl border-2 border-slate-300 shadow-2xs overflow-hidden",
        className
      )}
    >
      {/* Header Card */}
      {!hideHeader && (
        <div className="bg-slate-50 border-b-2 border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[#005BAC]" />
            <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              Hasil Survei 3 Toko Pasar Lokal {materialName ? `• ${materialName}` : ""}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Wajib 3 toko valid berjarak radius wajar
          </span>
        </div>
      )}

      {/* Grid 3 Toko */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {stores.map((store) => {
          const isFilled = store.harga > 0;
          const lampiranCount = store.lampiranList?.length || 0;

          return (
            <div
              key={store.noToko}
              className={cn(
                "rounded-xl border-2 p-3.5 flex flex-col justify-between transition-all bg-white",
                isFilled
                  ? "border-slate-300 shadow-2xs"
                  : "border-dashed border-slate-300 bg-slate-50"
              )}
            >
              <div>
                {/* Header Toko */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px] font-bold">
                      {store.noToko}
                    </span>
                    <span className="truncate max-w-[130px]">{store.namaToko}</span>
                  </span>

                  {isFilled ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      Valid
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                      Kosong
                    </span>
                  )}
                </div>

                {/* Detail Data Toko */}
                {isFilled ? (
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Harga Survei:</span>
                      <span className="font-bold text-slate-900 font-mono text-sm tabular-nums">
                        {formatRupiah(store.harga)} / {satuan}
                      </span>
                    </div>

                    {store.tanggalSurvei && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Tanggal:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {formatTanggal(store.tanggalSurvei)}
                        </span>
                      </div>
                    )}

                    {store.alamat && (
                      <div className="flex items-start justify-between text-[11px] pt-1 border-t border-slate-100">
                        <span className="text-slate-400 flex items-center gap-1 shrink-0">
                          <MapPin className="w-3 h-3" /> Lokasi:
                        </span>
                        <span className="text-slate-700 text-right truncate max-w-[150px] font-medium">
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
                  <div className="py-4 text-center text-xs text-slate-400 font-medium">
                    Slot survei toko {store.noToko} belum terisi.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
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
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>Lihat {lampiranCount} Bukti Nota</span>
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
                    className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-none flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border-2 border-slate-300 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
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
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {activeLampiranModal.lampiranList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Tidak ada berkas bukti yang dilampirkan.
                </p>
              ) : (
                activeLampiranModal.lampiranList.map((lampiran: any) => (
                  <div
                    key={lampiran.id}
                    className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
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
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {lampiran.tipe ? lampiran.tipe.replace("_", " ") : "Dokumen"}
                        </span>
                      </div>
                    </div>

                    <a
                      href={lampiran.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-700 bg-white border-2 border-slate-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Buka</span>
                    </a>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLampiranModal(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
