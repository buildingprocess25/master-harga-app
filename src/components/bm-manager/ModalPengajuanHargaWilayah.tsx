"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MapPin,
  Package,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { hitungAhsp } from "@/lib/kalkulasi-ahsp";
import {
  hitungSelisihTerhadapInduk,
  isKomponenHargaEditableWilayah,
  makeThreeStores,
  type StoreSurveiWilayahInput,
} from "@/lib/wilayah-ahsp";
import { cn, formatRupiah } from "@/lib/utils";
import type { KategoriKoefisien } from "@/types";

interface KomponenTemplate {
  id: string;
  masterKoefisienId: string;
  kategori: KategoriKoefisien;
  namaKomponen: string;
  satuan: string;
  nilaiKoefisien: number;
  hargaAcuanSatuan: number;
  marginPersen: number;
  surveiTokoAwal?: StoreSurveiWilayahInput[];
}

interface WilayahOpsi {
  id: string;
  kodeWilayah: string;
  namaWilayah: string;
  hargaAktifSekarang: number | null;
  tiketAktifNomor: string | null;
  sedangDiproses: boolean;
  tiketProsesNomor: string | null;
}

interface TemplateWilayahData {
  item: {
    id: string;
    kodeItem: string;
    kodeMaster: string;
    namaItem: string;
    kategori: string;
    satuan: string;
    spesifikasi: string;
  };
  cabang: { id: string; kodeCabang: string; namaCabang: string };
  divisi: { id: string; kodeDivisi: string; namaDivisi: string };
  hargaFinalInduk: number;
  marginTotalPersen: number;
  nomorTiketInduk: string | null;
  komponenInduk: KomponenTemplate[];
  masterTokoList: Array<{ id: string; namaToko: string; alamat: string }>;
  wilayahOpsi: WilayahOpsi[];
  revisi: {
    id: string;
    nomorTiket: string;
    wilayahCabangId: string;
    catatanReview: string;
  } | null;
}

export interface ModalPengajuanHargaWilayahProps {
  isOpen: boolean;
  masterItemId: string;
  divisiId: string;
  tiketRevisiId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalPengajuanHargaWilayah({
  isOpen,
  masterItemId,
  divisiId,
  tiketRevisiId = null,
  onClose,
  onSuccess,
}: ModalPengajuanHargaWilayahProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [data, setData] = useState<TemplateWilayahData | null>(null);
  const [wilayahCabangId, setWilayahCabangId] = useState("");
  const [surveiMap, setSurveiMap] = useState<Record<string, StoreSurveiWilayahInput[]>>({});
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [alasan, setAlasan] = useState("");

  useEffect(() => {
    if (!isOpen || !masterItemId || !divisiId) return;
    let active = true;
    setLoading(true);
    setErrorText("");
    setData(null);

    const qs = new URLSearchParams({ masterItemId, divisiId });
    if (tiketRevisiId) qs.set("tiketRevisiId", tiketRevisiId);

    fetch(`/api/pengajuan/wilayah?${qs.toString()}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat data pengajuan harga wilayah.");
        }
        if (!active) return;
        const tpl: TemplateWilayahData = json.data;
        setData(tpl);

        const editable = tpl.komponenInduk.filter((k) =>
          isKomponenHargaEditableWilayah(k.kategori)
        );
        const initSurvei: Record<string, StoreSurveiWilayahInput[]> = {};
        for (const k of editable) {
          initSurvei[k.id] = makeThreeStores(k.surveiTokoAwal);
        }
        setSurveiMap(initSurvei);
        setOpenAccordions(editable.length > 0 ? [editable[0].id] : []);

        if (tpl.revisi?.wilayahCabangId) {
          setWilayahCabangId(tpl.revisi.wilayahCabangId);
          setAlasan(tpl.revisi.catatanReview || "");
        } else {
          const tersedia = tpl.wilayahOpsi.find((w) => !w.sedangDiproses);
          setWilayahCabangId(tersedia?.id ?? "");
          setAlasan("");
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setErrorText(err?.message || "Gagal memuat data pengajuan harga wilayah.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, masterItemId, divisiId, tiketRevisiId]);

  const editableKomponen = useMemo(
    () => (data?.komponenInduk ?? []).filter((k) => isKomponenHargaEditableWilayah(k.kategori)),
    [data]
  );

  const readonlyKomponen = useMemo(
    () => (data?.komponenInduk ?? []).filter((k) => !isKomponenHargaEditableWilayah(k.kategori)),
    [data]
  );

  const rataRataPerKomponen = (kompId: string) => {
    const stores = surveiMap[kompId] ?? [];
    const valid = stores.filter((s) => Number(s.hargaSatuan) > 0);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, s) => acc + Number(s.hargaSatuan), 0);
    return Math.round(sum / valid.length);
  };

  const estimasi = useMemo(() => {
    if (!data || data.komponenInduk.length === 0) return null;
    const marginFallback = data.marginTotalPersen || 8;
    const ambilMargin = (kat: KategoriKoefisien) =>
      data.komponenInduk.find((k) => k.kategori === kat)?.marginPersen ?? marginFallback;

    const kalk = hitungAhsp(
      data.komponenInduk.map((k) => ({
        kategori: k.kategori,
        koefisien: k.nilaiKoefisien,
        hargaAcuan: isKomponenHargaEditableWilayah(k.kategori)
          ? rataRataPerKomponen(k.id)
          : k.hargaAcuanSatuan,
      })),
      {
        upah: ambilMargin("UPAH"),
        material: ambilMargin("MATERIAL") ?? ambilMargin("ALAT"),
        bongkaran: ambilMargin("BONGKARAN"),
      }
    );

    const selisih = hitungSelisihTerhadapInduk(kalk.hargaFinal, data.hargaFinalInduk);
    return { ...kalk, ...selisih };
  }, [data, surveiMap]);

  const selectedWilayah = useMemo(
    () => data?.wilayahOpsi.find((w) => w.id === wilayahCabangId) ?? null,
    [data, wilayahCabangId]
  );

  const handleChangeToko = (kompId: string, storeIdx: number, updated: any) => {
    setSurveiMap((prev) => {
      const current = [...(prev[kompId] ?? makeThreeStores())];
      current[storeIdx] = {
        ...updated,
        noToko: storeIdx + 1,
        hargaSatuan: Number(updated?.hargaSatuan ?? updated?.harga) || 0,
      };
      return { ...prev, [kompId]: current };
    });
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setErrorText("");

    if (!wilayahCabangId) {
      setErrorText("Silakan pilih 1 wilayah terlebih dahulu.");
      return;
    }

    for (const k of editableKomponen) {
      const stores = surveiMap[k.id] ?? [];
      const valid = stores.filter(
        (s) => Boolean(s.namaToko?.trim()) && Number(s.hargaSatuan) > 0
      );
      if (valid.length < 3) {
        setErrorText(`Lengkapi 3 toko dan harga > 0 untuk komponen "${k.namaKomponen}".`);
        setOpenAccordions((prev) => (prev.includes(k.id) ? prev : [...prev, k.id]));
        return;
      }
    }

    const confirm = await Swal.fire({
      title: tiketRevisiId ? "Kirim Ulang ke Approval S&B?" : "Ajukan Harga Wilayah?",
      text: `${selectedWilayah?.namaWilayah || "Wilayah"} — ${formatRupiah(estimasi?.hargaFinal ?? 0)} / ${data.item.satuan}. Tiket langsung masuk ke Approval S&B Specialist.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#475569",
      confirmButtonText: "Ya, Ajukan ke S&B",
      cancelButtonText: "Batal",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/pengajuan/wilayah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterItemId,
          divisiId,
          wilayahCabangId,
          tiketRevisiId,
          alasan,
          hargaKomponen: editableKomponen.map((k) => ({
            rincianId: k.id,
            masterKoefisienId: k.masterKoefisienId,
            surveyToko: surveiMap[k.id] ?? [],
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengajukan harga wilayah.");
      }

      await Swal.fire({
        icon: "success",
        title: "Pengajuan Terkirim",
        text: json.message,
        confirmButtonColor: "#005BAC",
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorText(err?.message || "Gagal mengirim pengajuan harga wilayah.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-start justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xl max-w-5xl w-full my-6 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 truncate">
                {tiketRevisiId ? "Revisi Harga Wilayah" : "Ajukan Harga Wilayah"}
              </h2>
              <p className="text-xs text-slate-600 font-medium truncate">
                {data
                  ? `${data.item.namaItem} · ${data.divisi.namaDivisi}`
                  : "Memuat komponen pengajuan harga wilayah..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
            aria-label="Tutup modal pengajuan wilayah"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-[#005BAC]" />
            <span>Memuat komponen &amp; daftar toko...</span>
          </div>
        ) : !data ? (
          <div className="p-6 space-y-3 text-center">
            <p className="text-xs font-bold text-rose-700">{errorText || "Data tidak ditemukan."}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto bg-slate-50">
              {/* Info Cabang & Pilih Wilayah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border-2 border-slate-300 rounded-xl p-3.5">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Harga Induk ({data.cabang.namaCabang})
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-lg font-black font-mono text-[#005BAC]">
                      {formatRupiah(data.hargaFinalInduk)}
                    </span>
                    <span className="text-xs text-slate-600 font-semibold">
                      / {data.item.satuan}
                    </span>
                  </div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-[#005BAC] text-white text-[10px] font-bold">
                    {data.divisi.namaDivisi}
                  </span>
                </div>

                <div className="bg-white border-2 border-slate-300 rounded-xl p-3.5">
                  <label
                    htmlFor="wilayah-target"
                    className="block text-[11px] font-bold uppercase text-slate-700 mb-1.5"
                  >
                    Pilih 1 Wilayah
                  </label>
                  <select
                    id="wilayah-target"
                    value={wilayahCabangId}
                    disabled={Boolean(tiketRevisiId)}
                    onChange={(e) => setWilayahCabangId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-[#005BAC] disabled:bg-slate-100"
                  >
                    <option value="">-- Pilih Wilayah --</option>
                    {data.wilayahOpsi.map((w) => (
                      <option key={w.id} value={w.id} disabled={w.sedangDiproses}>
                        {w.namaWilayah}
                        {w.sedangDiproses
                          ? ` (Proses: ${w.tiketProsesNomor})`
                          : w.hargaAktifSekarang !== null
                            ? ` (Aktif: ${formatRupiah(w.hargaAktifSekarang)})`
                            : ""}
                      </option>
                    ))}
                  </select>
                  {selectedWilayah?.hargaAktifSekarang !== null &&
                    selectedWilayah?.hargaAktifSekarang !== undefined && (
                      <p className="text-[11px] font-semibold text-amber-800 mt-1">
                        Harga wilayah aktif saat ini: {formatRupiah(selectedWilayah.hargaAktifSekarang)}
                      </p>
                    )}
                </div>
              </div>

              {data.komponenInduk.length === 0 ? (
                <div className="bg-white border-2 border-rose-600 rounded-xl p-4 text-xs font-bold text-rose-700">
                  Resep AHSP belum tersedia untuk item dan divisi ini.
                </div>
              ) : (
                <>
                  {/* Accordion Form 3 Toko per Komponen Bahan & Peralatan */}
                  {editableKomponen.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-[#005BAC]" />
                          <span>Input Harga Bahan &amp; Peralatan (3 Toko)</span>
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenAccordions(editableKomponen.map((k) => k.id))}
                            className="text-xs text-[#005BAC] hover:underline font-bold cursor-pointer"
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

                      {editableKomponen.map((k, idx) => {
                        const stores = surveiMap[k.id] ?? makeThreeStores();
                        const validCount = stores.filter(
                          (s) => Boolean(s.namaToko?.trim()) && Number(s.hargaSatuan) > 0
                        ).length;
                        const isComplete = validCount === 3;
                        const rataRata = rataRataPerKomponen(k.id);
                        const subtotal = Math.round(rataRata * k.nilaiKoefisien);
                        const isOpen = openAccordions.includes(k.id);

                        return (
                          <div
                            key={k.id}
                            className="border-2 border-slate-300 rounded-2xl bg-white overflow-hidden shadow-2xs"
                          >
                            <div
                              onClick={() => toggleAccordion(k.id)}
                              className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs flex items-center justify-center font-black shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-black text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-black text-white uppercase",
                                        k.kategori === "ALAT" ? "bg-indigo-600" : "bg-emerald-600"
                                      )}
                                    >
                                      {k.kategori === "ALAT" ? "Peralatan" : "Bahan"}
                                    </span>
                                    <span>{k.namaKomponen}</span>
                                    {isComplete ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>3/3 Toko Valid</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded-full">
                                        {validCount}/3 Toko Terisi
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-600 font-mono mt-0.5 font-semibold">
                                    Koefisien: {k.nilaiKoefisien} {k.satuan} &middot; Margin{" "}
                                    {k.marginPersen}%
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-right shrink-0">
                                <div>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                                    Rata-Rata 3 Toko
                                  </span>
                                  <span className="font-mono font-bold text-[#005BAC] text-xs sm:text-sm">
                                    {formatRupiah(rataRata)} / {k.satuan}
                                  </span>
                                </div>
                                <div className="border-l-2 border-slate-200 pl-3">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                                    Subtotal
                                  </span>
                                  <span className="font-mono font-black text-emerald-700 text-xs sm:text-sm">
                                    {formatRupiah(subtotal)}
                                  </span>
                                </div>
                                <ChevronDown
                                  className={cn(
                                    "w-5 h-5 text-slate-400 transition-transform",
                                    isOpen && "rotate-180"
                                  )}
                                />
                              </div>
                            </div>

                            {isOpen && (
                              <div className="p-4 border-t-2 border-slate-200 bg-slate-50">
                                <RincianSurvei3TokoCard
                                  mode="edit"
                                  hideHeader={true}
                                  compact={true}
                                  surveyToko={stores}
                                  satuan={k.satuan}
                                  materialName={k.namaKomponen}
                                  masterTokoList={data.masterTokoList}
                                  onChangeToko={(storeIdx, updated) =>
                                    handleChangeToko(k.id, storeIdx, updated)
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tenaga Kerja */}
                  {readonlyKomponen.length > 0 && (
                    <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-slate-100 border-b-2 border-slate-200 text-[11px] font-black uppercase text-slate-700">
                        Tenaga Kerja &amp; Lainnya
                      </div>
                      <div className="divide-y divide-slate-100">
                        {readonlyKomponen.map((k) => (
                          <div
                            key={k.id}
                            className="px-4 py-2.5 flex items-center justify-between text-xs gap-3"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{k.namaKomponen}</span>
                              <span className="text-[11px] text-slate-500 ml-2 font-mono">
                                ({k.nilaiKoefisien} {k.satuan})
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-700 whitespace-nowrap">
                              {formatRupiah(k.hargaAcuanSatuan)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ringkasan Total & Selisih */}
                  {estimasi && (
                    <div className="bg-white border-2 border-[#005BAC] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-slate-500 block">
                          Estimasi Harga Wilayah
                        </span>
                        <span className="text-2xl font-black font-mono text-[#005BAC]">
                          {formatRupiah(estimasi.hargaFinal)}
                        </span>
                        <span className="text-xs text-slate-600 font-semibold ml-1.5">
                          / {data.item.satuan}
                        </span>
                        <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">
                          HPP {formatRupiah(Math.round(estimasi.hpp))} &middot; Margin efektif{" "}
                          {estimasi.marginEfektif}%
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-bold uppercase text-slate-500 block">
                          Selisih dari Induk
                        </span>
                        <span
                          className={cn(
                            "text-sm font-mono font-black",
                            estimasi.selisihRp > 0
                              ? "text-[#990F14]"
                              : estimasi.selisihRp < 0
                                ? "text-emerald-700"
                                : "text-slate-600"
                          )}
                        >
                          {estimasi.selisihRp > 0 ? "+" : estimasi.selisihRp < 0 ? "-" : ""}
                          {formatRupiah(Math.abs(estimasi.selisihRp))} (
                          {estimasi.selisihRp > 0 ? "+" : estimasi.selisihRp < 0 ? "-" : ""}
                          {Math.abs(estimasi.selisihPersen).toLocaleString("id-ID", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Alasan Penyesuaian */}
              <div className="bg-white border-2 border-slate-300 rounded-xl p-3.5">
                <label
                  htmlFor="alasan-wilayah"
                  className="block text-xs font-bold text-slate-800 mb-1.5"
                >
                  Alasan Penyesuaian Harga Wilayah (Opsional)
                </label>
                <textarea
                  id="alasan-wilayah"
                  rows={2}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Contoh: Selisih harga material & pengiriman area wilayah..."
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#005BAC]"
                />
              </div>

              {errorText && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-600 text-white text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorText}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-white border-t-2 border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !wilayahCabangId || data.komponenInduk.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#005BAC] hover:bg-[#004585] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Ajukan ke Approval S&amp;B</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
