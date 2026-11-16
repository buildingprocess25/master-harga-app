"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Calculator,
  Plus,
  Trash2,
  ChevronDown,
  Percent,
  Save,
  Layers,
} from "lucide-react";
import CreatableSelect from "react-select/creatable";
import { KoefisienDetailItem, KategoriKoefisien } from "@/types";
import { cn, formatRupiah, formatKoefisien } from "@/lib/utils";

// =============================================================================
// Standar Pilihan Unit & Pustaka Default
// =============================================================================
export const UPAH_UNIT_OPTIONS = [
  { label: "Oh", value: "Oh" },
  { label: "Hari", value: "Hari" },
  { label: "Bulan", value: "Bulan" },
  { label: "Ls", value: "Ls" },
];

export const MATERIAL_UNIT_OPTIONS = [
  { label: "Kg", value: "Kg" },
  { label: "M2", value: "M2" },
  { label: "M3", value: "M3" },
  { label: "M1", value: "M1" },
  { label: "Pcs", value: "Pcs" },
  { label: "Btg", value: "Btg" },
  { label: "Zak", value: "Zak" },
  { label: "Ltr", value: "Ltr" },
  { label: "Unit", value: "Unit" },
  { label: "Ls", value: "Ls" },
];

export interface ComboBoxOption {
  id?: string;
  label: string;
  unit: string;
  defaultPrice?: number;
  defaultKoefisien?: number;
}

export const unitSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "36px",
    height: "36px",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#005BAC" : "#cbd5e1",
    borderWidth: "2px",
    fontSize: "12px",
    backgroundColor: "#ffffff",
    boxShadow: state.isFocused ? "0 0 0 1px #005BAC" : "none",
    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),
  menu: (base: any) => ({
    ...base,
    fontSize: "12px",
    zIndex: 60,
    backgroundColor: "#ffffff",
    border: "2px solid #cbd5e1",
    borderRadius: "0.5rem",
  }),
  valueContainer: (base: any) => ({
    ...base,
    padding: "0 8px",
  }),
  dropdownIndicator: (base: any) => ({
    ...base,
    padding: "2px 6px",
  }),
  clearIndicator: (base: any) => ({
    ...base,
    padding: "2px 6px",
  }),
};

// =============================================================================
// Komponen ComboBoxInput
// =============================================================================
function ComboBoxInput({
  value,
  onChange,
  onSelectOption,
  options,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectOption: (opt: ComboBoxOption) => void;
  options: ComboBoxOption[];
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return options;
    const q = value.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="border-2 border-slate-300 rounded-lg px-3 py-2 w-full text-xs bg-white font-medium text-slate-900 focus:outline-none focus:border-[#005BAC] pr-8"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-60 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border-2 border-slate-300 rounded-lg shadow-xl py-1 text-xs">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  onSelectOption(opt);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-[#005BAC] flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100 last:border-0"
              >
                <span className="font-bold text-slate-900">{opt.label}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {opt.unit}
                  {opt.defaultPrice
                    ? ` • Rp ${opt.defaultPrice.toLocaleString("id-ID")}`
                    : ""}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2.5 text-slate-500 italic text-[11px]">
              Ketik nama kustom: &quot;{value}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Interface Types
// =============================================================================
export interface OpsiPustakaKoefisien {
  id: string;
  namaKomponen: string;
  kategori: string;
  satuan: string;
  nilaiKoefisienDefault: number;
  hargaAcuanDefault: number | null;
  wajibSurveiToko: boolean;
}

export interface RincianKalkulasiKoefisienProps {
  item?: any;
  koefisienItems?: KoefisienDetailItem[];
  mode?: "readonly" | "editable" | "margin-only";
  isReadOnly?: boolean;
  liveMarginUpah?: number;
  liveMarginMaterial?: number;
  liveMarginBongkaran?: number;
  initialMarginUpah?: number;
  initialMarginMaterial?: number;
  initialMarginBongkaran?: number;
  initialUpahItems?: any[];
  initialMaterialItems?: any[];
  initialUpahBongkaranItems?: any[];
  onMarginChange?: (upah: number, material: number, bongkaran: number) => void;
  onItemsChange?: (items: KoefisienDetailItem[]) => void;
  onSave?: (data?: any) => void;
  onBack?: () => void;
  userRole?: string;
  pustakaKoefisien?: OpsiPustakaKoefisien[];
  onTambahKoefisienBaru?: (data: {
    kategori: string;
    namaKomponen: string;
    satuan: string;
    nilaiKoefisienDefault: number;
    hargaAcuanDefault: number | null;
    wajibSurveiToko: boolean;
  }) => Promise<any>;
  className?: string;
}

export function RincianKalkulasiKoefisien({
  item,
  koefisienItems = [],
  mode = "readonly",
  isReadOnly: isReadOnlyProp,
  liveMarginUpah = 8,
  liveMarginMaterial = 8,
  liveMarginBongkaran = 8,
  initialMarginUpah,
  initialMarginMaterial,
  initialMarginBongkaran,
  initialUpahItems,
  initialMaterialItems,
  initialUpahBongkaranItems,
  onMarginChange,
  onItemsChange,
  onSave,
  onBack,
  userRole = "S&B Specialist",
  pustakaKoefisien = [],
  onTambahKoefisienBaru,
  className = "",
}: RincianKalkulasiKoefisienProps) {
  const isEditable = isReadOnlyProp !== undefined ? !isReadOnlyProp : mode === "editable";
  const isMarginEditable = isEditable || mode === "margin-only";

  // State Margin Numerik Terpusat (Tanpa Slider)
  const [marginUpahState, setMarginUpahState] = useState<number>(
    initialMarginUpah ?? liveMarginUpah ?? item?.marginUpah ?? 8,
  );
  const [marginMaterialState, setMarginMaterialState] = useState<number>(
    initialMarginMaterial ?? liveMarginMaterial ?? item?.marginMaterial ?? 8,
  );
  const [marginBongkaranState, setMarginBongkaranState] = useState<number>(
    initialMarginBongkaran ??
      liveMarginBongkaran ??
      item?.marginBongkaran ??
      item?.marginUpah ??
      8,
  );

  useEffect(() => {
    const val = initialMarginUpah ?? liveMarginUpah;
    if (val !== undefined) setMarginUpahState(val);
  }, [initialMarginUpah, liveMarginUpah]);

  useEffect(() => {
    const val = initialMarginMaterial ?? liveMarginMaterial;
    if (val !== undefined) setMarginMaterialState(val);
  }, [initialMarginMaterial, liveMarginMaterial]);

  useEffect(() => {
    const val = initialMarginBongkaran ?? liveMarginBongkaran;
    if (val !== undefined) setMarginBongkaranState(val);
  }, [initialMarginBongkaran, liveMarginBongkaran]);

  // Handle Perubahan Nilai Margin Numerik
  const handleMarginInputChange = (
    kategori: KategoriKoefisien,
    valStr: string,
  ) => {
    const parsed = parseFloat(valStr.replace(",", ".")) || 0;
    if (kategori === "UPAH") {
      setMarginUpahState(parsed);
      onMarginChange?.(parsed, marginMaterialState, marginBongkaranState);
    } else if (kategori === "MATERIAL") {
      setMarginMaterialState(parsed);
      onMarginChange?.(marginUpahState, parsed, marginBongkaranState);
    } else if (kategori === "BONGKARAN") {
      setMarginBongkaranState(parsed);
      onMarginChange?.(marginUpahState, marginMaterialState, parsed);
    }
  };

  // State Modal Tambah Komponen
  const [modalKategori, setModalKategori] = useState<KategoriKoefisien | null>(null);
  const [namaBaru, setNamaBaru] = useState("");
  const [satuanBaru, setSatuanBaru] = useState("Oh");
  const [koefBaru, setKoefBaru] = useState("1.0000");
  const [hargaBaru, setHargaBaru] = useState("0");

  // Opsi Dropdown Dinamis dari Database Master Koefisien
  const upahOptions: ComboBoxOption[] = useMemo(() => {
    return pustakaKoefisien
      .filter((p) => p.kategori === "UPAH")
      .map((p) => ({
        id: p.id,
        label: p.namaKomponen,
        unit: p.satuan,
        defaultPrice: p.hargaAcuanDefault ?? undefined,
        defaultKoefisien: p.nilaiKoefisienDefault,
      }));
  }, [pustakaKoefisien]);

  const materialOptions: ComboBoxOption[] = useMemo(() => {
    return pustakaKoefisien
      .filter((p) => p.kategori === "MATERIAL")
      .map((p) => ({
        id: p.id,
        label: p.namaKomponen,
        unit: p.satuan,
        defaultPrice: p.hargaAcuanDefault ?? undefined,
        defaultKoefisien: p.nilaiKoefisienDefault,
      }));
  }, [pustakaKoefisien]);

  const bongkaranOptions: ComboBoxOption[] = useMemo(() => {
    return pustakaKoefisien
      .filter((p) => p.kategori === "BONGKARAN")
      .map((p) => ({
        id: p.id,
        label: p.namaKomponen,
        unit: p.satuan,
        defaultPrice: p.hargaAcuanDefault ?? undefined,
        defaultKoefisien: p.nilaiKoefisienDefault,
      }));
  }, [pustakaKoefisien]);

  // Filter Items per Kategori (CATATAN: ALAT/Peralatan Kerja DITIADAKAN sesuai permintaan)
  const upahItems = useMemo(() => {
    if (koefisienItems && koefisienItems.length > 0) {
      return koefisienItems.filter((i) => i.kategori === "UPAH");
    }
    if (initialUpahItems && initialUpahItems.length > 0) {
      return initialUpahItems.map((u: any) => ({
        id: u.id || `u-${Math.random()}`,
        kategori: "UPAH" as KategoriKoefisien,
        namaKomponen: u.label || u.namaKomponen || "Tenaga Kerja",
        satuan: u.unit || u.satuan || "Oh",
        koefisien: Number(u.value || u.koefisien) || 0,
        hargaAcuan: u.hargaAcuan || 0,
        subtotal: (Number(u.value || u.koefisien) || 0) * (u.hargaAcuan || 0),
        isCustom: u.isCustom,
      }));
    }
    return [];
  }, [koefisienItems, initialUpahItems]);

  const materialItems = useMemo(() => {
    if (koefisienItems && koefisienItems.length > 0) {
      return koefisienItems
        .filter((i) => i.kategori === "MATERIAL")
        .map((m) => ({ ...m, wajibSurveiToko: true }));
    }
    if (initialMaterialItems && initialMaterialItems.length > 0) {
      return initialMaterialItems.map((m: any) => ({
        id: m.id || `m-${Math.random()}`,
        kategori: "MATERIAL" as KategoriKoefisien,
        namaKomponen: m.label || m.namaKomponen || "Material",
        satuan: m.unit || m.satuan || "Kg",
        koefisien: Number(m.value || m.koefisien) || 0,
        hargaAcuan: m.hargaAcuan || 0,
        subtotal: 0,
        wajibSurveiToko: true,
        isCustom: m.isCustom,
      }));
    }
    return [];
  }, [koefisienItems, initialMaterialItems]);

  const bongkaranItems = useMemo(() => {
    if (koefisienItems && koefisienItems.length > 0) {
      return koefisienItems.filter((i) => i.kategori === "BONGKARAN");
    }
    if (initialUpahBongkaranItems && initialUpahBongkaranItems.length > 0) {
      return initialUpahBongkaranItems.map((b: any) => ({
        id: b.id || `ub-${Math.random()}`,
        kategori: "BONGKARAN" as KategoriKoefisien,
        namaKomponen: b.label || b.namaKomponen || "Bongkaran",
        satuan: b.unit || b.satuan || "Oh",
        koefisien: Number(b.value || b.koefisien) || 0,
        hargaAcuan: b.hargaAcuan || 0,
        subtotal: (Number(b.value || b.koefisien) || 0) * (b.hargaAcuan || 0),
        isCustom: b.isCustom,
      }));
    }
    return [];
  }, [koefisienItems, initialUpahBongkaranItems]);

  // Kalkulasi Subtotal per Grup Komponen
  const calculateGroupTotals = (
    items: KoefisienDetailItem[],
    marginPercent: number,
  ) => {
    const hpp = items.reduce(
      (acc, i) =>
        acc + (Number(i.koefisien) || 0) * (Number(i.hargaAcuan) || 0),
      0,
    );
    const nominalMargin = Math.round(hpp * (marginPercent / 100));
    const total = hpp + nominalMargin;
    return { hpp, nominalMargin, total };
  };

  const upahTotals = calculateGroupTotals(upahItems, marginUpahState);
  const materialTotals = calculateGroupTotals(materialItems, marginMaterialState);
  const bongkaranTotals = calculateGroupTotals(
    bongkaranItems,
    marginBongkaranState,
  );

  const grandTotalHpp =
    upahTotals.hpp + materialTotals.hpp + bongkaranTotals.hpp;
  const grandTotalAkhir =
    upahTotals.total + materialTotals.total + bongkaranTotals.total;

  // Handler Hapus Baris
  const handleHapusBaris = (itemId: string) => {
    if (!onItemsChange) return;
    const next = koefisienItems.filter((x) => x.id !== itemId);
    onItemsChange(next);
  };

  // Handler Ubah Nilai Koefisien / Harga Baris
  const handleUbahNilai = (
    itemId: string,
    field: "koefisien" | "hargaAcuan",
    val: number,
  ) => {
    if (!onItemsChange) return;
    const next = koefisienItems.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          [field]: val,
        };
      }
      return it;
    });
    onItemsChange(next);
  };

  // Handler Simpan Komponen Baru
  const handleSimpanKomponen = async () => {
    if (!modalKategori || !onItemsChange) return;
    if (!namaBaru.trim()) return;

    const kVal = parseFloat(koefBaru) || 1;
    const hVal = parseFloat(hargaBaru) || 0;

    let pustakaId = "";

    // 1. Cek apakah komponen sudah ada di daftar pustaka
    const matchExisting = pustakaKoefisien.find(
      (p) =>
        p.namaKomponen.toLowerCase() === namaBaru.trim().toLowerCase() &&
        p.kategori === modalKategori,
    );

    if (matchExisting) {
      pustakaId = matchExisting.id;
    } else if (onTambahKoefisienBaru) {
      try {
        const res = await onTambahKoefisienBaru({
          kategori: modalKategori,
          namaKomponen: namaBaru.trim(),
          satuan: satuanBaru.trim() || "Oh",
          nilaiKoefisienDefault: kVal,
          hargaAcuanDefault: modalKategori === "MATERIAL" ? 0 : hVal,
          wajibSurveiToko: modalKategori === "MATERIAL",
        });
        pustakaId = res?.data?.id || res?.id || "";
      } catch (e) {
        console.warn("Gagal simpan ke pustaka:", e);
      }
    }

    const newItem: KoefisienDetailItem = {
      id: pustakaId || `item_${Date.now()}`,
      masterKoefisienId: pustakaId || `item_${Date.now()}`,
      kategori: modalKategori,
      namaKomponen: namaBaru.trim(),
      satuan: satuanBaru.trim() || "Oh",
      koefisien: kVal,
      hargaAcuan: modalKategori === "MATERIAL" ? 0 : hVal,
      wajibSurveiToko: modalKategori === "MATERIAL",
      isCustom: true,
    };

    onItemsChange([...koefisienItems, newItem]);

    // Reset Modal
    setModalKategori(null);
    setNamaBaru("");
    setSatuanBaru("Oh");
    setKoefBaru("1.0000");
    setHargaBaru("0");
  };

  // Render Tabel Grup Komponen (Gaya Solid master-harga-app)
  const renderGroup = (
    title: string,
    items: KoefisienDetailItem[],
    currentMargin: number,
    kategori: KategoriKoefisien,
    totals: { hpp: number; nominalMargin: number; total: number },
  ) => {
    const isUpah = kategori === "UPAH" || kategori === "BONGKARAN";

    return (
      <div className="mb-4 bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-2xs">
        {/* Header Grup */}
        <div className="bg-slate-100 px-4 py-3 border-b-2 border-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-4 rounded-xs ${
                kategori === "UPAH"
                  ? "bg-[#005BAC]"
                  : kategori === "MATERIAL"
                  ? "bg-emerald-600"
                  : "bg-amber-600"
              }`}
            />
            <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Input Margin Numerik Langsung (Tanpa Slider) */}
            {userRole === "S&B Specialist" && (
              <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-300 px-2.5 py-1 rounded-lg">
                <span className="text-[11px] font-bold text-amber-950">
                  Margin {kategori === "UPAH" ? "Upah" : kategori === "MATERIAL" ? "Material" : "Bongkaran"}:
                </span>
                <div className="relative w-18">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={currentMargin}
                    disabled={!isMarginEditable}
                    onChange={(e) =>
                      handleMarginInputChange(kategori, e.target.value)
                    }
                    className="w-full bg-white border border-amber-400 rounded px-1.5 py-0.5 text-xs font-bold text-amber-950 text-center pr-4 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono disabled:bg-slate-100 disabled:border-slate-300 disabled:text-slate-600"
                  />
                  <span className="absolute right-1.5 top-0.5 text-[10px] text-amber-700 font-bold">
                    %
                  </span>
                </div>
              </div>
            )}

            {/* Tombol Tambah Komponen */}
            {isEditable && (
              <button
                type="button"
                onClick={() => {
                  setModalKategori(kategori);
                  setNamaBaru("");
                  setSatuanBaru(isUpah ? "Oh" : item?.satuan || "Kg");
                  setHargaBaru(isUpah ? "175000" : "0");
                  setKoefBaru("1.0000");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-[#005BAC] text-[#005BAC] hover:bg-[#005BAC] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  Tambah {kategori === "UPAH" ? "Upah" : kategori === "MATERIAL" ? "Material" : "Bongkaran"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tabel Komponen */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-700 font-bold text-[11px] bg-slate-50 uppercase tracking-wider">
                <th className="py-2.5 pl-3 w-10 text-center">No</th>
                <th className="py-2.5">Komponen Pekerjaan</th>
                <th className="py-2.5 w-24">Satuan</th>
                <th className="py-2.5 text-right w-28">Koefisien</th>
                <th className="py-2.5 text-right w-36">Harga Acuan (Rp)</th>
                <th className="py-2.5 text-right w-32">Subtotal Dasar</th>
                <th className="py-2.5 pr-3 text-right w-36 font-black text-[#005BAC]">
                  Total (+{currentMargin}%)
                </th>
                {isEditable && (
                  <th className="py-2.5 w-12 text-center pr-2">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 font-mono tabular-nums text-slate-900">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isEditable ? 8 : 7}
                    className="py-5 text-center text-slate-500 font-sans italic text-xs"
                  >
                    Belum ada komponen {title.toLowerCase()} yang ditambahkan.
                  </td>
                </tr>
              ) : (
                items.map((rowItem, idx) => {
                  const subtotal =
                    (Number(rowItem.koefisien) || 0) *
                    (Number(rowItem.hargaAcuan) || 0);
                  const totalRow =
                    subtotal + Math.round(subtotal * (currentMargin / 100));

                  return (
                    <tr
                      key={rowItem.id || idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2.5 pl-3 text-center text-slate-500 font-sans font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 font-sans font-bold text-slate-900">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{rowItem.namaKomponen}</span>
                          {rowItem.wajibSurveiToko && (
                            <span className="text-[10px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded uppercase">
                              Survei BC (3 Toko)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-700 font-sans font-medium">
                        {rowItem.satuan}
                      </td>

                      {/* Input Koefisien */}
                      <td className="py-2 text-right">
                        {isEditable ? (
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={rowItem.koefisien || ""}
                            onChange={(e) =>
                              handleUbahNilai(
                                rowItem.id,
                                "koefisien",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-24 text-right px-2 py-1 bg-white border-2 border-slate-300 rounded font-bold text-slate-900 focus:border-[#005BAC] outline-none"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">
                            {formatKoefisien(rowItem.koefisien)}
                          </span>
                        )}
                      </td>

                      {/* Harga Acuan */}
                      <td className="py-2 text-right text-slate-700">
                        {isEditable && !rowItem.wajibSurveiToko ? (
                          <input
                            type="number"
                            step="500"
                            min="0"
                            value={rowItem.hargaAcuan || ""}
                            onChange={(e) =>
                              handleUbahNilai(
                                rowItem.id,
                                "hargaAcuan",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-28 text-right px-2 py-1 bg-white border-2 border-slate-300 rounded font-bold text-slate-900 focus:border-[#005BAC] outline-none"
                          />
                        ) : rowItem.wajibSurveiToko ? (
                          <span className="text-[11px] text-slate-600 italic font-sans font-medium">
                            {rowItem.hargaAcuan > 0
                              ? formatRupiah(rowItem.hargaAcuan)
                              : "Survei BC"}
                          </span>
                        ) : (
                          <span className="font-semibold">
                            {formatRupiah(rowItem.hargaAcuan)}
                          </span>
                        )}
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 text-right text-slate-800 font-semibold">
                        {formatRupiah(subtotal)}
                      </td>

                      {/* Total (+Margin) */}
                      <td className="py-2.5 pr-3 text-right font-black text-slate-900">
                        {formatRupiah(totalRow)}
                      </td>

                      {/* Tombol Hapus */}
                      {isEditable && (
                        <td className="py-2 text-center pr-2">
                          <button
                            type="button"
                            title="Hapus baris"
                            onClick={() => handleHapusBaris(rowItem.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Subtotal Grup Footer */}
        <div className="bg-slate-50 border-t-2 border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-800">
          <div className="flex items-center gap-4">
            <span>
              Dasar: <strong className="text-slate-900 font-mono font-bold">{formatRupiah(totals.hpp)}</strong>
            </span>
            {currentMargin > 0 && (
              <span>
                + Margin ({currentMargin}%):{" "}
                <strong className="text-amber-800 font-mono font-bold">
                  {formatRupiah(totals.nominalMargin)}
                </strong>
              </span>
            )}
          </div>
          <div className="font-bold text-slate-900">
            Total {kategori === "UPAH" ? "Upah" : kategori === "MATERIAL" ? "Material" : "Bongkaran"}:{" "}
            <span className="text-[#005BAC] font-black font-mono text-sm">
              {formatRupiah(totals.total)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border-2 border-slate-300 shadow-2xs overflow-hidden",
        className,
      )}
    >
      {/* Header Utama Card (Sesuai Gaya master-harga-app) */}
      <div className="bg-slate-50 border-b-2 border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#005BAC] text-white flex items-center justify-center font-bold shadow-xs">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
              Rincian Koefisien
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Kalkulasi otomatis harga satuan standar berbasis koefisien resep (Tenaga Kerja, Bahan, dan Bongkaran)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {item?.status === "USULAN_KONTRAKTOR" && (
            <span className="text-xs font-bold text-white bg-amber-600 px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-2xs">
              <Percent className="w-3.5 h-3.5" />
              <span>Mode Negosiasi Kontraktor</span>
            </span>
          )}
          {isEditable ? (
            <span className="text-xs font-bold text-white bg-[#005BAC] px-3 py-1 rounded-md shadow-2xs">
              Mode Edit
            </span>
          ) : mode === "margin-only" ? (
            <span className="text-xs font-bold text-white bg-amber-600 px-3 py-1 rounded-md shadow-2xs">
              Mode Revisi Margin
            </span>
          ) : (
            <span className="text-xs font-bold text-slate-700 bg-white border-2 border-slate-300 px-3 py-1 rounded-md">
              Hanya Baca
            </span>
          )}
        </div>
      </div>

      {/* Rincian Grup Tabel Komponen (Peralatan Kerja TIDAK ADA) */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* A. Tenaga Kerja (Upah) */}
        {renderGroup(
          "A. Tenaga Kerja (Upah)",
          upahItems,
          marginUpahState,
          "UPAH",
          upahTotals,
        )}

        {/* B. Bahan / Material */}
        {renderGroup(
          "B. Bahan / Material",
          materialItems,
          marginMaterialState,
          "MATERIAL",
          materialTotals,
        )}

        {/* C. Pekerjaan Bongkaran (Jika ada atau item mendukung bongkaran) */}
        {(bongkaranItems.length > 0 || item?.isTermasukBongkaran) &&
          renderGroup(
            "C. Pekerjaan Bongkaran",
            bongkaranItems,
            marginBongkaranState,
            "BONGKARAN",
            bongkaranTotals,
          )}

        {/* Ringkasan Total Akhir AHSP */}
        <div className="mt-5 pt-3 border-t-2 border-slate-300 bg-slate-50 p-4 rounded-xl border-2 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-xs text-slate-600 font-bold block">
              Total HPP Murni (Sebelum Margin):
            </span>
            <span className="font-mono text-base font-bold text-slate-900">
              {formatRupiah(grandTotalHpp)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">
              Total Harga Satuan (+Margin):
            </span>
            <span className="font-mono text-2xl font-black text-[#005BAC] tabular-nums">
              {formatRupiah(grandTotalAkhir)}
            </span>
          </div>
        </div>

        {/* Footer Tombol Simpan / Kembali jika prop disediakan */}
        {(onSave || onBack) && (
          <div className="pt-3 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <span className="text-xs text-slate-500 italic">
              {item?.status === "PENDING_SB_SPECIALIST" || item?.status === "USULAN_KONTRAKTOR"
                ? "Margin yang disimpan akan otomatis memperbarui harga penawaran dan diteruskan ke sistem."
                : item?.isTrial
                ? "Koefisien & margin akan disimpan sebagai acuan perhitungan item trial."
                : "Koefisien akan menjadi acuan survei harga 3 toko oleh Building Coordinator."}
            </span>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 transition cursor-pointer"
                >
                  Kembali
                </button>
              )}
              {onSave && (
                <button
                  type="button"
                  onClick={() => onSave()}
                  className="px-5 py-2.5 bg-[#005BAC] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Tambah Komponen Baru (Gaya Solid master-harga-app) */}
      {modalKategori && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-4 bg-[#005BAC] rounded-xs" />
                <h4 className="text-sm font-black text-slate-900 uppercase">
                  Tambah Komponen {modalKategori}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setModalKategori(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Nama Komponen dengan ComboBoxInput */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Komponen (Pilih Standar atau Ketik Kustom) <span className="text-red-500">*</span>
                </label>
                <ComboBoxInput
                  value={namaBaru}
                  onChange={setNamaBaru}
                  onSelectOption={(opt) => {
                    setNamaBaru(opt.label);
                    setSatuanBaru(opt.unit);
                    if (opt.defaultKoefisien) {
                      setKoefBaru(String(opt.defaultKoefisien));
                    }
                    if (opt.defaultPrice !== undefined && modalKategori !== "MATERIAL") {
                      setHargaBaru(String(opt.defaultPrice));
                    }
                  }}
                  options={
                    modalKategori === "UPAH"
                      ? upahOptions
                      : modalKategori === "MATERIAL"
                      ? materialOptions
                      : bongkaranOptions
                  }
                  placeholder={`Pilih dari pustaka master atau ketik nama ${modalKategori.toLowerCase()}...`}
                  autoFocus
                />
              </div>

              {/* Satuan & Koefisien */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <CreatableSelect
                    styles={unitSelectStyles}
                    options={
                      modalKategori === "UPAH" || modalKategori === "BONGKARAN"
                        ? UPAH_UNIT_OPTIONS
                        : MATERIAL_UNIT_OPTIONS
                    }
                    value={
                      satuanBaru
                        ? { label: satuanBaru, value: satuanBaru }
                        : null
                    }
                    onChange={(selected: any) =>
                      setSatuanBaru(selected ? selected.value : "Oh")
                    }
                    placeholder="Pilih/ketik satuan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Koefisien <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={koefBaru}
                    onChange={(e) => setKoefBaru(e.target.value)}
                    placeholder="0.0000"
                    className="border-2 border-slate-300 rounded-lg px-3 py-2 w-full text-xs bg-white font-mono font-bold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>
              </div>

              {/* Harga Acuan & Keterangan Survei Material */}
              {modalKategori !== "MATERIAL" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Harga Acuan Upah (Rp)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={hargaBaru}
                    onChange={(e) => setHargaBaru(e.target.value)}
                    placeholder="0"
                    className="border-2 border-slate-300 rounded-lg px-3 py-2 w-full text-xs bg-white font-mono font-bold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-950 font-medium">
                  <p>
                  </p>
                </div>
              )}
            </div>

            {/* Tombol Aksi Modal */}
            <div className="flex justify-end gap-2.5 pt-3 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={() => setModalKategori(null)}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-100 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimpanKomponen}
                disabled={!namaBaru.trim()}
                className="px-5 py-2 bg-[#005BAC] hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Simpan Komponen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
