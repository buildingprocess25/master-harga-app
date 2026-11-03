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
      <thead className="bg-[#EEF2F6] text-slate-600 font-semibold">
        <tr>
          <th className="py-2.5 pl-4 pr-2 w-10">No</th>
          <th className="py-2.5 px-2">Item Pekerjaan</th>
          <th className="py-2.5 px-2">Kategori</th>
          <th className="py-2.5 px-2">Cabang / Wilayah</th>
          <th className="py-2.5 px-2 text-right">Harga Satuan</th>
          <th className="py-2.5 px-2 text-right">Selisih dari Induk</th>
          <th className="py-2.5 pl-2 pr-4">Berlaku Sejak</th>
        </tr>
      </thead>
      <tbody>
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
      <tr className="border-t border-slate-100 align-top hover:bg-[#EAF3FB]/50 break-inside-avoid">
        <td className="py-2.5 pl-4 pr-2 text-slate-500 font-mono">{no}</td>
        <td className="py-2.5 px-2 min-w-56">
          <div className="font-semibold text-slate-900">{r.namaItem}</div>
          <div className="font-mono text-[11px] text-slate-500">{r.kodeMaster}</div>
          {r.spesifikasi && <div className="text-[11px] text-slate-600">{r.spesifikasi}</div>}
        </td>
        <td className="py-2.5 px-2 min-w-32">
          <div className="text-slate-800">{r.kategori}</div>
          <div className="text-[11px] text-slate-500">{r.namaDivisi}</div>
        </td>
        <td className="py-2.5 px-2 min-w-32">
          <div className="font-medium text-slate-800">{r.namaCabang}</div>
          <span className="inline-block mt-0.5 px-1.5 py-px rounded bg-[#EAF3FB] text-[#003A70] text-[10px] font-bold uppercase tracking-wide">
            Induk cabang
          </span>
        </td>
        <td className="py-2.5 px-2 text-right whitespace-nowrap">
          <div className="font-mono tabular-nums font-bold text-slate-900">{formatRupiah(r.harga)}</div>
          <div className="text-[11px] text-slate-500">per {r.satuan}</div>
        </td>
        <td className="py-2.5 px-2 text-right text-slate-400">-</td>
        <td className="py-2.5 pl-2 pr-4 whitespace-nowrap">
          <div className="font-mono text-slate-700">{formatTanggal(r.berlakuSejak)}</div>
          {r.nomorTiket && <div className="font-mono text-[11px] text-slate-500">{r.nomorTiket}</div>}
        </td>
      </tr>
      {r.wilayahList.map((w) => (
        <tr key={w.id} className="align-top bg-[#FFFDF3] hover:bg-[#FFF8DB] break-inside-avoid">
          <td className="py-2 pl-4 pr-2" />
          <td className="py-2 px-2 text-slate-500" colSpan={2}>
            <span className="inline-flex items-center gap-1 pl-3 text-[11px]">
              <CornerDownRight className="w-3.5 h-3.5 text-[#D99B00]" />
              Harga khusus wilayah untuk item di atas
            </span>
          </td>
          <td className="py-2 px-2">
            <div className="inline-flex items-center gap-1 font-medium text-slate-800">
              <MapPin className="w-3 h-3 text-[#D99B00]" /> {w.namaWilayah}
            </div>
            <span className="block mt-0.5 w-fit px-1.5 py-px rounded bg-[#FFF8DB] border border-[#F3D56B] text-[#6E4B00] text-[10px] font-bold uppercase tracking-wide">
              Override wilayah
            </span>
          </td>
          <td className="py-2 px-2 text-right whitespace-nowrap">
            <div className="font-mono tabular-nums font-bold text-slate-900">{formatRupiah(w.harga)}</div>
            <div className="text-[11px] text-slate-500">per {r.satuan}</div>
          </td>
          <td className="py-2 px-2 text-right whitespace-nowrap">
            <Selisih rp={w.selisihRp} persen={w.selisihPersen} />
          </td>
          <td className="py-2 pl-2 pr-4 whitespace-nowrap">
            <div className="font-mono text-slate-700">{formatTanggal(w.berlakuSejak)}</div>
            {w.nomorTiket && <div className="font-mono text-[11px] text-slate-500">{w.nomorTiket}</div>}
          </td>
        </tr>
      ))}
    </>
  );
}
