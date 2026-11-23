"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
  PlusCircle,
  Tag,
  X,
  MapPin,
} from "lucide-react";
import Swal from "sweetalert2";
import type { BarisKatalogBm, DetailHargaRilis } from "@/lib/services/master-harga-service";
import { DetailSpesifikasi } from "@/components/global/DetailSpesifikasi";
import { DetailHargaRilisContent } from "@/components/katalog/DetailHargaRilisContent";
import { ArrowLeft } from "lucide-react";
import {
  TambahPengajuanModal,
  type ActivationTemplatePayload,
  type BulkPengajuanPayloadItem,
} from "@/components/bm-manager/TambahPengajuanModal";
import { ModalPengajuanHargaWilayah } from "@/components/bm-manager/ModalPengajuanHargaWilayah";
import { submitBulkPengajuanApi } from "@/lib/client/submit-pengajuan";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";
import type { PengajuanHargaItem } from "@/types";

export function KatalogHargaBmClient({
  rows,
  namaCabang,
  nomorAwal = 1,
}: {
  rows: BarisKatalogBm[];
  namaCabang: string;
  nomorAwal?: number;
}) {
  const router = useRouter();
  const [selectedRow, setSelectedRow] = useState<BarisKatalogBm | null>(null);
  const [wilayahDetail, setWilayahDetail] = useState<DetailHargaRilis | null>(null);
  const [loadingWilayahDetailId, setLoadingWilayahDetailId] = useState<string | null>(null);
  const [loadingAktivasiKey, setLoadingAktivasiKey] = useState<string | null>(null);

  const bukaModalRow = (row: BarisKatalogBm) => {
    setWilayahDetail(null);
    setSelectedRow(row);
  };

  const tutupModalRow = () => {
    setWilayahDetail(null);
    setSelectedRow(null);
  };

  const bukaRincianWilayah = async (wilayahId: string) => {
    if (loadingWilayahDetailId) return;
    setLoadingWilayahDetailId(wilayahId);
    try {
      const res = await fetch(`/api/sb-specialist/master-harga/wilayah/${wilayahId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data) {
        await Swal.fire({
          icon: "error",
          title: "Gagal Memuat Rincian",
          text: json?.message || "Rincian harga wilayah tidak dapat dimuat.",
          confirmButtonColor: "#ED1C24",
        });
        return;
      }
      setWilayahDetail(json.data as DetailHargaRilis);
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Koneksi Gagal",
        text: "Tidak dapat terhubung ke server saat memuat rincian harga wilayah.",
        confirmButtonColor: "#ED1C24",
      });
    } finally {
      setLoadingWilayahDetailId(null);
    }
  };
  const [activationTemplate, setActivationTemplate] =
    useState<ActivationTemplatePayload | null>(null);
  const [isModalAktivasiOpen, setIsModalAktivasiOpen] = useState(false);
  const [wilayahTarget, setWilayahTarget] = useState<{
    masterItemId: string;
    divisiId: string;
  } | null>(null);

  const ajukanAktivasi = async (
    masterItemId: string,
    targetDivisiId?: string,
    buttonKey?: string,
    rowDivisiStatusList?: BarisKatalogBm["divisiStatusList"]
  ) => {
    const reqKey = buttonKey || `${masterItemId}:${targetDivisiId || "default"}`;
    if (loadingAktivasiKey) return;
    setLoadingAktivasiKey(reqKey);
    try {
      const params = new URLSearchParams({ masterItemId });
      if (targetDivisiId) params.set("targetDivisiId", targetDivisiId);
      const res = await fetch(`/api/bm-manager/aktivasi-template?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.data) {
        await Swal.fire({
          icon: "error",
          title: "Gagal Memuat Form Aktivasi",
          text: json?.message || "Template spesifikasi item tidak dapat dimuat.",
          confirmButtonColor: "#ED1C24",
        });
        return;
      }
      const rowAktif = (rowDivisiStatusList || []).filter((d) => d.status === "AKTIF");
      const rowProses = (rowDivisiStatusList || []).filter((d) => d.status === "PROSES");
      const mergedTemplate: ActivationTemplatePayload = {
        ...json.data,
        targetDivisiId: json.data.targetDivisiId || targetDivisiId,
        activeDivisiIds: Array.from(
          new Set([...(json.data.activeDivisiIds || []), ...rowAktif.map((d) => d.divisiId)])
        ),
        activeDivisiCodes: Array.from(
          new Set([...(json.data.activeDivisiCodes || []), ...rowAktif.map((d) => d.kodeDivisi)])
        ),
        inProgressDivisiIds: Array.from(
          new Set([...(json.data.inProgressDivisiIds || []), ...rowProses.map((d) => d.divisiId)])
        ),
        inProgressDivisiCodes: Array.from(
          new Set([...(json.data.inProgressDivisiCodes || []), ...rowProses.map((d) => d.kodeDivisi)])
        ),
      };
      setSelectedRow(null);
      setActivationTemplate(mergedTemplate);
      setIsModalAktivasiOpen(true);
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Koneksi Gagal",
        text: "Tidak dapat terhubung ke server saat memuat template aktivasi.",
        confirmButtonColor: "#ED1C24",
      });
    } finally {
      setLoadingAktivasiKey(null);
    }
  };

  const handleBulkAktivasiSubmit = async (bulkItems: BulkPengajuanPayloadItem[]) => {
    await submitBulkPengajuanApi({
      bulkItems,
      defaultCabang: namaCabang || "Cikokol",
      onCreated: () => router.refresh(),
    });
  };

  const toDetailItem = (r: BarisKatalogBm): PengajuanHargaItem => ({
    id: r.id,
    noTiket: r.kodeMaster,
    kodeItem: r.kodeItem,
    kelompokKode: r.kelompokKode,
    kode: r.kodeItem,
    kodeMaster: r.kodeMaster,
    namaItem: r.namaItem,
    item: r.namaItem,
    kategori: r.kategori,
    jenisCor: r.jenisCor ?? undefined,
    ukuran: r.ukuran,
    merk: r.merk,
    tipe: r.tipe ?? undefined,
    warna: r.warna ?? undefined,
    permukaan: r.permukaan ?? undefined,
    tebal: r.tebal ?? undefined,
    toleransi: r.toleransi ?? undefined,
    lokasi: r.lokasi,
    satuan: r.satuan,
    deskripsiOtomatis: r.deskripsiOtomatis,
    divisiId: r.divisiStatusList[0]?.divisiId || "",
    cabangId: "",
    namaCabang,
    cakupanHarga: "INDUK_CABANG",
    status: "RELEASED",
    tanggalPengajuan:
      r.divisiStatusList.find((d) => d.status === "AKTIF")?.berlakuSejak?.slice(0, 10) ||
      "-",
    surveiTokoList: [],
    koefisienItems: [],
    liveMarginUpah: 8,
    liveMarginMaterial: 8,
    liveMarginBongkaran: 8,
    totalHpp: 0,
    totalHargaSatuan: 0,
  });

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200">
            <tr>
              <th className="py-3 pl-4 pr-2 w-10">No</th>
              <th className="py-3 px-2 w-24">Kode</th>
              <th className="py-3 px-2">Item Pekerjaan &amp; Spesifikasi</th>
              <th className="py-3 px-2">Kategori</th>
              <th className="py-3 px-2 w-32 whitespace-nowrap">Status Cabang</th>
              <th className="py-3 px-2 min-w-36">Divisi ({namaCabang})</th>
              <th className="py-3 px-2 min-w-36 whitespace-nowrap">Harga ({namaCabang})</th>
              <th className="py-3 pl-2 pr-4 text-center w-44">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-200 bg-white">
            {rows.map((r, idx) => {
              const aktifDivs = r.divisiStatusList.filter((d) => d.status === "AKTIF");
              const belumAktifDivs = r.divisiStatusList.filter(
                (d) => d.status === "BELUM_AKTIF"
              );
              const isAktifDiCabangSaya = aktifDivs.length > 0;
              const jumlahCabangLain = isAktifDiCabangSaya
                ? Math.max(0, r.totalCabangAktif - 1)
                : r.totalCabangAktif;

              return (
                <tr key={r.id} className="align-top hover:bg-slate-50">
                  <td className="py-3.5 pl-4 pr-2 text-slate-500 font-mono font-bold">
                    {nomorAwal + idx}
                  </td>
                  <td className="py-3.5 px-2 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-block px-2.5 py-0.5 rounded text-[11px] font-black text-white uppercase",
                        r.kelompokKode === "ME" ? "bg-[#005BAC]" : "bg-slate-800"
                      )}
                    >
                      {r.kelompokKode}
                    </span>
                    <div className="font-mono text-[11px] font-bold text-slate-600 mt-1">
                      {r.kodeItem}
                    </div>
                  </td>
                  <td className="py-3.5 px-2 min-w-56">
                    <div className="font-bold text-slate-900">{r.namaItem}</div>
                    <div className="font-mono text-[11px] font-semibold text-slate-500">
                      {r.kodeMaster}
                    </div>
                    {r.spesifikasi && (
                      <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                        {r.spesifikasi}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      Lokasi: {r.lokasi} &middot; Satuan: {r.satuan}
                    </div>
                  </td>
                  <td className="py-3.5 px-2 min-w-32">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-bold">
                      {r.kategori}
                    </span>
                    {r.jenisCor && (
                      <div className="text-[11px] text-slate-600 font-semibold mt-1">
                        {r.jenisCor}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-2 w-32 whitespace-nowrap">
                    {isAktifDiCabangSaya ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                        <div className="text-[10px] font-semibold text-slate-600 mt-1">
                          {jumlahCabangLain > 0
                            ? `+${jumlahCabangLain} cabang lain`
                            : "1 cabang"}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black">
                          Belum Aktif
                        </span>
                        <div className="text-[10px] font-semibold text-slate-600 mt-1">
                          {r.totalCabangAktif} cabang lain
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-2 min-w-36">
                    {aktifDivs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {aktifDivs.map((d) => (
                          <span
                            key={d.divisiId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {d.shortLabel}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-2 min-w-36 whitespace-nowrap">
                    {r.minHargaCabangSaya !== null && r.maxHargaCabangSaya !== null ? (
                      r.minHargaCabangSaya === r.maxHargaCabangSaya ? (
                        <div>
                          <span className="font-mono font-black text-slate-900 text-xs">
                            {formatRupiah(r.minHargaCabangSaya)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold ml-1">
                            / {r.satuan}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="font-mono font-black text-slate-900 text-xs">
                            {formatRupiah(r.minHargaCabangSaya)} &ndash;{" "}
                            {formatRupiah(r.maxHargaCabangSaya)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            / {r.satuan}
                          </div>
                        </div>
                      )
                    ) : (
                      <span className="font-mono font-bold text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3.5 pl-2 pr-4 text-center whitespace-nowrap">
                    <div className="flex flex-col gap-1.5 items-stretch">
                      <button
                        type="button"
                        onClick={() => bukaModalRow(r)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-800 hover:border-[#005BAC] hover:text-[#005BAC] text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Spesifikasi</span>
                      </button>

                      {r.adaDivisiBelumAktif && (
                        <button
                          type="button"
                          disabled={loadingAktivasiKey !== null}
                          onClick={() =>
                            ajukanAktivasi(
                              r.id,
                              belumAktifDivs[0]?.divisiId,
                              `cta-${r.id}`,
                              r.divisiStatusList
                            )
                          }
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#005BAC] hover:bg-[#004585] text-white text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-60"
                        >
                          {loadingAktivasiKey === `cta-${r.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PlusCircle className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {loadingAktivasiKey === `cta-${r.id}`
                              ? "Memuat..."
                              : aktifDivs.length > 0
                                ? "Ajukan Divisi Lain"
                                : "Ajukan di Cabang Saya"}
                          </span>
                        </button>
                      )}

                      {aktifDivs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => bukaModalRow(r)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-amber-600 bg-white text-amber-700 hover:bg-amber-600 hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Ajukan Harga Wilayah</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Detail Spesifikasi & Harga Cabang Sendiri */}
      {selectedRow && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-start justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xl max-w-4xl w-full my-8 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#005BAC] text-white flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black text-white uppercase",
                        selectedRow.kelompokKode === "ME" ? "bg-[#005BAC]" : "bg-slate-800"
                      )}
                    >
                      {selectedRow.kelompokKode}
                    </span>
                    <h2 className="text-sm font-black text-slate-900">
                      {selectedRow.namaItem}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {selectedRow.kodeMaster} &middot; Cabang {namaCabang}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={tutupModalRow}
                className="p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto">
              {wilayahDetail ? (
                <DetailHargaRilisContent detail={wilayahDetail} />
              ) : (
                <>
                  <DetailSpesifikasi item={toDetailItem(selectedRow)} showDeskripsi={true} />

              {/* Daftar Cabang Aktif (Tanpa Harga Cabang Lain) */}
              <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-800 text-white text-xs font-black uppercase flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Cabang Aktif ({selectedRow.totalCabangAktif} Cabang)</span>
                </div>
                <div className="p-4 flex flex-wrap gap-2.5">
                  {!selectedRow.cabangAktifList.some((c) => c.isCabangSaya) && (
                    <div className="px-3 py-2 rounded-lg border-2 border-rose-600 bg-white flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{namaCabang}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black">
                        Belum Aktif
                      </span>
                    </div>
                  )}
                  {selectedRow.cabangAktifList.map((c) => (
                    <div
                      key={c.cabangId}
                      className={cn(
                        "px-3 py-2 rounded-lg border-2 bg-white flex items-center gap-2 flex-wrap",
                        c.isCabangSaya ? "border-[#005BAC]" : "border-slate-300"
                      )}
                    >
                      <span className="text-xs font-bold text-slate-900">
                        {c.namaCabang}
                      </span>
                      {c.isCabangSaya && (
                        <span className="px-2 py-0.5 rounded bg-[#005BAC] text-white text-[10px] font-black">
                          Cabang Anda
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        {c.divisiShortList.map((divShort) => (
                          <span
                            key={divShort}
                            className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black"
                          >
                            {divShort}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-800 text-white text-xs font-black uppercase">
                  Harga &amp; Status Cabang {namaCabang}
                </div>
                <div className="divide-y divide-slate-200">
                  {selectedRow.divisiStatusList.map((d) => (
                    <div key={d.divisiId} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{d.namaDivisi}</div>
                          <div className="text-[11px] text-slate-500 font-semibold">
                            {d.status === "AKTIF" && d.berlakuSejak
                              ? `Berlaku sejak ${formatTanggal(d.berlakuSejak)} (${d.nomorTiket || "-"})`
                              : d.status === "PROSES"
                                ? `Sedang Diproses (${d.nomorTiketProses})`
                                : "Belum Aktif"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {d.status === "AKTIF" ? (
                            <>
                              <span className="font-mono font-black text-sm text-[#005BAC]">
                                {formatRupiah(d.hargaInduk)} / {selectedRow.satuan}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setWilayahTarget({
                                    masterItemId: selectedRow.id,
                                    divisiId: d.divisiId,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-amber-600 bg-white text-amber-700 hover:bg-amber-600 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>Ajukan Harga Wilayah</span>
                              </button>
                            </>
                          ) : d.status === "PROSES" ? (
                            <Link
                              href={`/bm-manager/${d.tiketIdProses}`}
                              className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold"
                            >
                              Lihat Tiket {d.nomorTiketProses}
                            </Link>
                          ) : (
                            <span className="px-2.5 py-1 rounded bg-slate-700 text-white text-[11px] font-bold">
                              Belum Aktif
                            </span>
                          )}
                        </div>
                      </div>
                      {d.status === "AKTIF" && d.wilayahList.length > 0 && (
                        <div className="w-full pt-2 mt-2 border-t border-slate-200 flex flex-wrap gap-2">
                          {d.wilayahList.map((w) => (
                            <div
                              key={w.id}
                              className="inline-flex items-center rounded-lg border-2 border-amber-600 bg-white overflow-hidden"
                            >
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white text-[10px] font-bold">
                                <MapPin className="w-3 h-3" />
                                {w.namaWilayah}: {formatRupiah(w.harga)}
                              </span>
                              <button
                                type="button"
                                onClick={() => bukaRincianWilayah(w.id)}
                                disabled={loadingWilayahDetailId === w.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-amber-800 hover:bg-amber-700 hover:text-white text-[10px] font-bold transition-colors cursor-pointer disabled:bg-slate-200"
                              >
                                {loadingWilayahDetailId === w.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                                <span>Rincian</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
                </>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t-2 border-slate-200 flex justify-end gap-2">
              {wilayahDetail && (
                <button
                  type="button"
                  onClick={() => setWilayahDetail(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Spesifikasi</span>
                </button>
              )}
              {!wilayahDetail && selectedRow.adaDivisiBelumAktif && (
                <button
                  type="button"
                  disabled={loadingAktivasiKey !== null}
                  onClick={() =>
                    ajukanAktivasi(
                      selectedRow.id,
                      selectedRow.divisiStatusList.find((d) => d.status === "BELUM_AKTIF")
                        ?.divisiId,
                      `modal-footer-${selectedRow.id}`,
                      selectedRow.divisiStatusList
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005BAC] hover:bg-[#004585] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {loadingAktivasiKey === `modal-footer-${selectedRow.id}` && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Ajukan Aktivasi Divisi</span>
                </button>
              )}
              <button
                type="button"
                onClick={tutupModalRow}
                className="px-5 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Pengajuan (Mode Aktivasi Langsung di Katalog Harga) */}
      <TambahPengajuanModal
        isOpen={isModalAktivasiOpen}
        onClose={() => {
          setIsModalAktivasiOpen(false);
          setActivationTemplate(null);
        }}
        onSubmit={() => {}}
        onBulkSubmit={handleBulkAktivasiSubmit}
        activationTemplate={activationTemplate}
        defaultCabang={namaCabang}
      />

      {/* Modal Pengajuan Harga Wilayah (Input Harga Bahan/Alat -> Approval S&B) */}
      <ModalPengajuanHargaWilayah
        isOpen={Boolean(wilayahTarget)}
        masterItemId={wilayahTarget?.masterItemId ?? ""}
        divisiId={wilayahTarget?.divisiId ?? ""}
        onClose={() => setWilayahTarget(null)}
        onSuccess={() => {
          setSelectedRow(null);
          router.refresh();
        }}
      />
    </>
  );
}
