"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Akun Pengujian Whitelist dari Seeder untuk kemudahan klik isi cepat
const SAMPLE_WHITELIST_ACCOUNTS = [
  { label: "Building Coord (Cikokol)", email: "bc.cikokol@alfamart.co.id", role: "BC" },
  { label: "B&M Manager (Cikokol)", email: "bm.cikokol@alfamart.co.id", role: "BM" },
  { label: "S&B Specialist (HO)", email: "snb.specialist@alfamart.co.id", role: "SNB" },
  { label: "Regional Manager", email: "reg.manager1@alfamart.co.id", role: "RM" },
  { label: "Kontraktor (PT Cahaya)", email: "vendor.cahaya@rekanan.com", role: "Vendor" },
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successInfo, setSuccessInfo] = useState<{
    fullName: string;
    role: string;
    targetUrl: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Silakan masukkan alamat email terdaftar.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(
          data.message ||
            "Akun belum terdaftar pada Whitelist SPARTA-HARGA. Silakan hubungi Tim S&B Controlling HO."
        );
        setLoading(false);
        return;
      }

      setSuccessInfo({
        fullName: data.user.fullName,
        role: data.user.role,
        targetUrl: data.targetUrl,
      });

      // Redirect otomatis ke workspace peran
      setTimeout(() => {
        router.push(data.targetUrl);
      }, 600);
    } catch {
      setErrorMessage("Terjadi kendala koneksi saat menghubungi server.");
      setLoading(false);
    }
  };

  const handleFillAccount = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword("password123");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full">
        {/* Card Form Login */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Header Brand Alfamart */}
          <div className="bg-white p-6 pb-4 border-b border-slate-100 text-center">
            <div className="flex justify-center mb-3">
              <Image
                src="/alfamart-logo.png"
                alt="Logo Alfamart"
                width={160}
                height={50}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#005BAC] text-[11px] font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SPARTA-HARGA</span>
            </div>
            <h1 className="text-base font-bold text-slate-900 leading-snug">
              Sistem Pengelolaan Master Harga
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Survei Pasar 3 Toko, AHSP Koefisien & Kuorum Rekanan
            </p>
          </div>

          {/* Form Area */}
          <div className="p-6 pt-5">
            {/* Alert Error */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-[#ED1C24] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block mb-0.5">Akses Ditolak</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Alert Success */}
            {successInfo && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-[#008A00] shrink-0" />
                <div>
                  <span className="font-bold">Selamat datang, {successInfo.fullName}</span>
                  <span className="block text-[11px] text-emerald-600 font-medium">
                    Mengarahkan ke workspace {successInfo.role}...
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Input Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block font-bold text-slate-700 mb-1"
                >
                  Email Akun Terdaftar
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@alfamart.co.id atau vendor@rekanan.com"
                    disabled={loading || !!successInfo}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC] transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block font-bold text-slate-700 mb-1"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading || !!successInfo}
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC] transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tombol Masuk */}
              <button
                type="submit"
                disabled={loading || !!successInfo}
                className="w-full py-2.5 px-4 rounded-lg bg-[#005BAC] hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Whitelist...</span>
                  </>
                ) : (
                  <span>Masuk ke Modul Harga</span>
                )}
              </button>
            </form>

            {/* Quick Fill Akun Seeder (Untuk Mempermudah Testing Tim) */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
                <Info className="w-3.5 h-3.5 text-[#005BAC]" />
                <span>Pilih Akun Whitelist Uji Coba:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_WHITELIST_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleFillAccount(acc.email)}
                    className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-[#005BAC] text-slate-700 border border-slate-200 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span className="font-bold text-[10px] text-slate-400">
                      [{acc.role}]
                    </span>
                    <span>{acc.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <p className="text-center text-[11px] text-slate-400 mt-4 leading-relaxed">
          PT Sumber Alfaria Trijaya Tbk &bull; Modul Terproteksi Whitelist S&B Controlling HO
          <br />
          Zero-Trust Security Standard
        </p>
      </div>
    </div>
  );
}
