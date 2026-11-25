"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckSquare, Loader2, MapPin, Send } from "lucide-react";
import Swal from "sweetalert2";
import type { SlotSurveiUlangItem } from "@/lib/services/survei-tahunan-service";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

export function SurveiUlangTahunanClient({
  rows,
  nomorAwal = 1,
  tahunPeriode,
  totalWajibSurvei,
  totalSedangDiproses,
}: {
  rows: SlotSurveiUlangItem[];
  nomorAwal?: number;
  tahunPeriode: number;
  totalWajibSurvei: number;
  totalSedangDiproses: number;
}) {
  const router = useRouter();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectableKeys = useMemo(
    () => rows.filter((r) => !r.sedangDiproses).map((r) => r.slotKey),
    [rows]
  );

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const activeSelectedRows = useMemo(
    () => rows.filter((r) => !r.sedangDiproses && selectedSet.has(r.slotKey)),
    [rows, selectedSet]
  );

  const allSelected =
    selectableKeys.length > 0 && selectableKeys.every((k) => selectedSet.has(k));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys((prev) => prev.filter((k) => !selectableKeys.includes(k)));
    } else {
      setSelectedKeys((prev) => Array.from(new Set([...prev, ...selectableKeys])));
    }
  };

  const toggleRow = (slotKey: string) => {
    setSelectedKeys((prev) =>
      prev.includes(slotKey) ? prev.filter((k) => k !== slotKey) : [...prev, slotKey]
    );
  };

  const handleAjukanBulk = async () => {
    if (submitting || activeSelectedRows.length === 0) return;

    const jumlahInduk = activeSelectedRows.filter(
      (r) => r.cakupanHarga === "INDUK_CABANG"
    ).length;
    const jumlahWilayah = activeSelectedRows.length - jumlahInduk;
    const ringkasan = [
      jumlahInduk > 0 ? `${jumlahInduk} Harga Induk` : null,
      jumlahWilayah > 0 ? `${jumlahWilayah} Harga Wilayah` : null,
    ]
      .filter(Boolean)
      .join(" & ");

    const confirm = await Swal.fire({
      title: `Ajukan Survei Ulang (${activeSelectedRows.length} Item)?`,
      html: `<p style="font-size:13px;color:#334155;margin-bottom:8px;">Pengajuan periode <strong>November ${tahunPeriode}</strong> (<strong>${ringkasan}</strong>) dikirim dalam 1 paket ke <strong>Building Coordinator</strong> (<code>SIAP_SURVEI</code>).</p>`,
      input: "textarea",
      inputLabel: "Catatan untuk Building Coordinator (opsional)",
      inputPlaceholder: `Survei ulang November ${tahunPeriode}`,
      inputAttributes: { maxlength: "300" },
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Kirim ke BC",
      cancelButtonText: "Batal",
      confirmButtonColor: "#005BAC",
      cancelButtonColor: "#64748B",
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/bm-manager/survei-ulang-tahunan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catatan: typeof confirm.value === "string" ? confirm.value : undefined,
          slots: activeSelectedRows.map((r) => ({
            cakupanHarga: r.cakupanHarga,
            masterHargaCabangId: r.masterHargaCabangId,
            masterHargaWilayahId: r.masterHargaWilayahId,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Gagal mengajukan survei ulang.");
      }

      setSelectedKeys([]);
      router.refresh();

      await Swal.fire({
        icon: "success",
        title: "Berhasil Dikirim ke BC",
        text: json.message,
        confirmButtonColor: "#005BAC",
      });
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Pengajuan Gagal",
        text: err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim pengajuan.",
        confirmButtonColor: "#ED1C24",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar Aksi Bulk & Ringkasan Periode November */}
      <div className="px-4 py-3 bg-slate-50 border-b-2 border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-white">
            <CalendarClock className="w-3.5 h-3.5" />
            Periode November {tahunPeriode}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ED1C24] text-white">
            Wajib Survei Nov {tahunPeriode}: {totalWajibSurvei}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#005BAC] text-white">
            Sedang Diproses: {totalSedangDiproses}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeSelectedRows.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedKeys([])}
              disabled={submitting}
              className="px-3 py-1.5 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              Batal Pilih
            </button>
          )}
          <button
            type="button"
            onClick={handleAjukanBulk}
            disabled={submitting || activeSelectedRows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005BAC] hover:bg-[#004585] text-white text-xs font-bold cursor-pointer transition-colors disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>
              {submitting
                ? "Mengirim..."
                : `Ajukan Survei Ulang (${activeSelectedRows.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Tabel Slot Harga Wajib Survei November */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600 bg-slate-50">
              <th className="py-3 pl-4 pr-2 w-10 text-center">
                <input
                  type="checkbox"
                  aria-label="Pilih semua item yang siap disurvei ulang"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={selectableKeys.length === 0 || submitting}
                  className="w-4 h-4 accent-[#005BAC] cursor-pointer disabled:cursor-not-allowed"
                />
              </th>
              <th className="py-3 px-2 w-12 text-center">No</th>
              <th className="py-3 px-2">Item &amp; Kode</th>
              <th className="py-3 px-2">Divisi &amp; Cakupan</th>
              <th className="py-3 px-2">Harga Aktif</th>
              <th className="py-3 px-2">Rilis Terakhir</th>
              <th className="py-3 pl-2 pr-4">Status Survei</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {rows.map((r, idx) => {
              const checked = !r.sedangDiproses && selectedSet.has(r.slotKey);

              return (
                <tr
                  key={r.slotKey}
                  className={cn(
                    "transition-colors",
                    r.sedangDiproses
                      ? "bg-slate-50"
                      : checked
                        ? "bg-blue-50"
                        : "hover:bg-slate-50"
                  )}
                >
                  <td className="py-3.5 pl-4 pr-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${r.namaItem} (${r.namaDivisi})`}
                      checked={checked}
                      disabled={r.sedangDiproses || submitting}
                      onChange={() => toggleRow(r.slotKey)}
                      className="w-4 h-4 accent-[#005BAC] cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="py-3.5 px-2 text-center font-mono font-bold text-slate-500">
                    {nomorAwal + idx}
                  </td>
                  <td className="py-3.5 px-2 min-w-56">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-black text-white uppercase",
                          r.kelompokKode === "ME" ? "bg-amber-600" : "bg-[#005BAC]"
                        )}
                      >
                        {r.kelompokKode}
                      </span>
                      <span className="font-mono font-black text-slate-900">
                        {r.kodeItem}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                        {r.kategori}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 mt-1">{r.namaItem}</div>
                    {r.spesifikasi && (
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                        {r.spesifikasi}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-2 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{r.namaDivisi}</div>
                    <div className="mt-1">
                      {r.cakupanHarga === "KHUSUS_WILAYAH" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                          <MapPin className="w-3 h-3" />
                          {r.namaWilayah}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold">
                          Induk Cabang
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-2 whitespace-nowrap">
                    <div className="font-mono font-black text-slate-900">
                      {formatRupiah(r.hargaAktif)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">
                      / {r.satuan}
                    </div>
                    {r.nomorTiketTerakhir && (
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {r.nomorTiketTerakhir}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-2 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900">
                      {formatTanggal(r.berlakuSejak)}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      Usia {r.labelUmur}
                    </div>
                  </td>
                  <td className="py-3.5 pl-2 pr-4 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black text-white uppercase bg-[#ED1C24]">
                        Wajib Survei Nov {r.tahunPeriode}
                      </span>
                      {r.sedangDiproses && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#005BAC] text-white text-[10px] font-bold">
                          <CheckSquare className="w-3 h-3" />
                          Sedang Diproses
                          {r.nomorTiketProses ? ` (${r.nomorTiketProses})` : ""}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
