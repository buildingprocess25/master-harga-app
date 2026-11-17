"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Select from "react-select";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  AlertCircle,
  Store,
  Clock,
  Plus,
  Trash2,
  Save,
  Send,
  Pencil,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanTimelineBar } from "@/components/global/PengajuanTimelineBar";
import { DetailSpesifikasi } from "@/components/global/DetailSpesifikasi";
import { buatDeskripsiOtomatis } from "@/lib/utils";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { RingkasanBiayaMaterial } from "@/components/global/RingkasanBiayaMaterial";
import {
  RincianKalkulasiKoefisien,
  OpsiPustakaKoefisien,
} from "@/components/global/RincianKalkulasiKoefisien";
import { VotingKontraktorMonitorCard } from "@/components/global/VotingKontraktorMonitorCard";
import { KeputusanBanding } from "@/components/sb-specialist/KeputusanBanding";
import {
  PengajuanHargaItem,
  UserSessionProfile,
  KoefisienDetailItem,
} from "@/types";

const OPTIONS_REVISI = [
  "Kategori Pekerjaan",
  "Jenis Cor",
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

// Solid Anti-Slop Style Config for React Select
const solidComboboxStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "36px",
    height: "36px",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#005BAC" : "#cbd5e1",
    borderWidth: "2px",
    fontSize: "12px",
    backgroundColor: state.isDisabled ? "#f1f5f9" : "#ffffff",
    boxShadow: "none",
    "&:hover": {
      borderColor: state.isFocused ? "#005BAC" : "#94a3b8",
    },
  }),
  menu: (base: any) => ({
    ...base,
    fontSize: "12px",
    zIndex: 9999,
    borderRadius: "0.5rem",
    border: "2px solid #cbd5e1",
    backgroundColor: "#ffffff",
    boxShadow:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "12px",
    backgroundColor: state.isSelected
      ? "#005BAC"
      : state.isFocused
      ? "#e0f2fe"
      : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    fontWeight: state.isSelected ? "700" : "500",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
  }),
};

type ActionType =
  | "none"
  | "approve_spec"
  | "reject_spec"
  | "revise_spec"
  | "approve_harga"
  | "reject_harga";

export default function SBSpecialistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [item, setItem] = useState<PengajuanHargaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State Resep AHSP
  const [koefisienList, setKoefisienList] = useState<KoefisienDetailItem[]>([]);
  const [pustakaKoefisien, setPustakaKoefisien] = useState<
    OpsiPustakaKoefisien[]
  >([]);

  // State Live Margin (Direct inputan, bukan drag bar)
  const [liveMarginUpah, setLiveMarginUpah] = useState<number>(8);
  const [liveMarginMaterial, setLiveMarginMaterial] = useState<number>(8);
  const [liveMarginBongkaran, setLiveMarginBongkaran] = useState<number>(8);

  const handleMarginChange = (
    upah: number,
    mat: number,
    bongkaran: number
  ) => {
    setLiveMarginUpah(upah);
    setLiveMarginMaterial(mat);
    setLiveMarginBongkaran(bongkaran);
  };

  // State Aksi Interaktif Halaman
  const [activeAction, setActiveAction] = useState<ActionType>("none");
  const [catatan, setCatatan] = useState("");
  const [isSpekDisetujui, setIsSpekDisetujui] = useState(false);
  const [revisiList, setRevisiList] = useState<
    { field: string; note: string }[]
  >([{ field: "", note: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Modal Edit Redaksi Spesifikasi (hanya kolom terstruktur, status DIAJUKAN)
  const [isEditRedaksiOpen, setIsEditRedaksiOpen] = useState(false);
  const [isSavingRedaksi, setIsSavingRedaksi] = useState(false);
  const [redaksiForm, setRedaksiForm] = useState({
    namaItem: "",
    kategori: "",
    jenisCor: "",
    satuan: "",
    ukuran: "",
    merk: "",
    tipe: "",
    warna: "",
    permukaan: "",
    tebal: "",
    toleransi: "",
    lokasi: "",
  });

  const openEditRedaksiModal = () => {
    if (!item) return;
    setRedaksiForm({
      namaItem: item.namaItem || item.item || "",
      kategori: item.kategori || "",
      jenisCor: item.jenisCor || "",
      satuan: item.satuan || "m2",
      ukuran: item.ukuran || "",
      merk: item.merk || "",
      tipe: item.tipe || "",
      warna: item.warna || "",
      permukaan: item.permukaan || "",
      tebal: item.tebal || "",
      toleransi: item.toleransi || "",
      lokasi: Array.isArray(item.lokasi) ? item.lokasi.join(", ") : item.lokasi || "",
    });
    setIsEditRedaksiOpen(true);
  };

  const handleSaveRedaksi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const isCor = redaksiForm.kategori.toLowerCase().includes("cor");
    if (
      !redaksiForm.namaItem.trim() ||
      !redaksiForm.kategori.trim() ||
      !redaksiForm.satuan.trim() ||
      !redaksiForm.ukuran.trim() ||
      !redaksiForm.merk.trim() ||
      !redaksiForm.lokasi.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Kolom Wajib Kosong",
        text: "Nama Item, Kategori, Satuan, Ukuran, Merk, dan Lokasi wajib diisi.",
        confirmButtonColor: "#005BAC",
      });
      return;
    }
    if (isCor && !redaksiForm.jenisCor.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Jenis Cor Wajib Diisi",
        text: "Isi Jenis Cor karena kategori termasuk Pekerjaan Cor.",
        confirmButtonColor: "#005BAC",
      });
      return;
    }

    try {
      setIsSavingRedaksi(true);
      const res = await fetch(`/api/pengajuan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaItem: redaksiForm.namaItem.trim(),
          kategori: redaksiForm.kategori.trim(),
          jenisCor: isCor ? redaksiForm.jenisCor.trim() : "",
          satuan: redaksiForm.satuan.trim(),
          ukuran: redaksiForm.ukuran.trim(),
          merk: redaksiForm.merk.trim(),
          tipe: redaksiForm.tipe.trim(),
          warna: redaksiForm.warna.trim(),
          permukaan: redaksiForm.permukaan.trim(),
          tebal: redaksiForm.tebal.trim(),
          toleransi: redaksiForm.toleransi.trim(),
          lokasi: redaksiForm.lokasi.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsEditRedaksiOpen(false);
        await loadData();
        Swal.fire({
          icon: "success",
          title: "Redaksi Diperbarui",
          text: "Spesifikasi terstruktur dan deskripsi otomatis berhasil diperbarui.",
          confirmButtonColor: "#005BAC",
        });
      } else {
        Swal.fire("Gagal", json.message || "Gagal memperbarui redaksi spesifikasi.", "error");
      }
    } catch (err: any) {
      Swal.fire("Kesalahan", err.message || "Terjadi kesalahan koneksi.", "error");
    } finally {
      setIsSavingRedaksi(false);
    }
  };

  // Load Data Pengajuan & Master Koefisien
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

          // 3. Fetch Pustaka Koefisien (berdasarkan divisi tiket)
          const pRes = await fetch(
            `/api/master-koefisien?divisiId=${d.divisiId || ""}`
          );
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

  // =================== HANDLER PERSETUJUAN SPESIFIKASI ===================
  const handleApproveSpec = async () => {
    if (!item) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/validasi-spek`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keputusan: "SETUJU",
          catatan:
            catatan.trim() ||
            "Spesifikasi disetujui untuk penyusunan resep AHSP oleh S&B Specialist.",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsSpekDisetujui(true);
        setActiveAction("none");
        setCatatan("");
        Swal.fire({
          title: "Spesifikasi Disetujui",
          text: "Silakan buat koefisien pada bagian di bawah ini.",
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

  const handleReviseSpec = async () => {
    if (!item) return;

    const validRevisi = revisiList.filter((r) => r.field.trim() && r.note.trim());
    if (validRevisi.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Pilih minimal satu bagian yang perlu direvisi beserta catatannya.",
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    const compiledCatatan = validRevisi
      .map((r) => `- ${r.field}: ${r.note}`)
      .join("\n");
    const compiledRevisiFields = validRevisi.map((r) => r.field);

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/validasi-spek`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keputusan: "REVISI",
          catatan: compiledCatatan,
          revisiFields: compiledRevisiFields,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Pengajuan Dikembalikan",
          text: "Catatan perbaikan spesifikasi telah dikirim ke B&M Manager cabang.",
          icon: "info",
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
    }
  };

  const handleRejectSpec = async () => {
    if (!item) return;

    if (!catatan.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Alasan penolakan pengajuan wajib diisi.",
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/validasi-spek`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keputusan: "TOLAK",
          catatan: catatan.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Pengajuan Ditolak",
          text: "Pengajuan spesifikasi harga telah ditutup permanen.",
          icon: "warning",
          confirmButtonColor: "#ED1C24",
        });
        router.push("/sb-specialist");
      } else {
        Swal.fire("Gagal", json.message || "Gagal menolak spesifikasi.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan koneksi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =================== HANDLER SIMPAN / TERBITKAN RESEP KOEFISIEN ===================
  const handleSaveKoefisien = async () => {
    if (!item) return;

    if (koefisienList.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Koefisien Kosong",
        text: "Tambahkan minimal satu komponen koefisien upah atau material sebelum menyimpan.",
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    if (koefisienList.some((k) => Number(k.koefisien) <= 0)) {
      Swal.fire({
        icon: "warning",
        title: "Nilai Koefisien Belum Diisi",
        text: "Lengkapi nilai koefisien (> 0) pada seluruh baris komponen (termasuk bahan/peralatan dari cabang) sebelum mengunci AHSP.",
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/mastering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baris: koefisienList.map((k) => ({
            masterKoefisienId: k.masterKoefisienId || k.id,
            nilaiKoefisien: Number(k.koefisien) || 0,
            hargaAcuanSatuan: Number(k.hargaAcuan) || 0,
            namaKomponen: k.namaKomponen,
            satuan: k.satuan,
            kategori: k.kategori,
            wajibSurveiToko: k.kategori === "MATERIAL" || k.kategori === "ALAT",
          })),
          koefisienItems: koefisienList,
          liveMarginUpah,
          liveMarginMaterial,
          liveMarginBongkaran,
          terbitkan: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setItem((prev) => (prev ? { ...prev, status: "SIAP_SURVEI" } : null));
        await Swal.fire({
          title: "Koefisien dibuat",
          text: "Koefisien telah dikunci. Siap untuk survei.",
          icon: "success",
          confirmButtonColor: "#005BAC",
        });
        router.push("/sb-specialist");
      } else {
        Swal.fire("Gagal", json.message || "Gagal menyimpan resep koefisien.", "error");
      }
    } catch (e: any) {
      Swal.fire("Kesalahan", e.message || "Terjadi kesalahan koneksi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =================== HANDLER PERSETUJUAN HARGA SURVEI (LAYER 2) ===================
  const handleApproveHarga = async () => {
    if (!item) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/evaluasi-margin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SETUJU_HARGA",
          catatan:
            catatan.trim() ||
            "Disetujui S&B Specialist dan diteruskan ke Regional Manager.",
          liveMarginUpah,
          liveMarginMaterial,
          liveMarginBongkaran,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Harga Disetujui",
          text: "Rekomendasi harga satuan telah diteruskan ke Regional Manager untuk approval akhir.",
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

  const handleRejectHarga = async () => {
    if (!item) return;

    if (!catatan.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Alasan pengembalian harga survei ke BC wajib diisi.",
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/pengajuan/${id}/evaluasi-margin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "KEMBALIKAN_KE_BC",
          catatan: catatan.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          title: "Survei Dikembalikan",
          text: "Tiket harga survei telah dikembalikan ke Building Coordinator cabang.",
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

  // Helper Badge Status Header Sesuai Prototype
  const renderStatusBadge = () => {
    if (!item) return null;

    switch (item.status) {
      case "DIAJUKAN":
      case "PENDING_BM_MGR":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-amber-500 text-white shadow-2xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Status: Validasi Spesifikasi</span>
          </span>
        );
      case "PENDING_SB_SPECIALIST":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-[#005BAC] text-white shadow-2xs">
            <Store className="w-3.5 h-3.5" />
            <span>Status: Validasi Harga Survei</span>
          </span>
        );
      case "USULAN_KONTRAKTOR":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-purple-600 text-white shadow-2xs">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Status: Usulan Kontraktor</span>
          </span>
        );
      case "SIAP_SURVEI":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-blue-600 text-white shadow-2xs">
            <Store className="w-3.5 h-3.5" />
            <span>Status: Siap Survei</span>
          </span>
        );
      case "PERLU_REVISI":
      case "RETURNED_TO_BC":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-amber-600 text-white shadow-2xs">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Status: Perlu Revisi</span>
          </span>
        );
      case "DITOLAK":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-rose-600 text-white shadow-2xs">
            <XCircle className="w-3.5 h-3.5" />
            <span>Status: Ditolak</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Status: {item.status.replace(/_/g, " ")}</span>
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <AppLayoutShell user={user}>
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-10 h-10 border-4 border-[#005BAC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">
            Memuat Rincian Pengajuan...
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Mengambil data spesifikasi dan resep AHSP.
          </p>
        </div>
      </AppLayoutShell>
    );
  }

  if (!item) {
    return (
      <AppLayoutShell user={user}>
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Pengajuan Tidak Ditemukan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tiket yang Anda cari tidak terdaftar di sistem.
            </p>
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

  const isDiajukan =
    (item.status === "DIAJUKAN" || item.status === "PENDING_BM_MGR") &&
    !isSpekDisetujui;
  const isPendingSb = item.status === "PENDING_SB_SPECIALIST";
  const isBanding =
    item.status === "PENDING_KONTRAKTOR" ||
    item.status === "USULAN_KONTRAKTOR" ||
    item.status === "DITOLAK_KONTRAKTOR" ||
    Boolean(item.votingKontraktorList?.length);
  const showRincianKoefisien =
    isSpekDisetujui ||
    (item.status === "DIAJUKAN" && koefisienList.length > 0) ||
    item.status === "SIAP_SURVEI" ||
    item.status === "PENDING_SB_SPECIALIST" ||
    item.status === "PENDING_KONTRAKTOR" ||
    item.status === "USULAN_KONTRAKTOR" ||
    item.status === "DITOLAK_KONTRAKTOR" ||
    item.status === "RELEASED";

  const votesList = item.votingKontraktorList || [];
  const totalVotes = votesList.length;
  const targetKuorum = totalVotes > 0 ? Math.floor(totalVotes / 2) + 1 : 1;
  const setujuVotes = votesList.filter((v) => v.statusVote === "SETUJU").length;
  const menungguVotes = votesList.filter((v) => v.statusVote === "MENUNGGU").length;
  const adaBandingVotes = votesList.some(
    (v) => v.statusVote === "TOLAK" && typeof v.hargaBanding === "number"
  );
  const isKuorumTercapai = totalVotes > 0 && setujuVotes >= targetKuorum;
  const isKuorumBelumFinal =
    totalVotes === 0 ||
    (!isKuorumTercapai && setujuVotes + menungguVotes >= targetKuorum);
  const isKeputusanBandingTersedia =
    item.status === "USULAN_KONTRAKTOR" ||
    (item.status === "PENDING_KONTRAKTOR" && adaBandingVotes);
  const isKeputusanBandingAktif =
    item.status === "USULAN_KONTRAKTOR" && !isKuorumBelumFinal;

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "S&B Specialist", href: "/sb-specialist" },
        { label: item.noTiket || "Rincian Tiket" },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
        {/* Navigation Breadcrumb & Back + Status Badge Sesuai Prototype */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
          <Link
            href="/sb-specialist"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#005BAC] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Antrean S&amp;B Specialist</span>
          </Link>
          {renderStatusBadge()}
        </div>

        {/* Timeline Bar Pengajuan */}
        <PengajuanTimelineBar item={item} className="shadow-2xs" />

        {/* Card Ringkasan Spesifikasi Item */}
        <DetailSpesifikasi item={item} showDeskripsi={true} />

        {/* =========================================================================
            ALUR 1: TINJAUAN & VALIDASI SPESIFIKASI (STATUS DIAJUKAN)
            ========================================================================= */}
        {isDiajukan && (
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-slate-200 flex-wrap">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#005BAC]" />
                <span>Tinjauan &amp; Validasi Spesifikasi</span>
              </h3>
              <button
                type="button"
                onClick={openEditRedaksiModal}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-[#005BAC] text-[#005BAC] hover:bg-[#005BAC] hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Ubah Redaksi Spesifikasi</span>
              </button>
            </div>

            {activeAction === "none" ||
            activeAction === "approve_harga" ||
            activeAction === "reject_harga" ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/sb-specialist")}
                  className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  disabled={isSubmitting}
                >
                  Kembali
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAction("reject_spec");
                      setCatatan("");
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAction("revise_spec");
                      setCatatan("");
                      setRevisiList([{ field: "", note: "" }]);
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revisi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAction("approve_spec");
                      setCatatan("");
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Setujui Spesifikasi</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                {activeAction === "revise_spec" ? (
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>Detail Bagian yang Perlu Direvisi</span>
                    </div>

                    <div className="space-y-3">
                      {revisiList.map((rev, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border-2 border-amber-200 relative"
                        >
                          <div className="flex-1 space-y-1.5">
                            <label className="text-[11px] text-slate-700 font-bold block">
                              Pilih Bagian
                            </label>
                            <Select
                              value={
                                rev.field
                                  ? { label: rev.field, value: rev.field }
                                  : null
                              }
                              onChange={(option: any) => {
                                const newList = [...revisiList];
                                newList[index].field = option
                                  ? option.value
                                  : "";
                                setRevisiList(newList);
                              }}
                              options={OPTIONS_REVISI.map((opt) => ({
                                label: opt,
                                value: opt,
                                isDisabled: revisiList.some(
                                  (r, rIndex) =>
                                    rIndex !== index && r.field === opt
                                ),
                              }))}
                              placeholder="Pilih bagian..."
                              styles={solidComboboxStyles}
                              menuPortalTarget={
                                typeof document !== "undefined"
                                  ? document.body
                                  : undefined
                              }
                              isClearable
                              isSearchable
                            />
                          </div>

                          <div className="flex-[2] space-y-1.5">
                            <label className="text-[11px] text-slate-700 font-bold block">
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
                                className="w-full text-xs font-medium bg-white border-2 border-slate-300 rounded-lg p-2 focus:border-[#005BAC] focus:outline-none"
                                placeholder="Jelaskan detail yang perlu diperbaiki..."
                              />
                              {revisiList.length > 1 && (
                                <button
                                  type="button"
                                  className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg shrink-0 cursor-pointer border border-rose-300"
                                  onClick={() => {
                                    const newList = [...revisiList];
                                    newList.splice(index, 1);
                                    setRevisiList(newList);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {revisiList.length < OPTIONS_REVISI.length && (
                      <button
                        type="button"
                        className="w-full py-2 text-xs font-bold text-amber-900 border-2 border-dashed border-amber-400 bg-white hover:bg-amber-100/60 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        onClick={() =>
                          setRevisiList([...revisiList, { field: "", note: "" }])
                        }
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Bagian Lain</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {activeAction === "approve_spec"
                          ? "Catatan Persetujuan (Opsional)"
                          : "Alasan Penolakan (Wajib)"}
                      </span>
                    </label>
                    <textarea
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder={
                        activeAction === "approve_spec"
                          ? "Tuliskan catatan persetujuan jika ada..."
                          : "Tuliskan alasan spesifikasi ini ditolak..."
                      }
                      rows={3}
                      className={`w-full text-xs font-medium bg-white border-2 ${
                        activeAction === "reject_spec" && !catatan.trim()
                          ? "border-rose-400"
                          : "border-slate-300"
                      } rounded-xl p-3 focus:border-[#005BAC] focus:outline-none`}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveAction("none")}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer border border-slate-300"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={
                      activeAction === "approve_spec"
                        ? handleApproveSpec
                        : activeAction === "reject_spec"
                        ? handleRejectSpec
                        : handleReviseSpec
                    }
                    className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                      activeAction === "approve_spec"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : activeAction === "reject_spec"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-amber-500 hover:bg-amber-600"
                    }`}
                  >
                    {activeAction === "approve_spec" && (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {activeAction === "reject_spec" && (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {activeAction === "revise_spec" && (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>
                      Konfirmasi{" "}
                      {activeAction === "approve_spec"
                        ? "Persetujuan"
                        : activeAction === "reject_spec"
                        ? "Tolak"
                        : "Revisi"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ALUR 2: REVIEW HASIL SURVEI HARGA LAPANGAN (STATUS PENDING_SB_SPECIALIST)
            ========================================================================= */}
        {isPendingSb && (
          <div className="space-y-6">
            {/* Tampilkan Hasil Survei Lapangan 3 Toko */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 pb-3 border-b-2 border-slate-200">
                <Store className="w-4 h-4 text-slate-600" />
                <span>Review Hasil Survei Harga Lapangan</span>
              </h3>

              <RingkasanBiayaMaterial
                surveiList={item.surveiTokoList || []}
                namaMaterial={item.namaItem || item.item}
              />

              <div className="space-y-4 pt-2">
                <RincianSurvei3TokoCard
                  surveiList={item.surveiTokoList || []}
                  materialName={item.namaItem || item.item}
                  readonly={true}
                />
              </div>
            </div>

            {/* Panel Aksi Persetujuan Harga Survei (Layer 2) */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#005BAC]" />
                  <span>
                    {item.isRevisiMargin
                      ? "Konfirmasi Revisi Margin & Teruskan ke Regional"
                      : "Tinjauan & Persetujuan Harga Survei"}
                  </span>
                </h3>
                {item.isRevisiMargin && (
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-600 text-white">
                    Mode Revisi Margin
                  </span>
                )}
              </div>

              {item.isRevisiMargin && (
                <div className="bg-amber-100 border-2 border-amber-400 rounded-xl p-3 text-xs font-semibold text-amber-950">
                  Silakan ubah persentase Margin (Upah, Material, atau Bongkaran) pada kartu{" "}
                  <span className="font-black">Rincian Koefisien</span> di bawah. Penambahan atau pengubahan koefisien terkunci pada tahap revisi banding. Setelah sesuai, klik{" "}
                  <span className="font-black">Setujui Harga &amp; Teruskan ke Regional</span>.
                </div>
              )}

              {activeAction === "none" ||
              activeAction === "approve_spec" ||
              activeAction === "reject_spec" ||
              activeAction === "revise_spec" ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/sb-specialist")}
                    className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    disabled={isSubmitting}
                  >
                    Kembali
                  </button>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction("reject_harga");
                        setCatatan("");
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Kembalikan Survei ke BC</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction("approve_harga");
                        setCatatan("");
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-[#005BAC] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Setujui Harga &amp; Teruskan ke Regional</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {activeAction === "approve_harga"
                          ? "Catatan Persetujuan Harga (Opsional)"
                          : "Alasan Pengembalian Harga ke BC (Wajib)"}
                      </span>
                    </label>
                    <textarea
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder={
                        activeAction === "approve_harga"
                          ? "Tuliskan catatan persetujuan harga survei jika ada..."
                          : "Tuliskan alasan spesifik kenapa harga survei ini dikembalikan..."
                      }
                      rows={3}
                      className={`w-full text-xs font-medium bg-white border-2 ${
                        activeAction === "reject_harga" && !catatan.trim()
                          ? "border-rose-400"
                          : "border-slate-300"
                      } rounded-xl p-3 focus:border-[#005BAC] focus:outline-none`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t-2 border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveAction("none")}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer border border-slate-300"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={
                        activeAction === "approve_harga"
                          ? handleApproveHarga
                          : handleRejectHarga
                      }
                      className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                        activeAction === "approve_harga"
                          ? "bg-[#005BAC] hover:bg-blue-700"
                          : "bg-amber-600 hover:bg-amber-700"
                      }`}
                    >
                      {activeAction === "approve_harga" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>
                        Konfirmasi{" "}
                        {activeAction === "approve_harga"
                          ? "Setujui Harga"
                          : "Kembalikan ke BC"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            ALUR 3: MONITORING & EVALUASI KUORUM REKANAN KONTRAKTOR
            ========================================================= */}
        {isBanding && (
          <div className="space-y-4">
            <VotingKontraktorMonitorCard
              votingList={item.votingKontraktorList || []}
              deadlineVoting={item.deadlineVoting}
            />
            {isKeputusanBandingTersedia && (
              <KeputusanBanding
                tiketId={item.id}
                hargaDitawarkan={item.totalHargaSatuan ?? null}
                disabled={!isKeputusanBandingAktif}
                onSukses={loadData}
                alasanTerkunci={
                  isKuorumBelumFinal
                    ? `Progres kuorum saat ini (${setujuVotes} Setuju, ${menungguVotes} Menunggu dari ${totalVotes} Kontraktor, butuh ${targetKuorum} Setuju) belum menghasilkan keputusan final. Tombol keputusan banding akan aktif setelah kuorum mencapai keputusan valid.`
                    : undefined
                }
                usulanRata={(() => {
                  const usulans = (item.votingKontraktorList || [])
                    .filter(
                      (v) =>
                        v.statusVote === "TOLAK" &&
                        typeof v.hargaBanding === "number"
                    )
                    .map((v) => v.hargaBanding as number);
                  return usulans.length > 0
                    ? Math.round(
                        usulans.reduce((a, b) => a + b, 0) / usulans.length
                      )
                    : null;
                })()}
              />
            )}
          </div>
        )}

        {/* =========================================================================
            ALUR 4: RINCIAN KALKULASI KOEFISIEN AHSP & LIVE MARGIN INPUT
            ========================================================================= */}
        {showRincianKoefisien && (
          <div className="space-y-4">
            <RincianKalkulasiKoefisien
              item={item}
              koefisienItems={koefisienList}
              mode={
                item.status === "DIAJUKAN"
                  ? isSpekDisetujui
                    ? "editable"
                    : "readonly"
                  : item.isRevisiMargin
                  ? "margin-only"
                  : "readonly"
              }
              liveMarginUpah={liveMarginUpah}
              liveMarginMaterial={liveMarginMaterial}
              liveMarginBongkaran={liveMarginBongkaran}
              onMarginChange={handleMarginChange}
              onItemsChange={setKoefisienList}
              pustakaKoefisien={pustakaKoefisien}
              onTambahKoefisienBaru={handleTambahPustakaBaru}
              onSave={
                item.status === "DIAJUKAN" && isSpekDisetujui
                  ? handleSaveKoefisien
                  : undefined
              }
            />
            
          </div>
        )}
      </div>

      {/* Modal Ubah Redaksi Spesifikasi (Hanya Kolom Terstruktur, Deskripsi Otomatis) */}
      {isEditRedaksiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-4">
            <div className="px-5 py-4 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Ubah Redaksi Spesifikasi Item
                </h3>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Perubahan hanya dilakukan pada kolom terstruktur. Deskripsi otomatis tersusun ulang oleh sistem.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditRedaksiOpen(false)}
                className="p-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRedaksi} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Nama Item / Pekerjaan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={redaksiForm.namaItem}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, namaItem: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={redaksiForm.kategori}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, kategori: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                {redaksiForm.kategori.toLowerCase().includes("cor") && (
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Jenis Cor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={redaksiForm.jenisCor}
                      onChange={(e) => setRedaksiForm((p) => ({ ...p, jenisCor: e.target.value }))}
                      placeholder="Site Mix / Ready Mix K-225..."
                      className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={redaksiForm.satuan}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, satuan: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Ukuran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={redaksiForm.ukuran}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, ukuran: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Merk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={redaksiForm.merk}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, merk: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Tipe</label>
                  <input
                    type="text"
                    value={redaksiForm.tipe}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, tipe: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Warna</label>
                  <input
                    type="text"
                    value={redaksiForm.warna}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, warna: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Permukaan</label>
                  <input
                    type="text"
                    value={redaksiForm.permukaan}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, permukaan: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Tebal</label>
                  <input
                    type="text"
                    value={redaksiForm.tebal}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, tebal: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Toleransi</label>
                  <input
                    type="text"
                    value={redaksiForm.toleransi}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, toleransi: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Lokasi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={redaksiForm.lokasi}
                    onChange={(e) => setRedaksiForm((p) => ({ ...p, lokasi: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-[#005BAC]"
                  />
                </div>
              </div>

              {/* Pratinjau Deskripsi Otomatis (Read-Only) */}
              <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    Pratinjau Deskripsi Otomatis
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold">
                    Otomatis (Read-Only)
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                  {buatDeskripsiOtomatis({
                    kategori: redaksiForm.kategori,
                    jenisCor: redaksiForm.kategori.toLowerCase().includes("cor")
                      ? redaksiForm.jenisCor
                      : "",
                    namaItem: redaksiForm.namaItem,
                    ukuran: redaksiForm.ukuran,
                    merk: redaksiForm.merk,
                    tipe: redaksiForm.tipe,
                    warna: redaksiForm.warna,
                    permukaan: redaksiForm.permukaan,
                    tebal: redaksiForm.tebal,
                    toleransi: redaksiForm.toleransi,
                    lokasi: redaksiForm.lokasi,
                    satuan: redaksiForm.satuan,
                  }) || "-"}
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditRedaksiOpen(false)}
                  disabled={isSavingRedaksi}
                  className="px-4 py-2 bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingRedaksi}
                  className="px-5 py-2 bg-[#005BAC] hover:bg-[#004585] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingRedaksi ? "Menyimpan..." : "Simpan Perubahan Redaksi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayoutShell>
  );
}
