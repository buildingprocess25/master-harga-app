"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Send, SlidersHorizontal, XCircle } from "lucide-react";
import { putuskanBandingAction } from "@/app/sb-specialist/actions";
import { konfirmasiAksi, notifikasi } from "@/components/pengajuan/konfirmasi";
import { cn, formatRupiah } from "@/lib/utils";

type Mode = "REVISI_MARGIN" | "PERTAHANKAN" | "TUTUP";

const OPSI = [
  {
    m: "REVISI_MARGIN",
    label: "Revisi harga",
    icon: SlidersHorizontal,
    aktif: "bg-[#EAF3FB] text-[#003A70] ring-2 ring-[#005BAC]",
    tombol: "bg-[#005BAC] hover:bg-[#004687]",
    info: "Usulan masuk akal. Tiket kembali ke evaluasi live margin agar harga baru disusun dari rincian AHSP, lalu dikirim ulang ke Regional.",
  },
  {
    m: "PERTAHANKAN",
    label: "Pertahankan harga",
    icon: Lock,
    aktif: "bg-[#FFF8DB] text-[#6E4B00] ring-2 ring-[#D99B00]",
    tombol: "bg-[#D99B00] hover:bg-[#B88300]",
    info: "Usulan tidak cukup beralasan. Harga tetap dan diteruskan ke Regional untuk membuka putaran berikutnya; rekanan yang sudah banding hanya dapat setuju atau tolak (tolak lagi berarti Parked).",
  },
  {
    m: "TUTUP",
    label: "Tutup pengajuan",
    icon: XCircle,
    aktif: "bg-[#FDECEE] text-[#990F14] ring-2 ring-[#D91920]",
    tombol: "bg-[#ED1C24] hover:bg-red-700",
    info: "Negosiasi tidak disepakati. Tiket ditutup permanen (DITOLAK).",
  },
] as const;

/** Kartu keputusan S&B Specialist atas usulan banding rekanan (USULAN_KONTRAKTOR). */
export function KeputusanBanding({
  tiketId,
  hargaDitawarkan,
  usulanRata,
}: {
  tiketId: string;
  hargaDitawarkan: number | null;
  usulanRata: number | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("REVISI_MARGIN");
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const aktif = OPSI.find((o) => o.m === mode)!;

  const kirim = async () => {
    setError("");
    if (catatan.trim().length < 5) {
      setError("Catatan evaluasi wajib diisi (minimal 5 karakter).");
      return;
    }
    const ok = await konfirmasiAksi(
      mode === "REVISI_MARGIN"
        ? {
            judul: "Revisi harga lewat evaluasi margin?",
            teks: `Rata-rata usulan rekanan ${formatRupiah(usulanRata)} vs harga ditawarkan ${formatRupiah(hargaDitawarkan)}. Tiket kembali ke PENDING_SB_SPECIALIST.`,
            tombol: "Ya, revisi",
            nada: "biru",
          }
        : mode === "PERTAHANKAN"
          ? {
              judul: "Pertahankan harga?",
              teks: `Harga ${formatRupiah(hargaDitawarkan)} diteruskan ke Regional Manager untuk membuka putaran voting berikutnya.`,
              tombol: "Ya, pertahankan",
              nada: "kuning",
            }
          : { judul: "Tutup pengajuan permanen?", teks: "Tiket ditutup dengan status DITOLAK.", tombol: "Ya, tutup", nada: "merah" }
    );
    if (!ok) return;

    startTransition(async () => {
      const hasil = await putuskanBandingAction({ tiketId, keputusan: mode, catatan });
      if (!hasil.success) {
        notifikasi("gagal", hasil.message);
        return;
      }
      await notifikasi("sukses", hasil.message);
      // Revisi tetap di halaman ini: status berubah dan workspace evaluasi margin tampil.
      if (mode === "REVISI_MARGIN") router.refresh();
      else router.push("/sb-specialist/banding-rekanan");
    });
  };

  return (
    <section className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3" aria-labelledby="judul-keputusan-banding">
      <h2 id="judul-keputusan-banding" className="text-sm font-bold text-slate-900 uppercase tracking-wide">
        Keputusan Evaluasi Banding
      </h2>
      <div role="radiogroup" aria-label="Keputusan banding" className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
        {OPSI.map((o) => {
          const Icon = o.icon;
          const dipilih = mode === o.m;
          return (
            <button
              key={o.m}
              type="button"
              role="radio"
              aria-checked={dipilih}
              onClick={() => {
                setMode(o.m);
                setError("");
              }}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs transition-colors cursor-pointer",
                dipilih ? `${o.aktif} font-bold` : "text-slate-600 hover:bg-slate-200/70 font-medium"
              )}
            >
              <Icon className="w-4 h-4" />
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{aktif.info}</p>

      <div>
        <label htmlFor="catatan-banding" className="block text-xs font-bold text-slate-700 mb-1">
          Catatan evaluasi (dibaca Regional Manager)
        </label>
        <textarea
          id="catatan-banding"
          rows={3}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          aria-invalid={!!error}
          placeholder={
            mode === "REVISI_MARGIN"
              ? "Contoh: nota pembanding valid, harga semen naik 9% di 3 toko; margin material perlu disesuaikan."
              : mode === "PERTAHANKAN"
                ? "Contoh: usulan tanpa bukti pasar yang valid, harga survei 3 toko masih wajar."
                : "Contoh: selisih usulan terlalu jauh dari pagu anggaran pekerjaan."
          }
          className={cn(
            "w-full px-3 py-2 rounded-lg border text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]",
            error ? "border-[#D91920]" : "border-slate-300"
          )}
        />
        {error && <p className="text-xs text-[#990F14] mt-1">{error}</p>}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={kirim}
          disabled={pending}
          className={cn("inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-60 cursor-pointer", aktif.tombol)}
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {aktif.label}
        </button>
      </div>
    </section>
  );
}
