"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Package,
  AlertCircle,
  FileText,
  Pencil,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  Building2,
} from "lucide-react";
import Swal from "sweetalert2";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanTimelineBar } from "@/components/global/PengajuanTimelineBar";
import { DetailSpesifikasi } from "@/components/global/DetailSpesifikasi";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { RingkasanBiayaMaterial } from "@/components/global/RingkasanBiayaMaterial";
import { TambahPengajuanModal } from "@/components/bm-manager/TambahPengajuanModal";
import {
  PengajuanHargaItem,
  KoefisienDetailItem,
  SurveyTokoItem,
  ApprovalLog,
} from "@/types/pengajuan";
import {
  getStoredPengajuan,
  saveStoredPengajuan,
} from "@/lib/pengajuanStorage";
import { formatRupiah } from "@/lib/utils";

export default function BMManagerReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [item, setItem] = useState<PengajuanHargaItem | null>(null);
  const [materialItems, setMaterialItems] = useState<any[]>([]);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // State Review / Keputusan
  const [catatan, setCatatan] = useState("");
  const [catatanError, setCatatanError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Helper slot 3 toko
  const makeInitialStores = (existing?: any[]): any[] => {
    const today = new Date().toISOString().slice(0, 10);
    const ex = existing || [];
    return [
      ex[0]
        ? { ...ex[0], volumeAcuan: 1 }
        : {
            namaToko: "",
            alamatToko: "",
            volumeAcuan: 1,
            hargaSatuan: 0,
            tanggalSurvei: today,
          },
      ex[1]
        ? { ...ex[1], volumeAcuan: 1 }
        : {
            namaToko: "",
            alamatToko: "",
            volumeAcuan: 1,
            hargaSatuan: 0,
            tanggalSurvei: today,
          },
      ex[2]
        ? { ...ex[2], volumeAcuan: 1 }
        : {
            namaToko: "",
            alamatToko: "",
            volumeAcuan: 1,
            hargaSatuan: 0,
            tanggalSurvei: today,
          },
    ];
  };

  // Load Data on Mount (dari API Route Handler GET /api/pengajuan/[id] dengan fallback localStorage)
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadItemData() {
      setLoading(true);

      let found: PengajuanHargaItem | null = null;

      // 1. Coba ambil dari route handler GET /api/pengajuan/[id]
      try {
        const res = await fetch(`/api/pengajuan/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          found = json.data;
        }
      } catch (err) {
        console.warn(
          "Gagal fetch dari /api/pengajuan/[id], mencoba data lokal:",
          err
        );
      }

      // 2. Jika tidak ada di DB, cari dari localStorage
      if (!found) {
        const all = getStoredPengajuan();
        found =
          all.find((i) => i.id === id || i.kode === id || i.noTiket === id) ||
          null;
      }

      if (!isMounted) return;

      if (found) {
        setItem(found);

        let rawMaterials = found.koefisienMaterialItems || [];

        if (rawMaterials.length === 0) {
          const itemNama = (found.item || found.namaItem || "").toLowerCase();
          const isKeramik =
            itemNama.includes("keramik") || itemNama.includes("granit");
          const isCat = itemNama.includes("cat");

          if (isKeramik) {
            rawMaterials = [
              {
                id: `m-1-${found.id}`,
                label: `${found.item || found.namaItem} ${found.ukuran || ""} ${
                  found.merk || ""
                }`.trim(),
                value: found.koefisienMaterial || "1.0500",
                unit: found.satuan || "m2",
                surveyToko: makeInitialStores(found.surveiTokoList),
              },
              {
                id: `m-2-${found.id}`,
                label: "Semen Instan / Mortar Perekat",
                value: "0.1000",
                unit: "sak",
                surveyToko: makeInitialStores(),
              },
              {
                id: `m-3-${found.id}`,
                label: "Semen Pengisi Nat (Tile Grout)",
                value: "0.0500",
                unit: "kg",
                surveyToko: makeInitialStores(),
              },
            ];
          } else if (isCat) {
            rawMaterials = [
              {
                id: `m-1-${found.id}`,
                label: `${found.item || found.namaItem} ${found.ukuran || ""} ${
                  found.merk || ""
                }`.trim(),
                value: found.koefisienMaterial || "1.0000",
                unit: found.satuan || "Pail",
                surveyToko: makeInitialStores(found.surveiTokoList),
              },
              {
                id: `m-2-${found.id}`,
                label: "Plamir Alkali Killer",
                value: "2.5000",
                unit: "kg",
                surveyToko: makeInitialStores(),
              },
              {
                id: `m-3-${found.id}`,
                label: "Rol Cat & Kuas Standar",
                value: "0.0500",
                unit: "set",
                surveyToko: makeInitialStores(),
              },
            ];
          } else {
            rawMaterials = [
              {
                id: `m-1-${found.id}`,
                label: `${found.item || found.namaItem} ${found.ukuran || ""} ${
                  found.merk || ""
                }`.trim(),
                value: found.koefisienMaterial || "1.0000",
                unit: found.satuan || "unit",
                surveyToko: makeInitialStores(found.surveiTokoList),
              },
            ];
          }
        } else {
          rawMaterials = rawMaterials.map((m: any) => {
            const stores = makeInitialStores(m.surveyToko);
            const h1 = Number(stores[0]?.hargaSatuan || stores[0]?.harga) || 0;
            const h2 = Number(stores[1]?.hargaSatuan || stores[1]?.harga) || 0;
            const h3 = Number(stores[2]?.hargaSatuan || stores[2]?.harga) || 0;
            const avg =
              h1 > 0 && h2 > 0 && h3 > 0
                ? Math.round((h1 + h2 + h3) / 3)
                : 0;
            const subtotal = avg > 0 ? Math.round(Number(m.value) * avg) : 0;

            return {
              ...m,
              surveyToko: stores,
              hargaSurveiRataRata: m.hargaSurveiRataRata || avg,
              subtotal: m.subtotal || subtotal,
            };
          });
        }

        setMaterialItems(rawMaterials);
        if (rawMaterials.length > 0) {
          setOpenAccordions([rawMaterials[0].id]);
        }
      }

      setLoading(false);
    }

    loadItemData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Total Biaya Material
  const totalBiayaMaterial = useMemo(() => {
    return materialItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  }, [materialItems]);

  const handleToggleAccordion = (accordionId: string) => {
    setOpenAccordions((prev) =>
      prev.includes(accordionId)
        ? prev.filter((i) => i !== accordionId)
        : [...prev, accordionId]
    );
  };

  // Eksekusi Revisi -> Dikembalikan ke BC (Hanya aktif saat status PENDING_BM_MGR)
  const handleRevisi = async () => {
    if (!item) return;

    if (!catatan.trim()) {
      setCatatanError(
        "Catatan revisi wajib diisi agar Building Coordinator mengetahui bagian yang perlu diperbaiki."
      );
      return;
    }

    setIsSubmitting(true);

    let apiMessage = "";
    try {
      const res = await fetch(`/api/pengajuan/${item.id}/review-bm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "return", catatan: catatan.trim() }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        apiMessage = resJson.message;
      } else {
        console.warn("API review-bm return warning:", resJson.message);
      }
    } catch (err) {
      console.warn("API review-bm return error, fallback lokal:", err);
    }

    const newLog: ApprovalLog = {
      role: "B&M Manager",
      action: "REVISE",
      tanggal: new Date().toISOString().slice(0, 16).replace("T", " "),
      catatan: catatan.trim(),
    };

    const all = getStoredPengajuan();
    const updated = all.map((i) => {
      if (i.id === item.id || i.noTiket === item.noTiket) {
        return {
          ...i,
          status: "RETURNED_TO_BC" as const,
          catatanReview: catatan.trim(),
          catatanReviewTerakhir: catatan.trim(),
          historyLog: [...(i.historyLog || []), newLog],
        };
      }
      return i;
    });

    saveStoredPengajuan(updated);

    await Swal.fire({
      icon: "warning",
      title: "Survei Direvisi",
      text:
        apiMessage ||
        "Survei harga berhasil dikembalikan ke Building Coordinator untuk diperbaiki.",
      confirmButtonColor: "#D97706",
      confirmButtonText: "Kembali ke Antrean",
    });

    router.push("/bm-manager");
  };

  // Eksekusi Setujui -> Diteruskan ke S&B Specialist (Layer 2)
  const handleSetujui = async () => {
    if (!item) return;

    setIsSubmitting(true);

    let apiMessage = "";
    try {
      const res = await fetch(`/api/pengajuan/${item.id}/review-bm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          catatan:
            catatan.trim() ||
            "Survei harga 3 toko disetujui B&M Manager dan diteruskan ke S&B Specialist.",
        }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        apiMessage = resJson.message;
      } else {
        console.warn("API review-bm approve warning:", resJson.message);
      }
    } catch (err) {
      console.warn("API review-bm approve error, fallback lokal:", err);
    }

    const newLog: ApprovalLog = {
      role: "B&M Manager",
      action: "APPROVE",
      tanggal: new Date().toISOString().slice(0, 16).replace("T", " "),
      catatan:
        catatan.trim() ||
        "Survei harga 3 toko disetujui B&M Manager dan diteruskan ke S&B Specialist.",
    };

    const all = getStoredPengajuan();
    const updated = all.map((i) => {
      if (i.id === item.id || i.noTiket === item.noTiket) {
        return {
          ...i,
          status: "PENDING_SB_SPECIALIST" as const,
          catatanReviewTerakhir: catatan.trim() || undefined,
          historyLog: [...(i.historyLog || []), newLog],
        };
      }
      return i;
    });

    saveStoredPengajuan(updated);

    await Swal.fire({
      icon: "success",
      title: "Survei Disetujui",
      text:
        apiMessage ||
        "Survei harga berhasil disetujui B&M Manager dan diteruskan ke S&B Specialist.",
      confirmButtonColor: "#059669",
      confirmButtonText: "Selesai",
    });

    router.push("/bm-manager");
  };

  const handleUpdateSpesifikasi = async (updatedItem: PengajuanHargaItem) => {
    try {
      const res = await fetch(`/api/pengajuan/${updatedItem.id || item?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: updatedItem.item || updatedItem.namaItem,
          namaItem: updatedItem.namaItem || updatedItem.item,
          kategori: updatedItem.kategori,
          merk: updatedItem.merk,
          ukuran: updatedItem.ukuran,
          tipe: updatedItem.tipe,
          warna: updatedItem.warna,
          permukaan: updatedItem.permukaan,
          tebal: updatedItem.tebal,
          toleransi: updatedItem.toleransi,
          lokasi: updatedItem.lokasi,
          satuan: updatedItem.satuan,
          cakupanHarga: updatedItem.cakupanHarga || "INDUK_CABANG",
          alasanPengajuan: updatedItem.alasanPengajuan,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        console.warn("Server PATCH warning:", json.message);
      }
    } catch (err) {
      console.warn("PATCH API error, fallback lokal:", err);
    }

    const allItems = getStoredPengajuan();
    const updatedAll = allItems.map((i) =>
      i.id === updatedItem.id || i.noTiket === updatedItem.noTiket
        ? updatedItem
        : i
    );
    saveStoredPengajuan(updatedAll);

    setItem(updatedItem);
    setMaterialItems(updatedItem.koefisienMaterialItems || []);
    setIsEditModalOpen(false);

    Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: "Spesifikasi berhasil diperbarui.",
      confirmButtonColor: "#ED1C24",
    });
  };

  if (loading) {
    return (
      <AppLayoutShell>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center text-slate-500 text-xs font-semibold">
            Memuat data tiket...
          </div>
        </div>
      </AppLayoutShell>
    );
  }

  if (!item) {
    return (
      <AppLayoutShell>
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-10 h-10 text-slate-400 mb-2" />
          <h2 className="text-base font-bold text-slate-800">
            Material Tidak Ditemukan
          </h2>
          <Link href="/bm-manager" className="mt-4">
            <button className="px-4 py-2 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke B&amp;M Manager</span>
            </button>
          </Link>
        </div>
      </AppLayoutShell>
    );
  }

  // Tombol edit spesifikasi hanya tersedia jika tiket masih dalam tahap drafting / pengajuan awal
  const isEditable = item.status === "DRAFT" || item.status === "DIAJUKAN";

  // Tombol approval (Setujui / Revisi) HANYA boleh muncul saat tiket sedang menunggu persetujuan B&M Manager
  const isPendingBmApproval = item.status === "PENDING_BM_MGR";

  return (
    <AppLayoutShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "B&M Manager", href: "/bm-manager" },
        { label: "Detail Pengajuan Spesifikasi & Harga" },
      ]}
    >
      <div className="max-w-5xl mx-auto space-y-5 pb-8">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Link href="/bm-manager">
            <button className="px-3.5 py-1.5 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer bg-white shadow-2xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Daftar Antrean</span>
            </button>
          </Link>

          {isEditable && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Spesifikasi</span>
            </button>
          )}
        </div>

        {/* 1. Alur Tahapan & Progress Tracker (Wajib di Setiap Halaman Detail) */}
        <PengajuanTimelineBar item={item} />

        {/* 2. Rincian Spesifikasi Material (12 Parameter Standar) */}
        <DetailSpesifikasi item={item} showDeskripsi={true} />

        {/* 3. Penyesuaian Berdasarkan Status Tahapan Tiket */}
        {/* KONDISI A: Status DIAJUKAN / DRAFT (Tahap 1/2: Menunggu Verifikasi S&B) */}
        {(item.status === "DIAJUKAN" || item.status === "DRAFT") && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-700 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Tahap 2: Menunggu Verifikasi Spesifikasi oleh S&amp;B Controller Specialist
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              Spesifikasi material fisik ini telah Anda ajukan. Saat ini tiket berada dalam antrean peninjauan oleh tim S&amp;B Controller Specialist HO.
              Setelah spesifikasi disetujui, tiket akan otomatis diteruskan ke <strong>Building Coordinator (BC)</strong> untuk dilakukan survei harga pasar 3 toko lokal.
            </p>
          </div>
        )}

        {/* KONDISI B: Status SIAP_SURVEI (Tahap 3: Sedang Disurvei BC) */}
        {item.status === "SIAP_SURVEI" && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-700 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Tahap 3: Sedang Dilakukan Survei Harga oleh Building Coordinator
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              Spesifikasi fisik material telah disetujui oleh S&amp;B Controller. Saat ini <strong>Building Coordinator</strong> cabang sedang mengumpulkan bukti survei harga pada 3 toko material lokal terdekat.
            </p>
          </div>
        )}

        {/* KONDISI C: Status RETURNED_TO_BC (Survei Sedang Diperbaiki BC) */}
        {item.status === "RETURNED_TO_BC" && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-700 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Survei Harga Sedang Direvisi oleh Building Coordinator
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              Survei harga material telah Anda kembalikan ke Building Coordinator untuk perbaikan dengan catatan evaluasi:
            </p>
            <div className="bg-white border-2 border-amber-200 rounded-xl p-3 text-xs font-medium text-slate-800 whitespace-pre-wrap">
              {item.catatanReviewTerakhir || item.catatanReview || "Perlu penyesuaian data survei toko."}
            </div>
          </div>
        )}

        {/* KONDISI D: Status PENDING_BM_MGR (Tahap 4: Review B&M Manager) ATAU Sudah Melewati Tahap 4 */}
        {(isPendingBmApproval ||
          item.status === "PENDING_SB_SPECIALIST" ||
          item.status === "PENDING_REGIONAL_MGR" ||
          item.status === "PENDING_KONTRAKTOR" ||
          item.status === "RELEASED") && (
          <>
            {/* Hasil Survei Komponen Material (Accordion) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-600" />
                  <span>Hasil Survei Komponen Material (3 Toko)</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenAccordions(
                        materialItems.map((m, idx) => m.id || `mat-${idx}`)
                      )
                    }
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

              {/* Accordion Items */}
              <div className="space-y-3">
                {materialItems.map((mat, idx) => {
                  const itemKey = mat.id || `mat-${idx}`;
                  const isOpen = openAccordions.includes(itemKey);
                  const stores = mat.surveyToko || [];
                  const validCount = stores.filter(
                    (s: any) =>
                      (s.namaToko?.trim() || s.namaToko) &&
                      Number(s.hargaSatuan || s.harga) > 0
                  ).length;
                  const isComplete = validCount === 3;

                  return (
                    <div
                      key={itemKey}
                      className="border-2 border-slate-300 rounded-2xl bg-white overflow-hidden shadow-2xs transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleAccordion(itemKey)}
                        className="w-full px-4 py-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-3 text-left gap-2 sm:gap-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-blue-700 text-white text-xs flex items-center justify-center font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                                <span>{mat.label}</span>
                                {isComplete ? (
                                  <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                    <span>3/3 Toko</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold border border-amber-300">
                                    {validCount}/3 Toko
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Koefisien:{" "}
                                <span className="font-bold text-slate-800">
                                  {mat.value} {mat.unit}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right shrink-0">
                            <div>
                              <span className="text-[10px] text-slate-500 block font-medium">
                                Rata-Rata
                              </span>
                              <span className="font-mono font-bold text-blue-700 text-xs sm:text-sm">
                                {formatRupiah(mat.hargaSurveiRataRata || 0)} / {mat.unit}
                              </span>
                            </div>
                            <div className="border-l-2 border-slate-200 pl-3">
                              <span className="text-[10px] text-slate-500 block font-medium">
                                Subtotal
                              </span>
                              <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                                {formatRupiah(mat.subtotal || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pl-2">
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="p-4 bg-white border-t border-slate-100">
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

            {/* Rekapitulasi Biaya Material */}
            <RingkasanBiayaMaterial
              materialItems={materialItems}
              totalBiayaMaterial={totalBiayaMaterial}
            />
          </>
        )}

        {/* 4. Panel Keputusan B&M Manager: HANYA TAMPIL SAAT STATUS "PENDING_BM_MGR" */}
        {isPendingBmApproval ? (
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Catatan Keputusan B&amp;M Manager</span>
              </label>
              <textarea
                value={catatan}
                onChange={(e) => {
                  setCatatan(e.target.value);
                  if (catatanError) setCatatanError("");
                }}
                placeholder="Tuliskan catatan persetujuan atau alasan revisi survei ke Building Coordinator..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border-2 border-slate-300 text-slate-800 bg-white font-medium focus:border-red-600 focus:outline-none"
              />
              {catatanError && (
                <p className="text-xs text-red-600 mt-1 font-bold">{catatanError}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t-2 border-slate-100">
              <Link href="/bm-manager" className="w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Kembali
                </button>
              </Link>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleRevisi}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs h-9 px-5 font-bold shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revisi ke BC</span>
                </button>

                <button
                  type="button"
                  onClick={handleSetujui}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-5 font-bold shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Setujui Survei</span>
                </button>
              </div>
            </div>
          </div>
        ) : item.status === "PENDING_SB_SPECIALIST" || item.status === "RELEASED" ? (
          /* Status badge informasi untuk tahapan lanjutan */
          <div className="flex items-center justify-end pt-2">
            {item.status === "PENDING_SB_SPECIALIST" && (
              <span className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>
                  Survei telah disetujui B&amp;M Manager • Sedang ditinjau S&amp;B Controller
                </span>
              </span>
            )}
            {item.status === "RELEASED" && (
              <span className="text-xs text-emerald-800 font-bold bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Master Harga Resmi Aktif</span>
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Edit Spesifikasi Modal */}
      {item && (
        <TambahPengajuanModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateSpesifikasi}
          existingItems={getStoredPengajuan()}
          itemToEdit={item}
        />
      )}
    </AppLayoutShell>
  );
}
