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
import Swal from "sweetalert2";
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
    if (pilihan === "BANDING" && nilaiUsulan <= 0) return "Isi usulan harga banding.";
    if (pilihan === "BANDING" && hargaDitawarkan && nilaiUsulan === hargaDitawarkan)
      return "Harga usulan sama dengan harga penawaran. Pilih Setuju bila harga sudah sesuai.";
    if (pilihan !== "SETUJU" && !catatan.trim())
      return "Alasan wajib diisi.";
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
        if (!res.ok || !json.success)
          throw new Error(json.message || `Gagal mengunggah ${file.name}.`);
        setLampiranList((prev) => [...prev, json.data]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah berkas.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKirimRespon = async () => {
    const pesanValidasi = validasi();
    if (pesanValidasi) {
      setError(pesanValidasi);
      return;
    }
    setError("");

    // SweetAlert2 Confirmation Dialog
    let title = "Setujui harga ini?";
    let text = "Harga penawaran akan disepakati untuk pekerjaan cabang ini.";
    let confirmBtnText = "Ya, Setujui";
    let confirmColor = "#005BAC";

    if (pilihan === "BANDING") {
      title = "Kirim usulan banding?";
      text = `Usulan harga sebesar ${formatRupiah(nilaiUsulan)} akan diteruskan ke S&B Specialist.`;
      confirmBtnText = "Ya, Kirim Usulan";
      confirmColor = "#005BAC";
    } else if (pilihan === "TOLAK") {
      title = "Tolak penawaran ini?";
      text = "Perusahaan Anda akan dinonaktifkan sementara di cabang ini.";
      confirmBtnText = "Ya, Tolak";
      confirmColor = "#ED1C24";
    }

    const confirm = await Swal.fire({
      title,
      text,
      icon: pilihan === "SETUJU" ? "question" : "warning",
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: "#64748b",
      confirmButtonText: confirmBtnText,
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    setMengirim(true);
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
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Respon gagal dikirim.");
      }

      await Swal.fire({
        title: "Respon Terkirim",
        text: json.message || "Respon perusahaan Anda telah berhasil dicatat.",
        icon: "success",
        confirmButtonColor: "#005BAC",
      });

      router.refresh();
    } catch (e: any) {
      Swal.fire({
        title: "Gagal Mengirim Respon",
        text: e.message || "Terjadi kesalahan koneksi.",
        icon: "error",
        confirmButtonColor: "#005BAC",
      });
    } finally {
      setMengirim(false);
    }
  };

  const opsi: {
    key: Pilihan;
    judul: string;
    deskripsi: string;
    icon: typeof CheckCircle2;
    aktif: string;
  }[] = [
    {
      key: "SETUJU",
      judul: "Setujui Harga",
      deskripsi: "Harga penawaran sesuai dan siap dilaksanakan.",
      icon: CheckCircle2,
      aktif: "border-2 border-emerald-600 bg-white text-emerald-900 shadow-2xs",
    },
    bolehBanding
      ? {
          key: "BANDING",
          judul: "Usulkan Banding",
          deskripsi: "Ajukan usulan harga lain beserta bukti pasar (kesempatan 1x).",
          icon: Scale,
          aktif: "border-2 border-[#005BAC] bg-white text-[#005BAC] shadow-2xs",
        }
      : {
          key: "TOLAK",
          judul: "Tolak Harga",
          deskripsi: "Kesempatan banding sudah digunakan. Menolak akan menonaktifkan akun sementara.",
          icon: XCircle,
          aktif: "border-2 border-rose-600 bg-white text-rose-900 shadow-2xs",
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
                "text-left rounded-xl border-2 p-3.5 transition-all cursor-pointer",
                dipilih
                  ? o.aktif
                  : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
              )}
            >
              <div className="flex items-center gap-2 text-xs font-black">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{o.judul}</span>
              </div>
              <p
                className={cn(
                  "text-[11px] mt-1 leading-relaxed font-medium",
                  dipilih ? "text-slate-800" : "text-slate-500"
                )}
              >
                {o.deskripsi}
              </p>
            </button>
          );
        })}
      </div>

      {pilihan === "BANDING" && (
        <div className="space-y-1.5 p-4 bg-white border-2 border-[#005BAC] rounded-xl shadow-2xs">
          <label htmlFor="usulan-harga" className="block text-xs font-bold text-slate-800">
            Usulan Harga {satuan ? `per ${satuan}` : ""}
          </label>
          <div className="relative max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500">
              Rp
            </span>
            <input
              id="usulan-harga"
              inputMode="numeric"
              value={nilaiUsulan ? nilaiUsulan.toLocaleString("id-ID") : ""}
              onChange={(e) => setUsulanHarga(e.target.value)}
              placeholder="0"
              className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#005BAC]"
            />
          </div>
          {nilaiUsulan > 0 && hargaDitawarkan ? (
            <p
              className={cn(
                "text-[11px] font-bold mt-1",
                selisih > 0 ? "text-rose-700" : "text-emerald-700"
              )}
            >
              {selisih > 0 ? "+" : ""}
              {formatRupiah(selisih)} ({selisih > 0 ? "+" : ""}
              {selisihPersen.toFixed(2)}%) dibanding harga penawaran
            </p>
          ) : null}
        </div>
      )}

      {pilihan && pilihan !== "SETUJU" && (
        <div className="space-y-1.5 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
          <label htmlFor="catatan" className="block text-xs font-bold text-slate-800">
            {pilihan === "BANDING" ? "Alasan Usulan Banding" : "Alasan Penolakan"}
          </label>
          <textarea
            id="catatan"
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={
              pilihan === "BANDING"
                ? "Tuliskan alasan mengapa harga perlu disesuaikan..."
                : "Tuliskan alasan penolakan harga..."
            }
            className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#005BAC]"
          />
        </div>
      )}

      {pilihan === "BANDING" && (
        <div className="space-y-2 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Bukti Pembanding Pasar (Opsional)
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              PDF, JPG, PNG (Maks 5 MB)
            </span>
          </div>

          {lampiranList.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {lampiranList.map((l) => (
                <li
                  key={l.fileUrl}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 border-slate-200 bg-white text-xs"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-[#005BAC] shrink-0" />
                    <span className="truncate font-semibold text-slate-800">
                      {l.namaFile}
                    </span>
                    {l.ukuranFile && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {l.ukuranFile}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLampiranList((prev) =>
                        prev.filter((x) => x.fileUrl !== l.fileUrl)
                      )
                    }
                    className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-xs font-bold text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC] disabled:opacity-50 cursor-pointer transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Paperclip className="w-3.5 h-3.5" />
            )}
            <span>{uploading ? "Mengunggah..." : "Tambah Berkas"}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs font-bold text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleKirimRespon}
          disabled={!pilihan || uploading || mengirim}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#005BAC] hover:bg-blue-700 text-white text-xs font-black shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
        >
          {mengirim ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{mengirim ? "Mengirim..." : "Kirim Respon"}</span>
        </button>
      </div>
    </div>
  );
}
