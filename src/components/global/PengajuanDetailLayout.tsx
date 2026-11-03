"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, FileText, ShieldCheck } from "lucide-react";
import { PengajuanHargaItem, RoleUser } from "@/types";
import { cn } from "@/lib/utils";
import { PengajuanTimelineBar } from "./PengajuanTimelineBar";
import { DetailSpesifikasiCard } from "./DetailSpesifikasiCard";
import { RincianSurvei3TokoCard } from "./RincianSurvei3TokoCard";
import { RingkasanBiayaMaterial } from "./RingkasanBiayaMaterial";
import { RincianKalkulasiKoefisien } from "./RincianKalkulasiKoefisien";
import { VotingKontraktorMonitorCard } from "./VotingKontraktorMonitorCard";

export interface PengajuanDetailLayoutProps {
  item: PengajuanHargaItem;
  role?: RoleUser;
  backHref?: string;
  backLabel?: string;
  actionSlot?: React.ReactNode;
  isAhspEditable?: boolean;
  onMarginChange?: (upah: number, material: number, bongkaran: number) => void;
  className?: string;
}

export function PengajuanDetailLayout({
  item,
  role,
  backHref = "/",
  backLabel = "Kembali ke Beranda",
  actionSlot,
  isAhspEditable = false,
  onMarginChange,
  className = "",
}: PengajuanDetailLayoutProps) {
  // Apakah data survei 3 toko sudah masuk
  const hasSurvei =
    item.surveiTokoList && item.surveiTokoList.some((s) => s.harga > 0);

  // Apakah koefisien AHSP sudah ada
  const hasKoefisien =
    item.koefisienItems && item.koefisienItems.length > 0;

  // Apakah sudah masuk tahap kuorum rekanan kontraktor
  const isTahapKontraktor =
    item.status === "PENDING_KONTRAKTOR" ||
    item.status === "USULAN_KONTRAKTOR" ||
    item.status === "DITOLAK_KONTRAKTOR" ||
    item.status === "RELEASED";

  return (
    <div className={cn("max-w-6xl mx-auto space-y-5 pb-12", className)}>
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#005BAC] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backLabel}</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <span>SPARTA-HARGA</span>
          <ChevronRight className="w-3 h-3" />
          <span>Pengajuan</span>
          <ChevronRight className="w-3 h-3" />
          <span className="font-mono text-slate-800 font-bold">
            #{item.noTiket}
          </span>
        </div>
      </div>

      {/* 1. Timeline Bar Siklus Hidup */}
      <PengajuanTimelineBar item={item} />

      {/* 2. Kartu Spesifikasi Master Item */}
      <DetailSpesifikasiCard item={item} />

      {/* 3. Hasil Survei 3 Toko Pasar (Jika status sudah masuk tahap survei atau setelahnya) */}
      {(hasSurvei || item.status !== "DIAJUKAN") && (
        <div className="space-y-4">
          <RincianSurvei3TokoCard
            surveiList={item.surveiTokoList}
            readonly={role !== "BUILDING_COORDINATOR"}
          />

          {hasSurvei && (
            <RingkasanBiayaMaterial
              surveiList={item.surveiTokoList}
              namaMaterial={item.namaItem}
            />
          )}
        </div>
      )}

      {/* 4. Analisa Harga Satuan Pekerjaan (AHSP) */}
      {hasKoefisien && (
        <RincianKalkulasiKoefisien
          koefisienItems={item.koefisienItems}
          mode={isAhspEditable ? "editable" : "readonly"}
          liveMarginUpah={item.liveMarginUpah}
          liveMarginMaterial={item.liveMarginMaterial}
          liveMarginBongkaran={item.liveMarginBongkaran}
          onMarginChange={onMarginChange}
        />
      )}

      {/* 5. Pemantauan Kuorum Rekanan Kontraktor (Jika tahap kuorum aktif) */}
      {isTahapKontraktor && item.votingKontraktorList && (
        <VotingKontraktorMonitorCard
          votingList={item.votingKontraktorList}
          deadlineVoting={item.deadlineVoting}
        />
      )}

      {/* 6. Slot Action Panel (Tombol Keputusan Approval) */}
      {actionSlot && <div className="pt-2">{actionSlot}</div>}
    </div>
  );
}
