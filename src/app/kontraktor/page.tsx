import Link from "next/link";
import { AlertTriangle, ChevronRight, ClipboardList, Inbox, MapPin } from "lucide-react";
import {
  evaluasiJikaKedaluwarsa,
  getCabangParkedKontraktor,
  getPenawaranKontraktor,
} from "@/lib/services/kuorum-service";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";
import { requireKontraktor } from "./_lib/require-kontraktor";
import { SlaCountdown } from "./_components/SlaCountdown";
import { StatusVoteBadge, labelStatusTiket } from "./_components/StatusBadge";

type Tab = "perlu-respon" | "riwayat";

export default async function KontraktorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireKontraktor();
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "riwayat" ? "riwayat" : "perlu-respon";

  let penawaran = await getPenawaranKontraktor(user.kontraktorId);

  // Tutup putaran yang SLA-nya sudah lewat agar status yang tampil final.
  const sekarang = new Date();
  const kedaluwarsa = penawaran.filter(
    (p) =>
      p.statusTiket === "PENDING_KONTRAKTOR" &&
      p.deadlineVoting &&
      new Date(p.deadlineVoting) < sekarang
  );
  if (kedaluwarsa.length > 0) {
    for (const p of kedaluwarsa) await evaluasiJikaKedaluwarsa(p.tiketId);
    penawaran = await getPenawaranKontraktor(user.kontraktorId);
  }

  const perluRespon = penawaran.filter(
    (p) => p.statusTiket === "PENDING_KONTRAKTOR" && p.statusVote === "MENUNGGU"
  );
  const riwayat = penawaran.filter((p) => !perluRespon.includes(p));
  const daftar = tab === "perlu-respon" ? perluRespon : riwayat;

  const sudahRespon = penawaran.filter(
    (p) => p.statusTiket === "PENDING_KONTRAKTOR" && p.statusVote !== "MENUNGGU"
  ).length;
  const resmi = penawaran.filter((p) => p.statusTiket === "RELEASED").length;
  const cabangParked = await getCabangParkedKontraktor(user.kontraktorId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Penawaran Harga Satuan</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Tinjau harga yang ditetapkan Alfamart untuk cabang tempat perusahaan Anda terdaftar,
          lalu berikan respon sebelum batas waktu 3x24 jam berakhir.
        </p>
      </div>

      {cabangParked.length > 0 && (
        <div className="rounded-lg border border-[#F7C1C5] bg-[#FDECEE] p-3 text-xs text-[#990F14]">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4" />
            Perusahaan Anda dinonaktifkan sementara di {cabangParked.length} cabang
          </div>
          <ul className="mt-1.5 space-y-1 pl-5 list-disc">
            {cabangParked.map((c) => (
              <li key={c.relasiId}>
                <span className="font-semibold">{c.namaCabang}</span> ({c.namaDivisi})
                {c.parkedAt && <> sejak {formatTanggal(c.parkedAt)}</>}
                {c.alasanParked && <>: {c.alasanParked}</>}
              </li>
            ))}
          </ul>
          <p className="mt-1.5">
            Selama nonaktif, perusahaan Anda tidak diundang pada penawaran baru di cabang tersebut.
            Silakan hubungi tim S&B Controlling atau Regional Manager untuk mediasi.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Metrik label="Perlu Respon" nilai={perluRespon.length} tone="yellow" />
        <Metrik label="Sudah Direspons" nilai={sudahRespon} tone="blue" />
        <Metrik label="Harga Resmi" nilai={resmi} tone="green" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 text-xs font-semibold">
          <TabLink href="/kontraktor" aktif={tab === "perlu-respon"} jumlah={perluRespon.length}>
            Perlu Respon
          </TabLink>
          <TabLink href="/kontraktor?tab=riwayat" aktif={tab === "riwayat"} jumlah={riwayat.length}>
            Riwayat
          </TabLink>
        </div>

        {daftar.length === 0 ? (
          <div className="py-14 text-center">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {tab === "perlu-respon" ? "Tidak ada penawaran yang menunggu respon" : "Belum ada riwayat penawaran"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {tab === "perlu-respon"
                ? "Penawaran baru akan muncul di sini setelah disetujui Regional Manager."
                : "Penawaran yang sudah Anda respons atau sudah ditutup akan tercatat di sini."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#EEF2F6] text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 pl-4 pr-2">Tiket & Item Pekerjaan</th>
                  <th className="py-2.5 px-2">Lokasi</th>
                  <th className="py-2.5 px-2 text-right">Harga Ditawarkan</th>
                  <th className="py-2.5 px-2">Respon Anda</th>
                  <th className="py-2.5 px-2">{tab === "perlu-respon" ? "Batas Waktu" : "Status Penawaran"}</th>
                  <th className="py-2.5 pl-2 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((p) => {
                  const status = labelStatusTiket(p.statusTiket);
                  return (
                    <tr key={p.votingId} className="hover:bg-[#EAF3FB]/50 align-top">
                      <td className="py-3 pl-4 pr-2 min-w-56">
                        <div className="font-mono text-[11px] text-slate-500">
                          {p.nomorTiket}
                          {p.putaran > 1 && (
                            <span className="ml-1.5 px-1.5 py-px rounded bg-[#EFEBFD] text-[#362387] font-sans font-semibold">
                              Putaran {p.putaran}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">{p.namaItem}</div>
                        <div className="text-[11px] text-slate-500">{p.namaDivisi}</div>
                      </td>
                      <td className="py-3 px-2 min-w-36">
                        <div className="font-medium text-slate-800">{p.namaCabang}</div>
                        {p.namaWilayah && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-[#6E4B00] mt-0.5">
                            <MapPin className="w-3 h-3" /> Wilayah {p.namaWilayah}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        <div className="font-mono font-bold tabular-nums text-slate-900">
                          {formatRupiah(p.hargaDitawarkan)}
                        </div>
                        {p.satuan && <div className="text-[11px] text-slate-500">per {p.satuan}</div>}
                      </td>
                      <td className="py-3 px-2">
                        <StatusVoteBadge status={p.statusVote} isBanding={p.usulanHarga !== null} />
                        {p.tanggalRespon && (
                          <div className="text-[11px] text-slate-500 mt-1">{formatTanggal(p.tanggalRespon)}</div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {tab === "perlu-respon" && p.deadlineVoting ? (
                          <SlaCountdown deadline={p.deadlineVoting} />
                        ) : (
                          <span className={cn("font-semibold", status.tone)}>{status.label}</span>
                        )}
                      </td>
                      <td className="py-3 pl-2 pr-4 text-right">
                        <Link
                          href={`/kontraktor/${p.tiketId}`}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors",
                            tab === "perlu-respon"
                              ? "bg-[#005BAC] text-white hover:bg-[#004687]"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          {tab === "perlu-respon" ? "Beri Respon" : "Lihat"}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
        <ClipboardList className="w-4 h-4 text-[#005BAC] shrink-0" />
        <p>
          Harga resmi berlaku bila minimal 50% + 1 rekanan di cabang tersebut menyetujui.
          Setiap rekanan dapat mengajukan banding satu kali per penawaran. Menolak dua putaran
          berturut-turut akan menonaktifkan sementara keikutsertaan perusahaan Anda di cabang tersebut.
        </p>
      </div>
    </div>
  );
}

function Metrik({ label, nilai, tone }: { label: string; nilai: number; tone: "yellow" | "blue" | "green" }) {
  const cls = {
    yellow: "bg-[#FFF8DB] border-[#F3D56B] text-[#6E4B00]",
    blue: "bg-[#EAF3FB] border-[#B8D8F3] text-[#003A70]",
    green: "bg-[#E7F6F0] border-[#B2DFCC] text-[#085438]",
  }[tone];
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", cls)}>
      <div className="text-[11px] font-semibold">{label}</div>
      <div className="text-xl font-bold font-mono tabular-nums">{nilai}</div>
    </div>
  );
}

function TabLink({
  href,
  aktif,
  jumlah,
  children,
}: {
  href: string;
  aktif: boolean;
  jumlah: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-3 -mb-px border-b-2 inline-flex items-center gap-1.5 transition-colors",
        aktif ? "border-[#005BAC] text-[#005BAC]" : "border-transparent text-slate-500 hover:text-slate-800"
      )}
    >
      {children}
      <span
        className={cn(
          "px-1.5 rounded text-[10px] font-bold font-mono",
          aktif ? "bg-[#005BAC] text-white" : "bg-slate-100 text-slate-600"
        )}
      >
        {jumlah}
      </span>
    </Link>
  );
}
