"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { cn, formatTanggal } from "@/lib/utils";

export interface RekananParkedRow {
  relasiId: string;
  kodeVendor: string;
  namaPerusahaan: string;
  picName: string;
  telepon: string;
  namaCabang: string;
  namaDivisi: string;
  parkedAt: string | null;
  alasanParked: string | null;
  itemPemicuKode: string | null;
}

const HARI = 24 * 60 * 60 * 1000;

export function TabelRekananParked({ data }: { data: RekananParkedRow[] }) {
  const router = useRouter();
  const [cari, setCari] = useState("");
  const [cabang, setCabang] = useState("SEMUA");
  const [target, setTarget] = useState<RekananParkedRow | null>(null);
  const [alasan, setAlasan] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState("");

  const daftarCabang = useMemo(() => [...new Set(data.map((d) => d.namaCabang))].sort(), [data]);

  const q = cari.trim().toLowerCase();
  const tampil = data.filter(
    (d) =>
      (cabang === "SEMUA" || d.namaCabang === cabang) &&
      (!q || d.namaPerusahaan.toLowerCase().includes(q) || d.kodeVendor.toLowerCase().includes(q))
  );

  const buka = (row: RekananParkedRow) => {
    setTarget(row);
    setAlasan("");
    setError("");
  };

  const tutup = () => {
    if (loading) return;
    setTarget(null);
  };

  const aktifkan = async () => {
    if (!target) return;
    if (!alasan.trim()) {
      setError("Alasan aktivasi wajib diisi sebagai jejak hasil mediasi.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/kuorum/parked/${target.relasiId}/unpark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan: alasan.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal mengaktifkan kembali rekanan.");
      setSukses(`${target.namaPerusahaan} aktif kembali di ${target.namaCabang}.`);
      setTarget(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengaktifkan kembali rekanan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Daftar Rekanan Parked</h2>
          <span className="px-1.5 rounded bg-[#FDECEE] text-[#990F14] text-[11px] font-bold font-mono">{data.length}</span>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama PT atau kode vendor"
              aria-label="Cari rekanan"
              className="w-full sm:w-60 pl-8 pr-3 py-1.5 rounded-md border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]"
            />
          </div>
          <select
            value={cabang}
            onChange={(e) => setCabang(e.target.value)}
            aria-label="Filter cabang"
            className="px-2 py-1.5 rounded-md border border-slate-300 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]"
          >
            <option value="SEMUA">Semua cabang</option>
            {daftarCabang.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sukses && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 p-2.5 rounded-md bg-[#E7F6F0] border border-[#B2DFCC] text-xs text-[#085438]">
          <span className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> {sukses}
          </span>
          <button type="button" onClick={() => setSukses("")} className="text-[11px] font-semibold hover:underline cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {data.length === 0 ? (
        <div className="py-12 text-center">
          <ShieldCheck className="w-8 h-8 text-[#0F8A5F] mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Tidak ada rekanan yang sedang Parked</p>
          <p className="text-xs text-slate-500 mt-1">Seluruh rekanan dalam cakupan wewenang Anda berstatus aktif.</p>
        </div>
      ) : tampil.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">Tidak ada rekanan yang cocok dengan filter.</p>
      ) : (
        <div className="overflow-x-auto mt-1">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#EEF2F6] text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 pl-4 pr-2">Rekanan</th>
                <th className="py-2.5 px-2">Cabang & Divisi</th>
                <th className="py-2.5 px-2">Parked Sejak</th>
                <th className="py-2.5 px-2">Alasan</th>
                <th className="py-2.5 pl-2 pr-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tampil.map((r) => {
                const lamaHari = r.parkedAt ? Math.floor((Date.now() - new Date(r.parkedAt).getTime()) / HARI) : null;
                return (
                  <tr key={r.relasiId} className="align-top hover:bg-[#EAF3FB]/50">
                    <td className="py-3 pl-4 pr-2 min-w-48">
                      <div className="font-semibold text-slate-900">{r.namaPerusahaan}</div>
                      <div className="font-mono text-[11px] text-slate-500">{r.kodeVendor}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5">
                        <Phone className="w-3 h-3" /> {r.picName}, {r.telepon}
                      </div>
                    </td>
                    <td className="py-3 px-2 min-w-36">
                      <div className="font-medium text-slate-800">{r.namaCabang}</div>
                      <div className="text-[11px] text-slate-500">{r.namaDivisi}</div>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <div className="font-mono text-slate-700">{formatTanggal(r.parkedAt)}</div>
                      {lamaHari !== null && (
                        <div className={cn("text-[11px] font-semibold", lamaHari >= 14 ? "text-[#990F14]" : "text-slate-500")}>
                          {lamaHari === 0 ? "Hari ini" : `${lamaHari} hari`}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 min-w-60 text-slate-700">
                      {r.alasanParked ?? "-"}
                      {r.itemPemicuKode && (
                        <div className="mt-1">
                          <span className="px-1.5 py-px rounded bg-slate-100 font-mono text-[11px] text-slate-600">
                            Item pemicu: {r.itemPemicuKode}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pl-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => buka(r)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#005BAC] hover:bg-[#004687] text-white text-[11px] font-bold whitespace-nowrap cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Aktifkan Kembali
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-unpark"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onKeyDown={(e) => e.key === "Escape" && tutup()}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-5">
            <h3 id="judul-unpark" className="text-sm font-bold text-slate-900">
              Aktifkan kembali rekanan
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              <span className="font-semibold text-slate-800">{target.namaPerusahaan}</span> akan kembali aktif di{" "}
              <span className="font-semibold text-slate-800">{target.namaCabang}</span> ({target.namaDivisi}) dan diundang
              pada voting berikutnya. Voting yang sedang berjalan tidak terpengaruh.
            </p>
            <label htmlFor="alasan-unpark" className="block text-xs font-bold text-slate-700 mt-4 mb-1">
              Hasil mediasi / alasan aktivasi
            </label>
            <textarea
              id="alasan-unpark"
              rows={3}
              autoFocus
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Mediasi 5 Nov dengan PIC rekanan, sepakat mengikuti harga penetapan berikutnya."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]"
            />
            {error && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-[#990F14]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={tutup}
                disabled={loading}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={aktifkan}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white bg-[#005BAC] hover:bg-[#004687] disabled:opacity-60 cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, aktifkan kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
