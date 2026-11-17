"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CornerDownRight,
  Eye,
  MapPin,
  Power,
  X,
  Loader2,
  Tag,
} from "lucide-react";
import Swal from "sweetalert2";
import type {
  BarisKatalog,
  DetailHargaRilis,
} from "@/lib/services/master-harga-service";
import { setStatusHargaCabangAction } from "@/app/sb-specialist/actions";
import { DetailSpesifikasi } from "@/components/global/DetailSpesifikasi";
import { RincianKalkulasiKoefisien } from "@/components/global/RincianKalkulasiKoefisien";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

function Selisih({ rp, persen }: { rp: number; persen: number }) {
  const naik = rp > 0;
  const tanda = naik ? "+" : rp < 0 ? "-" : "";
  return (
    <span
      className={cn(
        "font-mono tabular-nums font-bold",
        naik
          ? "text-[#990F14]"
          : rp < 0
            ? "text-emerald-700"
            : "text-slate-500"
      )}
    >
      {tanda}
      {formatRupiah(Math.abs(rp))}
      <span className="block text-[11px] font-semibold">
        ({tanda}
        {Math.abs(persen).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        %)
      </span>
    </span>
  );
}

export function MasterHargaClient({
  rows,
  nomorAwal = 1,
}: {
  rows: BarisKatalog[];
  nomorAwal?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState<DetailHargaRilis | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const bukaRincian = async (id: string) => {
    try {
      setLoadingId(id);
      const res = await fetch(`/api/sb-specialist/master-harga/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        Swal.fire({
          icon: "error",
          title: "Gagal Memuat Rincian",
          text: json.message || "Data master harga tidak ditemukan.",
          confirmButtonColor: "#005BAC",
        });
        return;
      }
      setDetail(json.data);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Kendala Koneksi",
        text: "Gagal memuat rincian master harga.",
        confirmButtonColor: "#005BAC",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const toggleStatus = async (r: BarisKatalog, aktif: boolean) => {
    const confirm = await Swal.fire({
      title: aktif
        ? `Aktifkan "${r.namaItem}"?`
        : `Nonaktifkan "${r.namaItem}" di ${r.namaCabang}?`,
      text: aktif
        ? "Harga akan kembali tampil sebagai harga resmi aktif."
        : "Harga cabang akan dinonaktifkan dari daftar harga resmi aktif.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: aktif ? "#059669" : "#ED1C24",
      cancelButtonColor: "#64748b",
      confirmButtonText: aktif ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
      cancelButtonText: "Batal",
    });
    if (!confirm.isConfirmed) return;

    startTransition(async () => {
      const hasil = await setStatusHargaCabangAction({ id: r.id, aktif });
      await Swal.fire({
        icon: hasil.success ? "success" : "error",
        title: hasil.success ? "Berhasil" : "Gagal",
        text: hasil.message,
        confirmButtonColor: "#005BAC",
      });
      if (hasil.success) {
        setDetail(null);
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200">
            <tr>
              <th className="py-3 pl-4 pr-2 w-10">No</th>
              <th className="py-3 px-2">Item Pekerjaan</th>
              <th className="py-3 px-2">Kategori</th>
              <th className="py-3 px-2">Cabang / Wilayah</th>
              <th className="py-3 px-2 text-right">Harga Satuan</th>
              <th className="py-3 px-2 text-right">Selisih dari Induk</th>
              <th className="py-3 px-2">Berlaku Sejak</th>
              <th className="py-3 pl-2 pr-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {rows.map((r, i) => (
              <React.Fragment key={r.id}>
                <tr className="align-top hover:bg-slate-50">
                  <td className="py-3 pl-4 pr-2 text-slate-500 font-mono">
                    {nomorAwal + i}
                  </td>
                  <td className="py-3 px-2 min-w-56">
                    <div className="font-bold text-slate-900">{r.namaItem}</div>
                    <div className="font-mono text-[11px] font-semibold text-slate-500">
                      {r.kodeMaster}
                    </div>
                    {r.spesifikasi && (
                      <div className="text-[11px] text-slate-600 font-medium">
                        {r.spesifikasi}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 min-w-32">
                    <div className="font-semibold text-slate-800">
                      {r.kategori}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {r.namaDivisi}
                    </div>
                  </td>
                  <td className="py-3 px-2 min-w-32">
                    <div className="font-bold text-slate-800">
                      {r.namaCabang}
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#005BAC] text-white text-[10px] font-bold uppercase tracking-wider">
                      Induk Cabang
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right whitespace-nowrap">
                    <div className="font-mono tabular-nums font-black text-slate-900 text-sm">
                      {formatRupiah(r.harga)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      per {r.satuan} · Margin {r.marginPersen}%
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-slate-400 font-medium">
                    -
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <div className="font-mono font-medium text-slate-700">
                      {formatTanggal(r.berlakuSejak)}
                    </div>
                    {r.nomorTiket && (
                      <div className="font-mono text-[11px] text-slate-500">
                        {r.nomorTiket}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pl-2 pr-4 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => bukaRincian(r.id)}
                        disabled={loadingId === r.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {loadingId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        <span>Rincian</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(r, false)}
                        disabled={pending}
                        title="Nonaktifkan Harga Cabang"
                        className="p-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-600 hover:border-[#ED1C24] hover:bg-[#ED1C24] hover:text-white transition-colors cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>

                {r.wilayahList.map((w) => (
                  <tr
                    key={w.id}
                    className="align-top bg-amber-50 hover:bg-amber-100"
                  >
                    <td className="py-2.5 pl-4 pr-2" />
                    <td className="py-2.5 px-2 text-slate-600" colSpan={2}>
                      <span className="inline-flex items-center gap-1.5 pl-3 text-xs font-semibold text-amber-900">
                        <CornerDownRight className="w-3.5 h-3.5 text-amber-600" />
                        Harga khusus wilayah untuk item di atas
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />{" "}
                        {w.namaWilayah}
                      </div>
                      <span className="block mt-1 w-fit px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider">
                        Khusus Wilayah
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      <div className="font-mono tabular-nums font-black text-slate-900 text-sm">
                        {formatRupiah(w.harga)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        per {r.satuan}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      <Selisih rp={w.selisihRp} persen={w.selisihPersen} />
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <div className="font-mono font-medium text-slate-700">
                        {formatTanggal(w.berlakuSejak)}
                      </div>
                      {w.nomorTiket && (
                        <div className="font-mono text-[11px] text-slate-500">
                          {w.nomorTiket}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 pr-4" />
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Rincian Item Rilis */}
      {detail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-start justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xl max-w-5xl w-full my-8 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-black text-slate-900">
                      {detail.item.namaItem}
                    </h2>
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase">
                      RILIS AKTIF
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {detail.item.kodeMaster} · Cabang {detail.item.namaCabang} ·
                    Berlaku sejak {formatTanggal(detail.berlakuSejak)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto">
              {/* Harga Induk + Override */}
              <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Harga Resmi Induk Cabang ({detail.item.namaCabang})
                  </span>
                  <span className="text-2xl font-black font-mono text-[#005BAC] tabular-nums">
                    {formatRupiah(detail.hargaFinalInduk)}
                  </span>
                  <span className="text-xs text-slate-600 font-semibold ml-1.5">
                    / {detail.item.satuan} (Margin {detail.marginTotalPersen}%)
                  </span>
                </div>
                {detail.nomorTiket && (
                  <span className="px-3 py-1.5 rounded-lg bg-[#005BAC] text-white text-xs font-mono font-bold">
                    Tiket Rilis: {detail.nomorTiket}
                  </span>
                )}
              </div>

              {detail.wilayahList.length > 0 && (
                <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs font-black uppercase text-slate-800">
                    Harga Khusus Wilayah ({detail.wilayahList.length})
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Wilayah</th>
                        <th className="py-2 px-3 text-right">Harga Wilayah</th>
                        <th className="py-2 px-3 text-right">Selisih Induk</th>
                        <th className="py-2 px-3">Berlaku Sejak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.wilayahList.map((w) => (
                        <tr key={w.id}>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {w.namaWilayah}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                            {formatRupiah(w.harga)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Selisih rp={w.selisihRp} persen={w.selisihPersen} />
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {formatTanggal(w.berlakuSejak)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <DetailSpesifikasi item={detail.item} showDeskripsi={true} />

              {detail.item.koefisienItems.length > 0 && (
                <RincianKalkulasiKoefisien
                  item={detail.item}
                  koefisienItems={detail.item.koefisienItems}
                  mode="readonly"
                  liveMarginUpah={detail.item.liveMarginUpah}
                  liveMarginMaterial={detail.item.liveMarginMaterial}
                  liveMarginBongkaran={detail.item.liveMarginBongkaran}
                />
              )}

              {detail.item.surveiTokoList.length > 0 && (
                <RincianSurvei3TokoCard
                  surveiList={detail.item.surveiTokoList}
                  materialName={detail.item.namaItem}
                  readonly={true}
                />
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t-2 border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="px-5 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
