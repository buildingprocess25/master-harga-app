"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  History,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Store,
  Tag,
  User,
  Wrench,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import type {
  BarisKomponenSurvei,
  BarisMasterToko,
  BarisRiwayatSurvei,
  MasterSurveiData,
} from "@/lib/services/master-survei-service";
import {
  jadikanHargaAcuanAction,
  setStatusMasterTokoSnbAction,
  simpanMasterTokoSnbAction,
} from "@/app/sb-specialist/actions";
import { RingkasanBiayaMaterial } from "@/components/global/RingkasanBiayaMaterial";
import { RincianSurvei3TokoCard } from "@/components/global/RincianSurvei3TokoCard";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";
import type { SurveyTokoItem } from "@/types";

interface TokoFormState {
  id?: string;
  cabangId: string;
  wilayahCabangId: string;
  namaToko: string;
  alamat: string;
  kota: string;
  kontakPic: string;
  telepon: string;
}

interface DetailSurveiModalData {
  judul: string;
  subjudul: string;
  namaMaterial: string;
  surveiList: SurveyTokoItem[];
  masterKoefisienId: string;
  hargaAcuanSaatIni: number | null;
  rataRataSurvei: number;
}

const INPUT_CLS =
  "w-full px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-[#005BAC]";

export function MasterSurveiClient({ data }: { data: MasterSurveiData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<
    "acuan_koefisien" | "riwayat_survei" | "master_toko"
  >("acuan_koefisien");

  const [detailModal, setDetailModal] = useState<DetailSurveiModalData | null>(
    null
  );
  const [tokoForm, setTokoForm] = useState<TokoFormState | null>(null);

  const handleJadikanHargaAcuan = async (
    masterKoefisienId: string,
    namaKomponen: string,
    hargaBaru: number,
    hargaSaatIni: number | null
  ) => {
    const confirm = await Swal.fire({
      title: "Jadikan Harga Acuan?",
      html: `
        <div style="text-align:left;font-size:13px;line-height:1.6;">
          <p>Komponen: <strong>${namaKomponen}</strong></p>
          <p>Harga acuan saat ini: <strong>${hargaSaatIni !== null ? formatRupiah(hargaSaatIni) : "-"}</strong></p>
          <p>Harga acuan baru (rata-rata survei): <strong style="color:#005BAC;">${formatRupiah(hargaBaru)}</strong></p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Jadikan Harga Acuan",
      cancelButtonText: "Batal",
    });
    if (!confirm.isConfirmed) return;

    startTransition(async () => {
      const res = await jadikanHargaAcuanAction({
        masterKoefisienId,
        hargaBaru,
      });
      await Swal.fire({
        icon: res.success ? "success" : "error",
        title: res.success ? "Harga Acuan Diperbarui" : "Gagal",
        text: res.message,
        confirmButtonColor: "#005BAC",
      });
      if (res.success) {
        setDetailModal(null);
        router.refresh();
      }
    });
  };

  const bukaModalTambahToko = () => {
    const firstCabang = data.cabangList[0];
    setTokoForm({
      cabangId: firstCabang?.id ?? "",
      wilayahCabangId: "",
      namaToko: "",
      alamat: "",
      kota: firstCabang?.namaCabang ?? "",
      kontakPic: "",
      telepon: "",
    });
  };

  const bukaModalEditToko = (t: BarisMasterToko) => {
    setTokoForm({
      id: t.id,
      cabangId: t.cabangId,
      wilayahCabangId: t.wilayahCabangId ?? "",
      namaToko: t.namaToko,
      alamat: t.alamat,
      kota: t.kota,
      kontakPic: t.kontakPic ?? "",
      telepon: t.telepon ?? "",
    });
  };

  const handleSimpanToko = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokoForm) return;
    if (!tokoForm.namaToko.trim() || !tokoForm.alamat.trim() || !tokoForm.cabangId) {
      Swal.fire({
        icon: "warning",
        title: "Data Belum Lengkap",
        text: "Cabang, nama toko, dan alamat wajib diisi.",
        confirmButtonColor: "#005BAC",
      });
      return;
    }

    startTransition(async () => {
      const res = await simpanMasterTokoSnbAction({
        id: tokoForm.id,
        cabangId: tokoForm.cabangId,
        wilayahCabangId: tokoForm.wilayahCabangId || null,
        namaToko: tokoForm.namaToko,
        alamat: tokoForm.alamat,
        kota: tokoForm.kota,
        kontakPic: tokoForm.kontakPic || null,
        telepon: tokoForm.telepon || null,
      });
      await Swal.fire({
        icon: res.success ? "success" : "error",
        title: res.success ? "Tersimpan" : "Gagal",
        text: res.message,
        confirmButtonColor: "#005BAC",
      });
      if (res.success) {
        setTokoForm(null);
        router.refresh();
      }
    });
  };

  const handleToggleToko = async (t: BarisMasterToko) => {
    const aktif = !t.isActive;
    const confirm = await Swal.fire({
      title: aktif
        ? `Aktifkan "${t.namaToko}"?`
        : `Nonaktifkan "${t.namaToko}"?`,
      text: aktif
        ? "Toko akan muncul kembali pada pilihan survei Building Coordinator."
        : "Toko tidak akan muncul lagi untuk survei baru, riwayat survei lama tetap tersimpan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: aktif ? "#059669" : "#ED1C24",
      cancelButtonColor: "#64748b",
      confirmButtonText: aktif ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
      cancelButtonText: "Batal",
    });
    if (!confirm.isConfirmed) return;

    startTransition(async () => {
      const res = await setStatusMasterTokoSnbAction({ id: t.id, aktif });
      await Swal.fire({
        icon: res.success ? "success" : "error",
        title: res.success ? "Berhasil" : "Gagal",
        text: res.message,
        confirmButtonColor: "#005BAC",
      });
      if (res.success) router.refresh();
    });
  };

  const renderBadgeKategori = (kat: string) =>
    kat === "ALAT" ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold uppercase">
        <Wrench className="w-3 h-3" />
        Peralatan
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#005BAC] text-white text-[10px] font-bold uppercase">
        <Tag className="w-3 h-3" />
        Material Bahan
      </span>
    );

  const selectedCabangObj = tokoForm
    ? data.cabangList.find((c) => c.id === tokoForm.cabangId)
    : undefined;

  return (
    <>
      {/* Navigasi 3 Tab Solid */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3 border-b-2 border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("acuan_koefisien")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "acuan_koefisien"
                ? "border-[#005BAC] text-[#005BAC] bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Material &amp; Peralatan (Koefisien)</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                activeTab === "acuan_koefisien"
                  ? "bg-[#005BAC] text-white"
                  : "bg-slate-600 text-white"
              )}
            >
              {data.komponenSurvei.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("riwayat_survei")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "riwayat_survei"
                ? "border-[#005BAC] text-[#005BAC] bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Survei 3 Toko</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                activeTab === "riwayat_survei"
                  ? "bg-[#005BAC] text-white"
                  : "bg-slate-600 text-white"
              )}
            >
              {data.riwayatSurvei.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("master_toko")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "master_toko"
                ? "border-[#005BAC] text-[#005BAC] bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Master Toko / Supplier</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                activeTab === "master_toko"
                  ? "bg-[#005BAC] text-white"
                  : "bg-slate-600 text-white"
              )}
            >
              {data.masterTokoList.length}
            </span>
          </button>
        </div>

        {activeTab === "master_toko" && (
          <button
            type="button"
            onClick={bukaModalTambahToko}
            className="mb-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#005BAC] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Toko</span>
          </button>
        )}
      </div>

      {/* TAB 1: MATERIAL & PERALATAN (KOEFISIEN) */}
      {activeTab === "acuan_koefisien" && (
        <div className="overflow-x-auto">
          {data.komponenSurvei.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-500 font-medium">
              Tidak ada komponen Material Bahan atau Peralatan Kerja yang cocok dengan filter.
            </p>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 pl-4 pr-2">Komponen (Master Koefisien)</th>
                  <th className="py-3 px-2">Kategori &amp; Divisi</th>
                  <th className="py-3 px-2 text-right">Harga Acuan Koefisien</th>
                  <th className="py-3 px-2">Survei 3 Toko Terbaru</th>
                  <th className="py-3 px-2 text-right">Rata-Rata Pasar</th>
                  <th className="py-3 pl-2 pr-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {data.komponenSurvei.map((k: BarisKomponenSurvei) => {
                  const rata = k.latestSurvei?.rataRataHarga ?? 0;
                  const acuan = k.hargaAcuanDefault ?? 0;
                  const samaDenganAcuan = rata > 0 && acuan === rata;

                  return (
                    <tr key={k.id} className="align-top hover:bg-slate-50">
                      <td className="py-3 pl-4 pr-2 min-w-52">
                        <div className="font-bold text-slate-900">
                          {k.namaKomponen}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[11px] text-slate-600 font-medium">
                            Satuan: {k.satuan} · Koef: {k.nilaiKoefisienDefault}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div>{renderBadgeKategori(k.kategori)}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1">
                          {k.namaDivisi}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {k.hargaAcuanDefault !== null
                          ? formatRupiah(k.hargaAcuanDefault)
                          : "-"}
                      </td>
                      <td className="py-3 px-2 min-w-60">
                        {k.latestSurvei ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-800">
                              {k.latestSurvei.nomorTiket} ·{" "}
                              {k.latestSurvei.namaCabang}
                              {k.latestSurvei.namaWilayah
                                ? ` (${k.latestSurvei.namaWilayah})`
                                : ""}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {k.latestSurvei.tokoList
                                .map((t) => `${t.namaToko}: ${formatRupiah(t.harga)}`)
                                .join(" | ")}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Belum ada data survei 3 toko
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        {rata > 0 ? (
                          <div>
                            <span className="font-mono tabular-nums font-black text-[#005BAC] text-sm">
                              {formatRupiah(rata)}
                            </span>
                            {samaDenganAcuan && (
                              <span className="block text-[10px] font-bold text-emerald-700 mt-0.5">
                                Sesuai acuan
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {k.latestSurvei && (
                            <button
                              type="button"
                              onClick={() =>
                                setDetailModal({
                                  judul: `Hasil Survei: ${k.namaKomponen}`,
                                  subjudul: `${k.latestSurvei!.nomorTiket} · Cabang ${k.latestSurvei!.namaCabang}`,
                                  namaMaterial: k.namaKomponen,
                                  surveiList: k.latestSurvei!.tokoList,
                                  masterKoefisienId: k.id,
                                  hargaAcuanSaatIni: k.hargaAcuanDefault,
                                  rataRataSurvei: rata,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC] text-[11px] font-bold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Rincian</span>
                            </button>
                          )}
                          {rata > 0 && (
                            <button
                              type="button"
                              disabled={pending || samaDenganAcuan}
                              onClick={() =>
                                handleJadikanHargaAcuan(
                                  k.id,
                                  k.namaKomponen,
                                  rata,
                                  k.hargaAcuanDefault
                                )
                              }
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors",
                                samaDenganAcuan
                                  ? "bg-emerald-600 text-white opacity-75 cursor-default"
                                  : "bg-[#005BAC] hover:bg-blue-700 text-white cursor-pointer disabled:opacity-60"
                              )}
                            >
                              {pending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {samaDenganAcuan
                                  ? "Acuan Aktif"
                                  : "Jadikan Harga Acuan"}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: RIWAYAT SURVEI 3 TOKO */}
      {activeTab === "riwayat_survei" && (
        <div className="overflow-x-auto">
          {data.riwayatSurvei.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-500 font-medium">
              Belum ada riwayat survei 3 toko yang sesuai filter.
            </p>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 pl-4 pr-2">Tiket &amp; Cabang</th>
                  <th className="py-3 px-2">Komponen &amp; Item</th>
                  <th className="py-3 px-2">Hasil 3 Toko</th>
                  <th className="py-3 px-2 text-right">Rata-Rata Survei</th>
                  <th className="py-3 pl-2 pr-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {data.riwayatSurvei.map((r: BarisRiwayatSurvei) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50">
                    <td className="py-3 pl-4 pr-2 whitespace-nowrap">
                      <div className="font-mono font-bold text-[#005BAC]">
                        {r.nomorTiket}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700">
                        {r.namaCabang}
                        {r.namaWilayah ? ` · ${r.namaWilayah}` : ""}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatTanggal(r.tanggalPengajuan)}
                      </div>
                    </td>
                    <td className="py-3 px-2 min-w-52">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">
                          {r.namaKomponen}
                        </span>
                        {renderBadgeKategori(r.kategori)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Item: {r.namaItem} ({r.kodeMaster})
                      </div>
                    </td>
                    <td className="py-3 px-2 min-w-60 space-y-0.5 text-[11px] text-slate-700">
                      {r.tokoList.map((t) => (
                        <div key={t.id} className="flex justify-between gap-2">
                          <span className="truncate font-medium">
                            {t.urutanToko}. {t.namaToko}
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatRupiah(t.harga)}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <div className="font-mono tabular-nums font-black text-[#005BAC] text-sm">
                        {formatRupiah(r.rataRataHarga)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Acuan Koef:{" "}
                        {r.hargaAcuanDefault !== null
                          ? formatRupiah(r.hargaAcuanDefault)
                          : "-"}
                      </div>
                    </td>
                    <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setDetailModal({
                              judul: `Hasil Survei: ${r.namaKomponen}`,
                              subjudul: `${r.nomorTiket} · Cabang ${r.namaCabang}`,
                              namaMaterial: r.namaKomponen,
                              surveiList: r.tokoList,
                              masterKoefisienId: r.masterKoefisienId,
                              hargaAcuanSaatIni: r.hargaAcuanDefault,
                              rataRataSurvei: r.rataRataHarga,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC] text-[11px] font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Rincian</span>
                        </button>
                        {r.rataRataHarga > 0 && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              handleJadikanHargaAcuan(
                                r.masterKoefisienId,
                                r.namaKomponen,
                                r.rataRataHarga,
                                r.hargaAcuanDefault
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#005BAC] hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Jadikan Harga Acuan</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: MASTER TOKO / SUPPLIER */}
      {activeTab === "master_toko" && (
        <div className="overflow-x-auto">
          {data.masterTokoList.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-500 font-medium">
              Belum ada toko terdaftar yang cocok dengan filter.
            </p>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 pl-4 pr-2">Nama Toko &amp; Alamat</th>
                  <th className="py-3 px-2">Cabang &amp; Wilayah</th>
                  <th className="py-3 px-2">Kontak PIC</th>
                  <th className="py-3 px-2 text-center">Dipakai</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  <th className="py-3 pl-2 pr-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {data.masterTokoList.map((t: BarisMasterToko) => (
                  <tr
                    key={t.id}
                    className={cn(
                      "align-top hover:bg-slate-50",
                      !t.isActive && "bg-slate-100 text-slate-500"
                    )}
                  >
                    <td className="py-3 pl-4 pr-2 min-w-64">
                      <div className="font-bold text-slate-900">{t.namaToko}</div>
                      <div className="text-[11px] text-slate-600 flex items-start gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                        <span>
                          {t.alamat} ({t.kota})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        {t.namaCabang}
                      </div>
                      {t.namaWilayah && (
                        <div className="text-[11px] text-slate-500">
                          Wilayah: {t.namaWilayah}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap text-[11px]">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{t.kontakPic || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 font-mono mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{t.telepon || "-"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-700">
                      {t.dipakaiCount}x
                    </td>
                    <td className="py-3 px-2 text-center">
                      {t.isActive ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-600 text-white text-[10px] font-bold uppercase">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => bukaModalEditToko(t)}
                          className="p-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:border-[#005BAC] hover:text-[#005BAC] cursor-pointer"
                          title="Ubah data toko"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleToko(t)}
                          disabled={pending}
                          className={cn(
                            "p-1.5 rounded-lg border-2 bg-white cursor-pointer transition-colors",
                            t.isActive
                              ? "border-slate-300 text-slate-600 hover:border-[#ED1C24] hover:bg-[#ED1C24] hover:text-white"
                              : "border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                          )}
                          title={t.isActive ? "Nonaktifkan toko" : "Aktifkan toko"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL RINCIAN SURVEI 3 TOKO */}
      {detailModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-start justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xl max-w-4xl w-full my-8 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  {detailModal.judul}
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  {detailModal.subjudul}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <RingkasanBiayaMaterial
                surveiList={detailModal.surveiList}
                namaMaterial={detailModal.namaMaterial}
              />
              <RincianSurvei3TokoCard
                surveiList={detailModal.surveiList}
                materialName={detailModal.namaMaterial}
                readonly={true}
              />
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t-2 border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-700 font-semibold">
                Acuan Master Koefisien saat ini:{" "}
                <span className="font-mono font-black text-slate-900">
                  {detailModal.hargaAcuanSaatIni !== null
                    ? formatRupiah(detailModal.hargaAcuanSaatIni)
                    : "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
                {detailModal.rataRataSurvei > 0 && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      handleJadikanHargaAcuan(
                        detailModal.masterKoefisienId,
                        detailModal.namaMaterial,
                        detailModal.rataRataSurvei,
                        detailModal.hargaAcuanSaatIni
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005BAC] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Jadikan Harga Acuan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT TOKO */}
      {tokoForm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSimpanToko}
            className="bg-white border-2 border-slate-300 rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-3"
          >
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <h2 className="text-sm font-black text-slate-900">
                {tokoForm.id ? "Ubah Data Toko Survei" : "Tambah Toko Survei Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setTokoForm(null)}
                className="p-1.5 rounded-lg border-2 border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cabang
                </label>
                <select
                  value={tokoForm.cabangId}
                  onChange={(e) => {
                    const cb = data.cabangList.find((c) => c.id === e.target.value);
                    setTokoForm({
                      ...tokoForm,
                      cabangId: e.target.value,
                      wilayahCabangId: "",
                      kota: tokoForm.kota || cb?.namaCabang || "",
                    });
                  }}
                  className={INPUT_CLS}
                >
                  {data.cabangList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.namaCabang}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wilayah (Opsional)
                </label>
                <select
                  value={tokoForm.wilayahCabangId}
                  onChange={(e) =>
                    setTokoForm({ ...tokoForm, wilayahCabangId: e.target.value })
                  }
                  className={INPUT_CLS}
                >
                  <option value="">Cabang Induk</option>
                  {(selectedCabangObj?.wilayahList ?? []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.namaWilayah}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Toko / Supplier
              </label>
              <input
                value={tokoForm.namaToko}
                onChange={(e) =>
                  setTokoForm({ ...tokoForm, namaToko: e.target.value })
                }
                placeholder="Contoh: TB Bintang Bangunan Cikokol"
                className={INPUT_CLS}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Lengkap
              </label>
              <textarea
                rows={2}
                value={tokoForm.alamat}
                onChange={(e) =>
                  setTokoForm({ ...tokoForm, alamat: e.target.value })
                }
                placeholder="Jl. MH Thamrin No. 12..."
                className={INPUT_CLS}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kota
                </label>
                <input
                  value={tokoForm.kota}
                  onChange={(e) =>
                    setTokoForm({ ...tokoForm, kota: e.target.value })
                  }
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama PIC
                </label>
                <input
                  value={tokoForm.kontakPic}
                  onChange={(e) =>
                    setTokoForm({ ...tokoForm, kontakPic: e.target.value })
                  }
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telepon
                </label>
                <input
                  value={tokoForm.telepon}
                  onChange={(e) =>
                    setTokoForm({ ...tokoForm, telepon: e.target.value })
                  }
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={() => setTokoForm(null)}
                disabled={pending}
                className="px-4 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005BAC] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Toko</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
