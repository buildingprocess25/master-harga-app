"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw, Send, XCircle } from "lucide-react";
import { putuskanKuorumGagalAction, putuskanLayer3Action } from "@/app/regional-manager/actions";
import { konfirmasiAksi, notifikasi } from "@/components/pengajuan/konfirmasi";
import { cn, formatRupiah } from "@/lib/utils";

type ModeLayer3 = "SETUJU" | "KEMBALI_SNB" | "TOLAK";
type ModeGagal = "BUKA_ULANG" | "TOLAK";

const GAYA = {
  hijau: "bg-[#E7F6F0] text-[#085438] ring-2 ring-[#0F8A5F]",
  kuning: "bg-[#FFF8DB] text-[#6E4B00] ring-2 ring-[#D99B00]",
  merah: "bg-[#FDECEE] text-[#990F14] ring-2 ring-[#D91920]",
};
const TOMBOL = {
  hijau: "bg-[#0F8A5F] hover:bg-[#0B6E4C]",
  kuning: "bg-[#D99B00] hover:bg-[#B88300]",
  merah: "bg-[#ED1C24] hover:bg-red-700",
};

/**
 * Kartu keputusan Regional Manager (inline, bukan modal).
 * - PENDING_REGIONAL_MGR: Setujui & buka kuorum / Kembalikan ke S&B / Tolak.
 * - DITOLAK_KONTRAKTOR: Buka kuorum ulang setelah mediasi / Tolak permanen.
 */
export function KeputusanRegional({
  tiketId,
  status,
  hargaRekomendasi,
  satuan,
  rekananAktif,
  masalah,
}: {
  tiketId: string;
  status: "PENDING_REGIONAL_MGR" | "DITOLAK_KONTRAKTOR";
  hargaRekomendasi: number | null;
  satuan: string | null;
  rekananAktif: number;
  masalah: string[];
}) {
  const router = useRouter();
  const layer3 = status === "PENDING_REGIONAL_MGR";
  const opsi = layer3
    ? ([
        { m: "SETUJU", label: "Setujui & buka kuorum", icon: CheckCircle2, tone: "hijau" },
        { m: "KEMBALI_SNB", label: "Kembalikan ke S&B", icon: RotateCcw, tone: "kuning" },
        { m: "TOLAK", label: "Tolak pengajuan", icon: XCircle, tone: "merah" },
      ] as const)
    : ([
        { m: "BUKA_ULANG", label: "Buka kuorum ulang", icon: RefreshCw, tone: "hijau" },
        { m: "TOLAK", label: "Tolak permanen", icon: XCircle, tone: "merah" },
      ] as const);

  const [mode, setMode] = useState<ModeLayer3 | ModeGagal>(opsi[0].m);
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const aktif = opsi.find((o) => o.m === mode)!;
  const membukaKuorum = mode === "SETUJU" || mode === "BUKA_ULANG";
  const catatanWajib = !(mode === "SETUJU");
  const terblokir = membukaKuorum && masalah.length > 0;

  const kirim = async () => {
    setError("");
    if (catatanWajib && catatan.trim().length < 5) {
      setError("Catatan wajib diisi (minimal 5 karakter).");
      return;
    }
    const harga = `${formatRupiah(hargaRekomendasi)}${satuan ? ` per ${satuan}` : ""}`;
    const ok = await konfirmasiAksi(
      membukaKuorum
        ? {
            judul: mode === "SETUJU" ? "Setujui harga & buka kuorum?" : "Buka kuorum ulang?",
            teks: `Harga ${harga} akan ditawarkan ke ${rekananAktif} rekanan aktif dengan batas respon 3x24 jam. Harga resmi terbit bila minimal 50% + 1 rekanan setuju.`,
            tombol: "Ya, buka kuorum",
            nada: "hijau",
          }
        : mode === "KEMBALI_SNB"
          ? { judul: "Kembalikan ke S&B Specialist?", teks: "Tiket kembali ke evaluasi margin S&B (PENDING_SB_SPECIALIST).", tombol: "Ya, kembalikan", nada: "kuning" }
          : { judul: "Tolak pengajuan permanen?", teks: "Tiket ditutup dengan status DITOLAK dan tidak dapat dilanjutkan.", tombol: "Ya, tolak", nada: "merah" }
    );
    if (!ok) return;

    startTransition(async () => {
      const hasil = layer3
        ? await putuskanLayer3Action({ tiketId, keputusan: mode as ModeLayer3, catatan })
        : await putuskanKuorumGagalAction({ tiketId, keputusan: mode as ModeGagal, catatan });
      if (!hasil.success) {
        notifikasi("gagal", hasil.message);
        router.refresh();
        return;
      }
      await notifikasi("sukses", hasil.message);
      router.push(membukaKuorum ? "/regional-manager/monitoring-kuorum" : "/regional-manager");
    });
  };

  return (
    <section className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3" aria-labelledby="judul-keputusan-regional">
      <div>
        <h2 id="judul-keputusan-regional" className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          {layer3 ? "Keputusan Layer 3" : "Tindak Lanjut Kuorum Gagal"}
        </h2>
        <p className="text-xs text-slate-600">
          {layer3
            ? "Persetujuan akan langsung membuka voting rekanan kontraktor cabang."
            : "Kuorum tidak tercapai tanpa usulan banding. Setelah mediasi dengan rekanan, buka kuorum ulang atau tutup pengajuan."}
        </p>
      </div>

      <div role="radiogroup" aria-label="Keputusan" className={cn("grid grid-cols-1 gap-2 p-1 bg-slate-100 rounded-xl", opsi.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {opsi.map((o) => {
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
                dipilih ? `${GAYA[o.tone]} font-bold` : "text-slate-600 hover:bg-slate-200/70 font-medium"
              )}
            >
              <Icon className="w-4 h-4" />
              {o.label}
            </button>
          );
        })}
      </div>

      {membukaKuorum && (
        masalah.length > 0 ? (
          <div className="flex items-start gap-2 text-xs text-[#990F14] bg-[#FDECEE] border border-[#F7C1C5] rounded-lg px-3 py-2" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <ul className="space-y-0.5">
              {masalah.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-[#085438] bg-[#E7F6F0] border border-[#B2DFCC] rounded-lg px-3 py-2">
            {rekananAktif} rekanan aktif akan diundang. Batas respon 3x24 jam sejak kuorum dibuka.
          </p>
        )
      )}

      <div>
        <label htmlFor="catatan-regional" className="block text-xs font-bold text-slate-700 mb-1">
          {mode === "SETUJU"
            ? "Catatan persetujuan (opsional)"
            : mode === "KEMBALI_SNB"
              ? "Apa yang perlu ditinjau ulang S&B?"
              : mode === "BUKA_ULANG"
                ? "Hasil mediasi dengan rekanan"
                : "Alasan penolakan"}
        </label>
        <textarea
          id="catatan-regional"
          rows={3}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          aria-invalid={!!error}
          placeholder={
            mode === "KEMBALI_SNB"
              ? "Contoh: margin material terlalu tinggi dibanding rata-rata regional, mohon ditinjau."
              : mode === "BUKA_ULANG"
                ? "Contoh: rapat mediasi 7 Nov, rekanan bersedia meninjau ulang harga."
                : ""
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
          disabled={pending || terblokir}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
            TOMBOL[aktif.tone]
          )}
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {aktif.label}
        </button>
      </div>
    </section>
  );
}
