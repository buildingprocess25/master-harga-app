import Link from "next/link";
import { ChevronRight, Inbox, Timer } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { SlaCountdown } from "@/components/kuorum/SlaCountdown";
import { requireRolePage } from "@/lib/auth/require-role";
import { evaluasiJikaKedaluwarsa, getRingkasanKuorum } from "@/lib/services/kuorum-service";
import { getAntreanPengajuan } from "@/lib/services/pengajuan-service";
import { cn, formatRupiah } from "@/lib/utils";

/**
 * Pemantauan kuorum rekanan yang sedang berjalan di cabang wewenang Regional Manager.
 * Putaran yang SLA-nya lewat ditutup lebih dulu agar daftar hanya berisi voting aktif.
 */
export default async function MonitoringKuorumPage() {
  const user = await requireRolePage(["REGIONAL_MANAGER"]);

  let tiket = await getAntreanPengajuan(user, { statuses: ["PENDING_KONTRAKTOR"] });
  const ringkasanAwal = await Promise.all(tiket.map((t) => getRingkasanKuorum(t.id)));
  const kedaluwarsa = ringkasanAwal.filter((r) => r.deadlineVoting && new Date(r.deadlineVoting) < new Date());
  if (kedaluwarsa.length > 0) {
    for (const r of kedaluwarsa) await evaluasiJikaKedaluwarsa(r.tiketId);
    tiket = await getAntreanPengajuan(user, { statuses: ["PENDING_KONTRAKTOR"] });
  }
  const ringkasan = kedaluwarsa.length > 0 ? await Promise.all(tiket.map((t) => getRingkasanKuorum(t.id))) : ringkasanAwal;
  const peta = new Map(ringkasan.map((r) => [r.tiketId, r]));

  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "Regional Manager" }, { label: "Monitoring Kuorum" }]}>
      <HeaderHalaman
        icon={Timer}
        judul="Monitoring Kuorum Rekanan"
        deskripsi="Voting rekanan kontraktor yang sedang berjalan (SLA 3x24 jam). Harga resmi terbit otomatis saat minimal 50% + 1 rekanan setuju."
      />

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {tiket.length === 0 ? (
          <div className="py-14 text-center">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada kuorum yang sedang berjalan</p>
            <p className="text-xs text-slate-500 mt-1">Tiket yang Anda setujui di Approval Layer 3 akan dipantau di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#EEF2F6] text-slate-600 font-semibold text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="py-2.5 pl-4 pr-2">Tiket, Item & Cabang</th>
                  <th className="py-2.5 px-2 text-right">Harga Ditawarkan</th>
                  <th className="py-2.5 px-2 min-w-40">Progres Kuorum</th>
                  <th className="py-2.5 px-2">Batas Waktu</th>
                  <th className="py-2.5 pl-2 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tiket.map((t) => {
                  const r = peta.get(t.id);
                  const total = r?.totalDiundang ?? 0;
                  const setuju = r?.jumlahSetuju ?? 0;
                  const tolak = r?.votingKontraktorList.filter((v) => v.statusVote === "TOLAK").length ?? 0;
                  const menunggu = r?.votingKontraktorList.filter((v) => v.statusVote === "MENUNGGU").length ?? 0;
                  const persen = total > 0 ? Math.round((setuju / total) * 100) : 0;
                  return (
                    <tr key={t.id} className="align-top hover:bg-[#EAF3FB]/50">
                      <td className="py-3 pl-4 pr-2 min-w-48">
                        <div className="font-mono text-[11px] text-slate-500">
                          {t.nomorTiket}
                          {r?.putaran && r.putaran > 1 && (
                            <span className="ml-1.5 px-1.5 py-px rounded bg-[#EFEBFD] text-[#362387] font-sans font-semibold">
                              Putaran {r.putaran}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">{t.namaItem}</div>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">{t.namaCabang}</span> · {t.namaDivisi}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right whitespace-nowrap font-mono font-bold tabular-nums text-slate-900">
                        {formatRupiah(t.hargaDitetapkanSNB)}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex justify-between text-[11px] font-semibold mb-1">
                          <span className={r?.kuorumTerpenuhi ? "text-[#085438]" : "text-slate-700"}>
                            {setuju}/{total} setuju (target {r?.targetKuorum ?? "-"})
                          </span>
                          <span className="text-slate-500">{persen}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={persen} aria-valuemin={0} aria-valuemax={100} aria-label={`Progres kuorum ${t.nomorTiket}`}>
                          <div className={cn("h-2 rounded-full", r?.kuorumTerpenuhi ? "bg-[#0F8A5F]" : "bg-[#FFD100]")} style={{ width: `${persen}%` }} />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {tolak} banding/tolak · {menunggu} menunggu
                        </div>
                      </td>
                      <td className="py-3 px-2">{r?.deadlineVoting ? <SlaCountdown deadline={r.deadlineVoting} /> : "-"}</td>
                      <td className="py-3 pl-2 pr-4 text-right">
                        <Link
                          href={`/regional-manager/${t.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          Detail <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppLayoutShell>
  );
}
