"use client";

import React from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Building,
  Scale,
} from "lucide-react";
import Swal from "sweetalert2";
import { VotingKontraktorItem } from "@/types";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

export interface VotingKontraktorMonitorCardProps {
  votingList?: VotingKontraktorItem[];
  deadlineVoting?: string;
  className?: string;
}

export function VotingKontraktorMonitorCard({
  votingList = [],
  deadlineVoting,
  className = "",
}: VotingKontraktorMonitorCardProps) {
  const total = votingList.length;
  const setujuCount = votingList.filter((v) => v.statusVote === "SETUJU").length;
  const tolakCount = votingList.filter((v) => v.statusVote === "TOLAK").length;
  const menungguCount = votingList.filter((v) => v.statusVote === "MENUNGGU").length;
  const timeoutCount = votingList.filter((v) => v.statusVote === "TIMEOUT").length;

  // Rumus Kuorum Alfamart: Minimal 50% + 1 rekanan setuju
  const targetKuorum = total > 0 ? Math.floor(total / 2) + 1 : 1;
  const persentaseSetuju = total > 0 ? Math.round((setujuCount / total) * 100) : 0;
  const isKuorumTercapai = setujuCount >= targetKuorum;
  const isKuorumGagal = total > 0 && !isKuorumTercapai && setujuCount + menungguCount < targetKuorum;

  const handleLihatDetailBanding = (kontraktor: VotingKontraktorItem) => {
    Swal.fire({
      title: "Rincian Usulan Banding",
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.5;">
          <div style="font-weight: 800; font-size: 15px; color: #0f172a; margin-bottom: 8px;">
            ${kontraktor.namaPerusahaan}
          </div>
          <div style="padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; background-color: #f8fafc; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #64748b; font-weight: 600;">Usulan Harga:</span>
              <span style="font-family: monospace; font-weight: 900; font-size: 16px; color: #005BAC;">
                ${formatRupiah(kontraktor.hargaBanding)}
              </span>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 8px;">
              <span style="color: #64748b; font-weight: 700; display: block; margin-bottom: 4px;">Alasan Banding:</span>
              <div style="color: #334155; font-style: italic;">
                "${kontraktor.catatanBanding || "Tidak ada catatan."}"
              </div>
            </div>
          </div>
        </div>
      `,
      icon: "info",
      confirmButtonColor: "#005BAC",
      confirmButtonText: "Tutup",
    });
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border-2 border-slate-300 shadow-2xs overflow-hidden",
        className
      )}
    >
      {/* Header Card */}
      <div className="bg-slate-50 border-b-2 border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#005BAC]" />
          <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
            Penawaran Kontraktor
          </h3>
        </div>

        {/* SLA Timer */}
        {deadlineVoting && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border-2 border-slate-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Batas Respon: {formatTanggal(deadlineVoting)}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Progress Bar Kuorum */}
        <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-slate-200">
          <div className="flex justify-between items-center mb-1.5 text-xs font-bold">
            <span className="text-slate-700">
              Progres Persetujuan Kontraktor:
            </span>
            <span
              className={cn(
                "font-black font-mono",
                isKuorumTercapai
                  ? "text-emerald-700"
                  : isKuorumGagal
                  ? "text-rose-700"
                  : "text-amber-700"
              )}
            >
              {setujuCount} dari {total} Kontraktor ({persentaseSetuju}%)
              {isKuorumTercapai
                ? " • Kuorum Tercapai"
                : isKuorumGagal
                ? ` • Kuorum Gagal${timeoutCount > 0 ? ` (${timeoutCount} Timeout SLA)` : ""}`
                : ` • Butuh ${targetKuorum} Setuju`}
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden border border-slate-300">
            <div
              className={cn(
                "h-3 rounded-full transition-all duration-300",
                isKuorumTercapai ? "bg-emerald-600" : "bg-[#FFD100]"
              )}
              style={{ width: `${Math.min(persentaseSetuju, 100)}%` }}
            />
          </div>
        </div>

        {/* 4 Metrik Kotak Solid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-white border-2 border-slate-300 p-3 rounded-xl shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">
              Total Diundang
            </span>
            <span className="text-xl font-black text-slate-900 font-mono">
              {total}
            </span>
          </div>
          <div className="bg-white border-2 border-emerald-600 p-3 rounded-xl shadow-2xs">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block mb-0.5">
              Setuju
            </span>
            <span className="text-xl font-black text-emerald-600 font-mono">
              {setujuCount}
            </span>
          </div>
          <div className="bg-white border-2 border-rose-600 p-3 rounded-xl shadow-2xs">
            <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block mb-0.5">
              Tolak / Banding
            </span>
            <span className="text-xl font-black text-rose-600 font-mono">
              {tolakCount}
            </span>
          </div>
          <div className="bg-white border-2 border-amber-500 p-3 rounded-xl shadow-2xs">
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block mb-0.5">
              {timeoutCount > 0 && menungguCount === 0
                ? "Timeout SLA"
                : "Menunggu Respon"}
            </span>
            <span className="text-xl font-black text-amber-600 font-mono">
              {timeoutCount > 0 && menungguCount === 0
                ? timeoutCount
                : menungguCount}
            </span>
            {timeoutCount > 0 && menungguCount > 0 && (
              <span className="text-[10px] font-bold text-slate-600 block">
                +{timeoutCount} Timeout SLA
              </span>
            )}
          </div>
        </div>

        {/* Tabel Rekanan Kontraktor */}
        <div className="overflow-x-auto border-2 border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 border-b-2 border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-2.5 pl-3 w-10">No</th>
                <th className="py-2.5">Nama Kontraktor</th>
                <th className="py-2.5 w-36">Status Respon</th>
                <th className="py-2.5 w-28">Tanggal Vote</th>
                <th className="py-2.5 text-right w-36">Usulan Banding</th>
                <th className="py-2.5 pr-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 text-slate-800">
              {votingList.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-slate-400 font-medium"
                  >
                    Belum ada penawaran kontraktor.
                  </td>
                </tr>
              ) : (
                votingList.map((kontraktor, idx) => {
                  const isSetuju = kontraktor.statusVote === "SETUJU";
                  const isTolak = kontraktor.statusVote === "TOLAK";
                  const isTimeout = kontraktor.statusVote === "TIMEOUT";

                  return (
                    <tr key={kontraktor.id || idx} className="hover:bg-slate-50">
                      <td className="py-3 pl-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{kontraktor.namaPerusahaan}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        {isSetuju ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setuju</span>
                          </span>
                        ) : isTolak ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-2xs">
                            <Scale className="w-3.5 h-3.5" />
                            <span>Usulan Banding</span>
                          </span>
                        ) : isTimeout ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-600 text-white shadow-2xs">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Timeout SLA</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Menunggu</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600 font-mono font-medium">
                        {formatTanggal(kontraktor.tanggalVote)}
                      </td>
                      <td className="py-3 text-right font-mono font-black tabular-nums text-slate-900">
                        {kontraktor.hargaBanding
                          ? formatRupiah(kontraktor.hargaBanding)
                          : "-"}
                      </td>
                      <td className="py-3 pr-3 text-center">
                        {isTolak && (
                          <button
                            type="button"
                            onClick={() => handleLihatDetailBanding(kontraktor)}
                            className="px-2.5 py-1 rounded-lg border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            Rincian
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
