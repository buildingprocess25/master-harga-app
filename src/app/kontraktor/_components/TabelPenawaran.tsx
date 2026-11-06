"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Clock, Search } from "lucide-react";
import { PengajuanHargaTable } from "@/components/global";
import { SlaCountdown } from "@/components/kuorum/SlaCountdown";
import { cn } from "@/lib/utils";
import { barisKeItem, type BarisPenawaran } from "../_lib/peta-item";
import { StatusVoteBadge } from "./StatusBadge";

export type ModePenawaran = "aktif" | "riwayat";

/**
 * Tabel penawaran portal rekanan: tab Perlu Konfirmasi / Riwayat Keputusan (rute terpisah
 * sesuai menu sidebar), pencarian lokal, dan tabel global PengajuanHargaTable.
 */
export function TabelPenawaran({
  mode,
  baris,
  jumlahAktif,
  jumlahRiwayat,
}: {
  mode: ModePenawaran;
  baris: BarisPenawaran[];
  jumlahAktif: number;
  jumlahRiwayat: number;
}) {
  const [cari, setCari] = useState("");

  const perBaris = useMemo(() => new Map(baris.map((b) => [b.tiketId, b])), [baris]);
  const items = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const cocok = q
      ? baris.filter((b) =>
          [b.nomorTiket, b.kodeMaster, b.namaItem, b.merk, b.kategori, b.lokasi, b.namaCabang, b.namaWilayah]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : baris;
    return cocok.map(barisKeItem);
  }, [baris, cari]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl self-start" aria-label="Tab penawaran">
          <TabLink href="/kontraktor" aktif={mode === "aktif"} jumlah={jumlahAktif} urgen>
            <Clock className="w-3.5 h-3.5 text-[#D99B00]" />
            Perlu Konfirmasi
          </TabLink>
          <TabLink href="/kontraktor/riwayat" aktif={mode === "riwayat"} jumlah={jumlahRiwayat}>
            <BadgeCheck className="w-3.5 h-3.5 text-[#005BAC]" />
            Riwayat Keputusan
          </TabLink>
        </nav>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari tiket, material, cabang..."
            aria-label="Cari penawaran"
            className="w-full h-9 pl-9 pr-3 rounded-xl border-2 border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#005BAC]"
          />
        </div>
      </div>

      <PengajuanHargaTable
        items={items}
        title={mode === "aktif" ? "Penawaran Menunggu Konfirmasi Anda" : "Riwayat Keputusan Penawaran"}
        showTanggal={false}
        showHarga
        showStatus={mode === "riwayat"}
        getDetailHref={(item) => `/kontraktor/${item.id}`}
        exportFilename={mode === "aktif" ? "Penawaran_Aktif_Rekanan" : "Riwayat_Penawaran_Rekanan"}
        emptyTitle={mode === "aktif" ? "Tidak ada penawaran yang menunggu respon" : "Belum ada riwayat penawaran"}
        emptyDescription={
          cari
            ? "Tidak ada penawaran yang cocok dengan kata kunci pencarian."
            : mode === "aktif"
              ? "Penawaran baru muncul di sini setelah disetujui Regional Manager."
              : "Penawaran yang sudah Anda respons atau sudah ditutup tercatat di sini."
        }
        onResetFilter={cari ? () => setCari("") : undefined}
        renderAction={(item) => {
          const b = perBaris.get(item.id);
          if (!b) return null;
          if (mode === "aktif" && b.deadlineVoting) return <SlaCountdown deadline={b.deadlineVoting} />;
          return <StatusVoteBadge status={b.statusVote} isBanding={b.usulanHarga !== null} />;
        }}
      />
    </div>
  );
}

function TabLink({
  href,
  aktif,
  jumlah,
  urgen,
  children,
}: {
  href: string;
  aktif: boolean;
  jumlah: number;
  urgen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={aktif ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors",
        aktif ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
      )}
    >
      {children}
      <span
        className={cn(
          "min-w-5 px-1.5 rounded text-[10px] font-bold font-mono text-center",
          urgen && jumlah > 0 ? "bg-[#ED1C24] text-white" : aktif ? "bg-[#005BAC] text-white" : "bg-slate-300 text-slate-700"
        )}
      >
        {jumlah}
      </span>
    </Link>
  );
}
