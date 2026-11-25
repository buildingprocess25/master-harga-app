"use client";

import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
  Layers,
  ListPlus,
  Loader2,
  Lock,
  Package,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { PengajuanHargaItem } from "@/types/pengajuan";
import type { KategoriKoefisien } from "@/types";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { hitungAhsp } from "@/lib/kalkulasi-ahsp";
import {
  hitungSelisihTerhadapInduk,
  isKomponenHargaEditableWilayah,
  makeThreeStores,
  type StoreSurveiWilayahInput,
} from "@/lib/wilayah-ahsp";
import { cn, formatRupiah, getInisialDivisi, parseNilaiDanSatuan } from "@/lib/utils";

interface KomponenReviewTemplate {
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

interface ActiveDivisionReviewInfo {
  divisiId: string;
  kodeDivisi: string;
  namaDivisi: string;
  hargaFinalInduk: number;
  marginTotalPersen: number;
  isTermasukBongkaran: boolean;
  nomorTiketInduk: string | null;
  inProgressTiketNomor: string | null;
  komponenInduk: KomponenReviewTemplate[];
}

interface CatalogReviewItem {
  masterItemId: string;
  kelompokKode: "SIP" | "ME";
  kodeItem: string;
  kodeMaster: string;
  namaItem: string;
  kategori: string;
  jenisCor: string;
  ukuran: string;
  merk: string;
  tipe: string;
  warna: string;
  permukaan: string;
  tebal: string;
  toleransi: string;
  lokasi: string;
  satuan: string;
  deskripsiOtomatis: string;
  isTermasukBongkaran: boolean;
  activeDivisiIds: string[];
  activeDivisiCodes: string[];
  inProgressDivisiIds: string[];
  inProgressDivisiCodes: string[];
  activeDivisions: ActiveDivisionReviewInfo[];
}

interface DivisiOption {
  id: string;
  kodeDivisi: string;
  namaDivisi: string;
  shortLabel: string;
}

interface QueuedReviewRow {
  queueId: string;
  catalogItem: CatalogReviewItem;
  divisiIds: string[];
  alasanReview: string;
  surveiMap: Record<string, StoreSurveiWilayahInput[]>;
  komponenInduk: KomponenReviewTemplate[];
  estimasiHargaBaru: number;
  hargaIndukSaatIni: number;
}

export interface ReviewUlangSpesifikasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (item: PengajuanHargaItem) => void;
  onSubmitted?: () => Promise<void> | void;
  existingItems?: PengajuanHargaItem[];
  defaultCabang?: string;
}

const DISABLED_INPUT_CLS =
  "w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-600 bg-slate-200 font-semibold cursor-not-allowed";

const getShortDivisiLabel = (kodeDivisi: string, namaDivisi: string): string =>
  getInisialDivisi(kodeDivisi, namaDivisi);

const getCleanDivisiName = (kodeDivisi: string, namaDivisi: string): string => {
  const k = kodeDivisi.toUpperCase();
  if (k.includes("BLD")) return "Building";
  if (k.includes("MNT")) return "Maintenance";
  if (k.includes("ENG")) return "Engineering";
  if (k.includes("DC")) return "DC";
  return namaDivisi.split("(")[0].trim() || namaDivisi;
};

const solidSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "40px",
    fontSize: "12px",
    fontWeight: 700,
    backgroundColor: "#ffffff",
    borderColor: state.isFocused ? "#005BAC" : "#94a3b8",
    borderWidth: "2px",
    borderRadius: "10px",
    boxShadow: "none",
    "&:hover": { borderColor: "#005BAC" },
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "#ffffff",
    border: "2px solid #cbd5e1",
    borderRadius: "10px",
    zIndex: 9999,
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "12px",
    fontWeight: 600,
    backgroundColor: state.isSelected
      ? "#005BAC"
      : state.isFocused
        ? "#e2e8f0"
        : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    cursor: "pointer",
  }),
};

export function ReviewUlangSpesifikasiModal({
  isOpen,
  onClose,
  onSubmitted,
  defaultCabang = "Cikokol",
}: ReviewUlangSpesifikasiModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [divisiOptions, setDivisiOptions] = useState<DivisiOption[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogReviewItem[]>([]);
  const [masterTokoList, setMasterTokoList] = useState<
    Array<{ id: string; namaToko: string; alamat: string }>
  >([]);
  const [cabangName, setCabangName] = useState(defaultCabang);

  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedDivisiIds, setSelectedDivisiIds] = useState<string[]>([]);
  const [alasanReview, setAlasanReview] = useState("");
  const [surveiMap, setSurveiMap] = useState<Record<string, StoreSurveiWilayahInput[]>>({});
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [queuedItems, setQueuedItems] = useState<QueuedReviewRow[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setErrorText("");
    setSelectedItemId("");
    setSelectedDivisiIds([]);
    setAlasanReview("");
    setSurveiMap({});
    setOpenAccordions([]);
    setQueuedItems([]);

    fetch("/api/pengajuan/review")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat katalog item cabang.");
        }
        if (!active) return;
        const d = json.data;
        setCabangName(d.cabang?.namaCabang || defaultCabang);
        setDivisiOptions(
          (d.divisiList || []).map((div: any) => ({
            id: div.id,
            kodeDivisi: div.kodeDivisi,
            namaDivisi: getCleanDivisiName(div.kodeDivisi, div.namaDivisi),
            shortLabel: getShortDivisiLabel(div.kodeDivisi, div.namaDivisi),
          }))
        );
        setMasterTokoList(d.masterTokoList || []);
        setCatalogItems(d.catalogItems || []);
      })
      .catch((err: any) => {
        if (!active) return;
        setErrorText(err?.message || "Gagal memuat data katalog review ulang.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, defaultCabang]);

  const selectedCatalogItem = useMemo(
    () => catalogItems.find((c) => c.masterItemId === selectedItemId) ?? null,
    [catalogItems, selectedItemId]
  );

  // Divisi yang sudah dipilih di antrean untuk item yang sama tidak boleh dipilih ganda
  const queuedDivisiIdsForSelectedItem = useMemo(() => {
    if (!selectedCatalogItem) return [] as string[];
    return queuedItems
      .filter((q) => q.catalogItem.masterItemId === selectedCatalogItem.masterItemId)
      .flatMap((q) => q.divisiIds);
  }, [queuedItems, selectedCatalogItem]);

  const selectableDivisiIdsForSelectedItem = useMemo(() => {
    if (!selectedCatalogItem) return [] as string[];
    const queuedSet = new Set(queuedDivisiIdsForSelectedItem);
    return selectedCatalogItem.activeDivisions
      .filter((d) => !d.inProgressTiketNomor && !queuedSet.has(d.divisiId))
      .map((d) => d.divisiId);
  }, [selectedCatalogItem, queuedDivisiIdsForSelectedItem]);

  // Saat item berubah, pre-fill divisi aktif yang tersedia dan survei 3 toko terakhir
  const initFormFromCatalogItem = (
    cat: CatalogReviewItem | null,
    overrideSurvei?: Record<string, StoreSurveiWilayahInput[]>,
    overrideDivisiIds?: string[],
    overrideAlasan?: string
  ) => {
    if (!cat) {
      setSelectedDivisiIds([]);
      setSurveiMap({});
      setOpenAccordions([]);
      setAlasanReview("");
      return;
    }

    const availIds = cat.activeDivisions
      .filter((d) => !d.inProgressTiketNomor)
      .map((d) => d.divisiId);
    const chosenDivs =
      overrideDivisiIds && overrideDivisiIds.length > 0
        ? overrideDivisiIds.filter((id) => availIds.includes(id))
        : availIds.length > 0
          ? [availIds[0]]
          : [];
    setSelectedDivisiIds(chosenDivs);

    const primaryDiv =
      cat.activeDivisions.find((d) => d.divisiId === chosenDivs[0]) ??
      cat.activeDivisions[0];
    const komponen = primaryDiv?.komponenInduk ?? [];
    const editable = komponen.filter((k) => isKomponenHargaEditableWilayah(k.kategori));

    if (overrideSurvei) {
      setSurveiMap(overrideSurvei);
    } else {
      const nextMap: Record<string, StoreSurveiWilayahInput[]> = {};
      for (const k of editable) {
        nextMap[k.id] = makeThreeStores();
      }
      setSurveiMap(nextMap);
    }
    setOpenAccordions(editable.length > 0 ? [editable[0].id] : []);
    setAlasanReview(overrideAlasan ?? "");
  };

  const handleSelectCatalogItem = (nextId: string) => {
    setSelectedItemId(nextId);
    const cat = catalogItems.find((c) => c.masterItemId === nextId) ?? null;
    initFormFromCatalogItem(cat);
  };

  const activeDivisionObj = useMemo(() => {
    if (!selectedCatalogItem) return null;
    return (
      selectedCatalogItem.activeDivisions.find((d) =>
        selectedDivisiIds.includes(d.divisiId)
      ) ?? selectedCatalogItem.activeDivisions[0] ?? null
    );
  }, [selectedCatalogItem, selectedDivisiIds]);

  const komponenInduk = activeDivisionObj?.komponenInduk ?? [];
  const editableKomponen = useMemo(
    () => komponenInduk.filter((k) => isKomponenHargaEditableWilayah(k.kategori)),
    [komponenInduk]
  );
  const readonlyKomponen = useMemo(
    () => komponenInduk.filter((k) => !isKomponenHargaEditableWilayah(k.kategori)),
    [komponenInduk]
  );

  // Kalkulasi estimasi harga baru dari input survei 3 toko saat ini
  const kalkulasiLive = useMemo(() => {
    if (komponenInduk.length === 0) return null;
    const marginFallback = activeDivisionObj?.marginTotalPersen ?? 8;
    const baris = komponenInduk.map((k) => {
      let hargaAcuan = k.hargaAcuanSatuan;
      if (isKomponenHargaEditableWilayah(k.kategori)) {
        const stores = surveiMap[k.id] ?? [];
        const valid = stores.filter((s) => s.namaToko?.trim() && Number(s.hargaSatuan) > 0);
        if (valid.length === 3) {
          hargaAcuan = Math.round(
            (Number(valid[0].hargaSatuan) +
              Number(valid[1].hargaSatuan) +
              Number(valid[2].hargaSatuan)) /
              3
          );
        } else if (valid.length > 0) {
          hargaAcuan = Math.round(
            valid.reduce((acc, s) => acc + Number(s.hargaSatuan), 0) / valid.length
          );
        }
      }
      return {
        kategori: k.kategori,
        koefisien: k.nilaiKoefisien,
        hargaAcuan,
      };
    });

    const ambilMargin = (kat: KategoriKoefisien) =>
      komponenInduk.find((k) => k.kategori === kat)?.marginPersen ?? marginFallback;

    const res = hitungAhsp(baris, {
      upah: ambilMargin("UPAH"),
      material: ambilMargin("MATERIAL") ?? ambilMargin("ALAT"),
      bongkaran: ambilMargin("BONGKARAN"),
    });
    const hargaInduk = activeDivisionObj?.hargaFinalInduk ?? 0;
    const selisih = hitungSelisihTerhadapInduk(res.hargaFinal, hargaInduk);
    return { ...res, hargaInduk, ...selisih };
  }, [komponenInduk, surveiMap, activeDivisionObj]);

  const parsedUkuran = parseNilaiDanSatuan(selectedCatalogItem?.ukuran, "cm");
  const parsedTebal = parseNilaiDanSatuan(selectedCatalogItem?.tebal, "mm");
  const parsedTol = parseNilaiDanSatuan(selectedCatalogItem?.toleransi, "mm");
  const isKategoriCor = Boolean(
    selectedCatalogItem?.kategori.toLowerCase().includes("cor")
  );
  const jenisPengajuan =
    (selectedCatalogItem?.satuan || "").toUpperCase() === "LS" ? "Hanya Jasa" : "Material";

  const handleChangeToko = (
    kompId: string,
    storeIdx: number,
    updated: Partial<StoreSurveiWilayahInput>
  ) => {
    setSurveiMap((prev) => {
      const current = prev[kompId] ? [...prev[kompId]] : makeThreeStores();
      current[storeIdx] = {
        ...current[storeIdx],
        ...updated,
        noToko: storeIdx + 1,
      };
      return { ...prev, [kompId]: current };
    });
  };

  const handleToggleDivisi = (divId: string) => {
    if (!selectableDivisiIdsForSelectedItem.includes(divId)) return;
    setSelectedDivisiIds((prev) =>
      prev.includes(divId) ? prev.filter((id) => id !== divId) : [...prev, divId]
    );
  };

  const allSelectableSelected =
    selectableDivisiIdsForSelectedItem.length > 0 &&
    selectableDivisiIdsForSelectedItem.every((id) => selectedDivisiIds.includes(id));

  const handleToggleAllDivisi = () => {
    if (allSelectableSelected) {
      setSelectedDivisiIds(
        selectableDivisiIdsForSelectedItem.length > 0
          ? [selectableDivisiIdsForSelectedItem[0]]
          : []
      );
    } else {
      setSelectedDivisiIds([...selectableDivisiIdsForSelectedItem]);
    }
  };

  const validateCurrentReviewSelection = (): boolean => {
    if (!selectedCatalogItem) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Item Terlebih Dahulu",
        text: "Pilih item aktif dari katalog cabang sebelum mengajukan review.",
        confirmButtonColor: "#005BAC",
      });
      return false;
    }

    if (selectedDivisiIds.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Divisi Tujuan",
        text: "Pilih minimal 1 divisi aktif yang tidak sedang dalam proses pengajuan.",
        confirmButtonColor: "#005BAC",
      });
      return false;
    }

    if (komponenInduk.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Resep AHSP Belum Tersedia",
        text: "Komponen AHSP untuk item dan divisi ini tidak ditemukan.",
        confirmButtonColor: "#ED1C24",
      });
      return false;
    }

    for (const k of editableKomponen) {
      const stores = surveiMap[k.id] ?? [];
      const valid = stores.filter((s) => s.namaToko?.trim() && Number(s.hargaSatuan) > 0);
      if (valid.length < 3) {
        setOpenAccordions((prev) => (prev.includes(k.id) ? prev : [...prev, k.id]));
        Swal.fire({
          icon: "warning",
          title: "Survei 3 Toko Belum Lengkap",
          text: `Komponen "${k.namaKomponen}" wajib diisi lengkap untuk 3 toko dengan harga > Rp 0.`,
          confirmButtonColor: "#ED1C24",
        });
        return false;
      }
    }

    return true;
  };

  const buildPayloadFromForm = (): QueuedReviewRow | null => {
    if (!selectedCatalogItem) return null;
    const clonedMap: Record<string, StoreSurveiWilayahInput[]> = {};
    for (const k of editableKomponen) {
      clonedMap[k.id] = (surveiMap[k.id] ?? []).map((s) => ({ ...s }));
    }
    return {
      queueId: `rev-q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      catalogItem: selectedCatalogItem,
      divisiIds: [...selectedDivisiIds],
      alasanReview: alasanReview.trim(),
      surveiMap: clonedMap,
      komponenInduk: [...komponenInduk],
      estimasiHargaBaru: kalkulasiLive?.hargaFinal ?? 0,
      hargaIndukSaatIni: activeDivisionObj?.hargaFinalInduk ?? 0,
    };
  };

  const handleAddToQueue = () => {
    if (!validateCurrentReviewSelection()) return;
    const row = buildPayloadFromForm();
    if (!row) return;
    setQueuedItems((prev) => [...prev, row]);
    setSelectedItemId("");
    initFormFromCatalogItem(null);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Ditambahkan ke Daftar Review",
      text: `${row.catalogItem.namaItem} siap direview (${row.divisiIds.length} divisi).`,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  };

  const isRowDivisiDisabled = (row: QueuedReviewRow, divId: string) => {
    const activeDiv = row.catalogItem.activeDivisions.find((d) => d.divisiId === divId);
    if (!activeDiv || Boolean(activeDiv.inProgressTiketNomor)) return true;
    return queuedItems.some(
      (q) =>
        q.queueId !== row.queueId &&
        q.catalogItem.masterItemId === row.catalogItem.masterItemId &&
        q.divisiIds.includes(divId)
    );
  };

  const handleToggleRowDivisi = (queueId: string, divId: string) => {
    setQueuedItems((prev) =>
      prev.map((row) => {
        if (row.queueId !== queueId) return row;
        if (isRowDivisiDisabled(row, divId)) return row;
        const exists = row.divisiIds.includes(divId);
        if (exists && row.divisiIds.length <= 1) {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "info",
            title: "Minimal 1 Divisi Aktif",
            text: "Setiap baris review minimal harus memilih 1 divisi.",
            showConfirmButton: false,
            timer: 2000,
          });
          return row;
        }
        return {
          ...row,
          divisiIds: exists
            ? row.divisiIds.filter((id) => id !== divId)
            : [...row.divisiIds, divId],
        };
      })
    );
  };

  const handleCopyRowToForm = (row: QueuedReviewRow) => {
    setSelectedItemId(row.catalogItem.masterItemId);
    initFormFromCatalogItem(
      row.catalogItem,
      row.surveiMap,
      row.divisiIds,
      row.alasanReview
    );
  };

  const handleRemoveQueueRow = (queueId: string) => {
    setQueuedItems((prev) => prev.filter((q) => q.queueId !== queueId));
  };

  const totalQueuedTickets = useMemo(
    () => queuedItems.reduce((sum, r) => sum + r.divisiIds.length, 0),
    [queuedItems]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let rowsToSubmit = [...queuedItems];

    if (rowsToSubmit.length === 0) {
      if (!validateCurrentReviewSelection()) return;
      const single = buildPayloadFromForm();
      if (!single) return;
      rowsToSubmit = [single];
    }

    const payloadItems = rowsToSubmit.map((r) => ({
      masterItemId: r.catalogItem.masterItemId,
      divisiIds: r.divisiIds,
      alasanReview: r.alasanReview,
      hargaKomponen: r.komponenInduk
        .filter((k) => isKomponenHargaEditableWilayah(k.kategori))
        .map((k) => ({
          rincianId: k.id,
          masterKoefisienId: k.masterKoefisienId,
          kategori: k.kategori,
          namaKomponen: k.namaKomponen,
          surveyToko: r.surveiMap[k.id] ?? [],
        })),
    }));

    setSubmitting(true);
    try {
      const res = await fetch("/api/pengajuan/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirim pengajuan review ulang.");
      }

      if (onSubmitted) {
        await onSubmitted();
      }

      await Swal.fire({
        icon: "success",
        title: "Review Ulang Diajukan",
        text: json.message || "Pengajuan review ulang telah diteruskan ke Approval S&B.",
        confirmButtonColor: "#005BAC",
      });
      onClose();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Mengajukan Review",
        text: err?.message || "Terjadi kesalahan saat mengirim review ulang.",
        confirmButtonColor: "#ED1C24",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyDescription = () => {
    if (!selectedCatalogItem?.deskripsiOtomatis) return;
    navigator.clipboard.writeText(selectedCatalogItem.deskripsiOtomatis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const pickerOptions = catalogItems.map((c) => {
    const activeLabels = c.activeDivisions
      .filter((d) => !d.inProgressTiketNomor)
      .map((d) => getShortDivisiLabel(d.kodeDivisi, d.namaDivisi))
      .join(", ");
    return {
      value: c.masterItemId,
      label: `${c.kodeItem} — ${c.namaItem} (${[c.merk, c.ukuran, c.lokasi]
        .filter(Boolean)
        .join(" · ")})${activeLabels ? ` [${activeLabels}]` : " [Semua Sedang Proses]"}`,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto">
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#005BAC] text-white flex items-center justify-center font-bold shadow-2xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Pengajuan Review Ulang Harga &amp; Spesifikasi
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Pilih item aktif Cabang {cabangName}, perbarui survei 3 toko, lalu teruskan langsung ke Approval S&amp;B.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Pemilih Item Aktif */}
          <div className="bg-slate-50 border-2 border-[#005BAC] rounded-xl p-4 space-y-2">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
              Pilih Item Aktif di Cabang {cabangName} <span className="text-red-600">*</span>
            </label>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-600 py-2 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-[#005BAC]" />
                <span>Memuat katalog item aktif...</span>
              </div>
            ) : errorText ? (
              <div className="p-3 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            ) : (
              <Select
                value={
                  selectedItemId
                    ? pickerOptions.find((o) => o.value === selectedItemId) ?? null
                    : null
                }
                onChange={(opt: any) => handleSelectCatalogItem(opt ? opt.value : "")}
                options={pickerOptions}
                styles={solidSelectStyles}
                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                placeholder="Cari kode item, nama material, merk, atau lokasi..."
                isClearable
                noOptionsMessage={() => "Tidak ada item aktif di cabang ini."}
              />
            )}
          </div>

          {selectedCatalogItem && (
            <>
              {/* Divisi Target Review (Hanya divisi AKTIF yang bisa dipilih; belum aktif/proses ter-disable) */}
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#005BAC] text-white text-[11px] font-black flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                        Review untuk Divisi Mana Saja? <span className="text-red-600">*</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Hanya divisi yang sudah aktif dan belum memiliki pengajuan berjalan yang dapat dipilih.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={selectableDivisiIdsForSelectedItem.length <= 1}
                    onClick={handleToggleAllDivisi}
                    className="px-3 py-1.5 rounded-lg border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-[11px] font-black transition-colors cursor-pointer shrink-0 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {selectableDivisiIdsForSelectedItem.length === 0
                      ? "Semua Divisi Aktif Sedang Proses"
                      : allSelectableSelected
                        ? "Pilih 1 Divisi"
                        : `Pilih Semua (${selectableDivisiIdsForSelectedItem.length} Divisi)`}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {divisiOptions.map((div) => {
                    const activeInfo = selectedCatalogItem.activeDivisions.find(
                      (a) => a.divisiId === div.id || a.kodeDivisi === div.kodeDivisi
                    );
                    const isActiveInBranch = Boolean(activeInfo);
                    const isInProgress = Boolean(activeInfo?.inProgressTiketNomor);
                    const isInQueue = queuedDivisiIdsForSelectedItem.includes(div.id);
                    const disabled = !isActiveInBranch || isInProgress || isInQueue;
                    const checked = !disabled && selectedDivisiIds.includes(div.id);

                    return (
                      <button
                        key={div.id}
                        type="button"
                        disabled={disabled}
                        aria-disabled={disabled}
                        onClick={() => handleToggleDivisi(div.id)}
                        className={cn(
                          "flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all",
                          disabled
                            ? "bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed select-none disabled:pointer-events-none"
                            : checked
                              ? "bg-[#005BAC] border-[#004585] text-white shadow-xs cursor-pointer"
                              : "bg-white border-slate-300 text-slate-800 hover:border-[#005BAC] cursor-pointer"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-black truncate">{div.namaDivisi}</div>
                          <div className="mt-0.5">
                            {isInQueue ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-blue-700 text-white text-[10px] font-bold">
                                Di Antrean
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                                Sedang Proses
                              </span>
                            ) : !isActiveInBranch ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-600 text-white text-[10px] font-bold">
                                Belum Aktif
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  "text-[10px] font-mono font-bold",
                                  checked ? "text-blue-100" : "text-emerald-700"
                                )}
                              >
                                {formatRupiah(activeInfo!.hargaFinalInduk)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0",
                            disabled
                              ? "bg-slate-500 border-slate-500 text-white"
                              : checked
                                ? "bg-white border-white text-[#005BAC]"
                                : "bg-white border-slate-300 text-transparent"
                          )}
                        >
                          {disabled ? (
                            <Lock className="w-3 h-3 stroke-[2.5]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 1: Jenis & Item Utama (Ter-disable sesuai spesifikasi master) */}
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                      Jenis &amp; Item Utama
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold">
                    Terkunci dari Master
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Kelompok Pekerjaan (Kode)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedCatalogItem.kelompokKode}
                      className={DISABLED_INPUT_CLS}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Jenis Pengajuan
                    </label>
                    <input
                      type="text"
                      disabled
                      value={jenisPengajuan}
                      className={DISABLED_INPUT_CLS}
                    />
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1">
                      <span className="text-[11px] font-bold text-slate-600">
                        Termasuk Pekerjaan Bongkaran?
                      </span>
                      <input
                        type="checkbox"
                        disabled
                        checked={selectedCatalogItem.isTermasukBongkaran}
                        className="w-4 h-4 rounded border-2 border-slate-300 text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Nama Material / Item
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedCatalogItem.namaItem}
                      className={DISABLED_INPUT_CLS}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Data Pokok Material */}
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                    Data Pokok Material
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Kategori Pekerjaan
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedCatalogItem.kategori || "-"}
                      className={DISABLED_INPUT_CLS}
                    />
                  </div>

                  {isKategoriCor && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Jenis Cor</label>
                      <input
                        type="text"
                        disabled
                        value={selectedCatalogItem.jenisCor || "-"}
                        className={DISABLED_INPUT_CLS}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Ukuran / Dimensi
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        disabled
                        value={parsedUkuran.nilai || selectedCatalogItem.ukuran || "-"}
                        className={cn(DISABLED_INPUT_CLS, "flex-1 min-w-0")}
                      />
                      <input
                        type="text"
                        disabled
                        value={parsedUkuran.satuan || selectedCatalogItem.satuan || "-"}
                        className={cn(DISABLED_INPUT_CLS, "w-24 shrink-0 text-center")}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Merk / Brand</label>
                    <input
                      type="text"
                      disabled
                      value={selectedCatalogItem.merk || "-"}
                      className={DISABLED_INPUT_CLS}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Fisik & Karakteristik */}
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                    Fisik &amp; Karakteristik
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Warna</label>
                    <input
                      type="text"
                      disabled
                      value={selectedCatalogItem.warna || "-"}
                      className={DISABLED_INPUT_CLS}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Tipe / Motif</label>
                    <input
                      type="text"
                      disabled
                      value={selectedCatalogItem.tipe || "-"}
                      className={DISABLED_INPUT_CLS}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Permukaan</label>
                    <input
                      type="text"
                      disabled
                      value={selectedCatalogItem.permukaan || "-"}
                      className={DISABLED_INPUT_CLS}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Ketebalan</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        disabled
                        value={parsedTebal.nilai || selectedCatalogItem.tebal || "-"}
                        className={cn(DISABLED_INPUT_CLS, "flex-1 min-w-0")}
                      />
                      <input
                        type="text"
                        disabled
                        value={selectedCatalogItem.tebal ? parsedTebal.satuan || "mm" : "-"}
                        className={cn(DISABLED_INPUT_CLS, "w-20 shrink-0 text-center")}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Toleransi</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        disabled
                        value={parsedTol.nilai || selectedCatalogItem.toleransi || "-"}
                        className={cn(DISABLED_INPUT_CLS, "flex-1 min-w-0")}
                      />
                      <input
                        type="text"
                        disabled
                        value={selectedCatalogItem.toleransi ? parsedTol.satuan || "mm" : "-"}
                        className={cn(DISABLED_INPUT_CLS, "w-20 shrink-0 text-center")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Penempatan & Catatan */}
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                    4
                  </span>
                  <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                    Penempatan &amp; Catatan Review
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Implementasi / Posisi
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedCatalogItem.kategori || "-"}
                      className={DISABLED_INPUT_CLS}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Lokasi / Area Gerai
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedCatalogItem.lokasi || "-"}
                      className={DISABLED_INPUT_CLS}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Catatan / Alasan Review (Opsional)
                    </label>
                    <input
                      type="text"
                      value={alasanReview}
                      onChange={(e) => setAlasanReview(e.target.value)}
                      placeholder="Misal: Kenaikan harga supplier Q4..."
                      className="h-9 rounded-lg text-xs bg-white border-2 border-slate-300 px-3 font-medium text-slate-900 focus:border-[#005BAC] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Kode Master & Deskripsi Terstandarisasi */}
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                    5
                  </span>
                  <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                    Kode Master &amp; Deskripsi Terstandarisasi
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border-2 border-slate-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Kode Item Fisik
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-[#005BAC] text-white font-mono font-black text-xs inline-block">
                      {selectedCatalogItem.kodeItem}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Kode Master Item
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-mono font-black text-xs inline-block truncate">
                      {selectedCatalogItem.kodeMaster}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Deskripsi Otomatis:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyDescription}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{copied ? "Tersalin!" : "Salin Deskripsi"}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-800 leading-relaxed">
                    {selectedCatalogItem.deskripsiOtomatis || "-"}
                  </div>
                </div>
              </div>

              {/* Section 6: Input Survei 3 Toko Komponen Bahan & Peralatan */}
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#005BAC] text-white text-[11px] font-black flex items-center justify-center">
                      6
                    </span>
                    <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                      Input Survei 3 Toko (Bahan &amp; Peralatan)
                    </h3>
                  </div>

                  {editableKomponen.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setOpenAccordions(editableKomponen.map((m) => m.id))}
                        className="text-[#005BAC] hover:underline font-bold cursor-pointer"
                      >
                        Buka Semua
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setOpenAccordions([])}
                        className="text-slate-600 hover:underline font-semibold cursor-pointer"
                      >
                        Tutup Semua
                      </button>
                    </div>
                  )}
                </div>

                {kalkulasiLive && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="bg-white border-2 border-slate-300 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500">
                        Harga Berlaku Saat Ini
                      </div>
                      <div className="font-mono font-black text-sm text-slate-900 mt-0.5">
                        {formatRupiah(kalkulasiLive.hargaInduk)}
                      </div>
                    </div>
                    <div className="bg-white border-2 border-[#005BAC] rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase text-[#005BAC]">
                        Estimasi Harga Review Baru
                      </div>
                      <div className="font-mono font-black text-sm text-[#005BAC] mt-0.5">
                        {formatRupiah(kalkulasiLive.hargaFinal)}
                      </div>
                    </div>
                    <div className="bg-white border-2 border-slate-300 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase text-slate-500">
                        Selisih dari Berlaku
                      </div>
                      <div
                        className={cn(
                          "font-mono font-black text-sm mt-0.5",
                          kalkulasiLive.selisihRp > 0
                            ? "text-rose-700"
                            : kalkulasiLive.selisihRp < 0
                              ? "text-emerald-700"
                              : "text-slate-700"
                        )}
                      >
                        {kalkulasiLive.selisihRp >= 0 ? "+" : ""}
                        {formatRupiah(kalkulasiLive.selisihRp)} (
                        {kalkulasiLive.selisihPersen >= 0 ? "+" : ""}
                        {kalkulasiLive.selisihPersen.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                )}

                {editableKomponen.length === 0 ? (
                  <div className="p-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-700">
                    Item ini hanya memiliki komponen Tenaga Kerja &amp; Lainnya (tidak memerlukan survei 3 toko).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editableKomponen.map((k, idx) => {
                      const isAccOpen = openAccordions.includes(k.id);
                      const stores = surveiMap[k.id] ?? makeThreeStores();
                      const valid = stores.filter(
                        (s) => s.namaToko?.trim() && Number(s.hargaSatuan) > 0
                      );
                      const rataRata =
                        valid.length > 0
                          ? Math.round(
                              valid.reduce((acc, s) => acc + Number(s.hargaSatuan), 0) /
                                valid.length
                            )
                          : 0;
                      const subtotal = Math.round(
                        rataRata * k.nilaiKoefisien * (1 + k.marginPersen / 100)
                      );

                      return (
                        <div
                          key={k.id}
                          className="border-2 border-slate-300 rounded-xl bg-white overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenAccordions((prev) =>
                                prev.includes(k.id)
                                  ? prev.filter((id) => id !== k.id)
                                  : [...prev, k.id]
                              )
                            }
                            className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 flex flex-wrap items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-[#005BAC] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {k.namaKomponen}
                                  </span>
                                  {valid.length === 3 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                                      3/3 Toko Terisi
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                                      {valid.length}/3 Toko Terisi
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-600 font-mono font-semibold mt-0.5">
                                  Koefisien: {k.nilaiKoefisien} {k.satuan} · Margin {k.marginPersen}%
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-right shrink-0">
                              <div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                                  Rata-Rata 3 Toko
                                </span>
                                <span className="font-mono font-bold text-[#005BAC] text-xs">
                                  {formatRupiah(rataRata)} / {k.satuan}
                                </span>
                              </div>
                              <div className="border-l-2 border-slate-300 pl-3">
                                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                                  Subtotal
                                </span>
                                <span className="font-mono font-black text-emerald-700 text-xs">
                                  {formatRupiah(subtotal)}
                                </span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "w-4 h-4 text-slate-600 transition-transform",
                                  isAccOpen && "rotate-180"
                                )}
                              />
                            </div>
                          </button>

                          {isAccOpen && (
                            <div className="p-4 border-t-2 border-slate-200 bg-slate-50">
                              <RincianSurvei3TokoCard
                                mode="edit"
                                hideHeader={true}
                                compact={true}
                                surveyToko={stores}
                                satuan={k.satuan}
                                materialName={k.namaKomponen}
                                masterTokoList={masterTokoList}
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
              </div>
            </>
          )}

          {/* Section Daftar Antrean Review Massal (Identik TambahPengajuanModal) */}
          <div className="bg-white p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#005BAC] text-white flex items-center justify-center shrink-0">
                  <ListPlus className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Daftar Antrean Review ({queuedItems.length} Item · {totalQueuedTickets} Tiket)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tambahkan beberapa item review beserta survei 3 tokonya untuk dikirim sekaligus dalam satu kali submit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemId("");
                    initFormFromCatalogItem(null);
                  }}
                  className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Bersihkan Form
                </button>
                <button
                  type="button"
                  disabled={!selectedCatalogItem}
                  onClick={handleAddToQueue}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005BAC] hover:bg-[#004585] text-white text-xs font-black cursor-pointer disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan ke Daftar</span>
                </button>
              </div>
            </div>

            {queuedItems.length > 0 ? (
              <div className="border-2 border-slate-300 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="px-3 py-2.5 font-black text-[11px] uppercase tracking-wider w-10">
                          #
                        </th>
                        <th className="px-3 py-2.5 font-black text-[11px] uppercase tracking-wider">
                          Material &amp; Spesifikasi
                        </th>
                        <th className="px-3 py-2.5 font-black text-[11px] uppercase tracking-wider">
                          Lokasi / Kode
                        </th>
                        <th className="px-3 py-2.5 font-black text-[11px] uppercase tracking-wider">
                          Divisi Review (Klik Ubah)
                        </th>
                        <th className="px-3 py-2.5 font-black text-[11px] uppercase tracking-wider text-right">
                          Estimasi Baru
                        </th>
                        <th className="px-3 py-2.5 font-black text-[11px] uppercase tracking-wider text-right w-24">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {queuedItems.map((row, idx) => (
                        <tr key={row.queueId} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-black text-slate-700 align-top">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <div className="font-black text-slate-900">
                              {row.catalogItem.namaItem}
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium">
                              {[
                                row.catalogItem.jenisCor,
                                row.catalogItem.merk,
                                row.catalogItem.ukuran,
                                row.catalogItem.warna,
                                row.catalogItem.tipe,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-white text-[10px] font-black",
                                  row.catalogItem.kelompokKode === "ME"
                                    ? "bg-[#005BAC]"
                                    : "bg-slate-700"
                                )}
                              >
                                {row.catalogItem.kelompokKode}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold">
                                {row.catalogItem.kategori}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase">
                                {row.catalogItem.satuan}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <div className="font-bold text-slate-800">
                              {row.catalogItem.lokasi}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">
                              {row.catalogItem.kodeMaster}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <div className="flex flex-wrap gap-1">
                              {divisiOptions.map((div) => {
                                const active = row.divisiIds.includes(div.id);
                                const blockedRowDiv = isRowDivisiDisabled(row, div.id);
                                return (
                                  <button
                                    key={div.id}
                                    type="button"
                                    disabled={blockedRowDiv}
                                    onClick={() => handleToggleRowDivisi(row.queueId, div.id)}
                                    className={cn(
                                      "px-2 py-1 rounded-md text-[10px] font-black border-2 transition-colors",
                                      blockedRowDiv
                                        ? "bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed"
                                        : active
                                          ? "bg-[#005BAC] border-[#004585] text-white cursor-pointer"
                                          : "bg-white border-slate-300 text-slate-600 hover:border-[#005BAC] cursor-pointer"
                                    )}
                                  >
                                    {div.shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold mt-1">
                              {row.divisiIds.length} tiket review
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top text-right whitespace-nowrap">
                            <div className="font-mono font-black text-[#005BAC]">
                              {formatRupiah(row.estimasiHargaBaru)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Induk: {formatRupiah(row.hargaIndukSaatIni)}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopyRowToForm(row)}
                                title="Salin ke form"
                                className="p-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC] cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveQueueRow(row.queueId)}
                                title="Hapus dari daftar"
                                className="p-1.5 rounded-lg border-2 border-red-300 bg-white text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-[11px] text-slate-600 font-medium text-center">
                Daftar antrean masih kosong. Pilih item &amp; isi survei 3 toko lalu klik{" "}
                <strong className="text-slate-900">+ Tambahkan ke Daftar</strong> untuk mengirim banyak item sekaligus, atau langsung klik{" "}
                <strong className="text-slate-900">Ajukan Review ke S&amp;B</strong> untuk 1 item.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t-2 border-slate-200">
            <div className="text-xs font-semibold text-slate-600">
              {queuedItems.length > 0 ? (
                <span>
                  Siap mengirim{" "}
                  <strong className="text-slate-900">{queuedItems.length} item review</strong>{" "}
                  menjadi{" "}
                  <strong className="text-[#005BAC]">{totalQueuedTickets} tiket review</strong> ke Approval S&amp;B.
                </span>
              ) : selectedCatalogItem ? (
                <span>
                  Target divisi review:{" "}
                  <strong className="text-[#005BAC]">
                    {selectedDivisiIds.length > 0
                      ? divisiOptions
                          .filter((d) => selectedDivisiIds.includes(d.id))
                          .map((d) => d.namaDivisi)
                          .join(", ")
                      : "Belum dipilih"}
                  </strong>
                </span>
              ) : (
                <span>Pilih item aktif untuk memulai pengajuan review ulang.</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || (queuedItems.length === 0 && !selectedCatalogItem)}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#005BAC] hover:bg-[#004585] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-2xs cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {queuedItems.length > 0
                    ? `Ajukan ${queuedItems.length} Review ke S&B (${totalQueuedTickets} Tiket)`
                    : "Ajukan Review ke S&B"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
