"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  PengajuanHargaItem,
  KoefisienDetailItem,
  SurveyTokoItem,
  generateDeskripsiOtomatis,
  getKodeData,
} from "@/types/pengajuan";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";

export interface ReviewUlangSpesifikasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: PengajuanHargaItem) => void;
  existingItems?: PengajuanHargaItem[];
}

export function ReviewUlangSpesifikasiModal({
  isOpen,
  onClose,
  onSubmit,
  existingItems = [],
}: ReviewUlangSpesifikasiModalProps) {
  // Hanya item yang sudah rilis atau aktif di katalog master
  const catalogItems = useMemo(() => {
    const released = existingItems.filter(
      (item) => item.status === "RELEASED" || (item.status as string) === "APPROVED_ACTIVE"
    );
    return released.length > 0 ? released : existingItems;
  }, [existingItems]);

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const selectedItem = useMemo(() => {
    return catalogItems.find((i) => i.id === selectedItemId) || null;
  }, [catalogItems, selectedItemId]);

  // Form State
  const [kategori, setKategori] = useState("Pekerjaan Keramik");
  const [item, setItem] = useState("");
  const [ukuran, setUkuran] = useState("");
  const [merk, setMerk] = useState("");
  const [warna, setWarna] = useState("");
  const [tipe, setTipe] = useState("");
  const [permukaan, setPermukaan] = useState("");
  const [tebal, setTebal] = useState("");
  const [toleransi, setToleransi] = useState("");
  const [implementasi, setImplementasi] = useState("Dinding Gerai");
  const [lokasi, setLokasi] = useState("");
  const [informasiTambahan, setInformasiTambahan] = useState("");
  const [cabang, setCabang] = useState("Cikokol");

  const [copied, setCopied] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [materialItems, setMaterialItems] = useState<any[]>([]);

  // When selectedItemId changes, prefill form
  useEffect(() => {
    if (selectedItem) {
      setKategori(selectedItem.kategori || "Pekerjaan Keramik");
      setItem(selectedItem.item || selectedItem.namaItem || "");
      setUkuran(selectedItem.ukuran || "");
      setMerk(selectedItem.merk || "");
      setWarna(selectedItem.warna || "");
      setTipe(selectedItem.tipe || "");
      setPermukaan(selectedItem.permukaan || "");
      setTebal(selectedItem.tebal || "");
      setToleransi(selectedItem.toleransi || "");
      setImplementasi(selectedItem.implementasi || "Dinding Gerai");
      setLokasi(selectedItem.lokasi || "");
      setInformasiTambahan(selectedItem.informasiTambahan || "");
      setCabang(selectedItem.cabang || selectedItem.namaCabang || "Cikokol");

      // Set material components
      const rawMat = selectedItem.koefisienMaterialItems || [
        {
          id: `m-1-${selectedItem.id}`,
          label: `${selectedItem.item || selectedItem.namaItem} ${selectedItem.ukuran || ""}`,
          value: "1.0000",
          unit: selectedItem.satuan || "m2",
          surveyToko: selectedItem.surveiTokoList || [],
        },
      ];
      setMaterialItems(rawMat);
      if (rawMat.length > 0) {
        setOpenAccordions([rawMat[0].id]);
      }
    } else {
      setItem("");
      setUkuran("");
      setMerk("");
      setWarna("");
      setTipe("");
      setPermukaan("");
      setTebal("");
      setToleransi("");
      setImplementasi("Dinding Gerai");
      setLokasi("");
      setInformasiTambahan("");
      setMaterialItems([]);
      setOpenAccordions([]);
    }
  }, [selectedItem]);

  const otherItems = useMemo(() => {
    if (!selectedItem) return existingItems;
    return existingItems.filter((i) => i.id !== selectedItem.id);
  }, [existingItems, selectedItem]);

  const kodeData = useMemo(() => {
    return getKodeData({
      kategori,
      item,
      implementasi,
      lokasi,
      ukuran,
      merk,
      warna,
      tipe,
      permukaan,
      tebal,
      toleransi,
      existingItems: otherItems,
    });
  }, [
    kategori,
    item,
    implementasi,
    lokasi,
    ukuran,
    merk,
    warna,
    tipe,
    permukaan,
    tebal,
    toleransi,
    otherItems,
  ]);

  const deskripsiOtomatis = useMemo(() => {
    return generateDeskripsiOtomatis({
      item,
      ukuran,
      merk,
      warna,
      tipe,
      tebal,
      permukaan,
      toleransi,
      informasiTambahan,
      implementasi,
      lokasi,
    });
  }, [
    item,
    ukuran,
    merk,
    warna,
    tipe,
    tebal,
    permukaan,
    toleransi,
    informasiTambahan,
    implementasi,
    lokasi,
  ]);

  const handleToggleAccordion = (id: string) => {
    setOpenAccordions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyDeskripsi = () => {
    if (!deskripsiOtomatis) return;
    navigator.clipboard.writeText(deskripsiOtomatis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItem) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Material Katalog",
        text: "Silakan pilih salah satu item dari katalog master untuk direview ulang.",
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const updatedItem: PengajuanHargaItem = {
      ...selectedItem,
      id: `rev-${Date.now()}`,
      noTiket: kodeData.kodeMaster,
      kodeItem: kodeData.kodeItem,
      kode: kodeData.kodeItem,
      kodeMaster: kodeData.kodeMaster,
      namaItem: item.trim(),
      item: item.trim(),
      kategori: kategori.trim(),
      merk: merk.trim(),
      tipe: tipe.trim(),
      ukuran: ukuran.trim(),
      warna: warna.trim(),
      lokasi: lokasi.trim(),
      cabang: cabang,
      deskripsiOtomatis: deskripsiOtomatis,
      satuan: selectedItem.satuan || "m2",
      implementasi: implementasi.trim(),
      tebal: tebal.trim(),
      permukaan: permukaan.trim(),
      toleransi: toleransi.trim(),
      informasiTambahan: informasiTambahan.trim(),
      status: "DIAJUKAN",
      tanggalPengajuan: today,
      koefisienMaterialItems: materialItems,
      historyLog: [
        ...(selectedItem.historyLog || []),
        {
          role: "B&M Manager",
          action: "SUBMIT",
          tanggal: new Date().toISOString().slice(0, 16).replace("T", " "),
          catatan: "Mengajukan review ulang spesifikasi dari katalog master harga.",
        },
      ],
    };

    onSubmit(updatedItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-none overflow-y-auto">
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Review Ulang Spesifikasi Master Katalog
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Pilih material resmi terdaftar untuk diajukan pembaruan harga atau penyesuaian spesifikasi fisik.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pilih Item dari Katalog */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 space-y-2">
            <label className="block text-xs font-bold text-blue-900">
              Pilih Material dari Katalog Master Harga Resmi <span className="text-red-600">*</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border-2 border-blue-400 text-xs text-slate-900 bg-white font-bold focus:border-blue-600 focus:outline-none"
            >
              <option value="">-- Pilih Item dari Katalog Master --</option>
              {catalogItems.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kode || c.kodeItem} - {c.item || c.namaItem} ({c.merk} {c.ukuran})
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <>
              {/* Grid 12 Field Spesifikasi */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Kategori */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Kategori Pekerjaan
                  </label>
                  <input
                    type="text"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 2. Material */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    2. Nama Material
                  </label>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 3. Merk */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    3. Merk Pabrikan
                  </label>
                  <input
                    type="text"
                    value={merk}
                    onChange={(e) => setMerk(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 4. Ukuran */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    4. Ukuran Dimensi
                  </label>
                  <input
                    type="text"
                    value={ukuran}
                    onChange={(e) => setUkuran(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 5. Warna */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    5. Warna Fisik
                  </label>
                  <input
                    type="text"
                    value={warna}
                    onChange={(e) => setWarna(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 6. Tipe */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    6. Tipe / Seri
                  </label>
                  <input
                    type="text"
                    value={tipe}
                    onChange={(e) => setTipe(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 7. Permukaan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    7. Tekstur Permukaan
                  </label>
                  <input
                    type="text"
                    value={permukaan}
                    onChange={(e) => setPermukaan(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 8. Tebal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    8. Ketebalan Material
                  </label>
                  <input
                    type="text"
                    value={tebal}
                    onChange={(e) => setTebal(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 9. Toleransi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    9. Toleransi Fisik
                  </label>
                  <input
                    type="text"
                    value={toleransi}
                    onChange={(e) => setToleransi(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 10. Implementasi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    10. Posisi / Implementasi
                  </label>
                  <input
                    type="text"
                    value={implementasi}
                    onChange={(e) => setImplementasi(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 11. Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    11. Area Penempatan
                  </label>
                  <input
                    type="text"
                    value={lokasi}
                    onChange={(e) => setLokasi(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* 12. Informasi Tambahan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    12. Keterangan Tambahan
                  </label>
                  <input
                    type="text"
                    value={informasiTambahan}
                    onChange={(e) => setInformasiTambahan(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Kotak Preview Kode & Deskripsi Otomatis */}
              <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Kode Item:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-700 text-white font-mono font-bold text-xs">
                      {kodeData.kodeItem}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">
                      Kode Master:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-white font-mono font-bold text-xs">
                      {kodeData.kodeMaster}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDeskripsi}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs self-start sm:self-auto"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copied ? "Tersalin!" : "Salin Deskripsi"}</span>
                  </button>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Deskripsi Otomatis Terstandarisasi:
                  </span>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                    {deskripsiOtomatis}
                  </p>
                </div>
              </div>

              {/* Accordion Rincian Survei 3 Toko Komponen Material */}
              {materialItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-slate-600" />
                      <span>Survei Komponen Material Terdaftar</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenAccordions(materialItems.map((m) => m.id))}
                        className="text-xs text-blue-700 hover:underline font-bold cursor-pointer"
                      >
                        Buka Semua
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setOpenAccordions([])}
                        className="text-xs text-slate-600 hover:underline font-semibold cursor-pointer"
                      >
                        Tutup Semua
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {materialItems.map((mat, idx) => {
                      const isOpen = openAccordions.includes(mat.id);
                      return (
                        <div
                          key={mat.id}
                          className="border-2 border-slate-300 rounded-xl bg-white overflow-hidden shadow-xs"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleAccordion(mat.id)}
                            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-blue-700 text-white text-xs font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-900 text-xs">
                                {mat.label}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                (Koefisien: {mat.value} {mat.unit})
                              </span>
                            </div>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </button>

                          {isOpen && (
                            <div className="p-4 bg-white">
                              <RincianSurvei3TokoCard
                                mode="readonly"
                                hideHeader={true}
                                surveyToko={mat.surveyToko || []}
                                satuan={mat.unit}
                                materialName={mat.label}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!selectedItem}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              Ajukan Review Ulang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
