"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { putuskanValidasiAction } from "@/app/sb-specialist/actions";
import { konfirmasiAksi, notifikasi } from "@/components/pengajuan/konfirmasi";
import { cn } from "@/lib/utils";

type Mode = "VALID" | "REVISI" | "TOLAK";

const OPSI: { mode: Mode; label: string; icon: typeof CheckCircle2; aktif: string }[] = [
  { mode: "VALID", label: "Spesifikasi valid", icon: CheckCircle2, aktif: "bg-[#E7F6F0] text-[#085438] ring-2 ring-[#0F8A5F]" },
  { mode: "REVISI", label: "Kembalikan ke BM", icon: RotateCcw, aktif: "bg-[#FFF8DB] text-[#6E4B00] ring-2 ring-[#D99B00]" },
  { mode: "TOLAK", label: "Tolak pengajuan", icon: XCircle, aktif: "bg-[#FDECEE] text-[#990F14] ring-2 ring-[#D91920]" },
];

/**
 * Langkah 1 S&B Specialist: validasi spesifikasi pengajuan BM.
 * "Valid" membuka worksheet (tanpa perubahan status, karena status DIAJUKAN berlanjut
 * langsung ke SIAP_SURVEI saat resep diterbitkan). Revisi/Tolak mengubah status
 * dengan catatan wajib. Kartu keputusan inline agar reviewer bisa scroll sambil menulis.
 */
export function KartuValidasiSpesifikasi({
  tiketId,
  valid,
  onValid,
}: {
  tiketId: string;
  valid: boolean;
  onValid: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("VALID");
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const kirim = async () => {
    if (mode === "VALID") {
      onValid();
      return;
    }
    if (catatan.trim().length < 5) {
      setError("Catatan wajib diisi (minimal 5 karakter) agar BM tahu apa yang harus diperbaiki.");
      return;
    }
    setError("");
    const ok = await konfirmasiAksi(
      mode === "REVISI"
        ? {
            judul: "Kembalikan ke B&M Manager?",
            teks: "Tiket berstatus PERLU_REVISI dan kembali ke BM untuk melengkapi spesifikasi.",
            tombol: "Ya, kembalikan",
            nada: "kuning",
          }
        : {
            judul: "Tolak pengajuan permanen?",
            teks: "Tiket ditutup dengan status DITOLAK dan tidak dapat dilanjutkan.",
            tombol: "Ya, tolak",
            nada: "merah",
          }
    );
    if (!ok) return;

    startTransition(async () => {
      const hasil = await putuskanValidasiAction({ tiketId, keputusan: mode, catatan });
      if (!hasil.success) {
        notifikasi("gagal", hasil.message);
        return;
      }
      await notifikasi("sukses", hasil.message);
      router.push("/sb-specialist");
    });
  };

  return (
    <section className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3" aria-labelledby="judul-validasi">
      <div>
        <h2 id="judul-validasi" className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Langkah 1: Validasi Spesifikasi
        </h2>
        <p className="text-xs text-slate-600">
          Pastikan spesifikasi item (merk, ukuran, tipe, lokasi) cukup jelas untuk disusun resep AHSP dan disurvei di toko.
        </p>
      </div>

      <div role="radiogroup" aria-label="Keputusan validasi" className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
        {OPSI.map((o) => {
          const Icon = o.icon;
          const dipilih = mode === o.mode;
          return (
            <button
              key={o.mode}
              type="button"
              role="radio"
              aria-checked={dipilih}
              onClick={() => {
                setMode(o.mode);
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

      {mode === "VALID" ? (
        <p className="text-xs text-[#085438] bg-[#E7F6F0] border border-[#B2DFCC] rounded-lg px-3 py-2">
          {valid
            ? "Spesifikasi sudah dinyatakan valid. Lanjutkan penyusunan resep AHSP di bawah."
            : "Lanjutkan ke penyusunan resep AHSP. Status tiket berubah saat resep diterbitkan ke survei."}
        </p>
      ) : (
        <div>
          <label htmlFor="catatan-validasi" className="block text-xs font-bold text-slate-700 mb-1">
            {mode === "REVISI" ? "Apa yang harus diperbaiki BM?" : "Alasan penolakan"}
          </label>
          <textarea
            id="catatan-validasi"
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            aria-invalid={!!error}
            placeholder={
              mode === "REVISI"
                ? "Contoh: merk dan tebal material belum dicantumkan, lokasi pekerjaan kurang spesifik."
                : "Contoh: item sudah memiliki harga resmi aktif di cabang ini."
            }
            className={cn(
              "w-full px-3 py-2 rounded-lg border text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]",
              error ? "border-[#D91920]" : "border-slate-300"
            )}
          />
          {error && <p className="text-xs text-[#990F14] mt-1">{error}</p>}
        </div>
      )}

      {!(mode === "VALID" && valid) && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={kirim}
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60 cursor-pointer",
              mode === "VALID" && "bg-[#0F8A5F] hover:bg-[#0B6E4C]",
              mode === "REVISI" && "bg-[#D99B00] hover:bg-[#B88300]",
              mode === "TOLAK" && "bg-[#ED1C24] hover:bg-red-700"
            )}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === "VALID" ? "Lanjut susun resep AHSP" : mode === "REVISI" ? "Kembalikan ke BM" : "Tolak pengajuan"}
          </button>
        </div>
      )}
    </section>
  );
}
