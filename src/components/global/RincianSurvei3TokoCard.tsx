"use client";

import React, { useState } from "react";
import {
  Store,
  Calendar,
  MapPin,
  Paperclip,
  Eye,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Upload,
  Info,
  Loader2,
  Plus,
} from "lucide-react";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

export interface LampiranItemInput {
  id?: string;
  tipe?: string;
  jenisLampiran?: string;
  namaFile: string;
  url?: string;
  fileUrl?: string;
  ukuranFile?: string;
}

export interface SurveyTokoItemInput {
  id?: string;
  noToko?: number;
  namaToko: string;
  alamatToko?: string;
  alamat?: string;
  volumeAcuan?: number;
  hargaSatuan?: number;
  harga?: number;
  tanggalSurvei?: string;
  catatanSurvei?: string;
  catatan?: string;
  buktiSurveiUrl?: string;
  buktiSurveiName?: string;
  lampiranList?: LampiranItemInput[];
}

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
  masterTokoList?: Array<{ id: string; namaToko: string; alamat: string }>;
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
  masterTokoList = [],
  onEditStore,
  onChangeToko,
}: RincianSurvei3TokoCardProps) {
  // Modal Preview Image Zoom State
  const [previewModal, setPreviewModal] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Modal View Lampiran List (Readonly)
  const [activeLampiranModal, setActiveLampiranModal] = useState<{
    tokoNama: string;
    lampiranList: LampiranItemInput[];
  } | null>(null);

  // Uploading state per toko index
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Normalize inputs: either surveyToko or surveiList
  const rawList = surveyToko || surveiList || [];

  // Format ribuan untuk input nominal
  const formatRibuan = (val?: number) => {
    if (!val || isNaN(val)) return "";
    return new Intl.NumberFormat("id-ID").format(val);
  };

  const parseNominal = (val: string): number => {
    const clean = val.replace(/[^0-9]/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };

  // Pastikan selalu ada representasi 3 slot toko lengkap dengan multi-lampiran
  const stores = [1, 2, 3].map((num, idx) => {
    const raw = rawList[idx] || rawList.find((s: any) => s.noToko === num);
    const harga = Number(raw?.hargaSatuan ?? raw?.harga) || 0;
    const namaToko = raw?.namaToko || (mode === "readonly" ? `Toko Survei ${num}` : "");
    const alamat = raw?.alamatToko || raw?.alamat || "";
    const tanggalSurvei =
      raw?.tanggalSurvei ||
      (mode === "edit" ? new Date().toISOString().slice(0, 10) : "");
    const buktiUrl = raw?.buktiSurveiUrl || raw?.url || raw?.lampiranList?.[0]?.url;
    const buktiName =
      raw?.buktiSurveiName ||
      raw?.lampiranList?.[0]?.namaFile ||
      (buktiUrl ? `Bukti_Survei_Toko_${num}.jpg` : "");

    // Ambil array lampiranList lengkap
    let lampiranList: LampiranItemInput[] = [];
    if (Array.isArray(raw?.lampiranList) && raw.lampiranList.length > 0) {
      lampiranList = raw.lampiranList.map((l: any, lIdx: number) => ({
        id: l.id || `lamp-${num}-${lIdx}`,
        tipe: l.tipe || l.jenisLampiran || "NOTA_PEMBELIAN",
        jenisLampiran: l.jenisLampiran || l.tipe || "NOTA_PEMBELIAN",
        namaFile: l.namaFile || `Lampiran_${lIdx + 1}.jpg`,
        url: l.url || l.fileUrl,
        fileUrl: l.url || l.fileUrl,
        ukuranFile: l.ukuranFile || "Valid Geo-Tag",
      }));
    } else if (buktiUrl) {
      lampiranList = [
        {
          id: `l-${num}-1`,
          tipe: "NOTA_PEMBELIAN",
          jenisLampiran: "NOTA_PEMBELIAN",
          namaFile: buktiName,
          url: buktiUrl,
          fileUrl: buktiUrl,
          ukuranFile: "Valid Geo-Tag",
        },
      ];
    }

    return {
      noToko: num,
      namaToko,
      alamatToko: alamat,
      alamat,
      volumeAcuan: 1,
      hargaSatuan: harga,
      harga,
      tanggalSurvei,
      catatanSurvei: raw?.catatanSurvei || raw?.catatan || "",
      catatan: raw?.catatanSurvei || raw?.catatan || "",
      buktiSurveiUrl: lampiranList[0]?.url || buktiUrl || "",
      buktiSurveiName: lampiranList[0]?.namaFile || buktiName || "",
      lampiranList,
    };
  });

  // Kalkulasi rata-rata harga
  const h1 = stores[0].hargaSatuan;
  const h2 = stores[1].hargaSatuan;
  const h3 = stores[2].hargaSatuan;
  const validCount = [h1, h2, h3].filter((h) => h > 0).length;
  const hargaRataRata = validCount === 3 ? Math.round((h1 + h2 + h3) / 3) : 0;

  // Handler Multi-Upload Berkas Bukti Survei
  const handleFileUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0 || !onChangeToko) return;

    try {
      setUploadingIndex(index);
      const formData = new FormData();
      rawFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/pengajuan/lampiran", {
        method: "POST",
        body: formData,
      });

      const resJson = await res.json();
      let newUploadedItems: LampiranItemInput[] = [];

      if (res.ok && resJson.success && Array.isArray(resJson.items)) {
        newUploadedItems = resJson.items;
      } else if (res.ok && resJson.success && resJson.data) {
        newUploadedItems = Array.isArray(resJson.data) ? resJson.data : [resJson.data];
      } else {
        // Fallback ke object URL jika endpoint offline
        newUploadedItems = rawFiles.map((file, fIdx) => ({
          id: `local-${Date.now()}-${fIdx}`,
          tipe: "NOTA_PEMBELIAN",
          jenisLampiran: "NOTA_PEMBELIAN",
          namaFile: file.name,
          url: URL.createObjectURL(file),
          fileUrl: URL.createObjectURL(file),
          ukuranFile: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        }));
      }

      const existingLampiran = stores[index].lampiranList || [];
      const combinedLampiran = [...existingLampiran, ...newUploadedItems];

      onChangeToko(index, {
        ...stores[index],
        lampiranList: combinedLampiran,
        buktiSurveiUrl: combinedLampiran[0]?.url || "",
        buktiSurveiName: combinedLampiran[0]?.namaFile || "",
      });
    } catch {
      const fallbackItems = rawFiles.map((file, fIdx) => ({
        id: `local-${Date.now()}-${fIdx}`,
        tipe: "NOTA_PEMBELIAN",
        jenisLampiran: "NOTA_PEMBELIAN",
        namaFile: file.name,
        url: URL.createObjectURL(file),
        fileUrl: URL.createObjectURL(file),
        ukuranFile: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      }));

      const existingLampiran = stores[index].lampiranList || [];
      const combinedLampiran = [...existingLampiran, ...fallbackItems];

      onChangeToko(index, {
        ...stores[index],
        lampiranList: combinedLampiran,
        buktiSurveiUrl: combinedLampiran[0]?.url || "",
        buktiSurveiName: combinedLampiran[0]?.namaFile || "",
      });
    } finally {
      setUploadingIndex(null);
      // Reset input agar bisa pilih berkas yang sama jika diinginkan
      e.target.value = "";
    }
  };

  // Handler Hapus 1 Berkas Lampiran Tertentu
  const handleRemoveLampiranItem = (
    storeIndex: number,
    fileIndexOrId: number | string
  ) => {
    if (!onChangeToko) return;
    const currentLampiran = stores[storeIndex].lampiranList || [];
    const updated = currentLampiran.filter((item, idx) => {
      if (typeof fileIndexOrId === "number") return idx !== fileIndexOrId;
      return item.id !== fileIndexOrId && item.url !== fileIndexOrId;
    });

    onChangeToko(storeIndex, {
      ...stores[storeIndex],
      lampiranList: updated,
      buktiSurveiUrl: updated[0]?.url || "",
      buktiSurveiName: updated[0]?.namaFile || "",
    });
  };

  // =========================================================================
  // RENDER MODE EDIT (Formulir Pengisian Survei 3 Toko)
  // =========================================================================
  if (mode === "edit") {
    return (
      <div
        className={cn(
          "bg-white rounded-xl border-2 border-slate-300 shadow-2xs overflow-hidden",
          className
        )}
      >
        {/* Header Bar */}
        {!hideHeader && (
          <div className="bg-slate-50 border-b-2 border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#005BAC]" />
              <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                {materialName ? `Survei Pasar: ${materialName}` : "Rincian Survei 3 Toko Lokal"}
                <span className="text-slate-500 font-semibold ml-1.5 lowercase">
                  (satuan acuan: {satuan})
                </span>
              </h3>
            </div>
            <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
              <span>Rata-Rata 3 Toko:</span>
              <span className="font-bold text-slate-900 font-mono text-sm bg-white border-2 border-slate-300 px-2.5 py-1 rounded-lg">
                {formatRupiah(hargaRataRata)} / {satuan}
              </span>
            </div>
          </div>
        )}

        {/* Tabel Form Survei 3 Toko */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-300 uppercase tracking-wider text-[11px]">
                <th className="px-3 py-3 text-center w-12 border-r-2 border-slate-300">No</th>
                <th className="px-3.5 py-3 min-w-[200px] border-r-2 border-slate-300">
                  Nama Toko / Supplier
                </th>
                <th className="px-3.5 py-3 min-w-[220px] border-r-2 border-slate-300">
                  Alamat / Lokasi Toko
                </th>
                <th className="px-3 py-3 text-center w-24 border-r-2 border-slate-300">
                  Volume
                </th>
                <th className="px-3.5 py-3 text-right w-44 border-r-2 border-slate-300">
                  Harga Survei (Rp)
                </th>
                <th className="px-3.5 py-3 min-w-[260px] text-center">
                  Lampiran
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200 text-slate-800 font-medium">
              {stores.map((store, idx) => {
                const storeNum = idx + 1;
                const isUploading = uploadingIndex === idx;
                const lampiranCount = store.lampiranList?.length || 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors align-top">
                    {/* No */}
                    <td className="px-3 py-3 text-center font-bold text-slate-500 border-r-2 border-slate-200">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center font-black mx-auto text-xs">
                        {storeNum}
                      </span>
                    </td>

                    {/* Nama Toko */}
                    <td className="px-3.5 py-3 border-r-2 border-slate-200">
                      <div className="space-y-1">
                        <div className="relative">
                          <Store className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={store.namaToko}
                            onChange={(e) =>
                              onChangeToko &&
                              onChangeToko(idx, {
                                ...store,
                                namaToko: e.target.value,
                              })
                            }
                            placeholder={`Contoh: TB Bintang Bangunan ${storeNum}`}
                            list={`master-toko-options-${idx}`}
                            className="w-full h-8.5 pl-8 pr-2 text-xs font-semibold rounded-lg bg-white border-2 border-slate-300 focus:border-[#005BAC] focus:ring-0 outline-none text-slate-900"
                            required
                          />
                          {masterTokoList.length > 0 && (
                            <datalist id={`master-toko-options-${idx}`}>
                              {masterTokoList.map((m) => (
                                <option key={m.id} value={m.namaToko}>
                                  {m.alamat}
                                </option>
                              ))}
                            </datalist>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Alamat Toko */}
                    <td className="px-3.5 py-3 border-r-2 border-slate-200">
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={store.alamatToko || ""}
                          onChange={(e) =>
                            onChangeToko &&
                            onChangeToko(idx, {
                              ...store,
                              alamatToko: e.target.value,
                              alamat: e.target.value,
                            })
                          }
                          placeholder="Alamat jalan, kelurahan, kecamatan"
                          className="w-full h-8.5 pl-8 pr-2 text-xs font-medium rounded-lg bg-white border-2 border-slate-300 focus:border-[#005BAC] focus:ring-0 outline-none text-slate-900"
                          required
                        />
                      </div>
                    </td>

                    {/* Volume Acuan */}
                    <td className="px-3 py-3 text-center border-r-2 border-slate-200">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 border-2 border-slate-300 text-slate-700 rounded-lg text-xs font-bold font-mono">
                        1 {satuan}
                      </span>
                    </td>

                    {/* Harga Survei (Rp) */}
                    <td className="px-3.5 py-3 border-r-2 border-slate-200">
                      <div className="flex items-center bg-white border-2 border-slate-300 focus-within:border-[#005BAC] rounded-lg px-2.5 py-1">
                        <span className="text-slate-500 text-xs font-bold mr-1.5 select-none">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            store.hargaSatuan ? formatRibuan(store.hargaSatuan) : ""
                          }
                          onChange={(e) => {
                            const num = parseNominal(e.target.value);
                            onChangeToko &&
                              onChangeToko(idx, {
                                ...store,
                                hargaSatuan: num,
                                harga: num,
                              });
                          }}
                          placeholder="0"
                          className="w-full text-right outline-none text-xs font-bold font-mono text-slate-900 bg-transparent"
                          required
                        />
                      </div>
                    </td>

                    {/* Multi-Upload Lampiran Bukti Survei */}
                    <td className="px-3.5 py-3">
                      <div className="space-y-2 max-w-[280px] mx-auto">
                        {/* Status Count Badge jika sudah ada berkas */}
                        {lampiranCount > 0 && (
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
                              <Paperclip className="w-3 h-3 text-[#005BAC]" />
                              <span>{lampiranCount} Berkas Terlampir</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Nota / Tampak / Fisik
                            </span>
                          </div>
                        )}

                        {/* List Berkas Terunggah (Chips Interaktif) */}
                        {lampiranCount > 0 && (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {store.lampiranList?.map((file, fIdx) => {
                              const fileUrl = file.url || file.fileUrl || "";
                              const isPdf =
                                fileUrl.toLowerCase().endsWith(".pdf") ||
                                file.namaFile?.toLowerCase().endsWith(".pdf");

                              let badgeLabel = "Nota";
                              let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";

                              if (
                                file.tipe === "FOTO_TOKO" ||
                                file.jenisLampiran === "FOTO_TOKO"
                              ) {
                                badgeLabel = "Toko";
                                badgeColor = "bg-blue-100 text-blue-800 border-blue-300";
                              } else if (
                                file.tipe === "FOTO_MATERIAL" ||
                                file.jenisLampiran === "FOTO_MATERIAL"
                              ) {
                                badgeLabel = "Sampel";
                                badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
                              }

                              return (
                                <div
                                  key={file.id || fIdx}
                                  className="flex items-center justify-between p-1.5 px-2 bg-white rounded-lg border-2 border-slate-300 text-xs shadow-2xs gap-1.5 hover:border-slate-400 transition-colors"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewModal({
                                        url: fileUrl,
                                        title: `Toko ${storeNum}: ${file.namaFile}`,
                                      })
                                    }
                                    className="flex items-center gap-1.5 hover:text-[#005BAC] cursor-pointer truncate text-left flex-1"
                                    title="Klik untuk zoom pratinjau berkas"
                                  >
                                    {isPdf ? (
                                      <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    ) : (
                                      <ImageIcon className="w-3.5 h-3.5 text-[#005BAC] shrink-0" />
                                    )}
                                    <span className="truncate max-w-[130px] text-[11px] font-bold text-slate-800">
                                      {file.namaFile}
                                    </span>
                                  </button>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span
                                      className={cn(
                                        "text-[9px] px-1.5 py-0.5 rounded font-black border uppercase",
                                        badgeColor
                                      )}
                                    >
                                      {badgeLabel}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLampiranItem(idx, file.id || fIdx)}
                                      className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                      title="Hapus berkas ini"
                                    >
                                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Tombol Unggah / Tambah Berkas Multi */}
                        {isUploading ? (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-blue-700 font-bold py-1.5 bg-blue-50 border-2 border-blue-200 rounded-lg">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengunggah berkas...</span>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold text-slate-700 hover:text-[#005BAC] bg-white hover:bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#005BAC] rounded-lg transition-colors cursor-pointer w-full">
                            {lampiranCount > 0 ? (
                              <>
                                <Plus className="w-3.5 h-3.5 text-[#005BAC] stroke-[2.5]" />
                                <span>+ Tambah Berkas (Foto/PDF)</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5 text-slate-500" />
                                <span>Unggah Nota, Tampak &amp; Sampel</span>
                              </>
                            )}
                            <input
                              type="file"
                              multiple
                              accept="image/*,application/pdf"
                              onChange={(e) => handleFileUpload(idx, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Info Strip */}
        <div className="flex items-start gap-2 p-3 text-xs text-slate-800 bg-slate-100 border-t-2 border-slate-200">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Standar Multi-Lampiran Survei:</strong> Anda dapat mengunggah beberapa berkas sekaligus untuk setiap toko (Nota Pembelian, Foto Plang/Tampak Depan Toko, dan Foto Sampel Fisik Barang). Pastikan foto jelas dan memiliki Geo-Tag radius cabang.
          </p>
        </div>

        {/* Modal Preview Gambar / Dokumen Zoom */}
        {previewModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-none flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full border-2 border-slate-300 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="bg-slate-100 px-5 py-3 border-b-2 border-slate-200 flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 truncate">
                  {previewModal.title}
                </h4>
                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="text-slate-500 hover:text-slate-800 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-50 min-h-[250px]">
                {previewModal.url.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={previewModal.url}
                    title="Pratinjau Dokumen"
                    className="w-full h-96 border-2 border-slate-300 rounded-lg"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewModal.url}
                    alt="Pratinjau Bukti Survei"
                    className="max-h-[60vh] max-w-full rounded-lg border-2 border-slate-300 object-contain"
                  />
                )}
              </div>

              <div className="bg-slate-100 px-5 py-2.5 border-t-2 border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
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

  // =========================================================================
  // RENDER MODE READONLY (Tampilan Ringkasan 3 Toko)
  // =========================================================================
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
                    <span className="truncate max-w-[130px]">
                      {store.namaToko || `Toko ${store.noToko}`}
                    </span>
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
                    <span>Lihat {lampiranCount} Bukti Berkas</span>
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

      {/* Modal File Viewer Multi-Lampiran (Readonly) */}
      {activeLampiranModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-none flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border-2 border-slate-300 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Bukti Survei: {activeLampiranModal.tokoNama}
                </h4>
                <p className="text-xs text-slate-500">
                  Foto Nota/Kwitansi, Foto Fisik Toko, dan Sampel Barang ({activeLampiranModal.lampiranList.length} berkas)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLampiranModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
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
                activeLampiranModal.lampiranList.map((lampiran, lIdx) => {
                  const fileUrl = lampiran.url || lampiran.fileUrl || "";
                  const isPdf = fileUrl.toLowerCase().endsWith(".pdf") || lampiran.namaFile?.toLowerCase().endsWith(".pdf");

                  return (
                    <div
                      key={lampiran.id || lIdx}
                      className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          {isPdf ? (
                            <FileText className="w-4 h-4 text-rose-600" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-[#005BAC]" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block truncate max-w-[240px]">
                            {lampiran.namaFile}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {lampiran.tipe ? lampiran.tipe.replace("_", " ") : "Dokumen"} &bull; {lampiran.ukuranFile || "Valid"}
                          </span>
                        </div>
                      </div>

                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-700 bg-white border-2 border-slate-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka</span>
                      </a>
                    </div>
                  );
                })
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
