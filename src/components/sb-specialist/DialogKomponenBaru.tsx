"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { OpsiKoefisien } from "@/lib/services/ahsp-service";
import { KategoriKoefisien } from "@/types";
import { LABEL_KATEGORI, parseAngka } from "./worksheet-util";

const INPUT =
  "w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]";

/**
 * Formulir singkat menambah komponen baru ke Pustaka Koefisien langsung dari worksheet.
 * Komponen material default wajib survei toko karena harganya ditentukan survei BC.
 */
export function DialogKomponenBaru({
  divisiId,
  kategori,
  namaAwal,
  onBatal,
  onTersimpan,
}: {
  divisiId: string;
  kategori: KategoriKoefisien;
  namaAwal: string;
  onBatal: () => void;
  onTersimpan: (o: OpsiKoefisien) => void;
}) {
  const [nama, setNama] = useState(namaAwal);
  const [satuan, setSatuan] = useState("");
  const [koef, setKoef] = useState("1");
  const [harga, setHarga] = useState("");
  const [wajibSurvei, setWajibSurvei] = useState(kategori === "MATERIAL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    const nilaiKoef = parseAngka(koef);
    if (nama.trim().length < 3) return setError("Nama komponen minimal 3 karakter.");
    if (!satuan.trim()) return setError("Satuan wajib diisi, misalnya OH, Kg, M2, Lbr.");
    if (!(nilaiKoef > 0)) return setError("Koefisien default harus lebih dari 0.");

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/koefisien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divisiId,
          kategori,
          namaKomponen: nama.trim(),
          satuan: satuan.trim(),
          nilaiKoefisienDefault: nilaiKoef,
          hargaAcuanDefault: harga ? Number(harga.replace(/\D/g, "")) : null,
          wajibSurveiToko: wajibSurvei,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal menambah komponen.");
      onTersimpan(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah komponen.");
    } finally {
      setLoading(false);
    }
  };

  const nilaiHarga = Number(harga.replace(/\D/g, "")) || 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-komponen-baru"
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
      onKeyDown={(e) => e.key === "Escape" && !loading && onBatal()}
    >
      <form onSubmit={simpan} className="bg-white rounded-xl shadow-xl max-w-md w-full border-2 border-slate-300 p-5 space-y-3">
        <div>
          <h2 id="judul-komponen-baru" className="text-sm font-bold text-slate-900">
            Tambah komponen baru ke pustaka
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Kategori <span className="font-semibold">{LABEL_KATEGORI[kategori]}</span>. Komponen ini akan tersedia untuk tiket lain di divisi yang sama.
          </p>
        </div>

        <div>
          <label htmlFor="kb-nama" className="block text-xs font-bold text-slate-700 mb-1">Nama komponen</label>
          <input id="kb-nama" autoFocus value={nama} onChange={(e) => setNama(e.target.value)} className={INPUT} maxLength={120} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="kb-satuan" className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
            <input id="kb-satuan" value={satuan} onChange={(e) => setSatuan(e.target.value)} placeholder="OH, Kg, M2" className={INPUT} maxLength={20} />
          </div>
          <div>
            <label htmlFor="kb-koef" className="block text-xs font-bold text-slate-700 mb-1">Koefisien default</label>
            <input id="kb-koef" inputMode="decimal" value={koef} onChange={(e) => setKoef(e.target.value)} className={`${INPUT} font-mono`} />
          </div>
        </div>
        <div>
          <label htmlFor="kb-harga" className="block text-xs font-bold text-slate-700 mb-1">Harga acuan default (opsional)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-500">Rp</span>
            <input
              id="kb-harga"
              inputMode="numeric"
              value={nilaiHarga ? nilaiHarga.toLocaleString("id-ID") : ""}
              onChange={(e) => setHarga(e.target.value)}
              className={`${INPUT} pl-9 font-mono`}
            />
          </div>
        </div>
        <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
          <input type="checkbox" checked={wajibSurvei} onChange={(e) => setWajibSurvei(e.target.checked)} className="mt-0.5 accent-[#005BAC]" />
          <span>
            <span className="font-semibold">Wajib survei 3 toko</span>
            <span className="block text-[11px] text-slate-500">Harga acuan final komponen ini diambil dari rata-rata survei Building Coordinator.</span>
          </span>
        </label>

        {error && (
          <div className="flex items-start gap-1.5 text-xs text-[#990F14]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onBatal} disabled={loading} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer">
            Batal
          </button>
          <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white bg-[#005BAC] hover:bg-[#004687] disabled:opacity-60 cursor-pointer">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Simpan ke pustaka
          </button>
        </div>
      </form>
    </div>
  );
}
