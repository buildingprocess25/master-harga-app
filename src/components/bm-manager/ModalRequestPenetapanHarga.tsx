"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  PlusCircle,
  FileText,
  Building2,
  MapPin,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";
import Swal from "sweetalert2";

interface DivisiOption {
  id: string;
  kodeDivisi: string;
  namaDivisi: string;
}

interface WilayahOption {
  id: string;
  kodeWilayah: string;
  namaWilayah: string;
}

interface MasterItemOption {
  id: string;
  kodeItem: string;
  kodeMaster: string;
  namaItem: string;
  kategori: string;
  merk: string;
  ukuran: string;
  satuan: string;
}

interface ModalRequestPenetapanHargaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalRequestPenetapanHarga({
  isOpen,
  onClose,
  onSuccess,
}: ModalRequestPenetapanHargaProps) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [loadingInit, setLoadingInit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data Options
  const [divisiList, setDivisiList] = useState<DivisiOption[]>([]);
  const [wilayahList, setWilayahList] = useState<WilayahOption[]>([]);
  const [masterItemList, setMasterItemList] = useState<MasterItemOption[]>([]);
  const [itemSearch, setItemSearch] = useState("");

  // Form States
  const [divisiId, setDivisiId] = useState("");
  const [cakupanHarga, setCakupanHarga] = useState<"INDUK_CABANG" | "KHUSUS_WILAYAH">("INDUK_CABANG");
  const [wilayahCabangId, setWilayahCabangId] = useState("");
  const [selectedMasterItemId, setSelectedMasterItemId] = useState("");
  const [isTermasukBongkaran, setIsTermasukBongkaran] = useState(false);
  const [alasanPengajuan, setAlasanPengajuan] = useState("");

  // Form Fields (Item Baru)
  const [kodeItem, setKodeItem] = useState("");
  const [namaItem, setNamaItem] = useState("");
  const [kategori, setKategori] = useState("");
  const [merk, setMerk] = useState("");
  const [ukuran, setUkuran] = useState("");
  const [tipe, setTipe] = useState("");
  const [warna, setWarna] = useState("");
  const [lokasi, setLokasi] = useState("Sales Area & Gudang Toko");
  const [satuan, setSatuan] = useState("M2");

  // Error State
  const [errorText, setErrorText] = useState("");

  // Load Divisi & Sub-Wilayah on Mount
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Load Existing Items when Divisi changes
  useEffect(() => {
    if (divisiId && mode === "existing") {
      loadMasterItems(divisiId, itemSearch);
    }
  }, [divisiId, mode]);

  const loadInitialData = async () => {
    setLoadingInit(true);
    try {
      const res = await fetch("/api/divisi?includeWilayah=true");
      const json = await res.json();
      if (json.success && json.data) {
        setDivisiList(json.data.divisi || []);
        setWilayahList(json.data.wilayah || []);
        if (json.data.divisi?.length > 0 && !divisiId) {
          setDivisiId(json.data.divisi[0].id);
        }
      }
    } catch {
      setErrorText("Gagal mengambil data divisi master.");
    } finally {
      setLoadingInit(false);
    }
  };

  const loadMasterItems = async (targetDivisiId: string, search: string) => {
    try {
      const q = encodeURIComponent(search);
      const res = await fetch(`/api/master-item?divisiId=${targetDivisiId}&q=${q}`);
      const json = await res.json();
      if (json.success && json.data) {
        setMasterItemList(json.data);
      }
    } catch {
      // Abaikan
    }
  };

  const handleSelectExistingItem = (item: MasterItemOption) => {
    setSelectedMasterItemId(item.id);
    setNamaItem(item.namaItem);
    setKategori(item.kategori);
    setMerk(item.merk);
    setUkuran(item.ukuran);
    setSatuan(item.satuan);
    setKodeItem(item.kodeItem);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!divisiId) {
      setErrorText("Silakan pilih Divisi operasional.");
      return;
    }

    if (cakupanHarga === "KHUSUS_WILAYAH" && !wilayahCabangId) {
      setErrorText("Silakan pilih Sub-Wilayah yang ditargetkan.");
      return;
    }

    if (mode === "existing" && !selectedMasterItemId) {
      setErrorText("Silakan pilih salah satu item master yang ingin diperbarui harganya.");
      return;
    }

    if (mode === "new" && (!namaItem.trim() || !kategori.trim() || !satuan.trim())) {
      setErrorText("Nama item, kategori, dan satuan wajib diisi untuk spesifikasi baru.");
      return;
    }

    const confirm = await Swal.fire({
      title: "Konfirmasi Pengajuan",
      text: "Pengajuan harga satuan ini akan diteruskan ke S&B Specialist HO untuk penetapan resep koefisien AHSP baku. Lanjutkan?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#475569",
      confirmButtonText: "Ya, Ajukan Tiket",
      cancelButtonText: "Batal",
      reverseButtons: true,
      customClass: {
        popup: "rounded-xl border-2 border-slate-300 shadow-xl",
        confirmButton: "px-4 py-2 rounded-lg font-bold text-white bg-[#005BAC] hover:bg-blue-800",
        cancelButton: "px-4 py-2 rounded-lg font-bold text-white bg-slate-600 hover:bg-slate-700",
      },
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const payload = {
        mode,
        divisiId,
        cakupanHarga,
        wilayahCabangId: cakupanHarga === "KHUSUS_WILAYAH" ? wilayahCabangId : null,
        isTermasukBongkaran,
        alasanPengajuan,
        masterItemId: mode === "existing" ? selectedMasterItemId : null,
        kodeItem,
        namaItem,
        kategori,
        merk,
        ukuran,
        tipe,
        warna,
        lokasi,
        satuan,
      };

      const res = await fetch("/api/pengajuan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat pengajuan tiket harga.");
      }

      await Swal.fire({
        title: "Pengajuan Terkirim!",
        text: json.message,
        icon: "success",
        confirmButtonColor: "#005BAC",
        confirmButtonText: "Selesai",
        customClass: {
          popup: "rounded-xl border-2 border-slate-300 shadow-xl",
          confirmButton: "px-4 py-2 rounded-lg font-bold text-white bg-[#005BAC]",
        },
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorText(err.message || "Terjadi kendala saat mengirim permohonan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border-2 border-slate-300 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b-2 border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#005BAC] text-white">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Permohonan Penetapan Harga Satuan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Inisiasi Pengajuan Item Baru atau Pembaruan Harga Existing oleh B&M Manager
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorText && (
            <div className="p-3 rounded-lg bg-red-50 border-2 border-red-300 text-red-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#ED1C24] shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* 1. Mode Switch: Item Baru vs Update Existing */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Tipe Permohonan Harga:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("new")}
                className={`py-2 px-3 rounded-lg border-2 font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === "new"
                    ? "bg-[#005BAC] border-[#005BAC] text-white shadow-xs"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>1. Spesifikasi Item Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`py-2 px-3 rounded-lg border-2 font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === "existing"
                    ? "bg-[#005BAC] border-[#005BAC] text-white shadow-xs"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>2. Review / Update Harga Existing</span>
              </button>
            </div>
          </div>

          {/* 2. Divisi & Cakupan Harga */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Divisi Terkait <span className="text-[#ED1C24]">*</span>
              </label>
              <select
                value={divisiId}
                onChange={(e) => setDivisiId(e.target.value)}
                disabled={loadingInit}
                className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 font-semibold focus:border-[#005BAC] focus:outline-hidden"
              >
                {divisiList.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.kodeDivisi}] {d.namaDivisi}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Cakupan Harga Satuan <span className="text-[#ED1C24]">*</span>
              </label>
              <select
                value={cakupanHarga}
                onChange={(e) =>
                  setCakupanHarga(e.target.value as "INDUK_CABANG" | "KHUSUS_WILAYAH")
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 font-semibold focus:border-[#005BAC] focus:outline-hidden"
              >
                <option value="INDUK_CABANG">Induk Cabang (Standar Seluruh Toko)</option>
                <option value="KHUSUS_WILAYAH">Khusus Sub-Wilayah (Override Disparitas)</option>
              </select>
            </div>
          </div>

          {/* 3. Sub-Wilayah jika cakupan Khusus Wilayah */}
          {cakupanHarga === "KHUSUS_WILAYAH" && (
            <div className="p-3 bg-amber-50 rounded-lg border-2 border-amber-300">
              <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                <span>Pilih Sub-Wilayah Spesifik di Bawah Cabang Anda:</span>
              </label>
              <select
                value={wilayahCabangId}
                onChange={(e) => setWilayahCabangId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-amber-300 bg-white text-slate-800 font-semibold focus:border-[#005BAC] focus:outline-hidden"
              >
                <option value="">-- Pilih Sub-Wilayah --</option>
                {wilayahList.map((w) => (
                  <option key={w.id} value={w.id}>
                    [{w.kodeWilayah}] {w.namaWilayah}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-800 mt-1">
                *Harga yang disetujui akan menjadi acuan khusus toko di wilayah ini, menimpa harga induk cabang.
              </p>
            </div>
          )}

          {/* 4. Pemilihan Item Existing jika Mode Existing */}
          {mode === "existing" && (
            <div className="p-3 bg-slate-50 rounded-lg border-2 border-slate-300 space-y-2">
              <label className="block font-bold text-slate-800">
                Pilih Item Master dari Database:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik nama atau kode item untuk mencari..."
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    if (divisiId) loadMasterItems(divisiId, e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 focus:border-[#005BAC] focus:outline-hidden"
                />
              </div>

              <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 border-2 border-slate-200 rounded-lg bg-white">
                {masterItemList.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 font-medium">
                    Tidak ada item ditemukan.
                  </div>
                ) : (
                  masterItemList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectExistingItem(item)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        selectedMasterItemId === item.id
                          ? "bg-blue-50 text-[#005BAC] font-bold"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div>
                        <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-100 border border-slate-300 mr-1.5">
                          {item.kodeItem}
                        </span>
                        <span>{item.namaItem}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {item.satuan} &bull; {item.merk}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. Detail Spesifikasi Item */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kategori Pekerjaan <span className="text-[#ED1C24]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pekerjaan Lantai"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 focus:border-[#005BAC] focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Item Pekerjaan / Material <span className="text-[#ED1C24]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pekerjaan Lantai Keramik 60x60 Polish"
                  value={namaItem}
                  onChange={(e) => setNamaItem(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 font-bold focus:border-[#005BAC] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Merk Acuan</label>
                <input
                  type="text"
                  placeholder="Roman / Granito"
                  value={merk}
                  onChange={(e) => setMerk(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 focus:border-[#005BAC] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ukuran / Dimensi</label>
                <input
                  type="text"
                  placeholder="60x60 cm"
                  value={ukuran}
                  onChange={(e) => setUkuran(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 focus:border-[#005BAC] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipe / Finish</label>
                <input
                  type="text"
                  placeholder="Polish Glazed"
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 focus:border-[#005BAC] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Satuan Ukur <span className="text-[#ED1C24]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="M2, Kg, Bh, Set"
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 font-bold focus:border-[#005BAC] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Warna / Corak</label>
                <input
                  type="text"
                  placeholder="Cream Polos / Putih Alfamart"
                  value={warna}
                  onChange={(e) => setWarna(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 focus:border-[#005BAC] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi Pemasangan</label>
                <input
                  type="text"
                  placeholder="Sales Area Toko, Gudang, Teras"
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 focus:border-[#005BAC] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 6. Checkbox Opsi Bongkaran */}
          <div className="p-3 bg-slate-50 rounded-lg border-2 border-slate-300 flex items-center gap-2.5">
            <input
              type="checkbox"
              id="bongkaranCheckbox"
              checked={isTermasukBongkaran}
              onChange={(e) => setIsTermasukBongkaran(e.target.checked)}
              className="w-4 h-4 rounded-sm border-2 border-slate-400 text-[#005BAC] focus:ring-0 cursor-pointer"
            />
            <label
              htmlFor="bongkaranCheckbox"
              className="font-bold text-slate-800 cursor-pointer select-none"
            >
              Termasuk Pekerjaan Bongkaran Eksisting?
              <span className="block text-[11px] font-normal text-slate-500">
                Centang jika pekerjaan memerlukan pembongkaran lantai/plafon lama sebelum pemasangan baru.
              </span>
            </label>
          </div>

          {/* 7. Alasan Pengajuan */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Alasan Pengajuan / Latar Belakang Kebutuhan:
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan urgensi standarisasi atau latar belakang kenaikan harga lokal..."
              value={alasanPengajuan}
              onChange={(e) => setAlasanPengajuan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 focus:border-[#005BAC] focus:outline-hidden"
            />
          </div>

          {/* Tombol Aksi Bawah */}
          <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#005BAC] hover:bg-blue-800 text-white font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirimkan Pengajuan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kirim Permohonan Harga</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
