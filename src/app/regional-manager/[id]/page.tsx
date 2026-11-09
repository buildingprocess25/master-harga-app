"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Building2,
  AlertCircle,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanTimelineBar } from "@/components/global/PengajuanTimelineBar";
import { DetailSpesifikasiCard } from "@/components/global/DetailSpesifikasiCard";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { RingkasanBiayaMaterial } from "@/components/global/RingkasanBiayaMaterial";
import { RincianKalkulasiKoefisien } from "@/components/global/RincianKalkulasiKoefisien";
import { VotingKontraktorMonitorCard } from "@/components/global/VotingKontraktorMonitorCard";
import { PengajuanHargaItem, UserSessionProfile } from "@/types";
import { formatRupiah } from "@/lib/utils";

export default function RegionalManagerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [item, setItem] = useState<PengajuanHargaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);

    try {
      // 1. Fetch User Session
      const userRes = await fetch("/api/auth/me?role=REGIONAL_MANAGER");
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
          setItem(json.data as PengajuanHargaItem);
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

  // Handler Persetujuan Layer 3: Setujui & Buka Penawaran ke Rekanan
  const handleSetujuiHarga = async () => {
    const confirm = await Swal.fire({
      title: "Setujui & Buka Penawaran Rekanan?",
      text: "Harga satuan resmi disetujui tingkat regional. Penawaran kuorum 50%+1 akan otomatis dibuka ke seluruh rekanan kontraktor aktif di cabang dengan batas waktu SLA 3x24 jam.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Buka Penawaran",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/review-regional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          catatan: "Penetapan harga disetujui Regional Manager. Penawaran resmi dibuka ke rekanan cabang.",
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Penawaran Dibuka",
          text: json.message,
          icon: "success",
          confirmButtonColor: "#005BAC",
        });
        router.push("/regional-manager");
      } else {
        Swal.fire("Gagal", json.message || "Gagal menyetujui pengajuan.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan koneksi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Kembalikan ke S&B Specialist
  const handleKembalikanKeSNB = async () => {
    const { value: text, isConfirmed } = await Swal.fire({
      title: "Kembalikan ke S&B Specialist?",
      text: "Tiket akan dikembalikan ke S&B Specialist untuk peninjauan ulang margin atau disparitas harga.",
      input: "textarea",
      inputPlaceholder: "Tuliskan catatan evaluasi harga regional...",
      inputValidator: (v) => (!v ? "Catatan evaluasi wajib diisi!" : null),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FF9E1B",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Kembalikan ke S&B",
      cancelButtonText: "Batal",
    });

    if (!isConfirmed || !text) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/review-regional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVISE",
          catatan: text.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Dikembalikan ke S&B",
          text: "Tiket telah dikembalikan ke antrean S&B Specialist.",
          icon: "info",
          confirmButtonColor: "#005BAC",
        });
        router.push("/regional-manager");
      } else {
        Swal.fire("Gagal", json.message || "Gagal mengembalikan pengajuan.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Tolak Pengajuan
  const handleTolakRegional = async () => {
    const { value: text, isConfirmed } = await Swal.fire({
      title: "Tolak Pengajuan Harga?",
      text: "Pengajuan harga satuan ini akan ditutup permanen di tingkat regional.",
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
      const res = await fetch(`/api/pengajuan/${id}/review-regional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
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
        router.push("/regional-manager");
      } else {
        Swal.fire("Gagal", json.message || "Gagal menolak pengajuan.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayoutShell user={user}>
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-10 h-10 border-4 border-[#005BAC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">Memuat Rincian Pengajuan Regional...</h3>
          <p className="text-xs text-slate-500 mt-1">Mengambil rincian data harga dan hasil survei toko.</p>
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
            href="/regional-manager"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#005BAC] text-white font-bold text-xs rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Antrean Regional</span>
          </Link>
        </div>
      </AppLayoutShell>
    );
  }

  const isPendingRegional = item.status === "PENDING_REGIONAL_MGR";
  const inKuorum =
    item.status === "PENDING_KONTRAKTOR" ||
    item.status === "USULAN_KONTRAKTOR" ||
    item.status === "DITOLAK_KONTRAKTOR" ||
    item.status === "RELEASED";

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "Regional Manager", href: "/regional-manager" },
        { label: item.noTiket || "Rincian Tiket" },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigasi Atas & Status Ringkas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-slate-200">
          <Link
            href="/regional-manager"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#005BAC] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Antrean Regional Manager</span>
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

        {/* Kartu Ringkasan Rekomendasi Harga S&B */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Rekomendasi Harga Satuan S&amp;B Specialist
              </span>
              <h2 className="text-xl md:text-2xl font-black text-[#005BAC] font-mono tabular-nums">
                {formatRupiah(item.totalHargaSatuan || 0)}
                {item.satuan && (
                  <span className="text-xs font-sans font-bold text-slate-500 ml-1">
                    / {item.satuan}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border-2 border-slate-200 text-right">
              <span className="text-[10px] text-slate-500 block font-bold uppercase">HPP Material</span>
              <span className="text-xs font-black text-slate-800 font-mono">
                {formatRupiah(item.totalHpp || 0)}
              </span>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border-2 border-slate-200 text-right">
              <span className="text-[10px] text-slate-500 block font-bold uppercase">Margin Usulan</span>
              <span className="text-xs font-black text-emerald-700 font-mono">
                {item.liveMarginMaterial || 8}%
              </span>
            </div>
          </div>
        </div>

        {/* Detail Spesifikasi Material */}
        <DetailSpesifikasiCard item={item} />

        {/* Hasil Survei 3 Toko Fisik BC */}
        {item.surveiTokoList && item.surveiTokoList.length > 0 && (
          <RincianSurvei3TokoCard
            surveiList={item.surveiTokoList}
            materialName={item.namaItem || item.item}
            readonly={true}
          />
        )}

        {/* Ringkasan Biaya Material */}
        {item.surveiTokoList && item.surveiTokoList.length > 0 && (
          <RingkasanBiayaMaterial
            surveiList={item.surveiTokoList}
            namaMaterial={item.namaItem || item.item}
          />
        )}

        {/* Tabel AHSP (Read-Only) */}
        <RincianKalkulasiKoefisien
          koefisienItems={item.koefisienItems || []}
          mode="readonly"
          liveMarginUpah={item.liveMarginUpah ?? 8}
          liveMarginMaterial={item.liveMarginMaterial ?? 8}
          liveMarginBongkaran={item.liveMarginBongkaran ?? 8}
        />

        {/* Monitoring Kuorum Rekanan (Jika sudah di tahap kuorum) */}
        {inKuorum && (
          <VotingKontraktorMonitorCard votingList={item.votingKontraktorList || []} />
        )}

        {/* Panel Keputusan Regional Manager (Layer 3) */}
        {isPendingRegional && (
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase">
                Persetujuan Penetapan Tingkat Regional (Layer 3)
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Setujui rekomendasi untuk membuka penawaran ke rekanan kontraktor cabang atau kembalikan ke S&amp;B Specialist
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleTolakRegional}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleKembalikanKeSNB}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Kembalikan ke S&amp;B</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSetujuiHarga}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005BAC] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setujui &amp; Buka Penawaran</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayoutShell>
  );
}
