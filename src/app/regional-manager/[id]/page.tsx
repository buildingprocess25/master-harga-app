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
  FileText,
  Plus,
  Trash2,
  FileCheck,
} from "lucide-react";
import Swal from "sweetalert2";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanTimelineBar } from "@/components/global/PengajuanTimelineBar";
import { DetailSpesifikasi } from "@/components/global/DetailSpesifikasi";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { RingkasanBiayaMaterial } from "@/components/global/RingkasanBiayaMaterial";
import { RincianKalkulasiKoefisien } from "@/components/global/RincianKalkulasiKoefisien";
import { VotingKontraktorMonitorCard } from "@/components/global/VotingKontraktorMonitorCard";
import { PengajuanHargaItem, UserSessionProfile } from "@/types";
import { formatRupiah } from "@/lib/utils";

const OPTIONS_REVISI = [
  "Kategori Pekerjaan",
  "Nama Material",
  "Ukuran",
  "Merk",
  "Warna",
  "Tipe / Motif",
  "Ketebalan",
  "Finishing Permukaan",
  "Toleransi",
  "Implementasi / Posisi",
  "Lokasi / Area Gerai",
  "Informasi Tambahan",
];

export default function RegionalManagerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [item, setItem] = useState<PengajuanHargaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Review / Keputusan Sejalan Prototype
  const [catatan, setCatatan] = useState("");
  const [catatanError, setCatatanError] = useState("");
  const [activeAction, setActiveAction] = useState<string>("none");
  const [revisiList, setRevisiList] = useState<{ field: string; note: string }[]>([
    { field: "", note: "" },
  ]);

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

  const executeReview = async (
    action: string,
    catatanText: string,
    successMessage: string
  ) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/review-regional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          catatan: catatanText,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title:
            action === "APPROVE"
              ? "Harga Disetujui"
              : action === "REVISE"
              ? "Berhasil Dikembalikan"
              : "Pengajuan Ditolak",
          text: json.message || successMessage,
          icon: action === "APPROVE" ? "success" : "info",
          confirmButtonColor: "#005BAC",
        });
        router.push("/regional-manager");
      } else {
        Swal.fire("Gagal", json.message || "Gagal memproses keputusan.", "error");
      }
    } catch (e: any) {
      Swal.fire("Gagal", e.message || "Terjadi gangguan koneksi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    // 1. Validasi Revisi (Reguler / Trial)
    if (activeAction === "reject_reguler" || activeAction === "revise_trial") {
      const valid = revisiList.filter((r) => r.field.trim() && r.note.trim());
      if (valid.length === 0) {
        setCatatanError("Pilih minimal satu bagian yang direvisi beserta catatannya.");
        return;
      }

      const confirm = await Swal.fire({
        title: "Kembalikan untuk revisi?",
        text: "Pengajuan akan dikembalikan ke S&B Specialist.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#FF9E1B",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Ya, Kembalikan",
        cancelButtonText: "Batal",
      });

      if (!confirm.isConfirmed) return;

      const compiledCatatan = valid.map((r) => `[${r.field}] ${r.note}`).join("\n");
      await executeReview(
        "REVISE",
        compiledCatatan,
        "Pengajuan telah dikembalikan ke S&B Specialist."
      );
      return;
    }

    // 2. Validasi Tolak (Reguler / Trial / Negosiasi)
    if (
      activeAction === "reject_reguler_tolak" ||
      activeAction === "reject_trial" ||
      activeAction === "reject_negosiasi"
    ) {
      if (!catatan.trim()) {
        setCatatanError("Alasan penolakan wajib diisi");
        return;
      }

      const confirm = await Swal.fire({
        title: "Tolak pengajuan ini?",
        text: "Pengajuan yang ditolak tidak dapat diproses lagi.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ED1C24",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Ya, Tolak",
        cancelButtonText: "Batal",
      });

      if (!confirm.isConfirmed) return;

      await executeReview("REJECT", catatan.trim(), "Pengajuan telah ditutup.");
      return;
    }

    // 3. Setujui / Sahkan (Reguler / Trial / Promosi)
    const isPromosi = activeAction === "approve_promosi";
    const confirm = await Swal.fire({
      title: isPromosi ? "Sahkan Master Resmi?" : "Setujui harga ini?",
      text: isPromosi
        ? "Item trial akan disahkan menjadi Master Resmi permanen."
        : "Harga akan disetujui dan penawaran dibuka ke kontraktor.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#64748b",
      confirmButtonText: isPromosi ? "Ya, Sahkan" : "Ya, Setujui",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    await executeReview(
      "APPROVE",
      catatan.trim() ||
        (isPromosi
          ? "Item disahkan menjadi Master Resmi permanen."
          : "Harga disetujui."),
      isPromosi
        ? "Item telah disahkan menjadi Master Resmi."
        : "Penawaran telah dibuka ke kontraktor."
    );
  };

  if (isLoading) {
    return (
      <AppLayoutShell user={user}>
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-10 h-10 border-4 border-[#005BAC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">Memuat Data Pengajuan...</h3>
          <p className="text-xs text-slate-500 mt-1">Mohon tunggu sebentar.</p>
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
            <h3 className="text-base font-black text-slate-900">Data Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1">Pengajuan yang Anda cari tidak tersedia.</p>
          </div>
          <Link
            href="/regional-manager"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#005BAC] text-white font-bold text-xs rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Pengajuan</span>
          </Link>
        </div>
      </AppLayoutShell>
    );
  }

  const isPendingRegional = item.status === "PENDING_REGIONAL_MGR";
  const isPendingTrial = (item.status as string) === "TRIAL_PENDING_REGIONAL_MGR";
  const isPendingPromosi =
    (item.status as string) === "TRIAL_PROMOSI_REGIONAL_MGR" ||
    (item.status as string) === "TRIAL_PROMOSI_BM_MGR";

  const inKuorum =
    item.status === "PENDING_KONTRAKTOR" ||
    item.status === "USULAN_KONTRAKTOR" ||
    item.status === "DITOLAK_KONTRAKTOR" ||
    item.status === "RELEASED" ||
    Boolean(item.votingKontraktorList && item.votingKontraktorList.length > 0) ||
    Boolean(item.votingKontraktor);

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "Regional Manager", href: "/regional-manager" },
        { label: item.noTiket || "Detail Pengajuan" },
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
            <span>Kembali ke Daftar Pengajuan</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Cabang:</span>
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
            <div className="w-12 h-12 rounded-xl bg-[#005BAC] text-white flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Rekomendasi Harga Satuan
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
          </div>
        </div>

        {/* Detail Spesifikasi Material */}
        <DetailSpesifikasi item={item} showDeskripsi={true} />

        {/* Informasi Rencana Trial jika tipe trial */}
        {item.isTrial && (
          <div className="bg-white rounded-2xl p-5 border-2 border-slate-300 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Informasi Rencana Trial
              </h4>
              {isPendingPromosi && (
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  SELESAI DIEVALUASI
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Durasi Trial
                </span>
                <span className="mt-1 text-sm font-semibold text-slate-800 block">
                  {item.trialDurationDays ? `${item.trialDurationDays} Hari` : "90 Hari"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Alasan Trial
                </span>
                <span className="mt-1 text-sm font-semibold text-slate-800 block">
                  {item.alasanTrial || "-"}
                </span>
              </div>
            </div>

            {isPendingPromosi && item.trialCatatanEvaluasi && (
              <div className="pt-3 mt-3 border-t-2 border-slate-200">
                <span className="text-[11px] text-purple-700 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <FileCheck className="w-3.5 h-3.5" />
                  Catatan Evaluasi Lapangan (S&amp;B Specialist)
                </span>
                <div className="text-xs font-medium text-slate-800 bg-purple-50 p-3 rounded-xl border border-purple-200">
                  {item.trialCatatanEvaluasi}
                </div>
              </div>
            )}
          </div>
        )}

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
          userRole="REGIONAL_MANAGER"
          showMargin={false}
          liveMarginUpah={item.liveMarginUpah ?? 8}
          liveMarginMaterial={item.liveMarginMaterial ?? 8}
          liveMarginBongkaran={item.liveMarginBongkaran ?? 8}
        />

        {/* Monitoring Kuorum Kontraktor / Rekanan (Jika sudah di tahap kuorum) */}
        {inKuorum && (
          <VotingKontraktorMonitorCard
            votingList={item.votingKontraktorList || []}
            deadlineVoting={item.deadlineVoting}
            kodeDivisi={item.kodeDivisi}
            namaDivisi={item.namaDivisi}
          />
        )}

        {/* Tinjauan & Keputusan Regional Manager */}
        {(isPendingRegional || isPendingTrial || isPendingPromosi) && (
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-[#005BAC]" />
                <span>Tinjauan &amp; Keputusan Regional Manager</span>
              </h3>
            </div>

            {activeAction === "none" ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link href="/regional-manager" className="w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-4 py-2 border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Kembali
                  </button>
                </Link>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                  {isPendingRegional && (
                    <>
                      {item.isHasilNegosiasi ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAction("reject_negosiasi");
                              setCatatanError("");
                            }}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Kembalikan ke S&amp;B</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAction("approve_reguler");
                              setCatatanError("");
                            }}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui &amp; Rilis ke Kontraktor</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAction("reject_reguler_tolak");
                              setCatatanError("");
                            }}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAction("reject_reguler");
                              setCatatanError("");
                            }}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Revisi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAction("approve_reguler");
                              setCatatanError("");
                            }}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005BAC] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Setujui</span>
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {isPendingTrial && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAction("reject_trial");
                          setCatatanError("");
                        }}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAction("revise_trial");
                          setCatatanError("");
                        }}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revisi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAction("approve_trial");
                          setCatatanError("");
                        }}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005BAC] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Setujui Trial</span>
                      </button>
                    </>
                  )}

                  {isPendingPromosi && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction("approve_promosi");
                        setCatatanError("");
                      }}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sahkan Master</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAction === "reject_reguler" || activeAction === "revise_trial" ? (
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Detail Bagian yang Perlu Direvisi
                    </label>

                    <div className="space-y-3">
                      {revisiList.map((rev, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border-2 border-amber-200"
                        >
                          <div className="flex-1 space-y-1">
                            <label className="text-[11px] text-slate-600 font-bold block">
                              Pilih Bagian
                            </label>
                            <select
                              value={rev.field}
                              onChange={(e) => {
                                const newList = [...revisiList];
                                newList[index].field = e.target.value;
                                setRevisiList(newList);
                              }}
                              className="w-full text-xs font-semibold text-slate-800 bg-white border-2 border-slate-300 rounded-lg p-2 focus:outline-none focus:border-[#005BAC]"
                            >
                              <option value="">Pilih bagian...</option>
                              {OPTIONS_REVISI.map((opt) => (
                                <option
                                  key={opt}
                                  value={opt}
                                  disabled={revisiList.some(
                                    (r, rIdx) => rIdx !== index && r.field === opt
                                  )}
                                >
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex-[2] space-y-1">
                            <label className="text-[11px] text-slate-600 font-bold block">
                              Catatan Revisi
                            </label>
                            <div className="flex gap-2 items-start">
                              <textarea
                                value={rev.note}
                                onChange={(e) => {
                                  const newList = [...revisiList];
                                  newList[index].note = e.target.value;
                                  setRevisiList(newList);
                                }}
                                rows={2}
                                className="flex-1 text-xs text-slate-800 bg-white border-2 border-slate-300 rounded-lg p-2 resize-none focus:outline-none focus:border-[#005BAC]"
                                placeholder="Jelaskan detail revisinya..."
                              />
                              {revisiList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = [...revisiList];
                                    newList.splice(index, 1);
                                    setRevisiList(newList);
                                  }}
                                  className="h-9 w-9 flex items-center justify-center text-rose-600 hover:bg-rose-100 rounded-lg border-2 border-rose-300 shrink-0 cursor-pointer transition-colors"
                                  title="Hapus bagian ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setRevisiList([...revisiList, { field: "", note: "" }])
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border-2 border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Bagian Revisi
                      </button>
                    </div>

                    {catatanError && (
                      <p className="text-xs text-red-600 font-bold mt-2">
                        {catatanError}
                      </p>
                    )}
                  </div>
                ) : activeAction === "reject_reguler_tolak" ||
                  activeAction === "reject_trial" ||
                  activeAction === "reject_negosiasi" ? (
                  <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Alasan Penolakan
                    </label>
                    <textarea
                      value={catatan}
                      onChange={(e) => {
                        setCatatan(e.target.value);
                        setCatatanError("");
                      }}
                      placeholder="Tulis alasan penolakan..."
                      className="w-full text-xs text-slate-800 bg-white border-2 border-slate-300 rounded-lg p-2.5 min-h-[80px] focus:outline-none focus:border-rose-600"
                    />
                    {catatanError && (
                      <p className="text-xs text-red-600 font-bold">{catatanError}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#005BAC]" />
                      Catatan Persetujuan (Opsional)
                    </label>
                    <textarea
                      value={catatan}
                      onChange={(e) => {
                        setCatatan(e.target.value);
                        setCatatanError("");
                      }}
                      placeholder="Tulis catatan jika ada..."
                      className="w-full text-xs text-slate-800 bg-white border-2 border-slate-300 rounded-lg p-2.5 min-h-[80px] focus:outline-none focus:border-[#005BAC]"
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAction("none");
                      setCatatan("");
                      setCatatanError("");
                      setRevisiList([{ field: "", note: "" }]);
                    }}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-4 py-2 border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2 bg-[#005BAC] hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? "Memproses..." : "Konfirmasi"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayoutShell>
  );
}
