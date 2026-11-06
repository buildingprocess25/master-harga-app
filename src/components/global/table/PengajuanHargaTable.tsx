"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  FileText,
  Calendar,
  Building2,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import Swal from "sweetalert2";
import { PengajuanHargaItem } from "@/types";
import { formatTanggal } from "@/lib/utils";
import { exportToCSV, exportToExcel } from "@/lib/export-utils";

import { CodeBadge } from "./atoms/CodeBadge";
import { PriceCell } from "./atoms/PriceCell";
import { StatusBadge } from "./atoms/StatusBadge";
import { TableEmptyState } from "./atoms/TableEmptyState";
import { TableLoadingSkeleton } from "./atoms/TableLoadingSkeleton";

import { MaterialSpecCell } from "./molecules/MaterialSpecCell";
import { CategoryAreaCell } from "./molecules/CategoryAreaCell";
import { DescriptionCell } from "./molecules/DescriptionCell";
import { TableActionButtons } from "./molecules/TableActionButtons";

export interface PengajuanHargaTableProps {
  items: PengajuanHargaItem[];
  loading?: boolean;
  title?: string;
  showTanggal?: boolean;
  showCabang?: boolean;
  showStatus?: boolean;
  showHarga?: boolean;
  showCatatanReview?: boolean;
  onViewCatatan?: (item: PengajuanHargaItem) => void;
  renderAction?: (item: PengajuanHargaItem) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onResetFilter?: () => void;
  className?: string;
  getDetailHref?: (item: PengajuanHargaItem) => string;
  enableExport?: boolean;
  exportFilename?: string;
}

export function PengajuanHargaTable({
  items,
  loading = false,
  title = "Daftar Spesifikasi Material",
  showTanggal = true,
  showCabang = true,
  showStatus = true,
  showHarga = false,
  showCatatanReview = false,
  onViewCatatan,
  renderAction,
  emptyTitle,
  emptyDescription,
  onResetFilter,
  className = "",
  getDetailHref,
  enableExport = true,
  exportFilename = "Daftar_Antrean_Harga",
}: PengajuanHargaTableProps) {
  const pathname = usePathname();

  // Hitung jumlah kolom dinamis untuk skeleton & empty state
  // Base: No (1) + Kode (1) + Material (1) + Deskripsi (1) + Kategori (1) + Aksi (1) = 6
  const totalCols =
    6 +
    (showTanggal ? 1 : 0) +
    (showCabang ? 1 : 0) +
    (showHarga ? 1 : 0) +
    (showStatus ? 1 : 0) +
    (showCatatanReview ? 1 : 0);

  // Default handler untuk popup Catatan Review via SweetAlert2 (Solid standard)
  const handleDefaultViewCatatan = (item: PengajuanHargaItem) => {
    const catatan =
      item.catatanReview ||
      item.catatanReviewTerakhir ||
      "Belum ada catatan review.";
    const kode = item.kode || item.kodeItem || item.noTiket;

    Swal.fire({
      title: `<span class="text-base font-extrabold text-slate-900">Catatan Review &bull; #${kode}</span>`,
      html: `
        <div class="text-left text-xs bg-slate-50 p-4 rounded-lg border-2 border-slate-300 font-medium text-slate-800 leading-relaxed max-h-60 overflow-y-auto">
          <p class="whitespace-pre-wrap">${catatan}</p>
        </div>
      `,
      icon: "info",
      confirmButtonText: "Tutup",
      confirmButtonColor: "#005BAC",
      customClass: {
        popup: "rounded-xl border-2 border-slate-300 shadow-lg",
        confirmButton: "px-5 py-2 font-bold text-xs rounded-lg",
      },
    });
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 border-slate-300 shadow-xs overflow-hidden ${className}`}
    >
      {/* Table Card Header with Counter & Export Actions */}
      <div className="px-5 py-3.5 border-b-2 border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            {title}
          </span>
          <span className="text-[11px] bg-[#005BAC] text-white px-2.5 py-0.5 rounded-full font-bold">
            {items.length} Material
          </span>
        </div>

        {enableExport && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportToCSV(items, exportFilename)}
              disabled={loading || items.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              title="Ekspor data ke format CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportToExcel(items, exportFilename)}
              disabled={loading || items.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#0F8A5F] bg-white hover:bg-emerald-50 text-[#0F8A5F] text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              title="Ekspor data ke format Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0F8A5F]" />
              <span>Excel</span>
            </button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
              <th className="text-center px-3 py-3 border-r-2 border-slate-200 whitespace-nowrap w-12">
                No
              </th>
              <th className="text-center px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">
                Kode
              </th>

              {showTanggal && (
                <th className="px-3 py-3 border-r-2 border-slate-200 whitespace-nowrap text-center w-28">
                  Tanggal
                </th>
              )}

              {showCabang && (
                <th className="px-3 py-3 border-r-2 border-slate-200 whitespace-nowrap text-center w-32">
                  Cabang / Wilayah
                </th>
              )}

              <th className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">
                Material &amp; Spesifikasi
              </th>
              <th className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">
                Deskripsi Lengkap
              </th>
              <th className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">
                Kategori &amp; Area
              </th>

              {showHarga && (
                <th className="text-left px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap">
                  Estimasi Harga
                </th>
              )}

              {showStatus && (
                <th className="px-3 py-3 border-r-2 border-slate-200 text-center w-36 min-w-32">
                  Status
                </th>
              )}

              {showCatatanReview && (
                <th className="px-3.5 py-3 border-r-2 border-slate-200 whitespace-nowrap text-center">
                  Catatan Review
                </th>
              )}

              <th className="text-center px-3.5 py-3 whitespace-nowrap">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100 text-slate-800">
            {loading ? (
              <TableLoadingSkeleton colSpan={totalCols} rowCount={5} />
            ) : items.length === 0 ? (
              <TableEmptyState
                colSpan={totalCols}
                title={emptyTitle}
                description={emptyDescription}
                onReset={onResetFilter}
              />
            ) : (
              items.map((item, idx) => {
                const kode = item.kode || item.kodeItem || item.noTiket || "-";
                const nama = item.item || item.namaItem || "-";
                const tgl = item.tanggalPengajuan || item.createdAt;
                const cabangName =
                  item.cabang ||
                  item.namaCabang ||
                  (item.cakupanHarga === "KHUSUS_WILAYAH"
                    ? item.namaWilayah || "Khusus Wilayah"
                    : "Induk Cabang");
                const deskripsi =
                  item.deskripsiOtomatis ||
                  `${nama} ${item.merk ? `Merk: ${item.merk}` : ""} ${item.ukuran ? `Ukuran: ${item.ukuran}` : ""}`.trim();
                const harga =
                  item.totalHargaSatuan ||
                  item.estimasiHarga ||
                  item.hargaAcuanPasar;
                const isPendingBm = item.status === "PENDING_BM_MGR";
                const catatan = item.catatanReview || item.catatanReviewTerakhir;

                const detailLink = getDetailHref
                  ? getDetailHref(item)
                  : `${pathname}/${item.id}`;

                return (
                  <tr
                    key={item.id || idx}
                    className={`transition-colors ${
                      isPendingBm
                        ? "bg-amber-50 hover:bg-amber-100/70"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* 1. No */}
                    <td className="text-center px-3 py-3 font-bold text-slate-600 border-r-2 border-slate-100">
                      {idx + 1}
                    </td>

                    {/* 2. Kode Item / No Tiket */}
                    <td className="px-3.5 py-3 border-r-2 border-slate-100 text-center">
                      <CodeBadge
                        code={kode}
                        isTrial={Boolean(item.isTrial)}
                      />
                    </td>

                    {/* 3. Tanggal Pengajuan */}
                    {showTanggal && (
                      <td className="px-3 py-3 border-r-2 border-slate-100 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300 font-bold">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formatTanggal(tgl)}</span>
                        </div>
                      </td>
                    )}

                    {/* 4. Cabang / Wilayah */}
                    {showCabang && (
                      <td className="px-3 py-3 border-r-2 border-slate-100 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-[#005BAC] border-2 border-blue-200">
                          <Building2 className="w-3 h-3 text-[#005BAC]" />
                          <span>{cabangName}</span>
                        </span>
                      </td>
                    )}

                    {/* 5. Material & Spesifikasi */}
                    <td className="px-3.5 py-3 border-r-2 border-slate-100">
                      <MaterialSpecCell
                        item={nama}
                        merk={item.merk}
                        ukuran={item.ukuran}
                      />
                    </td>

                    {/* 6. Deskripsi Lengkap */}
                    <td className="px-3.5 py-3 border-r-2 border-slate-100">
                      <DescriptionCell
                        description={deskripsi}
                        detailHref={detailLink}
                      />
                    </td>

                    {/* 7. Kategori & Area */}
                    <td className="px-3.5 py-3 border-r-2 border-slate-100">
                      <CategoryAreaCell
                        kategori={item.kategori}
                        implementasi={item.implementasi}
                        lokasi={item.lokasi}
                      />
                    </td>

                    {/* 8. Estimasi Harga */}
                    {showHarga && (
                      <td className="px-3.5 py-3 border-r-2 border-slate-100 whitespace-nowrap">
                        <PriceCell price={harga} satuan={item.satuan} />
                      </td>
                    )}

                    {/* 9. Status Badge */}
                    {showStatus && (
                      <td className="px-3 py-3 text-center border-r-2 border-slate-100 w-36 min-w-32">
                        <div className="flex items-center justify-center">
                          <StatusBadge
                            status={item.status}
                            isTrial={item.isTrial}
                          />
                        </div>
                      </td>
                    )}

                    {/* 10. Catatan Review */}
                    {showCatatanReview && (
                      <td className="px-3.5 py-3 text-center border-r-2 border-slate-100 whitespace-nowrap">
                        {catatan ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onViewCatatan) {
                                onViewCatatan(item);
                              } else {
                                handleDefaultViewCatatan(item);
                              }
                            }}
                            className="h-7 text-[11px] px-2.5 border-2 border-amber-400 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg inline-flex items-center gap-1.5 font-bold cursor-pointer shadow-xs transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-700" />
                            <span>Lihat Catatan</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 font-bold text-xs">-</span>
                        )}
                      </td>
                    )}

                    {/* 11. Aksi */}
                    <td className="text-center px-3.5 py-3 whitespace-nowrap">
                      <TableActionButtons
                        item={item}
                        detailHref={getDetailHref}
                        renderCustomAction={renderAction}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
