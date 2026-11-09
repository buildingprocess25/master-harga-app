"use client";

import React, { useState } from "react";
import {
  Calculator,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { KoefisienDetailItem, KategoriKoefisien } from "@/types";
import { cn, formatRupiah, formatKoefisien } from "@/lib/utils";

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
  koefisienItems: KoefisienDetailItem[];
  mode?: "readonly" | "editable";
  liveMarginUpah?: number;
  liveMarginMaterial?: number;
  liveMarginBongkaran?: number;
  onMarginChange?: (upah: number, material: number, bongkaran: number) => void;
  onItemsChange?: (items: KoefisienDetailItem[]) => void;
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
  koefisienItems = [],
  mode = "readonly",
  liveMarginUpah = 8,
  liveMarginMaterial = 8,
  liveMarginBongkaran = 8,
  onMarginChange,
  onItemsChange,
  pustakaKoefisien = [],
  onTambahKoefisienBaru,
  className = "",
}: RincianKalkulasiKoefisienProps) {
  const isEditable = mode === "editable";

  // State Dialog Tambah Komponen
  const [modalKategori, setModalKategori] = useState<KategoriKoefisien | null>(null);
  const [selectedPustakaId, setSelectedPustakaId] = useState("");
  const [isInputBaru, setIsInputBaru] = useState(false);
  const [namaBaru, setNamaBaru] = useState("");
  const [satuanBaru, setSatuanBaru] = useState("m2");
  const [koefBaru, setKoefBaru] = useState("1.0000");
  const [hargaBaru, setHargaBaru] = useState("0");
  const [wajibSurveiBaru, setWajibSurveiBaru] = useState(false);

  // Filter per kategori
  const upahItems = koefisienItems.filter((i) => i.kategori === "UPAH");
  const materialItems = koefisienItems.filter((i) => i.kategori === "MATERIAL");
  const alatItems = koefisienItems.filter((i) => i.kategori === "ALAT");
  const bongkaranItems = koefisienItems.filter(
    (i) => i.kategori === "BONGKARAN"
  );

  // Kalkulasi Subtotal per Kategori
  const calculateGroupTotals = (
    items: KoefisienDetailItem[],
    marginPercent: number
  ) => {
    const hpp = items.reduce(
      (acc, i) => acc + (Number(i.koefisien) || 0) * (Number(i.hargaAcuan) || 0),
      0
    );
    const total = hpp * (1 + marginPercent / 100);
    return { hpp, total };
  };

  const upahTotals = calculateGroupTotals(upahItems, liveMarginUpah);
  const materialTotals = calculateGroupTotals(materialItems, liveMarginMaterial);
  const alatTotals = calculateGroupTotals(alatItems, 0); // Alat tanpa margin
  const bongkaranTotals = calculateGroupTotals(
    bongkaranItems,
    liveMarginBongkaran
  );

  const grandTotalHpp =
    upahTotals.hpp +
    materialTotals.hpp +
    alatTotals.hpp +
    bongkaranTotals.hpp;

  const grandTotalAkhir =
    upahTotals.total +
    materialTotals.total +
    alatTotals.total +
    bongkaranTotals.total;

  // Handler Hapus Baris
  const handleHapusBaris = (itemIndex: number) => {
    if (!onItemsChange) return;
    const next = [...koefisienItems];
    next.splice(itemIndex, 1);
    onItemsChange(next);
  };

  // Handler Ubah Nilai Koefisien / Harga Baris
  const handleUbahNilai = (
    itemIndex: number,
    field: "koefisien" | "hargaAcuan",
    val: number
  ) => {
    if (!onItemsChange) return;
    const next = [...koefisienItems];
    next[itemIndex] = {
      ...next[itemIndex],
      [field]: val,
    };
    onItemsChange(next);
  };

  // Handler Tambah Komponen dari Modal
  const handleSimpanKomponenModal = async () => {
    if (!modalKategori || !onItemsChange) return;

    if (isInputBaru) {
      if (!namaBaru.trim()) return;
      const kVal = parseFloat(koefBaru) || 1;
      const hVal = parseFloat(hargaBaru) || 0;

      let pustakaId = "";
      if (onTambahKoefisienBaru) {
        try {
          const res = await onTambahKoefisienBaru({
            kategori: modalKategori,
            namaKomponen: namaBaru.trim(),
            satuan: satuanBaru.trim() || "unit",
            nilaiKoefisienDefault: kVal,
            hargaAcuanDefault: hVal,
            wajibSurveiToko: modalKategori === "MATERIAL" ? wajibSurveiBaru : false,
          });
          pustakaId = res?.data?.id || res?.id || "";
        } catch (e) {
          console.warn("Gagal simpan ke pustaka:", e);
        }
      }

      const newItem: KoefisienDetailItem = {
        id: pustakaId || `new_${Date.now()}`,
        masterKoefisienId: pustakaId,
        kategori: modalKategori,
        namaKomponen: namaBaru.trim(),
        satuan: satuanBaru.trim() || "unit",
        koefisien: kVal,
        hargaAcuan: hVal,
        wajibSurveiToko: modalKategori === "MATERIAL" ? wajibSurveiBaru : false,
      };

      onItemsChange([...koefisienItems, newItem]);
    } else {
      const selected = pustakaKoefisien.find((p) => p.id === selectedPustakaId);
      if (!selected) return;

      const newItem: KoefisienDetailItem = {
        id: selected.id,
        masterKoefisienId: selected.id,
        kategori: modalKategori,
        namaKomponen: selected.namaKomponen,
        satuan: selected.satuan,
        koefisien: selected.nilaiKoefisienDefault || 1,
        hargaAcuan: selected.hargaAcuanDefault || 0,
        wajibSurveiToko: selected.wajibSurveiToko,
      };

      onItemsChange([...koefisienItems, newItem]);
    }

    // Reset Modal
    setModalKategori(null);
    setSelectedPustakaId("");
    setIsInputBaru(false);
    setNamaBaru("");
    setSatuanBaru("m2");
    setKoefBaru("1.0000");
    setHargaBaru("0");
    setWajibSurveiBaru(false);
  };

  // Render Tabel Grup Komponen
  const renderGroup = (
    title: string,
    items: KoefisienDetailItem[],
    currentMargin: number,
    kategori: KategoriKoefisien
  ) => {
    if (items.length === 0 && !isEditable) return null;

    const groupHpp = items.reduce(
      (sum, it) => sum + (Number(it.koefisien) || 0) * (Number(it.hargaAcuan) || 0),
      0
    );
    const groupNominalMargin = groupHpp * (currentMargin / 100);
    const groupTotalAkhir = groupHpp + groupNominalMargin;

    return (
      <div className="mb-4 bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-2xs">
        <div className="bg-slate-100 px-3.5 py-2.5 border-b-2 border-slate-300 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {kategori !== "ALAT" && (
              onMarginChange ? (
                <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-300 px-2.5 py-0.5 rounded-lg">
                  <span className="text-[11px] font-bold text-amber-900">
                    Margin {kategori === "UPAH" ? "Upah" : kategori === "MATERIAL" ? "Material" : "Bongkaran"}:
                  </span>
                  <div className="relative w-16">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={currentMargin}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (kategori === "UPAH") {
                          onMarginChange(val, liveMarginMaterial, liveMarginBongkaran);
                        } else if (kategori === "MATERIAL") {
                          onMarginChange(liveMarginUpah, val, liveMarginBongkaran);
                        } else if (kategori === "BONGKARAN") {
                          onMarginChange(liveMarginUpah, liveMarginMaterial, val);
                        }
                      }}
                      className="w-full bg-white border border-amber-400 rounded px-1.5 py-0.5 text-xs font-bold text-amber-900 text-center pr-4 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                    <span className="absolute right-1.5 top-0.5 text-[10px] text-amber-600 font-bold">
                      %
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-700 font-mono bg-white border border-slate-300 px-2 py-0.5 rounded">
                  Margin: {currentMargin}%
                </span>
              )
            )}

            {isEditable && (
              <button
                type="button"
                onClick={() => {
                  setModalKategori(kategori);
                  setSelectedPustakaId("");
                  setIsInputBaru(false);
                  setSatuanBaru(kategori === "UPAH" ? "Oh" : "m2");
                  setWajibSurveiBaru(kategori === "MATERIAL");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border-2 border-[#005BAC] text-[#005BAC] hover:bg-[#005BAC] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah {kategori === "UPAH" ? "Upah" : kategori === "MATERIAL" ? "Material" : "Komponen"}</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-600 font-bold text-[11px] bg-slate-50">
                <th className="py-2.5 pl-3 w-10">No</th>
                <th className="py-2.5">Komponen Pekerjaan</th>
                <th className="py-2.5 w-20">Satuan</th>
                <th className="py-2.5 text-right w-28">Koefisien</th>
                <th className="py-2.5 text-right w-36">Harga Acuan</th>
                <th className="py-2.5 text-right w-32">Subtotal</th>
                <th className="py-2.5 pr-3 text-right w-36 font-extrabold text-[#005BAC]">
                  Total (+{currentMargin}%)
                </th>
                {isEditable && <th className="py-2.5 w-10 text-center pr-2">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums text-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isEditable ? 8 : 7}
                    className="py-4 text-center text-slate-400 font-sans italic"
                  >
                    Belum ada rincian komponen {title.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                items.map((item, localIdx) => {
                  const globalIdx = koefisienItems.findIndex((x) => x === item);
                  const subtotal = (Number(item.koefisien) || 0) * (Number(item.hargaAcuan) || 0);
                  const totalItem = subtotal * (1 + currentMargin / 100);

                  return (
                    <tr key={item.id || localIdx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pl-3 text-slate-500 font-sans font-semibold">
                        {localIdx + 1}
                      </td>
                      <td className="py-2.5 font-sans font-bold text-slate-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.namaKomponen}</span>
                          {item.wajibSurveiToko && (
                            <span className="text-[10px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded">
                              Disurvei BC
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-600 font-sans">{item.satuan}</td>

                      {/* Koefisien (Bisa diedit bila mode editable) */}
                      <td className="py-2 text-right">
                        {isEditable ? (
                          <input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            value={item.koefisien || ""}
                            onChange={(e) =>
                              handleUbahNilai(
                                globalIdx,
                                "koefisien",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24 text-right px-2 py-1 bg-white border-2 border-slate-300 rounded font-bold text-slate-900 focus:border-[#005BAC] outline-none"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">
                            {formatKoefisien(item.koefisien)}
                          </span>
                        )}
                      </td>

                      {/* Harga Acuan */}
                      <td className="py-2 text-right text-slate-700">
                        {isEditable && !item.wajibSurveiToko ? (
                          <input
                            type="number"
                            step="500"
                            min="0"
                            value={item.hargaAcuan || ""}
                            onChange={(e) =>
                              handleUbahNilai(
                                globalIdx,
                                "hargaAcuan",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-28 text-right px-2 py-1 bg-white border-2 border-slate-300 rounded font-bold text-slate-900 focus:border-[#005BAC] outline-none"
                          />
                        ) : (
                          <span>{formatRupiah(item.hargaAcuan)}</span>
                        )}
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 text-right text-slate-700 font-semibold">
                        {formatRupiah(subtotal)}
                      </td>

                      {/* Total (+Margin) */}
                      <td className="py-2.5 pr-3 text-right font-black text-slate-900">
                        {formatRupiah(totalItem)}
                      </td>

                      {/* Tombol Hapus */}
                      {isEditable && (
                        <td className="py-2 text-center pr-2">
                          <button
                            type="button"
                            title="Hapus komponen"
                            onClick={() => handleHapusBaris(globalIdx)}
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
        <div className="bg-slate-50 border-t-2 border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-4">
            <span>Dasar: <strong className="text-slate-900">{formatRupiah(groupHpp)}</strong></span>
            {currentMargin > 0 && (
              <span>Margin ({currentMargin}%): <strong className="text-amber-800">{formatRupiah(groupNominalMargin)}</strong></span>
            )}
          </div>
          <div className="font-bold text-slate-900">
            Total {kategori === "UPAH" ? "Upah" : kategori === "MATERIAL" ? "Material" : kategori === "ALAT" ? "Alat" : "Bongkaran"}:{" "}
            <span className="text-[#005BAC] font-black">{formatRupiah(groupTotalAkhir)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border-2 border-slate-300 shadow-2xs overflow-hidden",
        className
      )}
    >
      {/* Header Card */}
      <div className="bg-slate-50 border-b-2 border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#005BAC] text-white flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
              Rincian AHSP &amp; Live Margin
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Kalkulasi otomatis harga satuan standar berbasis koefisien resep
            </p>
          </div>
        </div>

        {isEditable && (
          <span className="text-xs font-bold text-white bg-[#005BAC] px-2.5 py-1 rounded-md">
            Mode Editor Koefisien
          </span>
        )}
      </div>

      {/* Rincian Grup Tabel Komponen */}
      <div className="p-4 space-y-2">
        {renderGroup("A. Tenaga Kerja (Upah)", upahItems, liveMarginUpah, "UPAH")}
        {renderGroup(
          "B. Bahan / Material",
          materialItems,
          liveMarginMaterial,
          "MATERIAL"
        )}
        {renderGroup("C. Peralatan Kerja (Alat)", alatItems, 0, "ALAT")}
        {renderGroup(
          "D. Pekerjaan Bongkaran",
          bongkaranItems,
          liveMarginBongkaran,
          "BONGKARAN"
        )}

        {/* Ringkasan Total Akhir AHSP */}
        <div className="mt-4 pt-3 border-t-2 border-slate-300 bg-slate-50 p-4 rounded-xl border-2 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-xs text-slate-600 font-bold block">
              Total HPP Murni (Sebelum Margin):
            </span>
            <span className="font-mono text-base font-bold text-slate-800">
              {formatRupiah(grandTotalHpp)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wide block">
              Total Harga Satuan (+Margin):
            </span>
            <span className="font-mono text-2xl font-black text-[#005BAC] tabular-nums">
              {formatRupiah(grandTotalAkhir)}
            </span>
          </div>
        </div>
      </div>

      {/* Modal Sederhana Tambah Komponen Baru / Pilih dari Pustaka */}
      {modalKategori && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
              <h4 className="text-sm font-black text-slate-900 uppercase">
                Tambah Komponen {modalKategori}
              </h4>
              <button
                type="button"
                onClick={() => setModalKategori(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Toggle Pilih dari Pustaka vs Input Baru */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsInputBaru(false)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border-2 cursor-pointer ${
                  !isInputBaru
                    ? "bg-[#005BAC] border-[#005BAC] text-white"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
              >
                Pilih dari Pustaka
              </button>
              <button
                type="button"
                onClick={() => setIsInputBaru(true)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border-2 cursor-pointer ${
                  isInputBaru
                    ? "bg-[#005BAC] border-[#005BAC] text-white"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
              >
                Ketik Komponen Baru
              </button>
            </div>

            {!isInputBaru ? (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilih Komponen:
                </label>
                <select
                  value={selectedPustakaId}
                  onChange={(e) => setSelectedPustakaId(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#005BAC]"
                >
                  <option value="">-- Pilih dari Pustaka Standar --</option>
                  {pustakaKoefisien
                    .filter((p) => p.kategori === modalKategori)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.namaKomponen} ({p.satuan}) {p.hargaAcuanDefault ? `- ${formatRupiah(p.hargaAcuanDefault)}` : ""}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Komponen akan otomatis dimuat dengan nilai koefisien dan harga acuan standar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Komponen:
                  </label>
                  <input
                    type="text"
                    value={namaBaru}
                    onChange={(e) => setNamaBaru(e.target.value)}
                    placeholder="Contoh: Semen Portland, Mandor..."
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Satuan:
                    </label>
                    <input
                      type="text"
                      value={satuanBaru}
                      onChange={(e) => setSatuanBaru(e.target.value)}
                      placeholder="Oh, m2, kg..."
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#005BAC]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Koefisien Acuan:
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={koefBaru}
                      onChange={(e) => setKoefBaru(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-[#005BAC]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Harga Acuan Awal (Rp):
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={hargaBaru}
                    onChange={(e) => setHargaBaru(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-[#005BAC]"
                  />
                </div>

                {modalKategori === "MATERIAL" && (
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={wajibSurveiBaru}
                      onChange={(e) => setWajibSurveiBaru(e.target.checked)}
                      className="rounded border-slate-300 accent-[#005BAC]"
                    />
                    <span>Wajib disurvei oleh Building Coordinator di cabang</span>
                  </label>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={() => setModalKategori(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border-2 border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!isInputBaru && !selectedPustakaId}
                onClick={handleSimpanKomponenModal}
                className="px-4 py-2 text-xs font-bold text-white bg-[#005BAC] rounded-xl hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                Tambahkan ke Resep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
