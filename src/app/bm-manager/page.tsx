"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Search,
  Filter,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  Building,
  RotateCcw,
  Tag,
  ArrowUpRight,
} from "lucide-react";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { ModalRequestPenetapanHarga } from "@/components/bm-manager/ModalRequestPenetapanHarga";
import { UserSessionProfile, StatusPengajuanHarga, CakupanHarga } from "@/types";
import { formatTanggal } from "@/lib/utils";

interface TiketListItem {
  id: string;
  nomorTiket: string;
  divisiId: string;
  cabangId: string;
  cakupanHarga: CakupanHarga;
  status: StatusPengajuanHarga;
  tanggalPengajuan: string;
  divisi: {
    kodeDivisi: string;
    namaDivisi: string;
  };
  cabang: {
    kodeCabang: string;
    namaCabang: string;
  };
  wilayahCabang?: {
    kodeWilayah: string;
    namaWilayah: string;
  } | null;
  masterItem?: {
    kodeItem: string;
    namaItem: string;
    kategori: string;
    merk: string;
    ukuran: string;
    satuan: string;
  } | null;
}

const STATUS_CONFIG: Record<
  StatusPengajuanHarga,
  { label: string; bg: string; text: string }
> = {
  DRAFT: { label: "Draft", bg: "bg-slate-500", text: "text-white" },
  DIAJUKAN: { label: "Diajukan ke SNB", bg: "bg-[#005BAC]", text: "text-white" },
  SIAP_SURVEI: { label: "Siap Survei (BC)", bg: "bg-[#E0A800]", text: "text-slate-900" },
  RETURNED_TO_BC: { label: "Perlu Revisi Survei", bg: "bg-[#ED1C24]", text: "text-white" },
  PENDING_BM_MGR: { label: "Review Survei (BM)", bg: "bg-[#ED1C24]", text: "text-white" },
  PENDING_SB_SPECIALIST: { label: "Kalkulasi Margin (SNB)", bg: "bg-[#005BAC]", text: "text-white" },
  PENDING_REGIONAL_MGR: { label: "Review Regional (Layer 3)", bg: "bg-[#005BAC]", text: "text-white" },
  PENDING_KONTRAKTOR: { label: "Kuorum Rekanan (3x24h)", bg: "bg-slate-700", text: "text-white" },
  USULAN_KONTRAKTOR: { label: "Usulan Banding Vendor", bg: "bg-[#ED1C24]", text: "text-white" },
  DITOLAK_KONTRAKTOR: { label: "Kuorum Ditolak Vendor", bg: "bg-[#ED1C24]", text: "text-white" },
  PERLU_REVISI: { label: "Perlu Revisi", bg: "bg-[#ED1C24]", text: "text-white" },
  DITOLAK: { label: "Ditolak", bg: "bg-slate-800", text: "text-white" },
  RELEASED: { label: "Resmi Rilis (Aktif)", bg: "bg-[#0F8A5F]", text: "text-white" },
};

export default function BmManagerDashboardPage() {
  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [tikets, setTikets] = useState<TiketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterDivisi, setFilterDivisi] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCakupan, setFilterCakupan] = useState("ALL");

  useEffect(() => {
    fetchSession();
    fetchTikets();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.success && json.user) {
        setUser(json.user);
      }
    } catch {
      // Abaikan
    }
  };

  const fetchTikets = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterDivisi !== "ALL") query.append("divisiId", filterDivisi);
      if (filterStatus !== "ALL") query.append("status", filterStatus);
      if (filterCakupan !== "ALL") query.append("cakupan", filterCakupan);
      if (search) query.append("q", search);

      const res = await fetch(`/api/pengajuan?${query.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTikets(json.data);
      }
    } catch {
      // Abaikan
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTikets();
  };

  const handleResetFilters = () => {
    setSearch("");
    setFilterDivisi("ALL");
    setFilterStatus("ALL");
    setFilterCakupan("ALL");
    setTimeout(() => {
      fetchTikets();
    }, 50);
  };

  // Kalkulasi Metrik Kartu Ringkasan
  const totalPengajuan = tikets.length;
  const siapSurveiCount = tikets.filter((t) => t.status === "SIAP_SURVEI").length;
  const pendingBmCount = tikets.filter((t) => t.status === "PENDING_BM_MGR").length;
  const releasedCount = tikets.filter((t) => t.status === "RELEASED").length;

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "B&M Manager" },
        { label: "Dashboard Pengajuan Cabang" },
      ]}
    >
      {/* 1. Header Banner & Action Button */}
      <div className="bg-white rounded-xl border-2 border-slate-300 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF3FB] border-2 border-[#B8D8F3] text-[#005BAC] text-[11px] font-black uppercase tracking-wider mb-1">
            <Building className="w-3.5 h-3.5" />
            <span>Workspace B&M Manager &bull; {user?.namaCabang || "Cabang Cikokol"}</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
            Pengelolaan & Inisiasi Harga Satuan Cabang
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Kelola pengajuan harga baru, pembaruan existing, dan telaah hasil survei pasar 3 toko fisik.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-[#005BAC] hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Buat Pengajuan Harga</span>
        </button>
      </div>

      {/* 2. Empat Kartu Metrik Statistik Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border-2 border-slate-300 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Pengajuan</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {totalPengajuan}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Tiket terdaftar di cabang
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-slate-300 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Siap Survei (BC)</span>
            <Clock className="w-4 h-4 text-[#E0A800]" />
          </div>
          <div className="text-2xl font-black text-[#E0A800] mt-2 font-mono">
            {siapSurveiCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Sedang disurvei di pasar
          </div>
        </div>

        <div className={`bg-white rounded-xl border-2 p-4 shadow-xs ${
          pendingBmCount > 0 ? "border-[#ED1C24] bg-red-50/30" : "border-slate-300"
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={pendingBmCount > 0 ? "text-[#ED1C24]" : "text-slate-500"}>
              Review Survei (BM)
            </span>
            <AlertCircle className={`w-4 h-4 ${pendingBmCount > 0 ? "text-[#ED1C24]" : "text-slate-400"}`} />
          </div>
          <div className={`text-2xl font-black mt-2 font-mono ${
            pendingBmCount > 0 ? "text-[#ED1C24]" : "text-slate-900"
          }`}>
            {pendingBmCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {pendingBmCount > 0 ? "Memerlukan tindakan review Layer 1" : "Semua survei telah direview"}
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-slate-300 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Selesai Rilis</span>
            <CheckCircle2 className="w-4 h-4 text-[#0F8A5F]" />
          </div>
          <div className="text-2xl font-black text-[#0F8A5F] mt-2 font-mono">
            {releasedCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Aktif di Master Katalog
          </div>
        </div>
      </div>

      {/* 3. Bar Filter & Pencarian */}
      <div className="bg-white rounded-xl border-2 border-slate-300 p-4 shadow-xs">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Pencarian Keyword */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor tiket, nama item, atau merk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 font-medium focus:border-[#005BAC] focus:outline-hidden"
            />
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 font-semibold focus:border-[#005BAC] focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              <option value="DIAJUKAN">Diajukan ke SNB</option>
              <option value="SIAP_SURVEI">Siap Survei (BC)</option>
              <option value="PENDING_BM_MGR">Review Survei (BM)</option>
              <option value="PENDING_SB_SPECIALIST">Kalkulasi Margin (SNB)</option>
              <option value="PENDING_REGIONAL_MGR">Review Regional</option>
              <option value="PENDING_KONTRAKTOR">Kuorum Rekanan</option>
              <option value="RELEASED">Resmi Rilis</option>
            </select>
          </div>

          {/* Filter Cakupan */}
          <div>
            <select
              value={filterCakupan}
              onChange={(e) => setFilterCakupan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-slate-800 font-semibold focus:border-[#005BAC] focus:outline-hidden"
            >
              <option value="ALL">Semua Cakupan</option>
              <option value="INDUK_CABANG">Induk Cabang</option>
              <option value="KHUSUS_WILAYAH">Khusus Sub-Wilayah</option>
            </select>
          </div>

          {/* Tombol Terapkan & Reset */}
          <div className="flex items-center gap-1.5">
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-lg bg-[#005BAC] text-white font-bold hover:bg-blue-800 cursor-pointer text-center"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 rounded-lg border-2 border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Reset Filter"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* 4. Tabel Antrean Pengajuan Harga Cabang */}
      <div className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#005BAC]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Daftar Antrean Tiket Penetapan Harga
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500 font-mono">
            {tikets.length} Tiket
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 border-b-2 border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">No. Tiket</th>
                <th className="py-3 px-4">Item Pekerjaan / Material</th>
                <th className="py-3 px-4">Divisi</th>
                <th className="py-3 px-4">Cakupan Wilayah</th>
                <th className="py-3 px-4">Tanggal Pengajuan</th>
                <th className="py-3 px-4">Status Siklus</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    Memuat data antrean tiket...
                  </td>
                </tr>
              ) : tikets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-600 mb-1">Belum ada tiket pengajuan harga.</p>
                    <p className="text-[11px]">Gunakan tombol &quot;Buat Pengajuan Harga&quot; untuk menginisiasi permohonan baru.</p>
                  </td>
                </tr>
              ) : (
                tikets.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || {
                    label: t.status,
                    bg: "bg-slate-600",
                    text: "text-white",
                  };

                  const isPendingBm = t.status === "PENDING_BM_MGR";

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-blue-50/50 transition-colors ${
                        isPendingBm ? "bg-amber-50/40" : ""
                      }`}
                    >
                      {/* Nomor Tiket */}
                      <td className="py-3 px-4 font-mono font-bold text-[#005BAC]">
                        #{t.nomorTiket}
                      </td>

                      {/* Spesifikasi Item */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-tight">
                          {t.masterItem?.namaItem || "Spesifikasi Belum Ada"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t.masterItem?.kategori} &bull; {t.masterItem?.merk} &bull; {t.masterItem?.ukuran}
                        </div>
                      </td>

                      {/* Divisi */}
                      <td className="py-3 px-4">
                        <span className="font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 text-[10px]">
                          {t.divisi?.kodeDivisi || "BLD"}
                        </span>
                      </td>

                      {/* Cakupan Harga */}
                      <td className="py-3 px-4">
                        {t.cakupanHarga === "KHUSUS_WILAYAH" ? (
                          <div>
                            <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-amber-500 text-white uppercase tracking-wider inline-block">
                              Khusus Wilayah
                            </span>
                            <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                              {t.wilayahCabang?.namaWilayah || "Sub-Wilayah"}
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-blue-100 text-[#005BAC] border border-blue-200 uppercase tracking-wider">
                            Induk Cabang
                          </span>
                        )}
                      </td>

                      {/* Tanggal Pengajuan */}
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {formatTanggal(t.tanggalPengajuan)}
                      </td>

                      {/* Status Siklus Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider ${cfg.bg} ${cfg.text} shadow-2xs`}
                        >
                          {cfg.label}
                        </span>
                      </td>

                      {/* Tombol Aksi Detail */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/bm-manager/${t.id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            isPendingBm
                              ? "bg-[#ED1C24] hover:bg-red-700 text-white shadow-xs animate-pulse"
                              : "bg-white border-2 border-[#005BAC] text-[#005BAC] hover:bg-[#005BAC] hover:text-white"
                          }`}
                        >
                          <span>{isPendingBm ? "Review Survei" : "Detail"}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Inisiasi Penetapan Harga */}
      <ModalRequestPenetapanHarga
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTikets}
      />
    </AppLayoutShell>
  );
}
