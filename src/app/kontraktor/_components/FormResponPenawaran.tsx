"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Loader2, Paperclip, RotateCcw, Trash2, XCircle } from "lucide-react";
import { konfirmasiAksi, notifikasi } from "@/components/pengajuan/konfirmasi";
import { cn, formatRupiah } from "@/lib/utils";

/**
 * SEPAKATI = vote SETUJU. AJUKAN = vote TOLAK + harga usulan (banding, maksimal 1x).
 * Setelah banding terpakai, opsi kedua berubah menjadi TOLAK final tanpa harga usulan.
 */
type Pilihan = "SEPAKATI" | "AJUKAN" | "TOLAK";

interface LampiranTerunggah {
  namaFile: string;
  fileUrl: string;
  ukuranFile?: string;
}

const MAKS_LAMPIRAN = 5;

export interface FormResponPenawaranProps {
  tiketId: string;
  namaPerusahaan: string;
  hargaDitawarkan: number | null;
  satuan?: string | null;
  bolehBanding: boolean;
}

export function FormResponPenawaran({
  tiketId,
  namaPerusahaan,
  hargaDitawarkan,
  satuan,
  bolehBanding,
}: FormResponPenawaranProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pilihan, setPilihan] = useState<Pilihan | null>(null);
  const [usulanHarga, setUsulanHarga] = useState("");
  const [catatan, setCatatan] = useState("");
  const [lampiranList, setLampiranList] = useState<LampiranTerunggah[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [mengirim, setMengirim] = useState(false);

  const opsiKedua: Pilihan = bolehBanding ? "AJUKAN" : "TOLAK";
  const nilaiUsulan = Number(usulanHarga.replace(/\D/g, "")) || 0;
  const selisihPersen = hargaDitawarkan && nilaiUsulan ? ((nilaiUsulan - hargaDitawarkan) / hargaDitawarkan) * 100 : 0;

  const pilih = (p: Pilihan) => {
    setPilihan(p);
    setError("");
  };

  const validasi = (): string | null => {
    if (!pilihan) return "Pilih salah satu keputusan terlebih dahulu.";
    if (pilihan === "AJUKAN" && nilaiUsulan <= 0) return "Isi harga usulan baru.";
    if (pilihan === "AJUKAN" && hargaDitawarkan && nilaiUsulan === hargaDitawarkan)
      return "Harga usulan sama dengan harga yang ditawarkan. Pilih Sepakati Harga bila harga sudah sesuai.";
    if (pilihan !== "SEPAKATI" && !catatan.trim()) return "Alasan wajib diisi agar tim S&B dapat menindaklanjuti.";
    return null;
  };

  const unggah = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (lampiranList.length + files.length > MAKS_LAMPIRAN) {
      setError(`Maksimal ${MAKS_LAMPIRAN} berkas lampiran.`);
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/kuorum/lampiran", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || `Gagal mengunggah ${file.name}.`);
        setLampiranList((prev) => [...prev, json.data]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah berkas.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const kirim = async () => {
    const pesan = validasi();
    if (pesan) {
      setError(pesan);
      return;
    }
    setError("");

    const per = satuan ? ` per ${satuan}` : "";
    const ok = await konfirmasiAksi(
      pilihan === "SEPAKATI"
        ? {
            judul: "Sepakati harga ini?",
            teks: `Perusahaan Anda menyetujui harga ${formatRupiah(hargaDitawarkan)}${per}. Respon tidak dapat diubah setelah dikirim.`,
            tombol: "Ya, Sepakati",
            nada: "hijau",
          }
        : pilihan === "AJUKAN"
          ? {
              judul: "Kirim usulan harga baru?",
              teks: `Usulan ${formatRupiah(nilaiUsulan)}${per} akan ditinjau tim S&B Specialist. Kesempatan ini hanya 1 kali dan respon tidak dapat diubah.`,
              tombol: "Ya, Kirim Usulan",
              nada: "kuning",
            }
          : {
              judul: "Tolak harga secara final?",
              teks: "Ini penolakan kedua berturut-turut. Perusahaan Anda akan dinonaktifkan sementara di cabang ini sampai dimediasi tim S&B atau Regional Manager.",
              tombol: "Ya, Tolak Final",
              nada: "merah",
            }
    );
    if (!ok) return;

    setMengirim(true);
    try {
      const res = await fetch(`/api/kuorum/${tiketId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keputusan: pilihan === "SEPAKATI" ? "SETUJU" : "TOLAK",
          usulanHarga: pilihan === "AJUKAN" ? nilaiUsulan : undefined,
          catatan: catatan.trim() || undefined,
          lampiranList: pilihan === "AJUKAN" ? lampiranList : [],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Respon gagal dikirim.");
      router.refresh();
      notifikasi(
        "sukses",
        json.data?.diparkir
          ? "Penolakan tercatat. Perusahaan Anda dinonaktifkan sementara di cabang ini."
          : "Respon perusahaan Anda sudah tercatat."
      );
    } catch (e) {
      const pesanGagal = e instanceof Error ? e.message : "Respon gagal dikirim.";
      setError(pesanGagal);
      notifikasi("gagal", pesanGagal);
    } finally {
      setMengirim(false);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-5">
      {!bolehBanding && (
        <div className="bg-[#FFF8DB] border-2 border-[#F3D56B] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#6E4B00] leading-relaxed">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <p>
            <span className="font-bold">Penyesuaian S&B:</span> harga ini sudah ditinjau ulang setelah usulan perusahaan
            Anda sebelumnya. Kesempatan mengajukan harga baru sudah digunakan (maksimal 1x). Anda dapat menyepakati harga
            ini, atau menolak secara final dengan konsekuensi dinonaktifkan sementara di cabang ini.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <span className="text-sm font-bold text-slate-800 block">Keputusan dari {namaPerusahaan}</span>
        <div className="flex flex-col sm:flex-row gap-3" role="radiogroup" aria-label="Keputusan penawaran">
          <TombolPilihan
            aktif={pilihan === "SEPAKATI"}
            nada="hijau"
            onClick={() => pilih("SEPAKATI")}
            label="Sepakati Harga"
          />
          <TombolPilihan
            aktif={pilihan === opsiKedua}
            nada="merah"
            onClick={() => pilih(opsiKedua)}
            label={bolehBanding ? "Ajukan Harga Baru" : "Tolak Harga"}
          />
        </div>
      </div>

      {pilihan === "SEPAKATI" && (
        <div className="p-4 bg-[#E7F6F0]/60 border-2 border-[#B2DFCC] rounded-xl">
          <label htmlFor="catatan" className="text-xs font-bold text-slate-800 mb-1.5 block">
            Catatan Persetujuan (opsional)
          </label>
          <textarea
            id="catatan"
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Opsional: tuliskan catatan kesepakatan..."
            className={KELAS_INPUT}
          />
        </div>
      )}

      {pilihan === "TOLAK" && (
        <div className="p-4 bg-[#FDECEE]/60 border-2 border-[#F7C1C5] rounded-xl space-y-4">
          <div className="p-3 bg-[#FDECEE] border-2 border-[#F7C1C5] rounded-lg text-xs text-[#990F14] leading-relaxed">
            <div className="font-bold flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Konsekuensi Penolakan
            </div>
            <p className="mt-1">
              Menolak dua putaran berturut-turut menonaktifkan sementara (parked) perusahaan Anda di cabang ini. Selama
              nonaktif, perusahaan Anda tidak diundang pada penawaran baru di cabang tersebut.
            </p>
          </div>
          <FieldAlasan nilai={catatan} ubah={setCatatan} final />
        </div>
      )}

      {pilihan === "AJUKAN" && (
        <div className="p-4 bg-[#FDECEE]/40 border-2 border-[#F7C1C5] rounded-xl space-y-4">
          <div>
            <label htmlFor="usulan-harga" className="text-xs font-bold text-slate-800 mb-1.5 block">
              Usulan Harga Akhir (Rp) <span className="text-[#ED1C24]">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-500">
                  Rp
                </span>
                <input
                  id="usulan-harga"
                  type="text"
                  inputMode="numeric"
                  value={nilaiUsulan ? nilaiUsulan.toLocaleString("id-ID") : ""}
                  onChange={(e) => setUsulanHarga(e.target.value)}
                  placeholder="Masukkan nominal usulan"
                  className={cn(KELAS_INPUT, "pl-9 font-mono tabular-nums")}
                />
              </div>
              {nilaiUsulan > 0 && hargaDitawarkan ? (
                <span
                  className={cn(
                    "text-xs font-bold font-mono tabular-nums",
                    selisihPersen >= 0 ? "text-[#990F14]" : "text-[#085438]"
                  )}
                >
                  {selisihPersen >= 0 ? "+" : ""}
                  {selisihPersen.toLocaleString("id-ID", { maximumFractionDigits: 2 })}% dari harga ditawarkan
                </span>
              ) : null}
            </div>
            {satuan && <p className="text-[11px] text-slate-500 mt-1">Harga per {satuan}.</p>}
          </div>

          <FieldAlasan nilai={catatan} ubah={setCatatan} />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">Bukti pembanding pasar (opsional)</span>
              <span className="text-[11px] text-slate-500">PDF, JPG, PNG. Maks 5 MB per berkas.</span>
            </div>
            {lampiranList.length > 0 && (
              <ul className="space-y-1.5">
                {lampiranList.map((l) => (
                  <li
                    key={l.fileUrl}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 border-slate-200 bg-white text-xs"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-[#005BAC] shrink-0" />
                      <span className="truncate font-medium text-slate-800">{l.namaFile}</span>
                      {l.ukuranFile && <span className="text-slate-500 shrink-0">{l.ukuranFile}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLampiranList((prev) => prev.filter((x) => x.fileUrl !== l.fileUrl))}
                      className="text-slate-400 hover:text-[#ED1C24] cursor-pointer"
                      aria-label={`Hapus ${l.namaFile}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={(e) => unggah(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || lampiranList.length >= MAKS_LAMPIRAN}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC] disabled:opacity-50 cursor-pointer"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
              {uploading ? "Mengunggah..." : "Lampirkan berkas"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FDECEE] border-2 border-[#F7C1C5] text-xs text-[#990F14]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t-2 border-slate-100">
        <Link
          href="/kontraktor"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Kembali
        </Link>
        {pilihan && (
          <button
            type="button"
            onClick={kirim}
            disabled={mengirim || uploading}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50 cursor-pointer",
              pilihan === "SEPAKATI" ? "bg-[#0F8A5F] hover:bg-[#0B6E4C]" : "bg-[#ED1C24] hover:bg-red-700"
            )}
          >
            {mengirim ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : pilihan === "SEPAKATI" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            {pilihan === "SEPAKATI" ? "Konfirmasi" : pilihan === "AJUKAN" ? "Kirim Usulan" : "Konfirmasi Tolak"}
          </button>
        )}
      </div>
    </div>
  );
}

const KELAS_INPUT =
  "w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#005BAC]";

function TombolPilihan({
  aktif,
  nada,
  onClick,
  label,
}: {
  aktif: boolean;
  nada: "hijau" | "merah";
  onClick: () => void;
  label: string;
}) {
  const warna =
    nada === "hijau"
      ? { kotak: "bg-[#E7F6F0] border-[#0F8A5F] text-[#085438]", titik: "border-[#0F8A5F]", isi: "bg-[#0F8A5F]" }
      : { kotak: "bg-[#FDECEE] border-[#ED1C24] text-[#990F14]", titik: "border-[#ED1C24]", isi: "bg-[#ED1C24]" };
  return (
    <button
      type="button"
      role="radio"
      aria-checked={aktif}
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center gap-2 h-11 px-4 rounded-xl border-2 text-xs font-semibold transition-colors cursor-pointer",
        aktif ? warna.kotak : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      <span
        className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
          aktif ? warna.titik : "border-slate-300"
        )}
      >
        {aktif && <span className={cn("w-2 h-2 rounded-full", warna.isi)} />}
      </span>
      {label}
    </button>
  );
}

function FieldAlasan({ nilai, ubah, final }: { nilai: string; ubah: (v: string) => void; final?: boolean }) {
  return (
    <div>
      <label htmlFor="catatan" className="text-xs font-bold text-slate-800 mb-1.5 block">
        {final ? "Alasan Penolakan Final" : "Alasan"} <span className="text-[#ED1C24]">*</span>
      </label>
      <textarea
        id="catatan"
        rows={3}
        value={nilai}
        onChange={(e) => ubah(e.target.value)}
        placeholder={
          final
            ? "Tuliskan alasan mengapa harga penyesuaian tidak dapat diterima..."
            : "Tuliskan argumen mengapa harga perlu disesuaikan, misalnya harga material di pasar setempat..."
        }
        className={KELAS_INPUT}
      />
    </div>
  );
}
