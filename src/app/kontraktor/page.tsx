import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  ChevronRight,
  ClipboardList,
  Hammer,
  Inbox,
  MapPin,
  Search,
} from "lucide-react";
import {
  evaluasiJikaKedaluwarsa,
  getCabangParkedKontraktor,
  getPenawaranKontraktor,
} from "@/lib/services/kuorum-service";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";
import { requireKontraktor } from "./_lib/require-kontraktor";
import { SlaCountdown } from "@/components/kuorum/SlaCountdown";
import { StatusVoteBadge, labelStatusTiket } from "./_components/StatusBadge";

type Tab = "perlu-respon" | "riwayat";

export default async function KontraktorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await requireKontraktor();
  const { tab: tabParam, q: qParam } = await searchParams;
  const tab: Tab = tabParam === "riwayat" ? "riwayat" : "perlu-respon";
  const query = (qParam || "").toLowerCase().trim();

  let penawaran = await getPenawaranKontraktor(user.kontraktorId);

  // Evaluasi putaran yang SLA-nya sudah lewat
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
  const rawDaftar = tab === "perlu-respon" ? perluRespon : riwayat;

  const daftar = query
    ? rawDaftar.filter(
        (p) =>
          p.nomorTiket.toLowerCase().includes(query) ||
          p.namaItem.toLowerCase().includes(query) ||
          p.namaCabang.toLowerCase().includes(query)
      )
    : rawDaftar;

  const sudahRespon = penawaran.filter(
    (p) => p.statusTiket === "PENDING_KONTRAKTOR" && p.statusVote !== "MENUNGGU"
  ).length;
  const resmi = penawaran.filter((p) => p.statusTiket === "RELEASED").length;
  const cabangParked = await getCabangParkedKontraktor(user.kontraktorId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Hero Card */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#005BAC] text-white flex items-center justify-center font-bold shrink-0">
            <Hammer className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              Portal Kontraktor
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Konfirmasi &amp; kesepakatan harga satuan pekerjaan cabang
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white border-2 border-slate-300 px-3.5 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Perusahaan
            </span>
            <span className="text-xs font-black text-slate-800 truncate block max-w-48">
              {user.namaPerusahaanKontraktor}
            </span>
          </div>

          <div className="bg-white border-2 border-amber-500 px-3.5 py-1.5 rounded-xl text-center min-w-24">
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
              Perlu Respon
            </span>
            <span className="text-base font-black font-mono text-amber-600">
              {perluRespon.length}
            </span>
          </div>

          <div className="bg-white border-2 border-[#005BAC] px-3.5 py-1.5 rounded-xl text-center min-w-24">
            <span className="text-[10px] text-[#005BAC] font-bold uppercase tracking-wider block">
              Direspons
            </span>
            <span className="text-base font-black font-mono text-[#005BAC]">
              {sudahRespon}
            </span>
          </div>

          <div className="bg-white border-2 border-emerald-600 px-3.5 py-1.5 rounded-xl text-center min-w-24">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
              Harga Resmi
            </span>
            <span className="text-base font-black font-mono text-emerald-600">
              {resmi}
            </span>
          </div>
        </div>
      </div>

      {/* Peringatan Akun Nonaktif / Parked */}
      {cabangParked.length > 0 && (
        <div className="bg-white border-2 border-rose-600 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase">
                Nonaktif Sementara
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Perusahaan Anda Dinonaktifkan di {cabangParked.length} Cabang
              </h3>
            </div>
            <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 font-medium pt-1">
              {cabangParked.map((c) => (
                <li key={c.relasiId}>
                  <span className="font-bold text-slate-900">{c.namaCabang}</span> ({c.namaDivisi})
                  {c.parkedAt && <> sejak {formatTanggal(c.parkedAt)}</>}
                  {c.alasanParked && <>: {c.alasanParked}</>}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500 pt-1 font-medium">
              Perusahaan Anda tidak dapat merespons penawaran baru di cabang tersebut sampai diaktifkan kembali oleh cabang.
            </p>
          </div>
        </div>
      )}

      {/* Kontrol Tab & Pencarian */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b-2 border-slate-200 p-3 sm:px-4 gap-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <TabButton
              href={`/kontraktor${query ? `?q=${query}` : ""}`}
              aktif={tab === "perlu-respon"}
              jumlah={perluRespon.length}
              label="Perlu Respon"
            />
            <TabButton
              href={`/kontraktor?tab=riwayat${query ? `&q=${query}` : ""}`}
              aktif={tab === "riwayat"}
              jumlah={riwayat.length}
              label="Riwayat Keputusan"
            />
          </div>

          <form method="GET" action="/kontraktor" className="relative w-full sm:w-72">
            <input type="hidden" name="tab" value={tab} />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Cari item atau tiket..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-[#005BAC]"
            />
          </form>
        </div>

        {daftar.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {tab === "perlu-respon"
                ? "Tidak ada penawaran yang menunggu respon"
                : "Belum ada riwayat penawaran"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {tab === "perlu-respon"
                ? "Penawaran baru akan tampil di sini saat dibuka ke kontraktor."
                : "Penawaran yang telah Anda putuskan akan tercatat di sini."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200">
                <tr>
                  <th className="py-3 pl-4 pr-2">Tiket &amp; Item Pekerjaan</th>
                  <th className="py-3 px-2">Lokasi / Cabang</th>
                  <th className="py-3 px-2 text-right">Harga Ditawarkan</th>
                  <th className="py-3 px-2">Respon Anda</th>
                  <th className="py-3 px-2">
                    {tab === "perlu-respon" ? "Batas Waktu" : "Status Penawaran"}
                  </th>
                  <th className="py-3 pl-2 pr-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {daftar.map((p) => {
                  const status = labelStatusTiket(p.statusTiket);
                  return (
                    <tr key={p.votingId} className="hover:bg-slate-50 align-top">
                      <td className="py-3 pl-4 pr-2 min-w-56">
                        <div className="font-mono text-[11px] font-bold text-slate-500">
                          {p.nomorTiket}
                          {p.putaran > 1 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-700 text-white font-sans">
                              Putaran {p.putaran}
                            </span>
                          )}
                        </div>
                        <div className="font-black text-slate-900 mt-0.5">{p.namaItem}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {p.namaDivisi}
                        </div>
                      </td>

                      <td className="py-3 px-2 min-w-36">
                        <div className="font-bold text-slate-800">{p.namaCabang}</div>
                        {p.namaWilayah && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 mt-0.5">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            <span>Wilayah {p.namaWilayah}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        <div className="font-mono font-black tabular-nums text-slate-900">
                          {formatRupiah(p.hargaDitawarkan)}
                        </div>
                        {p.satuan && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            per {p.satuan}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        <StatusVoteBadge
                          status={p.statusVote}
                          isBanding={p.usulanHarga !== null}
                        />
                        {p.tanggalRespon && (
                          <div className="text-[10px] text-slate-500 font-medium mt-1">
                            {formatTanggal(p.tanggalRespon)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        {tab === "perlu-respon" && p.deadlineVoting ? (
                          <SlaCountdown deadline={p.deadlineVoting} />
                        ) : (
                          <span className={cn("font-bold text-xs", status.tone)}>
                            {status.label}
                          </span>
                        )}
                      </td>

                      <td className="py-3 pl-2 pr-4 text-right">
                        <Link
                          href={`/kontraktor/${p.tiketId}`}
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-xs",
                            tab === "perlu-respon"
                              ? "bg-[#005BAC] text-white hover:bg-blue-700"
                              : "border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <span>{tab === "perlu-respon" ? "Beri Respon" : "Lihat Detail"}</span>
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

      {/* Keterangan Aturan Kuorum Singkat */}
      <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white border-2 border-slate-300 rounded-2xl p-4 shadow-2xs">
        <ClipboardList className="w-4 h-4 text-[#005BAC] shrink-0 mt-0.5" />
        <p className="font-medium leading-relaxed">
          Harga resmi berlaku bila minimal 50% + 1 rekanan cabang menyetujui. Kesempatan usulan
          banding diberikan satu kali per penawaran. Menolak dua putaran berturut-turut akan
          menonaktifkan sementara perusahaan Anda di cabang terkait.
        </p>
      </div>
    </div>
  );
}

function TabButton({
  href,
  aktif,
  jumlah,
  label,
}: {
  href: string;
  aktif: boolean;
  jumlah: number;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
        aktif
          ? "bg-[#005BAC] text-white shadow-xs"
          : "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "px-1.5 py-0.2 rounded text-[10px] font-black font-mono",
          aktif ? "bg-white text-[#005BAC]" : "bg-slate-200 text-slate-800"
        )}
      >
        {jumlah}
      </span>
    </Link>
  );
}
