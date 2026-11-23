"use client";

import React from "react";
import { AlertCircle, Eye, Loader2, MapPin } from "lucide-react";
import type { DetailHargaRilis } from "@/lib/services/master-harga-service";
import { DetailSpesifikasi } from "@/components/global/DetailSpesifikasi";
import { RincianKalkulasiKoefisien } from "@/components/global/RincianKalkulasiKoefisien";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

function SelisihText({ rp, persen }: { rp: number; persen: number }) {
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
            : "text-slate-600"
      )}
    >
      {tanda}
      {formatRupiah(Math.abs(rp))}
      <span className="ml-1 text-[11px] font-semibold">
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

/**
 * Konten rincian harga rilis (Induk maupun Wilayah) beserta komponen AHSP
 * dan bukti survei 3 toko per masing-masing komponen material/peralatan.
 */
export function DetailHargaRilisContent({
  detail,
  onSelectWilayah,
  loadingWilayahId = null,
}: {
  detail: DetailHargaRilis;
  onSelectWilayah?: (wilayahId: string) => void;
  loadingWilayahId?: string | null;
}) {
  const isWilayah = detail.cakupanHarga === "KHUSUS_WILAYAH";
  const surveiGroups = detail.surveiPerKomponen ?? [];

  return (
    <div className="space-y-4">
      {isWilayah ? (
        <div className="bg-white border-2 border-amber-500 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-black uppercase mb-1.5">
                <MapPin className="w-3 h-3" />
                {detail.namaWilayah}
              </span>
              <span className="text-[11px] font-bold uppercase text-slate-500 block">
                {detail.item.namaCabang} &bull; {detail.item.namaDivisi}
              </span>
              <div className="mt-1">
                <span className="text-2xl font-black font-mono text-[#005BAC] tabular-nums">
                  {formatRupiah(detail.hargaFinalWilayah ?? detail.hargaFinalInduk)}
                </span>
                <span className="text-xs text-slate-600 font-semibold ml-1.5">
                  / {detail.item.satuan} (Margin {detail.marginTotalPersen}%)
                </span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase">
                Pembanding Harga Induk
              </div>
              <div className="font-mono font-black text-sm text-slate-900">
                {formatRupiah(detail.hargaFinalInduk)} / {detail.item.satuan}
              </div>
              {detail.selisihRp !== null && detail.selisihPersen !== null && (
                <div className="text-xs">
                  Selisih:{" "}
                  <SelisihText rp={detail.selisihRp} persen={detail.selisihPersen} />
                </div>
              )}
              {detail.nomorTiket && (
                <div className="pt-1">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-[#005BAC] text-white text-[11px] font-mono font-bold">
                    {detail.nomorTiket}
                  </span>
                </div>
              )}
            </div>
          </div>

          {detail.sumberRincian === "FALLBACK_INDUK" && (
            <div className="p-2.5 rounded-lg bg-amber-100 border-2 border-amber-400 text-amber-950 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Rincian komponen &amp; survei tiket wilayah belum tersedia; menampilkan komponen induk cabang.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Harga Resmi Induk Cabang ({detail.item.namaCabang} &bull; {detail.item.namaDivisi})
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
      )}

      {detail.wilayahList.length > 0 && (
        <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs font-black uppercase text-slate-800">
            Harga Wilayah ({detail.wilayahList.length})
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Wilayah</th>
                <th className="py-2 px-3 text-right">Harga Wilayah</th>
                <th className="py-2 px-3 text-right">Selisih Induk</th>
                <th className="py-2 px-3">Berlaku Sejak</th>
                {onSelectWilayah && <th className="py-2 px-3 text-center w-28">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.wilayahList.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-bold text-slate-900">{w.namaWilayah}</td>
                  <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                    {formatRupiah(w.harga)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <SelisihText rp={w.selisihRp} persen={w.selisihPersen} />
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600">
                    {formatTanggal(w.berlakuSejak)}
                  </td>
                  {onSelectWilayah && (
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectWilayah(w.id)}
                        disabled={loadingWilayahId === w.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-amber-600 bg-white text-amber-800 hover:bg-amber-600 hover:text-white text-[11px] font-bold transition-colors cursor-pointer disabled:bg-slate-200"
                      >
                        {loadingWilayahId === w.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        <span>Rincian</span>
                      </button>
                    </td>
                  )}
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

      {surveiGroups.length > 0 ? (
        <div className="space-y-3">
          {surveiGroups.map((g) => (
            <RincianSurvei3TokoCard
              key={g.rincianId}
              surveiList={g.surveiList}
              materialName={`${g.namaKomponen} (Koef: ${g.koefisien} ${g.satuan})`}
              satuan={g.satuan}
              readonly={true}
            />
          ))}
        </div>
      ) : (
        detail.item.surveiTokoList.length > 0 && (
          <RincianSurvei3TokoCard
            surveiList={detail.item.surveiTokoList}
            materialName={detail.item.namaItem}
            satuan={detail.item.satuan}
            readonly={true}
          />
        )
      )}
    </div>
  );
}
