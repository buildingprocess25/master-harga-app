"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  SlidersHorizontal,
  Send,
  Save,
  AlertCircle,
  FileText,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanTimelineBar } from "@/components/global/PengajuanTimelineBar";
import { DetailSpesifikasiCard } from "@/components/global/DetailSpesifikasiCard";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { RingkasanBiayaMaterial } from "@/components/global/RingkasanBiayaMaterial";
import {
  RincianKalkulasiKoefisien,
  OpsiPustakaKoefisien,
} from "@/components/global/RincianKalkulasiKoefisien";
import {
  PengajuanHargaItem,
  UserSessionProfile,
  KoefisienDetailItem,
} from "@/types";
import { formatRupiah } from "@/lib/utils";

const OPTIONS_REVISI = [
  "Nama Material",
  "Ukuran & Dimensi",
  "Merk & Produsen",
  "Warna Standar",
  "Tipe / Motif",
  "Ketebalan",
  "Finishing Permukaan",
  "Toleransi Teknis",
  "Lokasi / Area Toko",
  "Informasi Spesifikasi Lainnya",
];

export default function SBSpecialistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [item, setItem] = useState<PengajuanHargaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State Resep AHSP
  const [koefisienList, setKoefisienList] = useState<KoefisienDetailItem[]>([]);
  const [pustakaKoefisien, setPustakaKoefisien] = useState<OpsiPustakaKoefisien[]>([]);

  // State Live Margin
  const [liveMarginUpah, setLiveMarginUpah] = useState<number>(8);
  const [liveMarginMaterial, setLiveMarginMaterial] = useState<number>(8);
  const [liveMarginBongkaran, setLiveMarginBongkaran] = useState<number>(8);

  // State Dialog Revisi Spesifikasi
  const [isRevisiModalOpen, setIsRevisiModalOpen] = useState(false);
  const [selectedRevisiFields, setSelectedRevisiFields] = useState<string[]>([]);
  const [catatanRevisi, setCatatanRevisi] = useState("");

  // State Status Spesifikasi Valid
  const [isSpekValid, setIsSpekValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Data Pengajuan & Master Koefisien
  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);

    try {
      // 1. Fetch User Session
      const userRes = await fetch("/api/auth/me?role=SB_SPECIALIST");
      if (userRes.ok) {
        const uJson = await userRes.json();
        if (uJson.success && uJson.user) {
          setUser(uJson.user);
        }
      }

      // 2. Fetch Tiket Detail
      const res = await fetch(`/api/pengajuan/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data as PengajuanHargaItem;
          setItem(d);
          setKoefisienList(d.koefisienItems || []);
          setLiveMarginUpah(d.liveMarginUpah ?? 8);
          setLiveMarginMaterial(d.liveMarginMaterial ?? 8);
          setLiveMarginBongkaran(d.liveMarginBongkaran ?? 8);

          // Jika status sudah lewat DIAJUKAN, berarti spek sudah divalidasi
          if (d.status !== "DIAJUKAN" && d.status !== "PERLU_REVISI") {
            setIsSpekValid(true);
          }

          // 3. Fetch Pustaka Koefisien (berdasarkan divisi tiket)
          const pRes = await fetch(`/api/master-koefisien?divisiId=${d.divisiId || ""}`);
          if (pRes.ok) {
            const pJson = await pRes.json();
            if (pJson.success && Array.isArray(pJson.data)) {
              setPustakaKoefisien(pJson.data);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Gagal memuat detail tiket:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Handler Tambah Koefisien Baru ke Database Pustaka
  const handleTambahPustakaBaru = async (dataBaru: any) => {
    if (!item?.divisiId) return;
    try {
      const res = await fetch("/api/master-koefisien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dataBaru,
          divisiId: item.divisiId,
        }),
      });
      return await res.json();
    } catch (e) {
      console.error(e);
    }
  };

  // ===================== AKSI VALIDASI SPESIFIKASI =====================

  const handleSetujuiSpek = async () => {
    const confirm = await Swal.fire({
      title: "Setujui Spesifikasi?",
      text: "Spesifikasi dinyatakan sesuai standar. Anda dapat langsung menyusun resep koefisien AHSP.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Setujui Spek",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/validasi-spek`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keputusan: "SETUJU",
          catatan: "Spesifikasi disetujui untuk penyusunan AHSP.",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsSpekValid(true);
        Swal.fire({
          title: "Spesifikasi Disetujui",
          text: "Silakan buat koefisien.",
          icon: "success",
          confirmButtonColor: "#005BAC",
        });
      } else {
        Swal.fire("Gagal", json.message || "Gagal menyetujui spesifikasi.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan koneksi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKirimRevisiSpek = async () => {
    if (selectedRevisiFields.length === 0) {
      Swal.fire("Perhatian", "Pilih minimal satu bagian yang perlu diperbaiki.", "warning");
      return;
    }
    if (!catatanRevisi.trim()) {
      Swal.fire("Perhatian", "Tuliskan catatan perbaikan agar B&M Manager memahami yang perlu direvisi.", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/validasi-spek`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keputusan: "REVISI",
          catatan: catatanRevisi.trim(),
          revisiFields: selectedRevisiFields,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Pengajuan Dikembalikan",
          text: "Catatan perbaikan telah dikirim ke B&M Manager cabang.",
          icon: "success",
          confirmButtonColor: "#005BAC",
        });
        router.push("/sb-specialist");
      } else {
        Swal.fire("Gagal", json.message || "Gagal mengembalikan tiket.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan koneksi.", "error");
    } finally {
      setIsSubmitting(false);
      setIsRevisiModalOpen(false);
    }
  };

  const handleTolakSpek = async () => {
    const { value: text, isConfirmed } = await Swal.fire({
      title: "Tolak Pengajuan Harga?",
      text: "Pengajuan akan ditutup secara permanen dan tidak dapat dilanjutkan.",
      input: "textarea",
      inputPlaceholder: "Tuliskan alasan penolakan secara jelas...",
      inputValidator: (v) => (!v ? "Alasan penolakan wajib diisi!" : null),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ED1C24",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Tolak Permanen",
      cancelButtonText: "Batal",
    });

    if (!isConfirmed || !text) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/validasi-spek`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keputusan: "TOLAK",
          catatan: text.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Pengajuan Ditolak",
          text: "Status tiket telah ditutup permanen.",
          icon: "info",
          confirmButtonColor: "#005BAC",
        });
        router.push("/sb-specialist");
      } else {
        Swal.fire("Gagal", json.message || "Gagal menolak tiket.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===================== AKSI PENYUSUNAN RESEP AHSP =====================

  const handleSimpanResep = async (terbitkan: boolean) => {
    if (koefisienList.length === 0) {
      Swal.fire("Perhatian", "Tambahkan minimal satu komponen pekerjaan AHSP.", "warning");
      return;
    }

    if (terbitkan) {
      const hasMaterialSurvei = koefisienList.some(
        (k) => k.kategori === "MATERIAL" && k.wajibSurveiToko
      );
      if (!hasMaterialSurvei) {
        Swal.fire(
          "Perhatian",
          "Tambahkan minimal satu komponen bahan/material yang dicentang 'Disurvei BC' agar Building Coordinator cabang dapat melakukan survei 3 toko.",
          "warning"
        );
        return;
      }

      const confirm = await Swal.fire({
        title: "Kunci & Terbitkan ke Cabang?",
        text: "Resep AHSP akan dikunci dan tiket diterbitkan ke Building Coordinator cabang untuk survei fisik 3 toko pasar.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#005BAC",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Ya, Terbitkan ke Cabang",
        cancelButtonText: "Batal",
      });

      if (!confirm.isConfirmed) return;
    }

    try {
      setIsSubmitting(true);
      const barisPayload = koefisienList.map((k) => ({
        masterKoefisienId: k.masterKoefisienId || k.id,
        nilaiKoefisien: Number(k.koefisien) || 1,
        hargaAcuanSatuan: Number(k.hargaAcuan) || 0,
      }));

      const res = await fetch(`/api/pengajuan/${id}/mastering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baris: barisPayload,
          terbitkan,
          catatan: terbitkan
            ? "Resep AHSP resmi dikunci dan diterbitkan ke Building Coordinator cabang."
            : "Draft resep AHSP disimpan oleh S&B Specialist.",
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: terbitkan ? "Berhasil Diterbitkan" : "Draft Tersimpan",
          text: json.message,
          icon: "success",
          confirmButtonColor: "#005BAC",
        });
        if (terbitkan) {
          router.push("/sb-specialist");
        } else {
          loadData();
        }
      } else {
        Swal.fire("Gagal", json.message || "Gagal menyimpan resep AHSP.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===================== AKSI EVALUASI PASCA-SURVEI =====================

  const handleSetujuiHargaPascaSurvei = async () => {
    const confirm = await Swal.fire({
      title: "Setujui Rekomendasi Harga?",
      text: "Evaluasi harga dan margin akan disimpan, lalu diteruskan ke Regional Manager untuk persetujuan akhir Layer 3.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Teruskan ke Regional",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/evaluasi-margin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          margin: {
            upah: liveMarginUpah,
            material: liveMarginMaterial,
            bongkaran: liveMarginBongkaran,
          },
          teruskan: true,
          catatan: "Rekomendasi harga satuan telah dievaluasi dan disetujui S&B Specialist.",
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Berhasil Disetujui",
          text: "Rekomendasi harga telah diteruskan ke antrean Regional Manager.",
          icon: "success",
          confirmButtonColor: "#005BAC",
        });
        router.push("/sb-specialist");
      } else {
        Swal.fire("Gagal", json.message || "Gagal menyetujui harga.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan koneksi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKembalikanSurveiKeBC = async () => {
    const { value: text, isConfirmed } = await Swal.fire({
      title: "Kembalikan Survei ke BC?",
      text: "Building Coordinator cabang akan diminta melakukan perbaikan survei toko sesuai catatan evaluasi Anda.",
      input: "textarea",
      inputPlaceholder: "Tuliskan catatan perbaikan atau ketidakwajaran harga survei...",
      inputValidator: (v) => (!v ? "Catatan evaluasi wajib diisi!" : null),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FF9E1B",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Kembalikan ke BC",
      cancelButtonText: "Batal",
    });

    if (!isConfirmed || !text) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/evaluasi-margin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "KEMBALIKAN_KE_BC",
          catatan: text.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Survei Dikembalikan",
          text: "Tiket telah dikembalikan ke Building Coordinator cabang.",
          icon: "info",
          confirmButtonColor: "#005BAC",
        });
        router.push("/sb-specialist");
      } else {
        Swal.fire("Gagal", json.message || "Gagal mengembalikan survei.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan koneksi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayoutShell user={user}>
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-10 h-10 border-4 border-[#005BAC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">Memuat Rincian Pengajuan...</h3>
          <p className="text-xs text-slate-500 mt-1">Mengambil data spesifikasi dan resep AHSP.</p>
        </div>
      </AppLayoutShell>
    );
  }

  if (!item) {
    return (
      <AppLayoutShell user={user}>
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Pengajuan Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1">Tiket yang Anda cari tidak terdaftar di sistem.</p>
          </div>
          <Link
            href="/sb-specialist"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#005BAC] text-white font-bold text-xs rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Antrean S&amp;B</span>
          </Link>
        </div>
      </AppLayoutShell>
    );
  }

  const isDiajukan = item.status === "DIAJUKAN" || item.status === "PERLU_REVISI";
  const isPendingSb = item.status === "PENDING_SB_SPECIALIST";
  const isBanding = item.status === "USULAN_KONTRAKTOR";

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "S&B Specialist", href: "/sb-specialist" },
        { label: item.noTiket || "Rincian Tiket" },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigasi Atas & Status Ringkas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-slate-200">
          <Link
            href="/sb-specialist"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#005BAC] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Antrean S&amp;B Specialist</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Cabang Pengaju:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#005BAC] text-white">
              <Building2 className="w-3.5 h-3.5" />
              <span>{item.namaCabang || item.cabang || "Cabang"}</span>
            </span>
          </div>
        </div>

        {/* Stepper Timeline Siklus Hidup */}
        <PengajuanTimelineBar item={item} className="shadow-2xs" />

        {/* 1. Detail Spesifikasi Material Usulan BM */}
        <DetailSpesifikasiCard item={item} />

        {/* ================= SECTION KONDISI 1: STATUS DIAJUKAN ================= */}
        {isDiajukan && (
          <div className="space-y-6">
            {/* Panel Keputusan Validasi Spesifikasi */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                      Langkah 1: Validasi Spesifikasi Usulan BM
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Periksa kelayakan deskripsi material sebelum menyusun resep koefisien AHSP
                    </p>
                  </div>
                </div>

                {isSpekValid && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-xs rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Spesifikasi Disetujui</span>
                  </span>
                )}
              </div>

              {!isSpekValid ? (
                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSetujuiSpek}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui Spesifikasi &amp; Susun AHSP</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setSelectedRevisiFields([]);
                      setCatatanRevisi("");
                      setIsRevisiModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Minta Revisi ke B&amp;M Manager</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleTolakSpek}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Pengajuan</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-900 font-medium">
                  Spesifikasi pekerjaan telah divalidasi dan disetujui. Silakan koefisien di bawah ini, lalu klik tombol <strong>Simpan</strong> agar Building Coordinator dapat memulai survei pasar.
                </div>
              )}
            </div>

            {/* Section 2: Penyusunan Resep AHSP (Hanya Muncul Bila Spek Sudah Valid) */}
            {isSpekValid && (
              <div className="space-y-4">
                <RincianKalkulasiKoefisien
                  koefisienItems={koefisienList}
                  mode="editable"
                  liveMarginUpah={liveMarginUpah}
                  liveMarginMaterial={liveMarginMaterial}
                  liveMarginBongkaran={liveMarginBongkaran}
                  onMarginChange={(u, m, b) => {
                    setLiveMarginUpah(u);
                    setLiveMarginMaterial(m);
                    setLiveMarginBongkaran(b);
                  }}
                  onItemsChange={setKoefisienList}
                  pustakaKoefisien={pustakaKoefisien}
                  onTambahKoefisienBaru={handleTambahPustakaBaru}
                />

                {/* Tombol Terbitkan ke Cabang (SIAP_SURVEI) */}
                <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">
                      Langkah 2: Terbitkan Resep ke Cabang
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Kunci resep AHSP dan otomatis teruskan ke Building Coordinator cabang untuk survei 3 toko fisik
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSimpanResep(false)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      <Save className="w-4 h-4 text-slate-500" />
                      <span>Simpan Draft</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSimpanResep(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005BAC] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Kunci &amp; Terbitkan ke Cabang</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION KONDISI 2: STATUS PENDING_SB_SPECIALIST (PASCA-SURVEI) ================= */}
        {isPendingSb && (
          <div className="space-y-6">
            {/* Tampilan Survei 3 Toko BC */}
            <RincianSurvei3TokoCard
              surveiList={item.surveiTokoList || []}
              materialName={item.namaItem || item.item}
              readonly={true}
            />

            {/* Ringkasan Biaya Material Survei */}
            <RingkasanBiayaMaterial
              surveiList={item.surveiTokoList || []}
              namaMaterial={item.namaItem || item.item}
            />

            {/* Tabel AHSP dengan Kontrol Live Margin S&B */}
            <RincianKalkulasiKoefisien
              koefisienItems={koefisienList}
              mode="editable"
              liveMarginUpah={liveMarginUpah}
              liveMarginMaterial={liveMarginMaterial}
              liveMarginBongkaran={liveMarginBongkaran}
              onMarginChange={(u, m, b) => {
                setLiveMarginUpah(u);
                setLiveMarginMaterial(m);
                setLiveMarginBongkaran(b);
              }}
              onItemsChange={setKoefisienList}
            />

            {/* Panel Keputusan Rekomendasi Harga */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase">
                  Persetujuan Akhir S&amp;B Specialist (Layer 2)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Setujui rekomendasi harga satuan atau kembalikan ke Building Coordinator jika data survei toko diragukan
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleKembalikanSurveiKeBC}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Kembalikan Survei ke BC</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSetujuiHargaPascaSurvei}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005BAC] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Setujui &amp; Teruskan ke Regional</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION KONDISI 3: STATUS USULAN_KONTRAKTOR ================= */}
        {isBanding && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b-2 border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                    Evaluasi Usulan Banding Rekanan Kontraktor
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Rekanan kontraktor cabang mengajukan banding atas harga satuan yang ditawarkan
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">Daftar Voting &amp; Tanggapan Rekanan:</span>
                {item.votingKontraktorList && item.votingKontraktorList.length > 0 ? (
                  <div className="space-y-2">
                    {item.votingKontraktorList.map((v, vIdx) => (
                      <div
                        key={v.id || vIdx}
                        className="bg-white p-3 rounded-lg border-2 border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-black text-slate-900 block">
                            {v.namaPerusahaan}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Status: <strong>{v.statusVote}</strong>
                            {v.catatanBanding ? ` &bull; "${v.catatanBanding}"` : ""}
                          </span>
                        </div>
                        {v.hargaBanding && (
                          <span className="text-xs font-black text-[#005BAC] font-mono">
                            Usulan: {formatRupiah(v.hargaBanding)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada rincian data voting kontraktor.</p>
                )}
              </div>
            </div>

            {/* Rincian AHSP Readonly */}
            <RincianKalkulasiKoefisien
              koefisienItems={koefisienList}
              mode="readonly"
              liveMarginUpah={liveMarginUpah}
              liveMarginMaterial={liveMarginMaterial}
              liveMarginBongkaran={liveMarginBongkaran}
            />
          </div>
        )}

        {/* ================= SECTION KONDISI LAINNYA (READONLY) ================= */}
        {!isDiajukan && !isPendingSb && !isBanding && (
          <div className="space-y-6">
            {item.surveiTokoList && item.surveiTokoList.length > 0 && (
              <RincianSurvei3TokoCard
                surveiList={item.surveiTokoList}
                materialName={item.namaItem || item.item}
                readonly={true}
              />
            )}

            <RincianKalkulasiKoefisien
              koefisienItems={koefisienList}
              mode="readonly"
              liveMarginUpah={liveMarginUpah}
              liveMarginMaterial={liveMarginMaterial}
              liveMarginBongkaran={liveMarginBongkaran}
            />
          </div>
        )}
      </div>

      {/* Modal Dialog Form Checklist Revisi Spesifikasi */}
      {isRevisiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
              <h4 className="text-sm font-black text-slate-900 uppercase">
                Catatan Revisi Spesifikasi ke B&amp;M Manager
              </h4>
              <button
                type="button"
                onClick={() => setIsRevisiModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                Centang Bagian yang Wajib Diperbaiki:
              </span>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {OPTIONS_REVISI.map((opt) => {
                  const isChecked = selectedRevisiFields.includes(opt);
                  return (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 p-2 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer ${
                        isChecked
                          ? "bg-blue-50 border-[#005BAC] text-[#005BAC]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedRevisiFields(selectedRevisiFields.filter((f) => f !== opt));
                          } else {
                            setSelectedRevisiFields([...selectedRevisiFields, opt]);
                          }
                        }}
                        className="rounded border-slate-300 accent-[#005BAC]"
                      />
                      <span className="truncate">{opt}</span>
                    </label>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Catatan Evaluasi / Petunjuk Perbaikan:
                </label>
                <textarea
                  rows={3}
                  value={catatanRevisi}
                  onChange={(e) => setCatatanRevisi(e.target.value)}
                  placeholder="Tuliskan alasan perbaikan secara jelas..."
                  className="w-full bg-white border-2 border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-[#005BAC]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={() => setIsRevisiModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border-2 border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleKirimRevisiSpek}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl cursor-pointer"
              >
                Kirim Revisi ke BM
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayoutShell>
  );
}
