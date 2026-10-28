"use client";

import React, { useState } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Eye,
  FileText,
  Building,
} from "lucide-react";
import { VotingKontraktorItem, StatusVoteKontraktor } from "@/types";
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
  const [selectedBanding, setSelectedBanding] =
    useState<VotingKontraktorItem | null>(null);

  const total = votingList.length;
  const setujuCount = votingList.filter((v) => v.statusVote === "SETUJU").length;
  const tolakCount = votingList.filter((v) => v.statusVote === "TOLAK").length;
  const menungguCount = votingList.filter(
    (v) => v.statusVote === "MENUNGGU" || v.statusVote === "TIMEOUT"
  ).length;

  // Rumus Kuorum Alfamart: Minimal 50% + 1 rekanan setuju
  const targetKuorum = total > 0 ? Math.floor(total / 2) + 1 : 1;
  const persentaseSetuju = total > 0 ? Math.round((setujuCount / total) * 100) : 0;
  const isKuorumTercapai = setujuCount >= targetKuorum;

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Header Card */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#005BAC]" />
          <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Pemantauan Kuorum Rekanan Kontraktor (Target: 50% + 1)
          </h3>
        </div>

        {/* SLA Timer */}
        {deadlineVoting && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Batas Respon: {formatTanggal(deadlineVoting)}</span>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Progress Bar Kuorum */}
        <div className="mb-4 bg-slate-50 p-3.5 rounded-lg border border-slate-100">
          <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
            <span className="text-slate-700">
              Progres Persetujuan Kuorum Cabang:
            </span>
            <span
              className={cn(
                "font-bold",
                isKuorumTercapai ? "text-[#008A00]" : "text-amber-700"
              )}
            >
              {setujuCount} dari {total} Rekanan ({persentaseSetuju}%)
              {isKuorumTercapai ? " • Kuorum Sah" : ` • Butuh ${targetKuorum} Setuju`}
            </span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                isKuorumTercapai ? "bg-[#008A00]" : "bg-[#FFD100]"
              )}
              style={{ width: `${Math.min(persentaseSetuju, 100)}%` }}
            />
          </div>
        </div>

        {/* 4 Metrik Kotak */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-center">
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded">
            <span className="text-[11px] text-slate-400 block mb-0.5">
              Total Diundang
            </span>
            <span className="text-lg font-bold text-slate-800 font-mono">
              {total}
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded">
            <span className="text-[11px] text-emerald-700 block mb-0.5 font-medium">
              Setuju
            </span>
            <span className="text-lg font-bold text-[#008A00] font-mono">
              {setujuCount}
            </span>
          </div>
          <div className="bg-red-50 border border-red-200 p-2.5 rounded">
            <span className="text-[11px] text-red-700 block mb-0.5 font-medium">
              Tolak / Banding
            </span>
            <span className="text-lg font-bold text-red-700 font-mono">
              {tolakCount}
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded">
            <span className="text-[11px] text-amber-700 block mb-0.5 font-medium">
              Menunggu Respon
            </span>
            <span className="text-lg font-bold text-amber-800 font-mono">
              {menungguCount}
            </span>
          </div>
        </div>

        {/* Tabel Rekanan Kontraktor */}
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold">
              <tr>
                <th className="py-2.5 pl-3 w-10">No</th>
                <th className="py-2.5">Nama Perusahaan Rekanan</th>
                <th className="py-2.5 w-32">Status Respon</th>
                <th className="py-2.5 w-28">Tanggal Vote</th>
                <th className="py-2.5 text-right w-36">Usulan Banding</th>
                <th className="py-2.5 pr-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {votingList.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center text-slate-400 italic"
                  >
                    Belum ada data rekanan yang diundang untuk paket ini.
                  </td>
                </tr>
              ) : (
                votingList.map((kontraktor, idx) => {
                  const isSetuju = kontraktor.statusVote === "SETUJU";
                  const isTolak = kontraktor.statusVote === "TOLAK";

                  return (
                    <tr key={kontraktor.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 pl-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 font-semibold text-slate-900 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {kontraktor.namaPerusahaan}
                      </td>
                      <td className="py-2.5">
                        {isSetuju ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-[#008A00] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Setuju
                          </span>
                        ) : isTolak ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" /> Usul Banding
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" /> Menunggu
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-600 font-mono">
                        {formatTanggal(kontraktor.tanggalVote)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold tabular-nums">
                        {kontraktor.hargaBanding
                          ? formatRupiah(kontraktor.hargaBanding)
                          : "-"}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {isTolak && (
                          <button
                            type="button"
                            onClick={() => setSelectedBanding(kontraktor)}
                            className="text-[11px] text-[#005BAC] hover:underline font-bold"
                          >
                            Detail
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

      {/* Modal Detail Usulan Banding */}
      {selectedBanding && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 p-5">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Rincian Usulan Banding Rekanan
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              {selectedBanding.namaPerusahaan}
            </p>

            <div className="space-y-2 text-xs bg-slate-50 p-3 rounded border border-slate-200 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Harga Usulan Baru:</span>
                <span className="font-bold font-mono text-sm text-[#005BAC]">
                  {formatRupiah(selectedBanding.hargaBanding)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">
                  Catatan Argumentasi Pasar:
                </span>
                <p className="text-slate-700 italic">
                  &quot;{selectedBanding.catatanBanding || "Tidak ada catatan."}&quot;
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBanding(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
