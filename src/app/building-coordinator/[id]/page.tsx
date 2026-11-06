"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Package,
  Store,
  ChevronDown,
  Building2,
  Send,
} from "lucide-react";
import Swal from "sweetalert2";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanTimelineBar } from "@/components/global/PengajuanTimelineBar";
import { DetailSpesifikasi } from "@/components/global/DetailSpesifikasi";
import { RingkasanBiayaMaterial } from "@/components/global/RingkasanBiayaMaterial";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { PengajuanHargaItem, UserSessionProfile } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { getStoredPengajuan, saveStoredPengajuan } from "@/lib/pengajuanStorage";

interface StoreSurveyState {
  noToko: number;
  namaToko: string;
  alamatToko?: string;
  volumeAcuan: number;
  hargaSatuan: number;
  tanggalSurvei: string;
  catatanSurvei?: string;
  buktiSurveiUrl?: string;
  buktiSurveiName?: string;
}

interface MaterialComponentState {
  id: string;
  rincianAhspId?: string;
  label: string;
  unit: string;
  value: string;
  surveyToko: StoreSurveyState[];
  hargaSurveiRataRata?: number;
  hargaAcuan?: number;
  subtotal?: number;
}

export default function BuildingCoordinatorSurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = (params?.id as string) || "";

  // User & Data State
  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [item, setItem] = useState<PengajuanHargaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Material Components & Accordion State
  const [materialItems, setMaterialItems] = useState<MaterialComponentState[]>([]);
  const [openAccordionIds, setOpenAccordionIds] = useState<string[]>([]);

  // Master Toko List for Quick Autocomplete
  const [masterTokoList, setMasterTokoList] = useState<
    Array<{ id: string; namaToko: string; alamat: string }>
  >([]);

  // Helper Inisialisasi 3 Slot Toko
  const makeInitialStores = (existingStores?: any[]): StoreSurveyState[] => {
    const today = new Date().toISOString().slice(0, 10);
    const ex = existingStores || [];

    return [1, 2, 3].map((num, idx) => {
      const match = ex[idx] || ex.find((s: any) => s.noToko === num || s.urutanToko === num);
      return {
        noToko: num,
        namaToko: match?.namaToko || "",
        alamatToko: match?.alamatToko || match?.alamat || "",
        volumeAcuan: 1,
        hargaSatuan: Number(match?.hargaSatuan ?? match?.hargaSatuanSurvei ?? match?.harga) || 0,
        tanggalSurvei: match?.tanggalSurvei ? String(match.tanggalSurvei).slice(0, 10) : today,
        catatanSurvei: match?.catatanSurvei || match?.catatan || "",
        buktiSurveiUrl: match?.buktiSurveiUrl || match?.url || match?.lampiranList?.[0]?.url || "",
        buktiSurveiName: match?.buktiSurveiName || match?.lampiranList?.[0]?.namaFile || "",
      };
    });
  };

  // Fetch Data Pengajuan, User, dan Master Toko
  const fetchData = async () => {
    if (!itemId) return;
    setLoading(true);

    try {
      // 1. Fetch User
      const userRes = await fetch("/api/auth/me?role=BUILDING_COORDINATOR");
      if (userRes.ok) {
        const uJson = await userRes.json();
        if (uJson.success && uJson.user) {
          setUser(uJson.user);
        }
      }

      // 2. Fetch Master Toko
      const tokoRes = await fetch("/api/master-toko");
      if (tokoRes.ok) {
        const tJson = await tokoRes.json();
        if (tJson.success && Array.isArray(tJson.data)) {
          setMasterTokoList(tJson.data);
        }
      }

      // 3. Fetch Detail Pengajuan
      let targetItem: PengajuanHargaItem | null = null;
      const apiRes = await fetch(`/api/pengajuan/${itemId}`);
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.success && json.data) {
          targetItem = json.data;
        }
      }

      // Fallback ke local storage jika API tidak menemukan
      if (!targetItem) {
        const allLocal = getStoredPengajuan();
        targetItem = allLocal.find((i) => i.id === itemId || i.noTiket === itemId) || null;
      }

      if (targetItem) {
        setItem(targetItem);

        // Ekstrak komponen material dari koefisienItems atau koefisienMaterialItems
        let rawMaterials: any[] =
          targetItem.koefisienMaterialItems ||
          (targetItem.koefisienItems || []).filter(
            (k) => k.kategori === "MATERIAL" || !k.kategori
          );

        // Jika rincian koefisien dari S&B masih kosong di mock, buatkan default terstandarisasi
        if (rawMaterials.length === 0) {
          const itemName = (targetItem.item || targetItem.namaItem || "").toLowerCase();
          const isKeramik = itemName.includes("keramik") || itemName.includes("granit");
          const isCat = itemName.includes("cat") || itemName.includes("dulux");

          if (isKeramik) {
            rawMaterials = [
              {
                id: `mat-1-${targetItem.id}`,
                label: `${targetItem.namaItem || targetItem.item} ${targetItem.ukuran || ""} ${targetItem.merk || ""}`.trim(),
                value: targetItem.koefisienMaterial || "1.0340",
                unit: targetItem.satuan || "M2",
                surveyToko: makeInitialStores(targetItem.surveiTokoList || targetItem.surveyToko),
              },
              {
                id: `mat-2-${targetItem.id}`,
                label: "Semen Portland (PC)",
                value: "9.3270",
                unit: "Kg",
                surveyToko: makeInitialStores(),
              },
              {
                id: `mat-3-${targetItem.id}`,
                label: "Pasir Pasang",
                value: "0.0436",
                unit: "M3",
                surveyToko: makeInitialStores(),
              },
            ];
          } else if (isCat) {
            rawMaterials = [
              {
                id: `mat-1-${targetItem.id}`,
                label: `${targetItem.namaItem || targetItem.item} ${targetItem.ukuran || ""} ${targetItem.merk || ""}`.trim(),
                value: targetItem.koefisienMaterial || "1.0000",
                unit: targetItem.satuan || "Pail",
                surveyToko: makeInitialStores(targetItem.surveiTokoList || targetItem.surveyToko),
              },
              {
                id: `mat-2-${targetItem.id}`,
                label: "Plamir Alkali Killer",
                value: "2.5000",
                unit: "Kg",
                surveyToko: makeInitialStores(),
              },
              {
                id: `mat-3-${targetItem.id}`,
                label: "Rol Cat & Kuas Standar",
                value: "0.0500",
                unit: "Set",
                surveyToko: makeInitialStores(),
              },
            ];
          } else {
            rawMaterials = [
              {
                id: `mat-1-${targetItem.id}`,
                label: `${targetItem.namaItem || targetItem.item} ${targetItem.ukuran || ""} ${targetItem.merk || ""}`.trim(),
                value: targetItem.koefisienMaterial || "1.0000",
                unit: targetItem.satuan || "Unit",
                surveyToko: makeInitialStores(targetItem.surveiTokoList || targetItem.surveyToko),
              },
            ];
          }
        }

        // Petakan ke state komponen terpadu
        const formattedComponents: MaterialComponentState[] = rawMaterials.map((m, idx) => {
          const stores = makeInitialStores(m.surveyToko || m.surveiTokoList);
          const h1 = Number(stores[0]?.hargaSatuan) || 0;
          const h2 = Number(stores[1]?.hargaSatuan) || 0;
          const h3 = Number(stores[2]?.hargaSatuan) || 0;
          const valid = [h1, h2, h3].filter((h) => h > 0).length;
          const avg = valid === 3 ? Math.round((h1 + h2 + h3) / 3) : m.hargaAcuan || 0;
          const koef = Number(m.value || m.koefisien) || 1.0;
          const subtotal = avg > 0 ? Math.round(avg * koef) : 0;

          return {
            id: m.id || `mat-${idx}`,
            rincianAhspId: m.rincianAhspId || m.id,
            label: m.label || m.namaKomponen || `Komponen Material ${idx + 1}`,
            unit: m.unit || m.satuan || "Unit",
            value: String(m.value || m.koefisien || "1.0000"),
            surveyToko: stores,
            hargaSurveiRataRata: avg,
            hargaAcuan: avg,
            subtotal,
          };
        });

        setMaterialItems(formattedComponents);
        if (formattedComponents.length > 0) {
          setOpenAccordionIds([formattedComponents[0].id]);
        }
      }
    } catch (err) {
      console.error("Error loading survey detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [itemId]);

  // Handler Perubahan Data Toko untuk Komponen Tertentu
  const handleChangeTokoForMaterial = (
    materialIndex: number,
    storeIndex: number,
    updatedStore: StoreSurveyState
  ) => {
    setMaterialItems((prev) => {
      const next = [...prev];
      const target = { ...next[materialIndex] };
      const nextStores = [...target.surveyToko];
      nextStores[storeIndex] = updatedStore;

      const h1 = Number(nextStores[0]?.hargaSatuan) || 0;
      const h2 = Number(nextStores[1]?.hargaSatuan) || 0;
      const h3 = Number(nextStores[2]?.hargaSatuan) || 0;
      const valid = [h1, h2, h3].filter((h) => h > 0).length;
      const avg = valid === 3 ? Math.round((h1 + h2 + h3) / 3) : 0;
      const koef = Number(target.value) || 1.0;
      const subtotal = avg > 0 ? Math.round(avg * koef) : 0;

      target.surveyToko = nextStores;
      target.hargaSurveiRataRata = avg;
      target.hargaAcuan = avg;
      target.subtotal = subtotal;
      next[materialIndex] = target;
      return next;
    });
  };

  // Toggle Accordion Item
  const handleToggleAccordion = (id: string) => {
    setOpenAccordionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenAllAccordion = () => {
    setOpenAccordionIds(materialItems.map((m) => m.id));
  };

  const handleCloseAllAccordion = () => {
    setOpenAccordionIds([]);
  };

  // Hitung Total Biaya Material Seluruh Komponen
  const totalBiayaMaterial = useMemo(() => {
    return materialItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  }, [materialItems]);

  const isEditable =
    item?.status === "SIAP_SURVEI" ||
    item?.status === "RETURNED_TO_BC" ||
    item?.status === "DIAJUKAN";

  const isReturnedFromBM = item?.status === "RETURNED_TO_BC";

  // Submit Survei Harga ke B&M Manager
  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    // 1. Validasi Kelengkapan Setiap Komponen Material
    for (let i = 0; i < materialItems.length; i++) {
      const mat = materialItems[i];
      const stores = mat.surveyToko;
      const [t1, t2, t3] = stores;

      if (!t1?.namaToko?.trim() || !t2?.namaToko?.trim() || !t3?.namaToko?.trim()) {
        if (!openAccordionIds.includes(mat.id)) {
          setOpenAccordionIds((prev) => [...prev, mat.id]);
        }
        Swal.fire({
          icon: "warning",
          title: "Nama Toko Wajib Diisi",
          text: `Silakan lengkapi nama ketiga toko fisik pada komponen "${mat.label}".`,
          confirmButtonColor: "#005BAC",
          customClass: { confirmButton: "px-5 py-2 font-bold text-xs rounded-lg" },
        });
        return;
      }

      if (!t1?.alamatToko?.trim() || !t2?.alamatToko?.trim() || !t3?.alamatToko?.trim()) {
        if (!openAccordionIds.includes(mat.id)) {
          setOpenAccordionIds((prev) => [...prev, mat.id]);
        }
        Swal.fire({
          icon: "warning",
          title: "Alamat Toko Wajib Diisi",
          text: `Silakan lengkapi alamat lokasi fisik pada komponen "${mat.label}".`,
          confirmButtonColor: "#005BAC",
          customClass: { confirmButton: "px-5 py-2 font-bold text-xs rounded-lg" },
        });
        return;
      }

      const h1 = Number(t1.hargaSatuan) || 0;
      const h2 = Number(t2.hargaSatuan) || 0;
      const h3 = Number(t3.hargaSatuan) || 0;

      if (h1 <= 0 || h2 <= 0 || h3 <= 0) {
        if (!openAccordionIds.includes(mat.id)) {
          setOpenAccordionIds((prev) => [...prev, mat.id]);
        }
        Swal.fire({
          icon: "warning",
          title: "Harga Survei Belum Lengkap",
          text: `Harga survei pada ketiga toko komponen "${mat.label}" harus lebih besar dari Rp 0.`,
          confirmButtonColor: "#005BAC",
          customClass: { confirmButton: "px-5 py-2 font-bold text-xs rounded-lg" },
        });
        return;
      }
    }

    // 2. Konfirmasi Kirim via SweetAlert2 (Solid Standard)
    const confirmResult = await Swal.fire({
      title: `<span class="text-base font-black text-slate-900">Ajukan Hasil Survei 3 Toko?</span>`,
      html: `
        <div class="text-left text-xs bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-2 text-slate-700 font-medium">
          <p>Data survei untuk tiket <strong>#${item.noTiket || item.kode}</strong> akan dikirimkan ke <strong>B&M Manager</strong> untuk Layer 1 Review.</p>
          <div class="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
            <span>Estimasi Total Material:</span>
            <span class="font-mono text-[#005BAC]">${formatRupiah(totalBiayaMaterial)}</span>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Ajukan Survei",
      cancelButtonText: "Batal",
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#64748B",
      customClass: {
        popup: "rounded-2xl border-2 border-slate-300 shadow-xl",
        confirmButton: "px-5 py-2.5 font-bold text-xs rounded-xl shadow-xs",
        cancelButton: "px-5 py-2.5 font-bold text-xs rounded-xl",
      },
    });

    if (!confirmResult.isConfirmed) return;

    try {
      setIsSubmitting(true);

      // Siapkan payload
      const payload = {
        catatan: `Survei 3 toko fisik selesai diinput oleh Building Coordinator (${user?.fullName || "BC Cabang"}). Total HPP Material: ${formatRupiah(totalBiayaMaterial)}.`,
        materialItems: materialItems.map((m) => ({
          id: m.id,
          rincianAhspId: m.rincianAhspId,
          namaKomponen: m.label,
          label: m.label,
          unit: m.unit,
          satuan: m.unit,
          value: m.value,
          koefisien: Number(m.value),
          surveyToko: m.surveyToko,
        })),
        surveyToko: materialItems[0]?.surveyToko || [],
      };

      // 3. Kirim ke Backend Route Handler
      const response = await fetch(`/api/pengajuan/${item.id}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await response.json();

      if (!response.ok || !resJson.success) {
        throw new Error(resJson.message || "Gagal menyimpan survei ke server.");
      }

      // 4. Update fallback local storage agar sinkron
      const allLocal = getStoredPengajuan();
      const updatedLocal = allLocal.map((it) => {
        if (it.id === item.id || it.noTiket === item.noTiket) {
          return {
            ...it,
            status: "PENDING_BM_MGR" as const,
            surveyToko: materialItems[0]?.surveyToko as any,
            koefisienMaterialItems: materialItems as any,
            estimasiHarga: totalBiayaMaterial,
            hargaRataRata: materialItems[0]?.hargaSurveiRataRata || 0,
            tanggalPengajuan: new Date().toISOString().slice(0, 10),
          };
        }
        return it;
      });
      saveStoredPengajuan(updatedLocal);

      // 5. Notifikasi Berhasil via SweetAlert2
      await Swal.fire({
        icon: "success",
        title: "Survei Berhasil Diajukan!",
        html: `
          <div class="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border-2 border-slate-300 text-left space-y-1.5 font-medium">
            <p>Tiket <strong>#${item.noTiket || item.kode}</strong> kini berada dalam status <strong>PENDING_BM_MGR</strong>.</p>
            <p class="text-slate-500">B&M Manager cabang akan melakukan verifikasi disparitas harga dan keabsahan nota 3 toko.</p>
          </div>
        `,
        confirmButtonText: "Kembali ke Daftar Antrean",
        confirmButtonColor: "#005BAC",
        customClass: {
          popup: "rounded-2xl border-2 border-slate-300 shadow-xl",
          confirmButton: "px-5 py-2.5 font-bold text-xs rounded-xl",
        },
      });

      router.push("/building-coordinator");
    } catch (err: any) {
      console.error("Submit Survey Error:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Mengajukan Survei",
        text: err.message || "Terjadi kesalahan koneksi ke server.",
        confirmButtonColor: "#D62828",
        customClass: { confirmButton: "px-5 py-2 font-bold text-xs rounded-lg" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayoutShell user={user}>
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-[#005BAC] border-t-transparent rounded-full mb-3" />
          <p className="text-xs font-bold text-slate-600">Memuat data survei lapangan...</p>
        </div>
      </AppLayoutShell>
    );
  }

  if (!item) {
    return (
      <AppLayoutShell user={user}>
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h2 className="text-base font-black text-slate-900">Tiket Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 mt-1">
            Data tiket pengajuan harga yang Anda cari tidak tersedia atau tidak terdaftar pada cabang ini.
          </p>
          <div className="mt-5">
            <Link
              href="/building-coordinator"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Antrean Survei</span>
            </Link>
          </div>
        </div>
      </AppLayoutShell>
    );
  }

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "Building Coordinator", href: "/building-coordinator" },
        { label: `Survei #${item.noTiket || item.kode}` },
      ]}
    >
      <div className="space-y-6">
        {/* Top Header Navigation (Single Unified Back Button, No Redundant Back Buttons) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href="/building-coordinator"
              className="p-2 border-2 border-slate-300 hover:border-slate-800 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-slate-700"
              title="Kembali ke Antrean"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-md bg-[#005BAC] text-white">
                  {item.noTiket || item.kode}
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  Survei Harga Fisik 3 Toko Material
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {item.namaItem || item.item} &bull; {item.merk || "Standar"} ({item.ukuran || "-"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500">Wilayah Tugas:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#005BAC] text-white font-bold text-xs rounded-xl">
              <Building2 className="w-3.5 h-3.5" />
              <span>Cabang {(item.namaCabang || item.cabang || "Cikokol").replace(/^(cabang\s*)+/i, "").trim()}</span>
            </span>
          </div>
        </div>

        {/* 8-Step Timeline Bar (No Blinking) */}
        <PengajuanTimelineBar item={item} />

        {/* Warning Alert Banner (Jika status RETURNED_TO_BC) */}
        {isReturnedFromBM && (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              <span>Perhatian: Berkas Survei Dikembalikan oleh B&M Manager</span>
            </div>
            <div className="bg-white border-2 border-rose-300 rounded-xl p-3 text-xs font-semibold text-rose-950 leading-relaxed whitespace-pre-wrap">
              {item.catatanReview ||
                item.catatanReviewTerakhir ||
                "Silakan periksa kembali keabsahan foto toko dan disparitas harga 3 toko material."}
            </div>
            <p className="text-[11px] text-rose-800 font-medium">
              Mohon sesuaikan harga atau ganti foto nota toko yang lebih jelas sesuai arahan di atas, lalu klik &quot;Ajukan Ulang Survei&quot;.
            </p>
          </div>
        )}

        {/* Rincian 12 Spesifikasi Material Standar */}
        <DetailSpesifikasi item={item} showDeskripsi={true} />

        {/* Form Survei Harga 3 Toko */}
        <form onSubmit={handleSubmitSurvey} className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-[#005BAC]" />
                <span>Komponen Material yang Wajib Disurvei ({materialItems.length})</span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAllAccordion}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  Buka Semua
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleCloseAllAccordion}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Tutup Semua
                </button>
              </div>
            </div>

            {/* Accordion List Komponen Material */}
            <div className="space-y-3">
              {materialItems.map((mat, idx) => {
                const isOpen = openAccordionIds.includes(mat.id);
                const stores = mat.surveyToko;
                const validCount = stores.filter(
                  (s) => s.namaToko?.trim() && Number(s.hargaSatuan) > 0
                ).length;
                const isComplete = validCount === 3;

                return (
                  <div
                    key={mat.id}
                    className="border-2 border-slate-300 rounded-2xl bg-white overflow-hidden shadow-2xs transition-all"
                  >
                    {/* Accordion Trigger Header */}
                    <div
                      onClick={() => handleToggleAccordion(mat.id)}
                      className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-900 text-xs flex items-center justify-center font-black shrink-0 border border-slate-300">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-black text-slate-900 text-sm flex items-center gap-2.5 flex-wrap">
                            <span>{mat.label}</span>
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 px-2.5 py-0.5 rounded-full shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>3/3 Toko Valid</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-white bg-amber-500 px-2.5 py-0.5 rounded-full shadow-2xs">
                                {validCount}/3 Toko Terisi
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5 font-bold">
                            Koefisien AHSP:{" "}
                            <span className="text-slate-800">{mat.value} {mat.unit}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 text-right shrink-0">
                        <div>
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase block">
                            Rata-Rata 3 Toko
                          </span>
                          <span className="font-mono font-bold text-[#005BAC] text-sm">
                            {formatRupiah(mat.hargaSurveiRataRata || 0)} / {mat.unit}
                          </span>
                        </div>
                        <div className="border-l-2 border-slate-200 pl-4">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase block">
                            Subtotal
                          </span>
                          <span className="font-mono font-black text-emerald-700 text-sm">
                            {formatRupiah(mat.subtotal || 0)}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Accordion Content Form Toko */}
                    {isOpen && (
                      <div className="p-4 border-t-2 border-slate-200 bg-slate-50">
                        <RincianSurvei3TokoCard
                          mode={isEditable ? "edit" : "readonly"}
                          hideHeader={true}
                          surveyToko={mat.surveyToko}
                          satuan={mat.unit}
                          materialName={mat.label}
                          masterTokoList={masterTokoList}
                          onChangeToko={(storeIdx, updated) =>
                            handleChangeTokoForMaterial(idx, storeIdx, updated)
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ringkasan Biaya Material Terkalkulasi */}
          <RingkasanBiayaMaterial
            materialItems={materialItems}
            totalBiayaMaterial={totalBiayaMaterial}
          />

          {/* Action Buttons (Solid Standard) */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-200">
            <Link
              href="/building-coordinator"
              className="px-5 py-2.5 rounded-xl border-2 border-slate-300 hover:border-slate-800 font-bold text-xs text-slate-700 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </Link>

            {isEditable && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs text-white bg-[#005BAC] hover:bg-[#004A8D] shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Mengirimkan Survei..."
                    : isReturnedFromBM
                    ? "Ajukan Ulang Survei"
                    : "Ajukan Hasil Survei"}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </AppLayoutShell>
  );
}
