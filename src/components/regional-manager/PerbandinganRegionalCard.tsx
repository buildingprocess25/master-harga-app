import { BarChart3 } from "lucide-react";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

interface Perbandingan {
  regional: string;
  daftar: { cabangId: string; namaCabang: string; harga: number; berlakuSejak: string; cabangTiket: boolean }[];
  min: number | null;
  maks: number | null;
  rata: number | null;
}

function selisih(rekomendasi: number, pembanding: number) {
  return ((rekomendasi - pembanding) / pembanding) * 100;
}

function Persen({ v }: { v: number }) {
  return (
    <span className={cn("font-mono tabular-nums font-semibold", v > 10 ? "text-[#990F14]" : v < -10 ? "text-[#085438]" : "text-slate-700")}>
      {v > 0 ? "+" : ""}
      {v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
    </span>
  );
}

/**
 * Evaluasi disparitas: harga resmi item yang sama di cabang lain dalam regional,
 * dibandingkan dengan rekomendasi S&B untuk tiket ini.
 */
export function PerbandinganRegionalCard({
  data,
  hargaRekomendasi,
  namaCabangTiket,
}: {
  data: Perbandingan | null;
  hargaRekomendasi: number | null;
  namaCabangTiket: string;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" aria-labelledby="judul-perbandingan">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#005BAC]" />
          <h2 id="judul-perbandingan" className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Perbandingan Harga Antar Cabang{data ? ` (Regional ${data.regional})` : ""}
          </h2>
        </div>
        {data && data.rata !== null && hargaRekomendasi !== null && (
          <span className="text-[11px] text-slate-600">
            Rekomendasi vs rata-rata regional: <Persen v={selisih(hargaRekomendasi, data.rata)} />
          </span>
        )}
      </div>

      {!data || data.daftar.length === 0 ? (
        <p className="px-4 py-5 text-xs text-slate-500">
          Belum ada harga resmi item ini di cabang mana pun dalam regional, sehingga belum ada pembanding.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#EEF2F6] text-slate-600 font-semibold text-[11px] uppercase tracking-wide">
              <tr>
                <th className="py-2 pl-4 pr-2">Cabang</th>
                <th className="py-2 px-2 text-right">Harga Resmi</th>
                <th className="py-2 px-2">Berlaku Sejak</th>
                <th className="py-2 pl-2 pr-4 text-right">Rekomendasi vs Cabang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hargaRekomendasi !== null && (
                <tr className="bg-[#EAF3FB]">
                  <td className="py-2 pl-4 pr-2 font-bold text-[#003A70]">Rekomendasi tiket ini ({namaCabangTiket})</td>
                  <td className="py-2 px-2 text-right font-mono font-bold tabular-nums text-[#003A70]">{formatRupiah(hargaRekomendasi)}</td>
                  <td className="py-2 px-2 text-slate-500">-</td>
                  <td className="py-2 pl-2 pr-4 text-right text-slate-500">-</td>
                </tr>
              )}
              {data.daftar.map((d) => (
                <tr key={d.cabangId}>
                  <td className="py-2 pl-4 pr-2 font-medium text-slate-800">
                    {d.namaCabang}
                    {d.cabangTiket && (
                      <span className="ml-1.5 px-1.5 py-px rounded bg-[#FFF8DB] border border-[#F3D56B] text-[10px] font-bold text-[#6E4B00]">
                        harga berlaku saat ini
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums">{formatRupiah(d.harga)}</td>
                  <td className="py-2 px-2 font-mono text-slate-600">{formatTanggal(d.berlakuSejak)}</td>
                  <td className="py-2 pl-2 pr-4 text-right">
                    {hargaRekomendasi !== null ? <Persen v={selisih(hargaRekomendasi, d.harga)} /> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 text-[11px] text-slate-600">
              <tr>
                <td className="py-2 pl-4 pr-2" colSpan={4}>
                  Terendah <span className="font-mono font-semibold text-slate-800">{formatRupiah(data.min)}</span> · Tertinggi{" "}
                  <span className="font-mono font-semibold text-slate-800">{formatRupiah(data.maks)}</span> · Rata-rata{" "}
                  <span className="font-mono font-semibold text-slate-800">{formatRupiah(data.rata)}</span> dari {data.daftar.length} cabang
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
