"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Plus,
  RotateCcw,
  Layers,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  PengajuanHargaItem,
  generateDeskripsiOtomatis,
  getKodeData,
} from "@/types/pengajuan";

export interface TambahPengajuanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: PengajuanHargaItem) => void;
  nextIndex?: number;
  existingItems?: PengajuanHargaItem[];
  itemToEdit?: PengajuanHargaItem | null;
}

const INITIAL_MATERIAL_OPTIONS = [
  "Keramik",
  "Granit",
  "Homogeneous Tile",
  "Keramik Dinding",
  "Vinyl",
  "Batu Alam",
  "Marmer",
  "Porselen",
];

const INITIAL_MERK_OPTIONS = [
  "Sandimas",
  "Roman",
  "Mosaic",
  "Toto",
  "KIA",
  "Inax",
];

const INITIAL_POSISI_OPTIONS = [
  "Dinding Gerai",
  "Lantai Gerai",
  "Dinding",
  "Lantai",
  "Area Teras Depan",
  "Plafon",
  "Tangga",
];

const INITIAL_AREA_OPTIONS = [
  "Area Teras Depan",
  "Sales Area",
  "Gudang",
  "Toilet",
  "Fascia Depan",
  "Area Parkir",
  "Back Office",
  "Dinding Area Depan",
  "Dinding Area Belakang",
];

const INITIAL_KATEGORI_OPTIONS = [
  "Pekerjaan Keramik",
  "Area Terbuka",
  "Pekerjaan Finishing",
  "Pekerjaan Pasangan",
  "Pekerjaan Sanitair",
  "Pekerjaan Lantai",
  "Pekerjaan Dinding",
  "Pekerjaan Plafon",
  "Pekerjaan Elektrikal",
  "Pekerjaan Pengecatan",
  "Pekerjaan Pintu & Jendela",
];

const INITIAL_UKURAN_OPTIONS = [
  "60x60",
  "40x40",
  "30x30",
  "30x60",
  "60x120",
  "80x80",
  "20x20",
  "15x60",
  "100x100",
];

export function TambahPengajuanModal({
  isOpen,
  onClose,
  onSubmit,
  nextIndex = 1,
  existingItems = [],
  itemToEdit = null,
}: TambahPengajuanModalProps) {
  // Form State - Semua state default dikosongkan
  const [kategori, setKategori] = useState("");
  const [item, setItem] = useState("");
  const [ukuranVal, setUkuranVal] = useState("");
  const [ukuranSatuan, setUkuranSatuan] = useState("cm");
  const [merk, setMerk] = useState("");
  const [warna, setWarna] = useState("");
  const [tipe, setTipe] = useState("");
  const [permukaan, setPermukaan] = useState("");
  const [tebalVal, setTebalVal] = useState("");
  const [tebalSatuan, setTebalSatuan] = useState("mm");
  const [toleransiVal, setToleransiVal] = useState("");
  const [toleransiSatuan, setToleransiSatuan] = useState("mm");
  const [implementasi, setImplementasi] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [informasiTambahan, setInformasiTambahan] = useState("");
  const [cabang, setCabang] = useState("");

  const [copied, setCopied] = useState(false);

  // Full composite fields (kosong jika nilainya belum diinput)
  const ukuran = ukuranVal.trim() ? `${ukuranVal.trim()} ${ukuranSatuan}`.trim() : "";
  const tebal = tebalVal.trim() ? `${tebalVal.trim()} ${tebalSatuan}`.trim() : "";
  const toleransi = toleransiVal.trim() ? `${toleransiVal.trim()} ${toleransiSatuan}`.trim() : "";

  // Reset form / Populate jika sedang edit
  useEffect(() => {
    if (itemToEdit) {
      setKategori(itemToEdit.kategori || "");
      setItem(itemToEdit.item || itemToEdit.namaItem || "");

      // Parse ukuran
      if (itemToEdit.ukuran) {
        const parts = itemToEdit.ukuran.split(" ");
        setUkuranVal(parts[0] || "");
        if (parts[1]) setUkuranSatuan(parts[1]);
      } else {
        setUkuranVal("");
      }

      setMerk(itemToEdit.merk || "");
      setWarna(itemToEdit.warna || "");
      setTipe(itemToEdit.tipe || "");
      setPermukaan(itemToEdit.permukaan || "");

      // Parse tebal
      if (itemToEdit.tebal) {
        const parts = itemToEdit.tebal.split(" ");
        setTebalVal(parts[0] || "");
        if (parts[1]) setTebalSatuan(parts[1]);
      } else {
        setTebalVal("");
      }

      // Parse toleransi
      if (itemToEdit.toleransi) {
        const parts = itemToEdit.toleransi.split(" ");
        setToleransiVal(parts[0] || "");
        if (parts[1]) setToleransiSatuan(parts[1]);
      } else {
        setToleransiVal("");
      }

      setImplementasi(itemToEdit.implementasi || "");
      setLokasi(itemToEdit.lokasi || "");
      setInformasiTambahan(itemToEdit.informasiTambahan || "");
      setCabang(itemToEdit.cabang || itemToEdit.namaCabang || "");
    } else {
      // Default reset: kosongkan semua field
      setKategori("");
      setItem("");
      setUkuranVal("");
      setUkuranSatuan("cm");
      setMerk("");
      setWarna("");
      setTipe("");
      setPermukaan("");
      setTebalVal("");
      setTebalSatuan("mm");
      setToleransiVal("");
      setToleransiSatuan("mm");
      setImplementasi("");
      setLokasi("");
      setInformasiTambahan("");
      setCabang("");
    }
  }, [itemToEdit, isOpen]);

  // Code generation & duplicate detection
  const otherItems = useMemo(() => {
    if (!itemToEdit) return existingItems;
    return existingItems.filter((i) => i.id !== itemToEdit.id);
  }, [existingItems, itemToEdit]);

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
      nextIndex,
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
    nextIndex,
    otherItems,
  ]);

  const deskripsiOtomatis = useMemo(() => {
    if (!item.trim()) return "";
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

  const handleCopyDeskripsi = () => {
    if (!deskripsiOtomatis) return;
    navigator.clipboard.writeText(deskripsiOtomatis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!item.trim() || !kategori.trim() || !ukuranVal.trim() || !merk.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Data Belum Lengkap",
        text: "Pastikan nama material, kategori, ukuran, dan merk telah terisi.",
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    if (kodeData.isDuplicate && !itemToEdit) {
      Swal.fire({
        icon: "warning",
        title: "Data Material Duplikat",
        text: `Material ini sudah terdaftar dengan kode ${kodeData.kodeMaster}. Silakan sesuaikan varian atau lokasi pemasangan.`,
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const newItem: PengajuanHargaItem = {
      id: itemToEdit?.id || `req-${Date.now()}`,
      noTiket: itemToEdit?.noTiket || kodeData.kodeMaster,
      kodeItem: kodeData.kodeItem,
      namaItem: item.trim(),
      kategori: kategori.trim(),
      merk: merk.trim(),
      tipe: tipe.trim(),
      ukuran: ukuran.trim(),
      warna: warna.trim(),
      lokasi: lokasi.trim(),

      divisiId: itemToEdit?.divisiId || "div-sipil",
      cabangId: itemToEdit?.cabangId || "cab-cikokol",
      namaCabang: cabang || "Cikokol",
      cakupanHarga: itemToEdit?.cakupanHarga || "INDUK_CABANG",

      status: itemToEdit?.status || "DIAJUKAN",
      tanggalPengajuan: itemToEdit?.tanggalPengajuan || today,

      surveiTokoList: itemToEdit?.surveiTokoList || [],
      koefisienItems: itemToEdit?.koefisienItems || [],
      liveMarginUpah: itemToEdit?.liveMarginUpah || 8,
      liveMarginMaterial: itemToEdit?.liveMarginMaterial || 8,
      liveMarginBongkaran: itemToEdit?.liveMarginBongkaran || 8,
      totalHpp: itemToEdit?.totalHpp || 0,
      totalHargaSatuan: itemToEdit?.totalHargaSatuan || 0,

      // Aliases
      kode: kodeData.kodeItem,
      kodeMaster: kodeData.kodeMaster,
      item: item.trim(),
      cabang: cabang || "Cikokol",
      deskripsiOtomatis: deskripsiOtomatis,
      satuan: "m2",
      implementasi: implementasi.trim(),
      tebal: tebal.trim(),
      permukaan: permukaan.trim(),
      toleransi: toleransi.trim(),
      informasiTambahan: informasiTambahan.trim(),

      historyLog: [
        ...(itemToEdit?.historyLog || []),
        {
          role: "B&M Manager",
          action: itemToEdit ? "REVISE" : "SUBMIT",
          tanggal: new Date().toISOString().slice(0, 16).replace("T", " "),
          catatan: itemToEdit
            ? "Memperbarui data spesifikasi material."
            : "Mengajukan spesifikasi material baru.",
        },
      ],
    };

    onSubmit(newItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-none overflow-y-auto">
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {itemToEdit ? "Edit Spesifikasi Material" : "Tambah Pengajuan Spesifikasi Baru"}
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Input 12 parameter fisik material standar untuk diproses verifikasi S&amp;B Controller.
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
          {/* Identifikasi Cabang & Status Duplicate Alert */}
          {kodeData.isDuplicate && !itemToEdit && item.trim() && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">Perhatian: </span>
                Material dengan spesifikasi serupa sudah terdaftar dengan kode{" "}
                <span className="font-mono font-bold">{kodeData.kodeMaster}</span>.
                Anda dapat mengubah varian lokasi atau area pemasangan jika ingin mengajukan varian baru.
              </div>
            </div>
          )}

          {/* Grid 12 Field Spesifikasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. Kategori Pekerjaan <span className="text-red-600">*</span>
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
              >
                <option value="">-- Pilih Kategori Pekerjaan --</option>
                {INITIAL_KATEGORI_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Material / Item */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                2. Nama Material <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                list="material-options"
                placeholder="Contoh: Keramik, Granit..."
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
              />
              <datalist id="material-options">
                {INITIAL_MATERIAL_OPTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            {/* 3. Merk */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                3. Merk Pabrikan <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={merk}
                onChange={(e) => setMerk(e.target.value)}
                list="merk-options"
                placeholder="Contoh: Sandimas, Roman..."
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
              />
              <datalist id="merk-options">
                {INITIAL_MERK_OPTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            {/* 4. Ukuran + Satuan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                4. Ukuran Dimensi <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ukuranVal}
                  onChange={(e) => setUkuranVal(e.target.value)}
                  list="ukuran-options"
                  placeholder="Contoh: 60x60"
                  className="flex-1 h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
                />
                <select
                  value={ukuranSatuan}
                  onChange={(e) => setUkuranSatuan(e.target.value)}
                  className="w-20 h-9 px-2 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="m">m</option>
                  <option value="inch">inch</option>
                </select>
                <datalist id="ukuran-options">
                  {INITIAL_UKURAN_OPTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
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
                placeholder="Contoh: Putih Polos, Abu-abu..."
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
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
                placeholder="Contoh: Graniti, Matte..."
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
              />
            </div>

            {/* 7. Permukaan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                7. Tekstur Permukaan
              </label>
              <select
                value={permukaan}
                onChange={(e) => setPermukaan(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
              >
                <option value="">-- Pilih Tekstur Permukaan --</option>
                <option value="Polished">Polished (Mengkilap)</option>
                <option value="Unpolished">Unpolished (Doff)</option>
                <option value="Rustic">Rustic (Kasar / Anti-slip)</option>
                <option value="Matte">Matte</option>
                <option value="Glossy">Glossy</option>
                <option value="Satin">Satin</option>
              </select>
            </div>

            {/* 8. Tebal + Satuan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                8. Ketebalan Material
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tebalVal}
                  onChange={(e) => setTebalVal(e.target.value)}
                  placeholder="Contoh: 10"
                  className="flex-1 h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
                />
                <select
                  value={tebalSatuan}
                  onChange={(e) => setTebalSatuan(e.target.value)}
                  className="w-20 h-9 px-2 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>

            {/* 9. Toleransi + Satuan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                9. Toleransi Fisik
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={toleransiVal}
                  onChange={(e) => setToleransiVal(e.target.value)}
                  placeholder="Contoh: 0.5"
                  className="flex-1 h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
                />
                <select
                  value={toleransiSatuan}
                  onChange={(e) => setToleransiSatuan(e.target.value)}
                  className="w-20 h-9 px-2 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
                >
                  <option value="mm">mm</option>
                  <option value="%">%</option>
                  <option value="cm">cm</option>
                </select>
              </div>
            </div>

            {/* 10. Implementasi / Posisi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                10. Posisi / Implementasi
              </label>
              <input
                type="text"
                value={implementasi}
                onChange={(e) => setImplementasi(e.target.value)}
                list="posisi-options"
                placeholder="Contoh: Dinding Gerai, Lantai Gerai..."
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
              />
              <datalist id="posisi-options">
                {INITIAL_POSISI_OPTIONS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            {/* 11. Area / Lokasi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                11. Area Penempatan
              </label>
              <input
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                list="area-options"
                placeholder="Contoh: Sales Area, Area Teras..."
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
              />
              <datalist id="area-options">
                {INITIAL_AREA_OPTIONS.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
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
                placeholder="Catatan tambahan (opsional)"
                className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Kotak Preview Kode & Deskripsi Otomatis */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
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
                disabled={!deskripsiOtomatis}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs self-start sm:self-auto"
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
                {deskripsiOtomatis || "(Deskripsi otomatis akan muncul setelah nama material diisi)"}
              </p>
            </div>
          </div>

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
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              {itemToEdit ? "Simpan Perubahan" : "Ajukan Spesifikasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
