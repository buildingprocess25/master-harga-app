"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  MapPin,
  Phone,
  User,
  Plus,
  Search,
  Building2,
  ArrowLeft,
  X,
  CheckCircle2,
} from "lucide-react";
import Swal from "sweetalert2";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { UserSessionProfile } from "@/types";

interface MasterTokoItem {
  id: string;
  namaToko: string;
  alamat: string;
  kota: string;
  kontakPic?: string | null;
  telepon?: string | null;
  isActive: boolean;
  cabang?: {
    namaCabang: string;
    kodeCabang: string;
  };
}

export default function MasterTokoCabangPage() {
  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [stores, setStores] = useState<MasterTokoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal Tambah Toko State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [namaToko, setNamaToko] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kota, setKota] = useState("");
  const [kontakPic, setKontakPic] = useState("");
  const [telepon, setTelepon] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userRes = await fetch("/api/auth/me?role=BUILDING_COORDINATOR");
      if (userRes.ok) {
        const uJson = await userRes.json();
        if (uJson.success && uJson.user) {
          setUser(uJson.user);
          setKota(uJson.user.namaCabang || "Tangerang");
        }
      }

      const storeRes = await fetch("/api/master-toko");
      if (storeRes.ok) {
        const sJson = await storeRes.json();
        if (sJson.success && Array.isArray(sJson.data)) {
          setStores(sJson.data);
        }
      }
    } catch (err) {
      console.error("Error fetching master toko:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const userCabang = (user?.namaCabang || "Cikokol").replace(/^(cabang\s*)+/i, "").trim() || "Cikokol";

  const filteredStores = stores.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.namaToko.toLowerCase().includes(q) ||
      s.alamat.toLowerCase().includes(q) ||
      s.kota.toLowerCase().includes(q) ||
      (s.kontakPic && s.kontakPic.toLowerCase().includes(q))
    );
  });

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaToko.trim() || !alamat.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Nama toko dan alamat wajib diisi.",
        confirmButtonColor: "#005BAC",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/master-toko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaToko,
          alamat,
          kota: kota || userCabang,
          kontakPic,
          telepon,
        }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.message || "Gagal menambah master toko.");
      }

      Swal.fire({
        icon: "success",
        title: "Toko Berhasil Ditambahkan!",
        text: `Toko "${namaToko}" telah terdaftar pada direktori cabang ${userCabang}.`,
        confirmButtonColor: "#005BAC",
      });

      // Reset Form
      setNamaToko("");
      setAlamat("");
      setKontakPic("");
      setTelepon("");
      setIsModalOpen(false);

      fetchData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text: err.message || "Terjadi kesalahan server.",
        confirmButtonColor: "#D62828",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "Building Coordinator", href: "/building-coordinator" },
        { label: "Master Toko Lokal" },
      ]}
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#005BAC] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Store className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  Master Toko Material Lokal
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#005BAC] text-white">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Cabang {userCabang}</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Direktori toko dan supplier bahan bangunan fisik terverifikasi untuk survei berkala cabang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/building-coordinator"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-slate-300 hover:border-slate-800 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#005BAC] hover:bg-[#004A8D] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Toko Baru</span>
            </button>
          </div>
        </div>

        {/* Toolbar Search */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama toko, alamat, kota, atau PIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-white border-2 border-slate-300 text-slate-900 focus:border-[#005BAC] outline-none"
            />
          </div>

          <span className="text-xs font-bold text-slate-500">
            Total {filteredStores.length} Toko Terdaftar
          </span>
        </div>

        {/* Grid Daftar Toko */}
        {isLoading ? (
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[#005BAC] border-t-transparent rounded-full mb-3" />
            <p className="text-xs font-bold text-slate-600">Memuat direktori toko...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-12 text-center shadow-2xs">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-800">Belum Ada Toko Terdaftar</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tidak ada data toko material yang sesuai dengan pencarian Anda pada cabang {userCabang}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.map((toko, idx) => (
              <div
                key={toko.id}
                className="bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b-2 border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-[#005BAC] font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h3 className="font-black text-slate-900 text-sm truncate max-w-[200px]">
                        {toko.namaToko}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>Aktif</span>
                    </span>
                  </div>

                  <div className="pt-2 space-y-2 text-xs text-slate-600 font-medium">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-800 line-clamp-2">
                        {toko.alamat}, {toko.kota}
                      </span>
                    </div>

                    {toko.kontakPic && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>PIC: <strong className="text-slate-900">{toko.kontakPic}</strong></span>
                      </div>
                    )}

                    {toko.telepon && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-700">{toko.telepon}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t-2 border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Wilayah: <strong>{toko.cabang?.namaCabang || userCabang}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tambah Toko Baru (Solid Standard) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-none flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border-2 border-slate-300 overflow-hidden flex flex-col">
            <div className="bg-slate-100 px-5 py-4 border-b-2 border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#005BAC] text-white flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Tambah Toko Material Baru
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Daftarkan toko fisik untuk cabang {userCabang}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStore} className="p-5 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Nama Toko / Supplier Material <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TB Sinar Makmur Serpong"
                  value={namaToko}
                  onChange={(e) => setNamaToko(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-xl bg-white border-2 border-slate-300 focus:border-[#005BAC] outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Alamat Lengkap Toko <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Nama jalan, nomor, RT/RW, kelurahan, kecamatan"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full p-2.5 text-xs font-medium rounded-xl bg-white border-2 border-slate-300 focus:border-[#005BAC] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Kota / Wilayah
                  </label>
                  <input
                    type="text"
                    value={kota}
                    onChange={(e) => setKota(e.target.value)}
                    placeholder="Tangerang"
                    className="w-full h-9 px-3 text-xs font-semibold rounded-xl bg-white border-2 border-slate-300 focus:border-[#005BAC] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Nama PIC Toko
                  </label>
                  <input
                    type="text"
                    value={kontakPic}
                    onChange={(e) => setKontakPic(e.target.value)}
                    placeholder="Koh Alex / Ibu Maya"
                    className="w-full h-9 px-3 text-xs font-semibold rounded-xl bg-white border-2 border-slate-300 focus:border-[#005BAC] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="0812-xxxx-xxxx / 021-xxxxxxx"
                  className="w-full h-9 px-3 text-xs font-mono font-semibold rounded-xl bg-white border-2 border-slate-300 focus:border-[#005BAC] outline-none"
                />
              </div>

              <div className="pt-3 border-t-2 border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border-2 border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-[#005BAC] hover:bg-[#004A8D] text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Toko"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayoutShell>
  );
}
