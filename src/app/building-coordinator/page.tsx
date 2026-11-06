"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  RotateCcw,
  Building2,
} from "lucide-react";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanHargaTable } from "@/components/global/table/PengajuanHargaTable";
import { BuildingCoordHero } from "@/components/building-coordinator/BuildingCoordHero";
import { ModalCatatanApprover } from "@/components/building-coordinator/ModalCatatanApprover";
import { PengajuanHargaItem, UserSessionProfile } from "@/types";
import { getStoredPengajuan } from "@/lib/pengajuanStorage";

export default function BuildingCoordinatorDashboardPage() {
  // Tab State: 'siap_survei' | 'revisi' | 'diproses' | 'selesai'
  const [activeTab, setActiveTab] = useState<
    "siap_survei" | "revisi" | "diproses" | "selesai"
  >("siap_survei");

  // User & Data State
  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [items, setItems] = useState<PengajuanHargaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Catatan Review Approver State
  const [selectedCatatanItem, setSelectedCatatanItem] = useState<PengajuanHargaItem | null>(null);
  const [isCatatanModalOpen, setIsCatatanModalOpen] = useState(false);

  // Search & Filter State (strictly locked to user's branch, no branch dropdown)
  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("all");
  const [merkFilter, setMerkFilter] = useState("all");

  // Normalisasi Cabang
  const normalizeCabang = (val?: string | null) => {
    if (!val) return "";
    return val
      .toLowerCase()
      .replace(/^(cabang\s*)+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const isBranchMatch = (item: PengajuanHargaItem, userBranch: string) => {
    const cleanUser = normalizeCabang(userBranch);
    if (!cleanUser) return true;

    const cleanItemCabang = normalizeCabang(item.cabang);
    const cleanItemNamaCabang = normalizeCabang(item.namaCabang);

    return (
      cleanItemCabang.includes(cleanUser) ||
      cleanUser.includes(cleanItemCabang) ||
      cleanItemNamaCabang.includes(cleanUser) ||
      cleanUser.includes(cleanItemNamaCabang)
    );
  };

  // Load User Session & Pengajuan Data
  const fetchData = async () => {
    setIsLoading(true);
    let currentCabang = "Cikokol";

    try {
      // 1. Fetch User Session
      const userRes = await fetch("/api/auth/me?role=BUILDING_COORDINATOR");
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.success && userData.user) {
          setUser(userData.user);
          if (userData.user.namaCabang) {
            currentCabang = userData.user.namaCabang;
          }
        }
      }

      // 2. Fetch Tickets from API
      const res = await fetch("/api/pengajuan?role=BUILDING_COORDINATOR");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setItems(json.data);
          setIsLoading(false);
          return;
        }
      }

      // Fallback ke localStorage jika API kosong/offline
      const localData = getStoredPengajuan();
      setItems(localData);
    } catch (err) {
      console.warn("Gagal fetch data pengajuan:", err);
      const localData = getStoredPengajuan();
      setItems(localData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const userCabang = (user?.namaCabang || "Cikokol").replace(/^(cabang\s*)+/i, "").trim() || "Cikokol";

  // Filter Koleksi Data Berdasarkan Cabang Pengguna
  const branchScopedItems = useMemo(() => {
    return items.filter((item) => isBranchMatch(item, userCabang));
  }, [items, userCabang]);

  // Ekstrak Opsi Filter Kategori & Merk
  const kategoriOptions = useMemo(() => {
    const setKat = new Set<string>();
    branchScopedItems.forEach((i) => {
      if (i.kategori) setKat.add(i.kategori);
    });
    return Array.from(setKat);
  }, [branchScopedItems]);

  const merkOptions = useMemo(() => {
    const setMerk = new Set<string>();
    branchScopedItems.forEach((i) => {
      if (i.merk) setMerk.add(i.merk);
    });
    return Array.from(setMerk);
  }, [branchScopedItems]);

  // Filter Helper
  const applyFilters = (itemList: PengajuanHargaItem[]) => {
    return itemList.filter((item) => {
      if (kategoriFilter !== "all" && item.kategori !== kategoriFilter) {
        return false;
      }
      if (merkFilter !== "all" && item.merk !== merkFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const kode = (item.kode || item.kodeItem || item.noTiket || "").toLowerCase();
        const nama = (item.item || item.namaItem || "").toLowerCase();
        const merk = (item.merk || "").toLowerCase();
        const kategori = (item.kategori || "").toLowerCase();
        return (
          kode.includes(q) ||
          nama.includes(q) ||
          merk.includes(q) ||
          kategori.includes(q)
        );
      }
      return true;
    });
  };

  // 1. Data Siap Survei
  const itemsSiapSurveiRaw = useMemo(() => {
    return branchScopedItems.filter((item) => item.status === "SIAP_SURVEI");
  }, [branchScopedItems]);
  const itemsSiapSurvei = useMemo(
    () => applyFilters(itemsSiapSurveiRaw),
    [itemsSiapSurveiRaw, search, kategoriFilter, merkFilter]
  );

  // 2. Data Perlu Revisi Survei (RETURNED_TO_BC)
  const itemsRevisiRaw = useMemo(() => {
    return branchScopedItems.filter((item) => item.status === "RETURNED_TO_BC");
  }, [branchScopedItems]);
  const itemsRevisi = useMemo(
    () => applyFilters(itemsRevisiRaw),
    [itemsRevisiRaw, search, kategoriFilter, merkFilter]
  );

  // 3. Data Sedang Diproses (Layer 1 - 4 Approval)
  const itemsDiprosesRaw = useMemo(() => {
    return branchScopedItems.filter((item) => {
      return (
        item.status === "PENDING_BM_MGR" ||
        item.status === "PENDING_SB_SPECIALIST" ||
        item.status === "PENDING_REGIONAL_MGR" ||
        item.status === "PENDING_KONTRAKTOR" ||
        item.status === "USULAN_KONTRAKTOR"
      );
    });
  }, [branchScopedItems]);
  const itemsDiproses = useMemo(
    () => applyFilters(itemsDiprosesRaw),
    [itemsDiprosesRaw, search, kategoriFilter, merkFilter]
  );

  // 4. Data Selesai & Rilis
  const itemsSelesaiRaw = useMemo(() => {
    return branchScopedItems.filter((item) => item.status === "RELEASED");
  }, [branchScopedItems]);
  const itemsSelesai = useMemo(
    () => applyFilters(itemsSelesaiRaw),
    [itemsSelesaiRaw, search, kategoriFilter, merkFilter]
  );

  const handleResetFilters = () => {
    setSearch("");
    setKategoriFilter("all");
    setMerkFilter("all");
  };

  const handleOpenCatatan = (item: PengajuanHargaItem) => {
    setSelectedCatatanItem(item);
    setIsCatatanModalOpen(true);
  };

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "Building Coordinator", href: "/building-coordinator" },
        { label: "Survei Pasar" },
      ]}
    >
      <div className="space-y-6">
        {/* Hero Section */}
        <BuildingCoordHero
          countSiapSurvei={itemsSiapSurveiRaw.length}
          countRevisi={itemsRevisiRaw.length}
          countDiproses={itemsDiprosesRaw.length}
          countSelesai={itemsSelesaiRaw.length}
          userCabang={userCabang}
        />

        {/* Tab Selector & Search Toolbar (Solid Standard) */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* 4 Solid Tab Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab("siap_survei")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border-2 cursor-pointer ${
                  activeTab === "siap_survei"
                    ? "bg-white border-[#005BAC] text-[#005BAC] shadow-xs"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <ClipboardList className="w-4 h-4 text-amber-600" />
                <span>Siap Survei</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "siap_survei"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {itemsSiapSurveiRaw.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("revisi")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border-2 cursor-pointer ${
                  activeTab === "revisi"
                    ? "bg-white border-[#005BAC] text-[#005BAC] shadow-xs"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Perlu Revisi</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "revisi"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {itemsRevisiRaw.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("diproses")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border-2 cursor-pointer ${
                  activeTab === "diproses"
                    ? "bg-white border-[#005BAC] text-[#005BAC] shadow-xs"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Sedang Diproses</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "diproses"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {itemsDiprosesRaw.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("selesai")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border-2 cursor-pointer ${
                  activeTab === "selesai"
                    ? "bg-white border-[#005BAC] text-[#005BAC] shadow-xs"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Selesai &amp; Rilis</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "selesai"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {itemsSelesaiRaw.length}
                </span>
              </button>
            </div>

            {/* Locked Branch Indicator Badge (Per User Rule: No Free Branch Dropdown) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Wilayah Tugas:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005BAC] text-white font-extrabold text-xs rounded-xl shadow-2xs">
                <Building2 className="w-3.5 h-3.5" />
                <span>Cabang {userCabang}</span>
              </span>
            </div>
          </div>

          {/* Search & Secondary Filters Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t-2 border-slate-200">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode tiket, nama material, merk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-white border-2 border-slate-300 text-slate-900 focus:border-[#005BAC] outline-none"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={kategoriFilter}
                onChange={(e) => setKategoriFilter(e.target.value)}
                className="h-9 px-3 text-xs font-bold rounded-xl bg-white border-2 border-slate-300 text-slate-700 focus:border-[#005BAC] outline-none cursor-pointer"
              >
                <option value="all">Semua Kategori</option>
                {kategoriOptions.map((kat) => (
                  <option key={kat} value={kat}>
                    {kat}
                  </option>
                ))}
              </select>

              <select
                value={merkFilter}
                onChange={(e) => setMerkFilter(e.target.value)}
                className="h-9 px-3 text-xs font-bold rounded-xl bg-white border-2 border-slate-300 text-slate-700 focus:border-[#005BAC] outline-none cursor-pointer"
              >
                <option value="all">Semua Merk</option>
                {merkOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {(search || kategoriFilter !== "all" || merkFilter !== "all") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 bg-white border-2 border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Reset Filter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabel Data Sesuai Tab Aktif */}
        {activeTab === "siap_survei" && (
          <PengajuanHargaTable
            items={itemsSiapSurvei}
            loading={isLoading}
            title="Daftar Material Menunggu Survei Fisik 3 Toko"
            showTanggal={true}
            showCabang={false}
            showStatus={true}
            showHarga={false}
            showCatatanReview={false}
            emptyTitle="Tidak Ada Material Menunggu Survei"
            emptyDescription="Semua material di cabang ini sudah disurvei atau belum diverifikasi oleh S&B Specialist."
            onResetFilter={handleResetFilters}
            getDetailHref={(item) => `/building-coordinator/${item.id}`}
          />
        )}

        {activeTab === "revisi" && (
          <PengajuanHargaTable
            items={itemsRevisi}
            loading={isLoading}
            title="Daftar Pengajuan Perlu Perbaikan Survei dari B&M Manager"
            showTanggal={true}
            showCabang={false}
            showStatus={true}
            showHarga={true}
            showCatatanReview={true}
            onViewCatatan={(item) => handleOpenCatatan(item)}
            emptyTitle="Tidak Ada Tiket Revisi Survei"
            emptyDescription="Tidak ada data survei toko yang dikembalikan oleh B&M Manager untuk diperbaiki."
            onResetFilter={handleResetFilters}
            getDetailHref={(item) => `/building-coordinator/${item.id}`}
          />
        )}

        {activeTab === "diproses" && (
          <PengajuanHargaTable
            items={itemsDiproses}
            loading={isLoading}
            title="Daftar Pengajuan Harga Sedang Diproses (Layer 1 - 4 Approval)"
            showTanggal={true}
            showCabang={false}
            showStatus={true}
            showHarga={true}
            showCatatanReview={false}
            emptyTitle="Belum Ada Pengajuan Diproses"
            emptyDescription="Tidak ada survei harga yang sedang berjalan dalam rantai verifikasi bertingkat."
            onResetFilter={handleResetFilters}
            getDetailHref={(item) => `/building-coordinator/${item.id}`}
          />
        )}

        {activeTab === "selesai" && (
          <PengajuanHargaTable
            items={itemsSelesai}
            loading={isLoading}
            title="Daftar Harga Resmi Selesai &amp; Rilis Master Katalog"
            showTanggal={true}
            showCabang={false}
            showStatus={true}
            showHarga={true}
            showCatatanReview={false}
            emptyTitle="Belum Ada Harga Selesai"
            emptyDescription="Belum ada material yang telah menyelesaikan seluruh kuorum rekanan dan disahkan."
            onResetFilter={handleResetFilters}
            getDetailHref={(item) => `/building-coordinator/${item.id}`}
          />
        )}
      </div>

      {/* Modal Catatan Pengembalian Survei */}
      <ModalCatatanApprover
        isOpen={isCatatanModalOpen}
        onClose={() => setIsCatatanModalOpen(false)}
        item={selectedCatatanItem}
      />
    </AppLayoutShell>
  );
}
