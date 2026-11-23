import { FileText, Scale } from "lucide-react";
import type { RingkasanBanding } from "@/lib/services/banding-service";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

function Persen({ v }: { v: number }) {
  return (
    <span className={cn("font-mono tabular-nums font-semibold", v > 0 ? "text-[#990F14]" : "text-[#085438]")}>
      {v > 0 ? "+" : ""}
      {v.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%
    </span>
  );
}

const LABEL_STATUS = {
  SETUJU: { label: "Setuju", cls: "bg-[#E7F6F0] text-[#085438] border-[#B2DFCC]" },
  TOLAK: { label: "Tolak", cls: "bg-[#FDECEE] text-[#990F14] border-[#F7C1C5]" },
  TIMEOUT: { label: "Tidak merespons", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  MENUNGGU: { label: "Menunggu", cls: "bg-[#EAF3FB] text-[#003A70] border-[#B8D8F3]" },
} as const;

/**
 * Hasil voting rekanan putaran terakhir dengan fokus usulan banding: harga usulan,
 * selisih terhadap harga ditawarkan, argumentasi, dan berkas bukti pasar.
 * Dipakai S&B (evaluasi banding) dan Regional (konteks sebelum membuka putaran berikutnya).
 */
export function RingkasanBandingCard({ data, judul = "Usulan Banding Rekanan" }: { data: RingkasanBanding; judul?: string }) {
  const harga = data.hargaDitawarkan;
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" aria-labelledby="judul-banding">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#D99B00]" />
          <h2 id="judul-banding" className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {judul} (Putaran {data.putaran})
          </h2>
        </div>
        <span className="text-[11px] text-slate-600">
          {data.jumlahSetuju} setuju · {data.jumlahBanding} banding · {data.jumlahTolak} tolak · {data.jumlahTimeout} tidak merespons
          {" "}dari {data.totalDiundang} rekanan
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-slate-100">
        <Statistik label="Harga ditawarkan" nilai={formatRupiah(harga)} />
        <Statistik label="Rata-rata usulan" nilai={data.usulanRata !== null ? formatRupiah(data.usulanRata) : "-"} tone="kuning" />
        <Statistik
          label="Rentang usulan"
          nilai={data.usulanMin !== null ? `${formatRupiah(data.usulanMin)} s.d. ${formatRupiah(data.usulanMaks)}` : "-"}
        />
        <Statistik
          label="Selisih rata-rata"
          nilai={data.selisihRataPersen !== null ? `${data.selisihRataPersen > 0 ? "+" : ""}${data.selisihRataPersen.toLocaleString("id-ID")}%` : "-"}
          tone={data.selisihRataPersen !== null && Math.abs(data.selisihRataPersen) > 10 ? "merah" : "netral"}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#EEF2F6] text-slate-600 font-semibold text-[11px] uppercase tracking-wide">
            <tr>
              <th className="py-2 pl-4 pr-2">Rekanan</th>
              <th className="py-2 px-2">Respon</th>
              <th className="py-2 px-2 text-right">Usulan Harga</th>
              <th className="py-2 pl-2 pr-4">Argumentasi & Bukti</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.daftar.map((v) => {
              const s = LABEL_STATUS[v.statusVote];
              const isBanding = v.statusVote === "TOLAK" && typeof v.hargaBanding === "number";
              return (
                <tr key={v.id} className="align-top">
                  <td className="py-2.5 pl-4 pr-2 min-w-40">
                    <div className="font-semibold text-slate-900">{v.namaPerusahaan}</div>
                    {v.tanggalVote && <div className="text-[11px] text-slate-500 font-mono">{formatTanggal(v.tanggalVote)}</div>}
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={cn("inline-block px-2 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap", s.cls)}>
                      {isBanding ? "Usulan banding" : s.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right whitespace-nowrap">
                    {isBanding ? (
                      <>
                        <div className="font-mono font-bold tabular-nums text-slate-900">{formatRupiah(v.hargaBanding)}</div>
                        {harga ? <Persen v={(((v.hargaBanding as number) - harga) / harga) * 100} /> : null}
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-2 pr-4 min-w-64">
                    {v.catatanBanding ? <p className="text-slate-700">{v.catatanBanding}</p> : <span className="text-slate-400">-</span>}
                    {v.lampiranBandingList && v.lampiranBandingList.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5 mt-1.5">
                        {v.lampiranBandingList.map((l) => (
                          <li key={l.id}>
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 text-[11px] font-medium text-[#005BAC] hover:bg-[#EAF3FB]"
                            >
                              <FileText className="w-3 h-3" /> {l.namaFile}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Statistik({ label, nilai, tone = "netral" }: { label: string; nilai: string; tone?: "netral" | "kuning" | "merah" }) {
  const cls = {
    netral: "bg-slate-50 border-slate-200 text-slate-900",
    kuning: "bg-[#FFF8DB] border-[#F3D56B] text-[#6E4B00]",
    merah: "bg-[#FDECEE] border-[#F7C1C5] text-[#990F14]",
  }[tone];
  return (
    <div className={cn("rounded-lg border px-3 py-2", cls)}>
      <div className="text-[11px] font-semibold opacity-80">{label}</div>
      <div className="text-sm font-bold font-mono tabular-nums">{nilai}</div>
    </div>
  );
}
