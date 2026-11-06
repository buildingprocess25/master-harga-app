"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  ShieldCheck,
  Search,
  RotateCcw,
  Download,
  Plus,
  ChevronDown,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import Swal from "sweetalert2";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanHargaTable } from "@/components/global/table/PengajuanHargaTable";
import { TambahPengajuanModal } from "@/components/bm-manager/TambahPengajuanModal";
import { ReviewUlangSpesifikasiModal } from "@/components/bm-manager/ReviewUlangSpesifikasiModal";
import { ModalCatatanReview } from "@/components/bm-manager/ModalCatatanReview";
import {
  PengajuanHargaItem,
  PengajuanHargaFilterState,
  getKodeData,
  DAFTAR_CABANG_ALFAMART,
} from "@/types/pengajuan";
import {
  getStoredPengajuan,
  saveStoredPengajuan,
} from "@/lib/pengajuanStorage";
import { exportToCSV, exportToExcel } from "@/lib/export-utils";

export default function BMManagerPage() {
  // Tab State: 'materials' (Pengajuan Spesifikasi) vs 'approvals' (Persetujuan Harga Layer 1)
  const [activeTab, setActiveTab] = useState<"materials" | "approvals">("materials");

  // Master Data State
  const [items, setItems] = useState<PengajuanHargaItem[]>([]);
  const [isTambahModalOpen, setIsTambahModalOpen] = useState(false);
  const [isReviewUlangModalOpen, setIsReviewUlangModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PengajuanHargaItem | null>(null);
  const [viewingCatatanItem, setViewingCatatanItem] = useState<PengajuanHargaItem | null>(null);
  const [isCatatanModalOpen, setIsCatatanModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Filter & Search State
  const [selectedCabang, setSelectedCabang] = useState<string>("all");
  const [filters, setFilters] = useState<PengajuanHargaFilterState>({
    search: "",
    kategori: "all",
    merk: "all",
    implementasi: "all",
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Load Data dari Route Handler /api/pengajuan (dengan fallback localStorage)
  const fetchItems = async (cabangTarget = selectedCabang) => {
    setIsLoading(true);
    try {
      const url =
        cabangTarget !== "all"
          ? `/api/pengajuan?cabang=${encodeURIComponent(cabangTarget)}`
          : `/api/pengajuan`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setItems(json.data);
        saveStoredPengajuan(json.data);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn("API route handler fetch warning, menggunakan penyimpanan lokal:", err);
    }

    const stored = getStoredPengajuan();
    setItems(stored);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems(selectedCabang);
  }, [selectedCabang]);

  // Dropdown Categories & Brands
  const categories = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.kategori).filter(Boolean)));
  }, [items]);

  const brands = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.merk).filter(Boolean)));
  }, [items]);

  // Filtered Items untuk Tab "Pengajuan Spesifikasi"
  const filteredMaterials = useMemo(() => {
    return items.filter((item) => {
      // Filter Cabang Pengaju: B&M Manager beroperasi per cabang
      const itemCabang = item.cabang || item.namaCabang;
      if (selectedCabang !== "all" && itemCabang && itemCabang !== selectedCabang) {
        return false;
      }

      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const kode = (item.kode || item.kodeItem || item.noTiket || "").toLowerCase();
        const kodeMaster = (item.kodeMaster || "").toLowerCase();
        const nama = (item.item || item.namaItem || "").toLowerCase();
        const merk = (item.merk || "").toLowerCase();
        const tipe = (item.tipe || "").toLowerCase();
        const warna = (item.warna || "").toLowerCase();
        const lokasi = (item.lokasi || "").toLowerCase();
        const kat = (item.kategori || "").toLowerCase();
        const cab = (itemCabang || "").toLowerCase();
        const desc = (item.deskripsiOtomatis || "").toLowerCase();

        const match =
          kode.includes(q) ||
          kodeMaster.includes(q) ||
          nama.includes(q) ||
          merk.includes(q) ||
          tipe.includes(q) ||
          warna.includes(q) ||
          lokasi.includes(q) ||
          kat.includes(q) ||
          cab.includes(q) ||
          desc.includes(q);

        if (!match) return false;
      }

      if (filters.kategori !== "all" && item.kategori !== filters.kategori) return false;
      if (filters.merk && filters.merk !== "all" && item.merk !== filters.merk) return false;
      if (filters.implementasi && filters.implementasi !== "all" && item.implementasi !== filters.implementasi) {
        return false;
      }

      return true;
    });
  }, [items, filters, selectedCabang]);

  // Items Pending Approval Layer 1 (Survei Harga dari Building Coordinator)
  const pendingApprovals = useMemo(() => {
    return items.filter((i) => {
      if (i.status !== "PENDING_BM_MGR") return false;
      const itemCabang = i.cabang || i.namaCabang;
      if (selectedCabang !== "all" && itemCabang && itemCabang !== selectedCabang) {
        return false;
      }
      return true;
    });
  }, [items, selectedCabang]);

  const filteredPendingApprovals = useMemo(() => {
    if (!filters.search.trim()) return pendingApprovals;
    const q = filters.search.toLowerCase();
    return pendingApprovals.filter((i) => {
      const kode = (i.kode || i.kodeItem || i.noTiket || "").toLowerCase();
      const nama = (i.item || i.namaItem || "").toLowerCase();
      const merk = (i.merk || "").toLowerCase();
      const lokasi = (i.lokasi || "").toLowerCase();
      const cab = (i.cabang || i.namaCabang || "").toLowerCase();

      return (
        kode.includes(q) ||
        nama.includes(q) ||
        merk.includes(q) ||
        lokasi.includes(q) ||
        cab.includes(q)
      );
    });
  }, [pendingApprovals, filters.search]);

  // Handlers
  const handleOpenCatatanModal = (item: PengajuanHargaItem) => {
    setViewingCatatanItem(item);
    setIsCatatanModalOpen(true);
  };

  const handleAddItem = async (newItem: PengajuanHargaItem) => {
    const itemsToCheck = editingItem
      ? items.filter((i) => i.id !== editingItem.id && i.id !== newItem.id)
      : items.filter((i) => i.id !== newItem.id);

    const check = getKodeData({
      kategori: newItem.kategori,
      item: newItem.item || newItem.namaItem,
      implementasi: newItem.implementasi,
      lokasi: newItem.lokasi || "",
      ukuran: newItem.ukuran,
      merk: newItem.merk,
      warna: newItem.warna,
      tipe: newItem.tipe,
      permukaan: newItem.permukaan,
      tebal: newItem.tebal,
      toleransi: newItem.toleransi,
      existingItems: itemsToCheck,
    });

    if (check.isDuplicate && !editingItem) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Data spesifikasi material sudah terdaftar.",
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    const actualCabang =
      newItem.cabang ||
      newItem.namaCabang ||
      (selectedCabang !== "all" ? selectedCabang : "Cikokol");

    if (editingItem || items.some((i) => i.id === newItem.id)) {
      // Mode Edit / Resubmit via PATCH Route Handler
      try {
        const patchRes = await fetch(`/api/pengajuan/${newItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item: newItem.item || newItem.namaItem,
            namaItem: newItem.namaItem || newItem.item,
            kategori: newItem.kategori,
            merk: newItem.merk,
            ukuran: newItem.ukuran,
            tipe: newItem.tipe,
            warna: newItem.warna,
            permukaan: newItem.permukaan,
            tebal: newItem.tebal,
            toleransi: newItem.toleransi,
            lokasi: newItem.lokasi,
            satuan: newItem.satuan,
            cakupanHarga: newItem.cakupanHarga || "INDUK_CABANG",
            alasanPengajuan: newItem.alasanPengajuan,
          }),
        });
        const patchJson = await patchRes.json();
        if (patchRes.ok && patchJson.success) {
          await fetchItems(selectedCabang);
          setEditingItem(null);
          Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: "Pengajuan berhasil diajukan ulang ke server.",
            confirmButtonColor: "#ED1C24",
          });
          return;
        }
      } catch (err) {
        console.warn("PATCH API error, fallback ke penyimpanan lokal:", err);
      }

      // Fallback lokal
      const updated = items.map((i) => (i.id === newItem.id ? newItem : i));
      setItems(updated);
      saveStoredPengajuan(updated);
      setEditingItem(null);
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Pengajuan berhasil diajukan ulang.",
        confirmButtonColor: "#ED1C24",
      });
      return;
    }

    // New item via POST Route Handler
    try {
      const postRes = await fetch("/api/pengajuan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "new",
          item: newItem.item || newItem.namaItem,
          namaItem: newItem.namaItem || newItem.item,
          kategori: newItem.kategori,
          merk: newItem.merk,
          ukuran: newItem.ukuran,
          tipe: newItem.tipe,
          warna: newItem.warna,
          permukaan: newItem.permukaan,
          tebal: newItem.tebal,
          toleransi: newItem.toleransi,
          lokasi: newItem.lokasi,
          satuan: newItem.satuan,
          cabang: actualCabang,
          cakupanHarga: newItem.cakupanHarga || "INDUK_CABANG",
          alasanPengajuan: newItem.alasanPengajuan,
        }),
      });

      const postJson = await postRes.json();
      if (postRes.ok && postJson.success) {
        await fetchItems(selectedCabang);
        Swal.fire({
          icon: "success",
          title: "Material Diajukan",
          text:
            postJson.message ||
            "Material baru berhasil diajukan ke antrean verifikasi S&B Controller.",
          confirmButtonColor: "#ED1C24",
        });
        return;
      }
    } catch (err) {
      console.warn("POST API error, fallback ke penyimpanan lokal:", err);
    }

    // Fallback lokal
    const itemWithStatus: PengajuanHargaItem = {
      ...newItem,
      cabang: actualCabang,
      namaCabang: actualCabang,
      kode: newItem.kode || check.kodeItem,
      kodeMaster: newItem.kodeMaster || check.kodeMaster,
      status: "DIAJUKAN",
      tanggalPengajuan:
        newItem.tanggalPengajuan || new Date().toISOString().slice(0, 10),
    };

    const updated = [itemWithStatus, ...items];
    setItems(updated);
    saveStoredPengajuan(updated);

    Swal.fire({
      icon: "success",
      title: "Material Diajukan",
      text: "Material baru berhasil diajukan ke antrean verifikasi S&B Controller.",
      confirmButtonColor: "#ED1C24",
    });
  };

  const handleResetFilters = () => {
    setSelectedCabang("all");
    setFilters({
      search: "",
      kategori: "all",
      merk: "all",
      implementasi: "all",
    });
  };

  // Export Handlers
  const handleExportCSV = () => {
    const targetData = activeTab === "materials" ? filteredMaterials : filteredPendingApprovals;
    if (targetData.length === 0) {
      Swal.fire({ icon: "warning", title: "Data Kosong", text: "Tidak ada data untuk diunduh.", confirmButtonColor: "#ED1C24" });
      return;
    }
    exportToCSV(targetData);
    setIsExportDropdownOpen(false);
  };

  const handleExportExcel = () => {
    const targetData = activeTab === "materials" ? filteredMaterials : filteredPendingApprovals;
    if (targetData.length === 0) {
      Swal.fire({ icon: "warning", title: "Data Kosong", text: "Tidak ada data untuk diunduh.", confirmButtonColor: "#ED1C24" });
      return;
    }
    exportToExcel(targetData);
    setIsExportDropdownOpen(false);
  };

  return (
    <AppLayoutShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "B&M Manager" },
      ]}
    >
      <div className="space-y-5">
        {/* Tab Switcher Navigation */}
        <div className="flex items-center gap-2 border-b-2 border-slate-200">
          <button
            onClick={() => setActiveTab("materials")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs md:text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "materials"
                ? "border-red-600 text-red-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Pengajuan Spesifikasi</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "materials"
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {filteredMaterials.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("approvals")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs md:text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "approvals"
                ? "border-red-600 text-red-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Persetujuan Harga</span>
            {pendingApprovals.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-600 text-white">
                {pendingApprovals.length} Menunggu
              </span>
            )}
          </button>
        </div>

        {/* Search, Filter & Action Toolbar */}
        <div className="bg-white p-3.5 rounded-xl border-2 border-slate-300 shadow-2xs flex flex-col xl:flex-row gap-2.5 items-stretch xl:items-center justify-between">
          {/* Left: Search & Filter Selects */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-1 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Cari kode, material, merk, kategori..."
                className="w-full pl-9 pr-3 h-9 rounded-lg text-xs border-2 border-slate-300 bg-white text-slate-800 focus:border-red-600 focus:outline-none"
              />
            </div>

            {/* Filter Cabang Dropdown */}
            <div className="w-full sm:w-40">
              <select
                value={selectedCabang}
                onChange={(e) => setSelectedCabang(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-xs border-2 border-slate-300 bg-white text-slate-800 font-bold focus:border-red-600 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Cabang</option>
                {DAFTAR_CABANG_ALFAMART.map((c) => (
                  <option key={c} value={c}>
                    Cabang {c}
                  </option>
                ))}
              </select>
            </div>

            {activeTab === "materials" && (
              <>
                {/* Kategori Filter */}
                <div className="w-full sm:w-40">
                  <select
                    value={filters.kategori}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, kategori: e.target.value }))
                    }
                    className="w-full h-9 px-3 rounded-lg text-xs border-2 border-slate-300 bg-white text-slate-800 font-medium focus:border-red-600 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Kategori</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Merk Filter */}
                <div className="w-full sm:w-36">
                  <select
                    value={filters.merk}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, merk: e.target.value }))
                    }
                    className="w-full h-9 px-3 rounded-lg text-xs border-2 border-slate-300 bg-white text-slate-800 font-medium focus:border-red-600 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Merk</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Implementasi / Posisi Filter */}
                <div className="w-full sm:w-36">
                  <select
                    value={filters.implementasi}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        implementasi: e.target.value,
                      }))
                    }
                    className="w-full h-9 px-3 rounded-lg text-xs border-2 border-slate-300 bg-white text-slate-800 font-medium focus:border-red-600 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Posisi</option>
                    <option value="Lantai">Lantai</option>
                    <option value="Dinding">Dinding</option>
                    <option value="Lantai Gerai">Lantai Gerai</option>
                    <option value="Dinding Gerai">Dinding Gerai</option>
                  </select>
                </div>
              </>
            )}

            {/* Reset Filters */}
            {(filters.search ||
              selectedCabang !== "all" ||
              filters.kategori !== "all" ||
              filters.merk !== "all" ||
              filters.implementasi !== "all") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-3 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 border-2 border-slate-200 hover:border-slate-300 flex items-center gap-1.5 cursor-pointer bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right: Export & Tambah Pengajuan Actions */}
          <div className="flex items-center gap-2 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100 relative">
            {/* Export Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportDropdownOpen((prev) => !prev)}
                className="h-9 px-3 rounded-lg text-xs font-bold text-slate-700 bg-white border-2 border-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Data</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {isExportDropdownOpen && (
                <div className="absolute right-0 top-11 w-48 bg-white border-2 border-slate-300 rounded-xl shadow-xl z-30 p-1">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Unduh CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Unduh Excel (.xls)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tambah Pengajuan Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="h-9 px-3.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pengajuan</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-11 w-64 bg-white border-2 border-slate-300 rounded-xl shadow-xl z-30 p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setIsTambahModalOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left p-2 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Pengajuan Baru</div>
                      <div className="text-[11px] text-slate-500 font-normal">Input spesifikasi material baru</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsReviewUlangModalOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left p-2 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Review Ulang Spesifikasi</div>
                      <div className="text-[11px] text-slate-500 font-normal">Dari katalog master harga resmi</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TAB 1: Daftar Spesifikasi Material */}
        {activeTab === "materials" && (
          <PengajuanHargaTable
            items={filteredMaterials}
            showStatus={true}
            showHarga={false}
            title={
              selectedCabang === "all"
                ? "Daftar Spesifikasi Material (Semua Cabang)"
                : `Daftar Spesifikasi Material - Cabang ${selectedCabang}`
            }
            getDetailHref={(item) => `/bm-manager/${item.id}`}
            onResetFilter={handleResetFilters}
            onViewCatatan={handleOpenCatatanModal}
          />
        )}

        {/* TAB 2: Review Approval Layer 1 Persetujuan Harga */}
        {activeTab === "approvals" && (
          <PengajuanHargaTable
            items={filteredPendingApprovals}
            showStatus={true}
            showHarga={true}
            title={
              selectedCabang === "all"
                ? "Daftar Pengajuan Harga (Semua Cabang)"
                : `Daftar Pengajuan Harga - Cabang ${selectedCabang}`
            }
            onResetFilter={handleResetFilters}
            getDetailHref={(item) => `/bm-manager/${item.id}`}
            onViewCatatan={handleOpenCatatanModal}
          />
        )}
      </div>

      {/* Modal Tambah Spesifikasi Baru / Edit Resubmit */}
      <TambahPengajuanModal
        isOpen={isTambahModalOpen}
        onClose={() => setIsTambahModalOpen(false)}
        onSubmit={handleAddItem}
        nextIndex={items.length + 1}
        existingItems={items}
        itemToEdit={editingItem}
      />

      {/* Modal Review Ulang Spesifikasi (Khusus Item dari Master Katalog) */}
      <ReviewUlangSpesifikasiModal
        isOpen={isReviewUlangModalOpen}
        onClose={() => setIsReviewUlangModalOpen(false)}
        onSubmit={handleAddItem}
        existingItems={items}
      />

      {/* Modal Catatan S&B (Ringkas) */}
      <ModalCatatanReview
        isOpen={isCatatanModalOpen}
        onClose={() => setIsCatatanModalOpen(false)}
        item={viewingCatatanItem}
      />
    </AppLayoutShell>
  );
}
