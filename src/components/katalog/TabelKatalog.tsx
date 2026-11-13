import { CornerDownRight, MapPin } from "lucide-react";
import type { BarisKatalog } from "@/lib/services/master-harga-service";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";

function Selisih({ rp, persen }: { rp: number; persen: number }) {
  const naik = rp > 0;
  const tanda = naik ? "+" : rp < 0 ? "-" : "";
  return (
    <span className={cn("font-mono tabular-nums font-semibold", naik ? "text-[#990F14]" : rp < 0 ? "text-[#085438]" : "text-slate-500")}>
      {tanda}
      {formatRupiah(Math.abs(rp))}
      <span className="block text-[11px] font-normal">
        ({tanda}
        {Math.abs(persen).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
      </span>
    </span>
  );
}

/**
 * Tabel hierarki Katalog: baris harga induk cabang, diikuti baris harga
 * khusus wilayah (override) yang menjorok dengan badge penanda.
 */
export function TabelKatalog({ rows, nomorAwal = 1 }: { rows: BarisKatalog[]; nomorAwal?: number }) {
  return (
    <table className="w-full text-xs text-left">
      <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-200">
        <tr>
          <th className="py-3 pl-4 pr-2 w-10">No</th>
          <th className="py-3 px-2">Item Pekerjaan</th>
          <th className="py-3 px-2">Kategori</th>
          <th className="py-3 px-2">Cabang / Wilayah</th>
          <th className="py-3 px-2 text-right">Harga Satuan</th>
          <th className="py-3 px-2 text-right">Selisih dari Induk</th>
          <th className="py-3 pl-2 pr-4">Berlaku Sejak</th>
        </tr>
      </thead>
      <tbody className="divide-y-2 divide-slate-100">
        {rows.map((r, i) => (
          <FragmentBaris key={r.id} r={r} no={nomorAwal + i} />
        ))}
      </tbody>
    </table>
  );
}

function FragmentBaris({ r, no }: { r: BarisKatalog; no: number }) {
  return (
    <>
      <tr className="align-top hover:bg-slate-50 break-inside-avoid">
        <td className="py-3 pl-4 pr-2 text-slate-500 font-mono">{no}</td>
        <td className="py-3 px-2 min-w-56">
          <div className="font-bold text-slate-900">{r.namaItem}</div>
          <div className="font-mono text-[11px] text-slate-500">{r.kodeMaster}</div>
          {r.spesifikasi && <div className="text-[11px] text-slate-600 font-medium">{r.spesifikasi}</div>}
        </td>
        <td className="py-3 px-2 min-w-32">
          <div className="font-semibold text-slate-800">{r.kategori}</div>
          <div className="text-[11px] text-slate-500 font-medium">{r.namaDivisi}</div>
        </td>
        <td className="py-3 px-2 min-w-32">
          <div className="font-bold text-slate-800">{r.namaCabang}</div>
          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#005BAC] text-white text-[10px] font-bold uppercase tracking-wider">
            Induk cabang
          </span>
        </td>
        <td className="py-3 px-2 text-right whitespace-nowrap">
          <div className="font-mono tabular-nums font-black text-slate-900 text-sm">{formatRupiah(r.harga)}</div>
          <div className="text-[11px] text-slate-500 font-medium">per {r.satuan}</div>
        </td>
        <td className="py-3 px-2 text-right text-slate-400 font-medium">-</td>
        <td className="py-3 pl-2 pr-4 whitespace-nowrap">
          <div className="font-mono font-medium text-slate-700">{formatTanggal(r.berlakuSejak)}</div>
          {r.nomorTiket && <div className="font-mono text-[11px] text-slate-500">{r.nomorTiket}</div>}
        </td>
      </tr>
      {r.wilayahList.map((w) => (
        <tr key={w.id} className="align-top bg-amber-50 hover:bg-amber-100 break-inside-avoid">
          <td className="py-2.5 pl-4 pr-2" />
          <td className="py-2.5 px-2 text-slate-600" colSpan={2}>
            <span className="inline-flex items-center gap-1.5 pl-3 text-xs font-semibold text-amber-900">
              <CornerDownRight className="w-3.5 h-3.5 text-amber-600" />
              Harga khusus wilayah untuk item di atas
            </span>
          </td>
          <td className="py-2.5 px-2">
            <div className="inline-flex items-center gap-1 font-bold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-amber-600" /> {w.namaWilayah}
            </div>
            <span className="block mt-1 w-fit px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider">
              Khusus Wilayah
            </span>
          </td>
          <td className="py-2.5 px-2 text-right whitespace-nowrap">
            <div className="font-mono tabular-nums font-black text-slate-900 text-sm">{formatRupiah(w.harga)}</div>
            <div className="text-[11px] text-slate-500 font-medium">per {r.satuan}</div>
          </td>
          <td className="py-2.5 px-2 text-right whitespace-nowrap">
            <Selisih rp={w.selisihRp} persen={w.selisihPersen} />
          </td>
          <td className="py-2.5 pl-2 pr-4 whitespace-nowrap">
            <div className="font-mono font-medium text-slate-700">{formatTanggal(w.berlakuSejak)}</div>
            {w.nomorTiket && <div className="font-mono text-[11px] text-slate-500">{w.nomorTiket}</div>}
          </td>
        </tr>
      ))}
    </>
  );
}
