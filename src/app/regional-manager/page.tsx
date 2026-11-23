"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ClipboardCheck,
  Vote,
  Search,
  RotateCcw,
  Building2,
} from "lucide-react";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanHargaTable } from "@/components/global/table/PengajuanHargaTable";
import { PengajuanHargaItem, UserSessionProfile } from "@/types";
import { getStoredPengajuan } from "@/lib/pengajuanStorage";

export default function RegionalManagerDashboardPage() {
  // Tab State: 'approval' | 'kuorum'
  const [activeTab, setActiveTab] = useState<"approval" | "kuorum">("approval");

  // User & Data State
  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [items, setItems] = useState<PengajuanHargaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("all");
  const [cabangFilter, setCabangFilter] = useState("all");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch User Session
      const userRes = await fetch("/api/auth/me?role=REGIONAL_MANAGER");
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.success && userData.user) {
          setUser(userData.user);
        }
      }

      // 2. Fetch Tickets from API
      const res = await fetch("/api/pengajuan?role=REGIONAL_MANAGER");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setItems(json.data);
          setIsLoading(false);
          return;
        }
      }

      // Fallback local storage
      const localData = getStoredPengajuan();
      setItems(localData);
    } catch (err) {
      console.warn("Gagal memuat data pengajuan:", err);
      const localData = getStoredPengajuan();
      setItems(localData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Helper
  const applyFilters = (itemList: PengajuanHargaItem[]) => {
    return itemList.filter((item) => {
      if (kategoriFilter !== "all" && item.kategori !== kategoriFilter) {
        return false;
      }
      if (cabangFilter !== "all") {
        const cName = (item.namaCabang || item.cabang || "").toLowerCase();
        if (!cName.includes(cabangFilter.toLowerCase())) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const noTiket = (item.noTiket || "").toLowerCase();
        const nama = (item.namaItem || item.item || "").toLowerCase();
        const merk = (item.merk || "").toLowerCase();
        const kode = (item.kodeItem || item.kode || "").toLowerCase();
        const cabang = (item.namaCabang || item.cabang || "").toLowerCase();

        if (
          !noTiket.includes(q) &&
          !nama.includes(q) &&
          !merk.includes(q) &&
          !kode.includes(q) &&
          !cabang.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  };

  // 1. Tab Menunggu Persetujuan Layer 3 (Status PENDING_REGIONAL_MGR)
  const itemsApprovalRaw = useMemo(() => {
    return items.filter((item) => item.status === "PENDING_REGIONAL_MGR");
  }, [items]);
  const itemsApproval = useMemo(
    () => applyFilters(itemsApprovalRaw),
    [itemsApprovalRaw, search, kategoriFilter, cabangFilter]
  );

  // 2. Tab Review Kontraktor / Gagal Kuorum (Status DITOLAK_KONTRAKTOR, USULAN_KONTRAKTOR, PENDING_KONTRAKTOR)
  const itemsKuorumRaw = useMemo(() => {
    return items.filter(
      (item) =>
        item.status === "PENDING_KONTRAKTOR" ||
        item.status === "USULAN_KONTRAKTOR" ||
        item.status === "DITOLAK_KONTRAKTOR"
    );
  }, [items]);
  const itemsKuorum = useMemo(
    () => applyFilters(itemsKuorumRaw),
    [itemsKuorumRaw, search, kategoriFilter, cabangFilter]
  );

  // Ekstrak Opsi Filter Kategori & Cabang
  const kategoriOptions = useMemo(() => {
    const setKat = new Set<string>();
    items.forEach((i) => {
      if (i.kategori) setKat.add(i.kategori);
    });
    return Array.from(setKat);
  }, [items]);

  const cabangOptions = useMemo(() => {
    const setCab = new Set<string>();
    items.forEach((i) => {
      const c = i.namaCabang || i.cabang;
      if (c) setCab.add(c.replace(/^(cabang\s*)+/i, "").trim());
    });
    return Array.from(setCab);
  }, [items]);

  const handleResetFilters = () => {
    setSearch("");
    setKategoriFilter("all");
    setCabangFilter("all");
  };

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "Regional Manager", href: "/regional-manager" },
        { label: "Persetujuan" },
      ]}
    >
      <div className="space-y-6">
        {/* Hero Section Bersih & Tegas */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#005BAC] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  B&amp;M Regional Manager
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Persetujuan harga satuan dan penawaran kontraktor.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white border-2 border-rose-400 rounded-xl px-3.5 py-2 text-center min-w-[100px] shadow-2xs">
              <span className="text-[11px] text-rose-800 font-extrabold block uppercase tracking-wider">
                Perlu Persetujuan
              </span>
              <span className="text-xl font-black text-rose-900 leading-tight">
                {itemsApprovalRaw.length}
              </span>
            </div>

            <div className="bg-white border-2 border-blue-400 rounded-xl px-3.5 py-2 text-center min-w-[100px] shadow-2xs">
              <span className="text-[11px] text-blue-800 font-extrabold block uppercase tracking-wider">
                Penawaran Kontraktor
              </span>
              <span className="text-xl font-black text-blue-900 leading-tight">
                {itemsKuorumRaw.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector & Toolbar Pencarian */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* 2 Tab Utama */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab("approval")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border-2 cursor-pointer ${
                  activeTab === "approval"
                    ? "bg-white border-[#005BAC] text-[#005BAC] shadow-xs"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <ClipboardCheck className="w-4 h-4 text-rose-600" />
                <span>Menunggu Persetujuan</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "approval"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {itemsApprovalRaw.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("kuorum")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border-2 cursor-pointer ${
                  activeTab === "kuorum"
                    ? "bg-white border-[#005BAC] text-[#005BAC] shadow-xs"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Vote className="w-4 h-4 text-blue-600" />
                <span>Penawaran Kontraktor</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "kuorum"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {itemsKuorumRaw.length}
                </span>
              </button>
            </div>
          </div>

          {/* Toolbar Pencarian & Filter Sederhana */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t-2 border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari tiket, nama item, atau cabang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#005BAC] outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Cabang */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={cabangFilter}
                  onChange={(e) => setCabangFilter(e.target.value)}
                  className="bg-white border-2 border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#005BAC]"
                >
                  <option value="all">Semua Cabang</option>
                  {cabangOptions.map((c) => (
                    <option key={c} value={c}>
                      Cabang {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Kategori */}
              <select
                value={kategoriFilter}
                onChange={(e) => setKategoriFilter(e.target.value)}
                className="bg-white border-2 border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#005BAC]"
              >
                <option value="all">Semua Kategori</option>
                {kategoriOptions.map((kat) => (
                  <option key={kat} value={kat}>
                    {kat}
                  </option>
                ))}
              </select>

              {(search || kategoriFilter !== "all" || cabangFilter !== "all") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
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
        {activeTab === "approval" && (
          <PengajuanHargaTable
            items={itemsApproval}
            loading={isLoading}
            title="Pengajuan Menunggu Persetujuan"
            showTanggal={true}
            showCabang={true}
            showStatus={true}
            showHarga={true}
            showCatatanReview={false}
            emptyTitle="Tidak Ada Pengajuan"
            emptyDescription="Belum ada pengajuan harga yang perlu disetujui."
            onResetFilter={handleResetFilters}
            getDetailHref={(item) => `/regional-manager/${item.id}`}
          />
        )}

        {activeTab === "kuorum" && (
          <PengajuanHargaTable
            items={itemsKuorum}
            loading={isLoading}
            title="Penawaran Kontraktor"
            showTanggal={true}
            showCabang={true}
            showStatus={true}
            showHarga={true}
            showCatatanReview={true}
            emptyTitle="Tidak Ada Data"
            emptyDescription="Belum ada penawaran kontraktor yang sedang berjalan."
            onResetFilter={handleResetFilters}
            getDetailHref={(item) => `/regional-manager/${item.id}`}
          />
        )}
      </div>
    </AppLayoutShell>
  );
}
