"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
  Scale,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";

type Pilihan = "SETUJU" | "BANDING" | "TOLAK";

interface LampiranTerunggah {
  namaFile: string;
  fileUrl: string;
  ukuranFile?: string;
}

const MAKS_LAMPIRAN = 5;

export interface FormResponPenawaranProps {
  tiketId: string;
  hargaDitawarkan: number | null;
  satuan?: string | null;
  bolehBanding: boolean;
}

export function FormResponPenawaran({
  tiketId,
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
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [mengirim, setMengirim] = useState(false);

  const nilaiUsulan = Number(usulanHarga.replace(/\D/g, "")) || 0;
  const selisih = hargaDitawarkan ? nilaiUsulan - hargaDitawarkan : 0;
  const selisihPersen = hargaDitawarkan ? (selisih / hargaDitawarkan) * 100 : 0;

  const pilih = (p: Pilihan) => {
    setPilihan(p);
    setError("");
  };

  const validasi = (): string | null => {
    if (!pilihan) return "Pilih salah satu respon terlebih dahulu.";
    if (pilihan === "BANDING" && nilaiUsulan <= 0) return "Isi harga usulan banding.";
    if (pilihan === "BANDING" && hargaDitawarkan && nilaiUsulan === hargaDitawarkan)
      return "Harga usulan sama dengan harga yang ditawarkan. Pilih Setuju bila harga sudah sesuai.";
    if (pilihan !== "SETUJU" && !catatan.trim())
      return "Catatan argumentasi wajib diisi agar tim S&B dapat menindaklanjuti.";
    return null;
  };

  const bukaKonfirmasi = () => {
    const pesan = validasi();
    if (pesan) {
      setError(pesan);
      return;
    }
    setError("");
    setKonfirmasi(true);
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
    setMengirim(true);
    setError("");
    try {
      const res = await fetch(`/api/kuorum/${tiketId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keputusan: pilihan === "SETUJU" ? "SETUJU" : "TOLAK",
          usulanHarga: pilihan === "BANDING" ? nilaiUsulan : undefined,
          catatan: pilihan === "SETUJU" ? undefined : catatan.trim(),
          lampiranList: pilihan === "BANDING" ? lampiranList : [],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Respon gagal dikirim.");
      setKonfirmasi(false);
      router.refresh();
    } catch (e) {
      setKonfirmasi(false);
      setError(e instanceof Error ? e.message : "Respon gagal dikirim.");
    } finally {
      setMengirim(false);
    }
  };

  const opsi: { key: Pilihan; judul: string; deskripsi: string; icon: typeof CheckCircle2; aktif: string }[] = [
    {
      key: "SETUJU",
      judul: "Setuju",
      deskripsi: "Harga ditawarkan sudah sesuai dan siap dilaksanakan.",
      icon: CheckCircle2,
      aktif: "border-[#0F8A5F] bg-[#E7F6F0] text-[#085438]",
    },
    bolehBanding
      ? {
          key: "BANDING",
          judul: "Usulkan Banding",
          deskripsi: "Ajukan harga lain beserta argumentasi dan bukti pasar. Hanya 1 kali.",
          icon: Scale,
          aktif: "border-[#D99B00] bg-[#FFF8DB] text-[#6E4B00]",
        }
      : {
          key: "TOLAK",
          judul: "Tolak",
          deskripsi: "Kesempatan banding sudah digunakan. Menolak lagi akan menonaktifkan sementara perusahaan Anda di cabang ini.",
          icon: XCircle,
          aktif: "border-[#D91920] bg-[#FDECEE] text-[#990F14]",
        },
  ];

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {opsi.map((o) => {
          const Icon = o.icon;
          const dipilih = pilihan === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => pilih(o.key)}
              aria-pressed={dipilih}
              className={cn(
                "text-left rounded-lg border-2 p-3 transition-colors cursor-pointer",
                dipilih ? o.aktif : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
              )}
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <Icon className="w-4 h-4" />
                {o.judul}
              </div>
              <p className={cn("text-[11px] mt-1", dipilih ? "" : "text-slate-500")}>{o.deskripsi}</p>
            </button>
          );
        })}
      </div>

      {pilihan === "BANDING" && (
        <div className="space-y-1">
          <label htmlFor="usulan-harga" className="block text-xs font-bold text-slate-700">
            Harga usulan {satuan ? `per ${satuan}` : ""}
          </label>
          <div className="relative max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-500">Rp</span>
            <input
              id="usulan-harga"
              inputMode="numeric"
              value={nilaiUsulan ? nilaiUsulan.toLocaleString("id-ID") : ""}
              onChange={(e) => setUsulanHarga(e.target.value)}
              placeholder="0"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]"
            />
          </div>
          {nilaiUsulan > 0 && hargaDitawarkan ? (
            <p className={cn("text-[11px] font-semibold", selisih > 0 ? "text-[#990F14]" : "text-[#085438]")}>
              {selisih > 0 ? "+" : ""}
              {formatRupiah(selisih)} ({selisih > 0 ? "+" : ""}
              {selisihPersen.toFixed(2)}%) dibanding harga ditawarkan
            </p>
          ) : null}
        </div>
      )}

      {pilihan && pilihan !== "SETUJU" && (
        <div className="space-y-1">
          <label htmlFor="catatan" className="block text-xs font-bold text-slate-700">
            {pilihan === "BANDING" ? "Argumentasi harga pasar" : "Alasan penolakan"}
          </label>
          <textarea
            id="catatan"
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={
              pilihan === "BANDING"
                ? "Contoh: harga material di toko sekitar cabang naik 8% sejak bulan lalu, biaya angkut ke lokasi lebih tinggi."
                : "Jelaskan alasan perusahaan Anda menolak harga ini."
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]"
          />
        </div>
      )}

      {pilihan === "BANDING" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Bukti pembanding pasar (opsional)</span>
            <span className="text-[11px] text-slate-500">PDF, JPG, PNG. Maks 5 MB per berkas.</span>
          </div>
          {lampiranList.length > 0 && (
            <ul className="space-y-1.5">
              {lampiranList.map((l) => (
                <li
                  key={l.fileUrl}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-xs"
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
            multiple
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => unggah(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading || lampiranList.length >= MAKS_LAMPIRAN}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-slate-300 text-xs font-semibold text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC] disabled:opacity-50 cursor-pointer"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
            {uploading ? "Mengunggah..." : "Tambah berkas"}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FDECEE] border border-[#F7C1C5] text-xs text-[#990F14]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={bukaKonfirmasi}
          disabled={!pilihan || uploading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#005BAC] hover:bg-[#004687] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          Kirim Respon
        </button>
      </div>

      {konfirmasi && pilihan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-konfirmasi"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-5">
            <h2 id="judul-konfirmasi" className="text-sm font-bold text-slate-900">
              Konfirmasi respon penawaran
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Respon yang sudah dikirim tidak dapat diubah pada putaran ini.
            </p>
            <dl className="mt-4 space-y-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Respon</dt>
                <dd className="font-bold text-slate-900">
                  {pilihan === "SETUJU" ? "Setuju" : pilihan === "BANDING" ? "Usulkan Banding" : "Tolak"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Harga ditawarkan</dt>
                <dd className="font-mono tabular-nums">{formatRupiah(hargaDitawarkan)}</dd>
              </div>
              {pilihan === "BANDING" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Harga usulan</dt>
                  <dd className="font-mono font-bold tabular-nums text-[#005BAC]">{formatRupiah(nilaiUsulan)}</dd>
                </div>
              )}
              {pilihan === "BANDING" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Lampiran</dt>
                  <dd>{lampiranList.length} berkas</dd>
                </div>
              )}
            </dl>
            {pilihan === "TOLAK" && (
              <p className="mt-3 text-[11px] font-semibold text-[#990F14]">
                Ini penolakan kedua berturut-turut. Perusahaan Anda akan dinonaktifkan sementara di cabang ini
                sampai diaktifkan kembali oleh S&B atau Regional Manager.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setKonfirmasi(false)}
                disabled={mengirim}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={kirim}
                disabled={mengirim}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white cursor-pointer disabled:opacity-60",
                  pilihan === "TOLAK" ? "bg-[#D91920] hover:bg-[#B5141A]" : "bg-[#005BAC] hover:bg-[#004687]"
                )}
              >
                {mengirim && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, kirim respon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
