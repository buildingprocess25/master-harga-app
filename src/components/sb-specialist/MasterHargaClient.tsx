"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Select from "react-select";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Eye,
  Loader2,
  MapPin,
  Power,
  Search,
  Tag,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import type {
  BarisMasterHargaPerItem,
  DaftarHargaCabangPerItem,
  DetailHargaRilis,
  SlotHargaCabangSnb,
} from "@/lib/services/master-harga-service";
import { setStatusHargaCabangAction } from "@/app/sb-specialist/actions";
import { DetailHargaRilisContent } from "@/components/katalog/DetailHargaRilisContent";
import {
  solidFilterSelectStyles,
  type SimpleSelectOption,
} from "@/lib/client/select-styles";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

function Selisih({ rp, persen }: { rp: number; persen: number }) {
  const naik = rp > 0;
  const tanda = naik ? "+" : rp < 0 ? "-" : "";
  return (
    <span
      className={cn(
        "font-mono tabular-nums font-bold",
        naik
          ? "text-[#990F14]"
          : rp < 0
            ? "text-emerald-700"
            : "text-slate-500"
      )}
    >
      {tanda}
      {formatRupiah(Math.abs(rp))}
      <span className="block text-[11px] font-semibold">
        ({tanda}
        {Math.abs(persen).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        %)
      </span>
    </span>
  );
}

export interface ModalFilterAwal {
  cabangId: string;
  divisiId: string;
  hanyaOverride: boolean;
}

export function MasterHargaClient({
  rows,
  nomorAwal = 1,
  opsiCabang,
  opsiDivisi,
  initialModalFilter,
  readonly = false,
}: {
  rows: BarisMasterHargaPerItem[];
  nomorAwal?: number;
  opsiCabang: Array<{ id: string; namaCabang: string }>;
  opsiDivisi: Array<{ id: string; namaDivisi: string }>;
  initialModalFilter: ModalFilterAwal;
  readonly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // State Modal 1: Daftar Harga per Cabang & Wilayah (On-Demand per Item)
  const [activeItem, setActiveItem] = useState<BarisMasterHargaPerItem | null>(null);
  const [modalQ, setModalQ] = useState("");
  const [debouncedModalQ, setDebouncedModalQ] = useState("");
  const [modalCabangId, setModalCabangId] = useState("");
  const [modalDivisiId, setModalDivisiId] = useState("");
  const [modalOverride, setModalOverride] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalData, setModalData] = useState<DaftarHargaCabangPerItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalRefreshTick, setModalRefreshTick] = useState(0);
  const [expandedWilayahSlots, setExpandedWilayahSlots] = useState<Record<string, boolean>>({});

  // State Drill-Down Rincian AHSP & Survei 3 Toko (di dalam modal yang sama)
  const [detail, setDetail] = useState<DetailHargaRilis | null>(null);
  const [loadingRincianId, setLoadingRincianId] = useState<string | null>(null);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedModalQ(modalQ.trim()), 300);
    return () => clearTimeout(t);
  }, [modalQ]);

  const bukaModalCabang = (item: BarisMasterHargaPerItem) => {
    setActiveItem(item);
    setDetail(null);
    setModalQ("");
    setDebouncedModalQ("");
    setModalCabangId(initialModalFilter.cabangId);
    setModalDivisiId(initialModalFilter.divisiId);
    setModalOverride(initialModalFilter.hanyaOverride);
    setModalPage(1);
    setModalError("");
    setModalData(null);
    setExpandedWilayahSlots({});
  };

  const tutupModalCabang = () => {
    setActiveItem(null);
    setDetail(null);
    setModalData(null);
    setModalError("");
  };

  const kembaliKeDaftarCabang = () => {
    setDetail(null);
    requestAnimationFrame(() => modalBodyRef.current?.scrollTo({ top: 0 }));
  };

  const resetFilterModal = () => {
    setModalQ("");
    setDebouncedModalQ("");
    setModalCabangId("");
    setModalDivisiId("");
    setModalOverride(false);
    setModalPage(1);
  };

  useEffect(() => {
    if (!activeItem) return;
    const controller = new AbortController();
    setModalLoading(true);
    setModalError("");

    const params = new URLSearchParams();
    if (debouncedModalQ) params.set("q", debouncedModalQ);
    if (modalCabangId) params.set("cabangId", modalCabangId);
    if (modalDivisiId) params.set("divisiId", modalDivisiId);
    if (modalOverride) params.set("override", "1");
    params.set("page", String(modalPage));
    params.set("pageSize", "15");

    fetch(`/api/sb-specialist/master-harga/item/${activeItem.id}?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat data cabang.");
        }
        setModalData(json.data);
      })
      .catch((err: any) => {
        if (err?.name === "AbortError") return;
        setModalError(err?.message || "Gagal memuat daftar harga cabang.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setModalLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    activeItem,
    debouncedModalQ,
    modalCabangId,
    modalDivisiId,
    modalOverride,
    modalPage,
    modalRefreshTick,
  ]);

  const bukaRincianDariUrl = async (url: string, loadingKey: string) => {
    try {
      setLoadingRincianId(loadingKey);
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        Swal.fire({
          icon: "error",
          title: "Gagal Memuat Rincian",
          text: json.message || "Data master harga tidak ditemukan.",
          confirmButtonColor: "#005BAC",
        });
        return;
      }
      setDetail(json.data);
      requestAnimationFrame(() => modalBodyRef.current?.scrollTo({ top: 0 }));
    } catch {
      Swal.fire({
        icon: "error",
        title: "Kendala Koneksi",
        text: "Gagal memuat rincian master harga.",
        confirmButtonColor: "#005BAC",
      });
    } finally {
      setLoadingRincianId(null);
    }
  };

  const bukaRincian = (hargaCabangId: string) =>
    bukaRincianDariUrl(`/api/sb-specialist/master-harga/${hargaCabangId}`, hargaCabangId);

  const bukaRincianWilayah = (hargaWilayahId: string) =>
    bukaRincianDariUrl(
      `/api/sb-specialist/master-harga/wilayah/${hargaWilayahId}`,
      hargaWilayahId
    );

  const toggleStatus = async (slot: SlotHargaCabangSnb, namaItem: string, aktif: boolean) => {
    if (readonly) return;
    const confirm = await Swal.fire({
      title: aktif
        ? `Aktifkan "${namaItem}"?`
        : `Nonaktifkan "${namaItem}" di ${slot.namaCabang} (${slot.namaDivisi})?`,
      text: aktif
        ? "Harga akan kembali aktif."
        : "Harga pada cabang dan divisi ini akan dinonaktifkan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: aktif ? "#059669" : "#ED1C24",
      cancelButtonColor: "#64748b",
      confirmButtonText: aktif ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
      cancelButtonText: "Batal",
    });
    if (!confirm.isConfirmed) return;

    startTransition(async () => {
      const hasil = await setStatusHargaCabangAction({ id: slot.id, aktif });
      await Swal.fire({
        icon: hasil.success ? "success" : "error",
        title: hasil.success ? "Berhasil" : "Gagal",
        text: hasil.message,
        confirmButtonColor: "#005BAC",
      });
      if (hasil.success) {
        setDetail(null);
        setModalRefreshTick((n) => n + 1);
        router.refresh();
      }
    });
  };

  const adaFilterModal = Boolean(
    modalQ.trim() || modalCabangId || modalDivisiId || modalOverride
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200">
            <tr>
              <th className="py-3 pl-4 pr-2 w-10">No</th>
              <th className="py-3 px-2 w-24">Kelompok</th>
              <th className="py-3 px-2">Item Pekerjaan &amp; Spesifikasi</th>
              <th className="py-3 px-2">Kategori</th>
              <th className="py-3 px-2 min-w-44">Cakupan</th>
              <th className="py-3 px-2 text-right whitespace-nowrap">Rentang Harga</th>
              <th className="py-3 pl-2 pr-4 text-center w-36">Rincian</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-200 bg-white">
            {rows.map((r, i) => (
              <tr
                key={r.id}
                onClick={() => bukaModalCabang(r)}
                className="align-top cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <td className="py-3.5 pl-4 pr-2 text-slate-500 font-mono font-bold">
                  {nomorAwal + i}
                </td>
                <td className="py-3.5 px-2 whitespace-nowrap">
                  <span
                    className={cn(
                      "inline-block px-2.5 py-0.5 rounded text-[11px] font-black text-white uppercase",
                      r.kelompokKode === "ME" ? "bg-[#005BAC]" : "bg-slate-800"
                    )}
                  >
                    {r.kelompokKode}
                  </span>
                  <div className="font-mono text-[11px] font-bold text-slate-600 mt-1">
                    {r.kodeItem}
                  </div>
                </td>
                <td className="py-3.5 px-2 min-w-56">
                  <div className="font-bold text-slate-900">{r.namaItem}</div>
                  <div className="font-mono text-[11px] font-semibold text-slate-500">
                    {r.kodeMaster}
                  </div>
                  {r.spesifikasi && (
                    <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                      {r.spesifikasi}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    Lokasi: {r.lokasi} &middot; Satuan: {r.satuan}
                  </div>
                </td>
                <td className="py-3.5 px-2 min-w-32">
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold">
                    {r.kategori}
                  </span>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    {r.namaDivisiUtama}
                  </div>
                </td>
                <td className="py-3.5 px-2 min-w-44">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black">
                      <Building2 className="w-3 h-3" />
                      {r.totalCabangUnik} Cabang
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold">
                      {r.totalSlotAktif} Slot Divisi
                    </span>
                    {r.totalWilayah > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                        <MapPin className="w-3 h-3" />
                        {r.totalWilayah} Wilayah
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-2 text-right whitespace-nowrap">
                  <div className="font-mono tabular-nums font-black text-slate-900 text-sm">
                    {r.minHarga === r.maxHarga
                      ? formatRupiah(r.minHarga)
                      : `${formatRupiah(r.minHarga)} – ${formatRupiah(r.maxHarga)}`}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    per {r.satuan}
                  </div>
                </td>
                <td className="py-3.5 pl-2 pr-4 text-center whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      bukaModalCabang(r);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Harga</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Daftar Harga Cabang & Drill-Down Rincian AHSP (Portal ke document.body) */}
      {activeItem &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-slate-900/60 flex items-start justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xl max-w-5xl w-full my-6 overflow-hidden">
              {/* Header Modal (Daftar Cabang vs Drill-Down Rincian) */}
              {detail ? (
                <div className="px-5 py-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={kembaliKeDaftarCabang}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali</span>
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-black text-slate-900 truncate">
                          {detail.item.namaItem}
                        </h2>
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase shrink-0">
                          RILIS AKTIF
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium truncate">
                        {detail.item.kodeMaster} &middot; {detail.item.namaCabang} &middot;{" "}
                        {detail.item.namaDivisi} &middot; Berlaku sejak{" "}
                        {formatTanggal(detail.berlakuSejak)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={tutupModalCabang}
                    className="p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
                    aria-label="Tutup modal rincian"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#005BAC] text-white flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black text-white uppercase",
                              activeItem.kelompokKode === "ME" ? "bg-[#005BAC]" : "bg-slate-800"
                            )}
                          >
                            {activeItem.kelompokKode}
                          </span>
                          <h2 className="text-sm font-black text-slate-900 truncate">
                            {activeItem.namaItem}
                          </h2>
                        </div>
                        <p className="text-xs text-slate-600 font-medium truncate">
                          {activeItem.kodeMaster} &middot; {activeItem.kategori} &middot; Satuan{" "}
                          {activeItem.satuan}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={tutupModalCabang}
                      className="p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
                      aria-label="Tutup modal cabang"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Filter Bar Modal */}
                  <div className="px-5 py-3 bg-white border-b-2 border-slate-200 flex flex-wrap items-center gap-2.5">
                    <div className="relative flex-1 min-w-48">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={modalQ}
                        onChange={(e) => {
                          setModalQ(e.target.value);
                          setModalPage(1);
                        }}
                        placeholder="Cari nama/kode cabang atau wilayah..."
                        aria-label="Cari cabang atau wilayah"
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border-2 border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-[#005BAC]"
                      />
                    </div>

                    <div className="w-52">
                      <Select<SimpleSelectOption, false>
                        instanceId="modal-cabang-select"
                        aria-label="Filter cabang di modal"
                        styles={solidFilterSelectStyles}
                        options={(modalData?.cabangOpsiItem ?? opsiCabang).map((c) => ({
                          value: c.id,
                          label: c.namaCabang,
                        }))}
                        value={
                          modalCabangId
                            ? (modalData?.cabangOpsiItem ?? opsiCabang)
                                .filter((c) => c.id === modalCabangId)
                                .map((c) => ({ value: c.id, label: c.namaCabang }))[0] ?? null
                            : null
                        }
                        onChange={(opt) => {
                          setModalCabangId(opt ? opt.value : "");
                          setModalPage(1);
                        }}
                        placeholder="Semua cabang"
                        noOptionsMessage={() => "Cabang tidak ditemukan"}
                        isClearable
                        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                      />
                    </div>

                    <select
                      aria-label="Filter divisi di modal"
                      value={modalDivisiId}
                      onChange={(e) => {
                        setModalDivisiId(e.target.value);
                        setModalPage(1);
                      }}
                      className="px-3 py-1.5 rounded-xl border-2 border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-[#005BAC]"
                    >
                      <option value="">Semua divisi</option>
                      {opsiDivisi.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.namaDivisi}
                        </option>
                      ))}
                    </select>

                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none px-2.5 py-1.5 rounded-xl border-2 border-slate-300 bg-white hover:border-slate-400">
                      <input
                        type="checkbox"
                        checked={modalOverride}
                        onChange={(e) => {
                          setModalOverride(e.target.checked);
                          setModalPage(1);
                        }}
                        className="accent-[#005BAC] w-3.5 h-3.5"
                      />
                      Hanya ada harga wilayah
                    </label>

                    {adaFilterModal && (
                      <button
                        type="button"
                        onClick={resetFilterModal}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-[#005BAC] bg-white text-xs font-bold text-[#005BAC] hover:bg-[#005BAC] hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Semua Cabang</span>
                      </button>
                    )}
                  </div>

                  {/* Ringkasan Filter Modal */}
                  {modalData && (
                    <div className="px-5 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-700">
                      <span>
                        {modalData.totalCabang} Cabang &middot; {modalData.totalSlot} Slot Divisi &middot;{" "}
                        {modalData.totalWilayah} Harga Wilayah
                      </span>
                      {modalLoading && (
                        <span className="inline-flex items-center gap-1 text-[#005BAC]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Memperbarui...
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Body Modal */}
              <div
                ref={modalBodyRef}
                className="p-5 space-y-4 max-h-[68vh] overflow-y-auto bg-slate-50"
              >
                {detail ? (
                  <DetailHargaRilisContent
                    detail={detail}
                    onSelectWilayah={bukaRincianWilayah}
                    loadingWilayahId={loadingRincianId}
                  />
                ) : modalLoading && !modalData ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-[#005BAC]" />
                  <span>Memuat harga per cabang...</span>
                </div>
              ) : modalError ? (
                <div className="py-10 text-center space-y-2 bg-white border-2 border-rose-600 rounded-xl p-4">
                  <p className="text-xs font-bold text-rose-700">{modalError}</p>
                  <button
                    type="button"
                    onClick={() => setModalRefreshTick((n) => n + 1)}
                    className="px-4 py-1.5 rounded-lg bg-[#005BAC] text-white text-xs font-bold cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : !modalData || modalData.cabangGroups.length === 0 ? (
                <div className="py-12 text-center bg-white border-2 border-slate-300 rounded-xl">
                  <p className="text-xs font-bold text-slate-800">
                    Tidak ada harga cabang yang cocok
                  </p>
                  {adaFilterModal && (
                    <button
                      type="button"
                      onClick={resetFilterModal}
                      className="mt-2 px-3 py-1.5 rounded-lg border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-xs font-bold cursor-pointer"
                    >
                      Tampilkan Semua Cabang
                    </button>
                  )}
                </div>
              ) : (
                modalData.cabangGroups.map((group) => (
                  <div
                    key={group.cabangId}
                    className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-2xs"
                  >
                    <div className="px-4 py-2.5 bg-slate-800 text-white flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs">{group.namaCabang}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-600 text-[10px] font-mono font-bold">
                          {group.kodeCabang}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-[#005BAC]">
                          {group.slots.length} Divisi
                        </span>
                        {group.totalWilayah > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-600">
                            {group.totalWilayah} Wilayah
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Divisi / Wilayah</th>
                            <th className="py-2 px-3 text-right">Harga Satuan</th>
                            <th className="py-2 px-3 text-right">Selisih Wilayah</th>
                            <th className="py-2 px-3">Berlaku Sejak</th>
                            <th className="py-2 px-3 text-center w-36">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {group.slots.map((slot) => {
                            const hasManyWilayah = slot.wilayahList.length > 3;
                            const showAllWilayah =
                              !hasManyWilayah || Boolean(expandedWilayahSlots[slot.id]);

                            return (
                              <React.Fragment key={slot.id}>
                                <tr className="hover:bg-slate-50">
                                  <td className="py-2.5 px-3">
                                    <span className="inline-block px-2 py-0.5 rounded bg-[#005BAC] text-white text-[10px] font-black">
                                      {slot.namaDivisi}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                    <div className="font-mono font-black text-slate-900">
                                      {formatRupiah(slot.harga)}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-semibold">
                                      per {modalData.item.satuan} &middot; Margin {slot.marginPersen}%
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-slate-400 font-medium">
                                    -
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <div className="font-mono font-semibold text-slate-700">
                                      {formatTanggal(slot.berlakuSejak)}
                                    </div>
                                    {slot.nomorTiket && (
                                      <div className="font-mono text-[10px] text-slate-500">
                                        {slot.nomorTiket}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => bukaRincian(slot.id)}
                                        disabled={loadingRincianId === slot.id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                                      >
                                        {loadingRincianId === slot.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5" />
                                        )}
                                        <span>Rincian</span>
                                      </button>
                                      {!readonly && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleStatus(slot, modalData.item.namaItem, false)
                                          }
                                          disabled={pending}
                                          title="Nonaktifkan Harga Cabang"
                                          className="p-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-600 hover:border-[#ED1C24] hover:bg-[#ED1C24] hover:text-white transition-colors cursor-pointer"
                                        >
                                          <Power className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {hasManyWilayah && (
                                  <tr className="bg-slate-50">
                                    <td colSpan={5} className="py-1.5 px-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedWilayahSlots((prev) => ({
                                            ...prev,
                                            [slot.id]: !prev[slot.id],
                                          }))
                                        }
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005BAC] hover:underline cursor-pointer"
                                      >
                                        {showAllWilayah ? (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                        <span>
                                          {showAllWilayah
                                            ? `Sembunyikan ${slot.wilayahList.length} Wilayah`
                                            : `Tampilkan ${slot.wilayahList.length} Harga Wilayah`}
                                        </span>
                                      </button>
                                    </td>
                                  </tr>
                                )}

                                {showAllWilayah &&
                                  slot.wilayahList.map((w) => (
                                    <tr key={w.id} className="bg-slate-50 border-l-4 border-amber-600">
                                      <td className="py-2 px-3">
                                        <div className="flex items-center gap-2 pl-3 flex-wrap">
                                          <CornerDownRight className="w-3.5 h-3.5 text-amber-700" />
                                          <MapPin className="w-3.5 h-3.5 text-amber-700" />
                                          <span className="font-bold text-slate-900">
                                            {w.namaWilayah}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-right whitespace-nowrap">
                                        <div className="font-mono font-black text-slate-900">
                                          {formatRupiah(w.harga)}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-semibold">
                                          per {modalData.item.satuan}
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-right whitespace-nowrap">
                                        <Selisih rp={w.selisihRp} persen={w.selisihPersen} />
                                      </td>
                                      <td className="py-2 px-3 whitespace-nowrap">
                                        <div className="font-mono font-medium text-slate-700">
                                          {formatTanggal(w.berlakuSejak)}
                                        </div>
                                        {w.nomorTiket && (
                                          <div className="font-mono text-[10px] text-slate-500">
                                            {w.nomorTiket}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-center whitespace-nowrap">
                                        <button
                                          type="button"
                                          onClick={() => bukaRincianWilayah(w.id)}
                                          disabled={loadingRincianId === w.id}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-amber-600 bg-white text-amber-800 hover:bg-amber-600 hover:text-white text-[11px] font-bold transition-colors cursor-pointer disabled:bg-slate-200"
                                        >
                                          {loadingRincianId === w.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Eye className="w-3.5 h-3.5" />
                                          )}
                                          <span>Rincian</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

              {/* Footer Modal */}
              <div className="px-5 py-3 bg-white border-t-2 border-slate-200 flex items-center justify-between gap-3">
                {detail ? (
                  <button
                    type="button"
                    onClick={kembaliKeDaftarCabang}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Daftar Cabang</span>
                  </button>
                ) : modalData && modalData.jumlahHalaman > 1 ? (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      disabled={modalPage <= 1 || modalLoading}
                      onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:border-[#005BAC] hover:bg-[#005BAC] hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Halaman cabang sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-bold text-slate-800">
                      Hal {modalData.halaman} / {modalData.jumlahHalaman}
                    </span>
                    <button
                      type="button"
                      disabled={modalPage >= modalData.jumlahHalaman || modalLoading}
                      onClick={() =>
                        setModalPage((p) => Math.min(modalData.jumlahHalaman, p + 1))
                      }
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:border-[#005BAC] hover:bg-[#005BAC] hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Halaman cabang berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={tutupModalCabang}
                  className="px-5 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
