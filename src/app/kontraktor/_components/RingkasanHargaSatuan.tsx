import { Coins, Hammer, MapPin, Package, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

/**
 * Ringkasan harga satuan untuk rekanan: subtotal per kelompok komponen (sudah termasuk
 * margin) dan total harga ditawarkan. Rincian koefisien & harga acuan tidak ditampilkan.
 */
export function RingkasanHargaSatuan({
  hargaDitawarkan,
  satuan,
  ringkasan,
  namaWilayah,
}: {
  hargaDitawarkan: number | null;
  satuan?: string | null;
  ringkasan: { upah: number; materialAlat: number; bongkaran: number } | null;
  namaWilayah?: string | null;
}) {
  const kartu = ringkasan
    ? [
        { label: "Komponen Upah", ket: "Tenaga kerja", nilai: ringkasan.upah, Icon: Hammer, warna: "bg-[#EAF3FB] text-[#005BAC]" },
        {
          label: "Komponen Material & Alat",
          ket: "Pengadaan bahan & alat",
          nilai: ringkasan.materialAlat,
          Icon: Package,
          warna: "bg-[#E7F6F0] text-[#0F8A5F]",
        },
        ...(ringkasan.bongkaran > 0
          ? [
              {
                label: "Komponen Bongkaran",
                ket: "Pekerjaan bongkaran",
                nilai: ringkasan.bongkaran,
                Icon: Trash2,
                warna: "bg-[#FFF8DB] text-[#B45309]",
              },
            ]
          : []),
      ]
    : [];

  return (
    <section className="bg-white rounded-2xl p-5 border-2 border-slate-200 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-slate-100">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#005BAC]" />
          Ringkasan Harga Satuan
        </h2>
        {namaWilayah && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-[#FFD100] text-slate-900 border border-amber-300">
            <MapPin className="w-3 h-3" /> Harga khusus wilayah {namaWilayah}
          </span>
        )}
      </div>

      {kartu.length > 0 && (
        <div className={`grid grid-cols-1 gap-3 ${kartu.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {kartu.map(({ label, ket, nilai, Icon, warna }) => (
            <div key={label} className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">{label}</span>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${warna}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <span className="text-lg font-bold font-mono tabular-nums text-slate-900 block">
                  {formatRupiah(Math.round(nilai))}
                </span>
                <span className="text-[10px] text-slate-500">{ket}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EAF3FB] border-2 border-[#B8D8F3] rounded-xl px-5 py-3.5">
        <div>
          <span className="text-xs font-bold text-[#003A70] uppercase tracking-wide block">Total Harga Ditawarkan</span>
          <span className="text-[11px] text-[#005BAC]">
            {kartu.length > 0 ? "Akumulasi seluruh komponen, dibulatkan ke rupiah penuh" : "Harga satuan yang ditetapkan Alfamart"}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 self-end sm:self-auto">
          <span className="text-2xl font-black font-mono tabular-nums text-[#005BAC] tracking-tight">
            {formatRupiah(hargaDitawarkan)}
          </span>
          <span className="text-sm font-bold text-[#005BAC]">/ {satuan || "satuan"}</span>
        </div>
      </div>
    </section>
  );
}
