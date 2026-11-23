"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import Swal from "sweetalert2";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daftarCabang = useMemo(
    () => [...new Set(data.map((d) => d.namaCabang))].sort(),
    [data]
  );

  const q = cari.trim().toLowerCase();
  const tampil = data.filter(
    (d) =>
      (cabang === "SEMUA" || d.namaCabang === cabang) &&
      (!q ||
        d.namaPerusahaan.toLowerCase().includes(q) ||
        d.kodeVendor.toLowerCase().includes(q))
  );

  const handleUnpark = async (r: RekananParkedRow) => {
    const { value: alasanInput, isConfirmed } = await Swal.fire({
      title: `Aktifkan kembali ${r.namaPerusahaan}?`,
      text: `Rekanan akan diaktifkan kembali untuk wilayah Cabang ${r.namaCabang}.`,
      input: "textarea",
      inputPlaceholder: "Tuliskan alasan aktivasi kembali...",
      inputValidator: (v) => (!v ? "Alasan aktivasi wajib diisi" : null),
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Aktifkan",
      cancelButtonText: "Batal",
    });

    if (!isConfirmed || !alasanInput) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/kuorum/parked/${r.relasiId}/unpark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan: alasanInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengaktifkan kembali rekanan.");
      }

      await Swal.fire({
        title: "Rekanan Diaktifkan",
        text: `${r.namaPerusahaan} telah aktif kembali di Cabang ${r.namaCabang}.`,
        icon: "success",
        confirmButtonColor: "#005BAC",
      });
      router.refresh();
    } catch (e: any) {
      Swal.fire({
        title: "Gagal",
        text: e.message || "Terjadi kesalahan saat memproses aktivasi.",
        icon: "error",
        confirmButtonColor: "#005BAC",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b-2 border-slate-200">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide">
            Daftar Kontraktor Nonaktif
          </h2>
          <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[11px] font-black font-mono">
            {data.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari kontraktor..."
              aria-label="Cari rekanan"
              className="w-full sm:w-60 pl-8 pr-3 py-1.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-medium focus:outline-none focus:border-[#005BAC]"
            />
          </div>

          <select
            value={cabang}
            onChange={(e) => setCabang(e.target.value)}
            aria-label="Filter cabang"
            className="px-3 py-1.5 rounded-xl border-2 border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-[#005BAC]"
          >
            <option value="SEMUA">Semua Cabang</option>
            {daftarCabang.map((c) => (
              <option key={c} value={c}>
                Cabang {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-14 text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">
            Tidak ada kontraktor yang nonaktif
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Seluruh rekanan kontraktor pada cabang wewenang Anda berstatus aktif.
          </p>
        </div>
      ) : tampil.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500 font-medium">
          Tidak ada kontraktor yang cocok dengan kata kunci pencarian.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b-2 border-slate-200">
              <tr>
                <th className="py-3 pl-4 pr-2">Nama Perusahaan</th>
                <th className="py-3 px-2">Cabang &amp; Divisi</th>
                <th className="py-3 px-2">Nonaktif Sejak</th>
                <th className="py-3 px-2">Alasan</th>
                <th className="py-3 pl-2 pr-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {tampil.map((r) => {
                const lamaHari = r.parkedAt
                  ? Math.floor((Date.now() - new Date(r.parkedAt).getTime()) / HARI)
                  : null;
                return (
                  <tr key={r.relasiId} className="align-top hover:bg-slate-50">
                    <td className="py-3 pl-4 pr-2 min-w-48">
                      <div className="font-bold text-slate-900">{r.namaPerusahaan}</div>
                      <div className="font-mono text-[11px] text-slate-500">{r.kodeVendor}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5">
                        <Phone className="w-3 h-3 text-[#005BAC]" />
                        <span>{r.picName}, {r.telepon}</span>
                      </div>
                    </td>

                    <td className="py-3 px-2 min-w-36">
                      <div className="font-bold text-slate-800">{r.namaCabang}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{r.namaDivisi}</div>
                    </td>

                    <td className="py-3 px-2 whitespace-nowrap">
                      <div className="font-mono font-medium text-slate-700">
                        {formatTanggal(r.parkedAt)}
                      </div>
                      {lamaHari !== null && (
                        <div
                          className={cn(
                            "text-[10px] font-bold mt-0.5",
                            lamaHari >= 14 ? "text-rose-700" : "text-slate-500"
                          )}
                        >
                          {lamaHari === 0 ? "Hari ini" : `${lamaHari} hari lalu`}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-2 min-w-60 text-slate-700">
                      <span className="font-medium">{r.alasanParked ?? "-"}</span>
                      {r.itemPemicuKode && (
                        <div className="mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600 font-semibold">
                            Pemicu: {r.itemPemicuKode}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 pl-2 pr-4 text-right">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleUnpark(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#005BAC] hover:bg-blue-700 text-white text-xs font-black shadow-xs whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Aktifkan Kembali</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
