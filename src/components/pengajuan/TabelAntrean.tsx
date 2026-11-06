import Link from "next/link";
import { ChevronRight, Inbox, MapPin } from "lucide-react";
import type { BarisAntrean } from "@/lib/services/pengajuan-service";
import { cn, formatTanggal } from "@/lib/utils";
import { StatusTiketBadge } from "./StatusTiketBadge";

const HARI = 24 * 60 * 60 * 1000;

/**
 * Tabel antrean tiket internal. Kolom "Menunggu" dihitung dari updatedAt
 * (sejak status terakhir berubah) agar tiket yang lama tertahan mudah terlihat.
 */
export function TabelAntrean({
  rows,
  hrefDetail,
  labelAksi,
  aksiUtama,
  pesanKosong,
  kolomTambahan,
}: {
  rows: BarisAntrean[];
  hrefDetail: (id: string) => string;
  labelAksi: string;
  /** true: tombol aksi solid (butuh tindakan); false: tombol outline (hanya lihat). */
  aksiUtama: boolean;
  pesanKosong: { judul: string; deskripsi: string };
  kolomTambahan?: { judul: string; isi: (r: BarisAntrean) => React.ReactNode };
}) {
  if (rows.length === 0) {
    return (
      <div className="py-14 text-center">
        <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">{pesanKosong.judul}</p>
        <p className="text-xs text-slate-500 mt-1">{pesanKosong.deskripsi}</p>
      </div>
    );
  }

  const sekarang = Date.now();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead className="bg-[#EEF2F6] text-slate-600 font-semibold text-[11px] uppercase tracking-wide">
          <tr>
            <th className="py-2.5 pl-4 pr-2">Tiket, Item & Cabang</th>
            <th className="py-2.5 px-2">Status</th>
            {kolomTambahan && <th className="py-2.5 px-2">{kolomTambahan.judul}</th>}
            <th className="py-2.5 px-2">Menunggu</th>
            <th className="py-2.5 pl-2 pr-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const hari = Math.floor((sekarang - new Date(r.updatedAt).getTime()) / HARI);
            return (
              <tr key={r.id} className="align-top hover:bg-[#EAF3FB]/50">
                {/* Cabang digabung di kolom pertama agar tombol aksi tetap terlihat di layar 1024px + sidebar. */}
                <td className="py-3 pl-4 pr-2 min-w-56">
                  <div className="font-mono text-[11px] text-slate-500">{r.nomorTiket}</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{r.namaItem}</div>
                  <div className="text-[11px] text-slate-500">
                    {r.kategori} · {r.namaDivisi}
                  </div>
                  <div className="text-[11px] text-slate-700 mt-0.5">
                    <span className="font-medium">{r.namaCabang}</span>
                    {r.namaWilayah && (
                      <span className="inline-flex items-center gap-1 ml-1.5 text-[#6E4B00]">
                        <MapPin className="w-3 h-3" /> {r.namaWilayah}
                      </span>
                    )}
                    {r.pembuat && <span className="text-slate-500"> · oleh {r.pembuat}</span>}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <StatusTiketBadge status={r.status} />
                </td>
                {kolomTambahan && <td className="py-3 px-2">{kolomTambahan.isi(r)}</td>}
                <td className="py-3 px-2 whitespace-nowrap">
                  <div className={cn("font-semibold", hari >= 3 ? "text-[#990F14]" : "text-slate-700")}>
                    {hari === 0 ? "Hari ini" : `${hari} hari`}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{formatTanggal(r.updatedAt)}</div>
                </td>
                <td className="py-3 pl-2 pr-4 text-right">
                  <Link
                    href={hrefDetail(r.id)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors",
                      aksiUtama
                        ? "bg-[#005BAC] text-white hover:bg-[#004687]"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {labelAksi}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
