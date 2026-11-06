import { History, ShieldAlert } from "lucide-react";
import {
  getCabangWewenang,
  getDaftarRekananParked,
  getNamaCabang,
  getRiwayatUnpark,
} from "@/lib/services/kuorum-service";
import { formatTanggal } from "@/lib/utils";
import { RoleUser } from "@/types";
import { TabelRekananParked } from "./TabelRekananParked";

/**
 * Isi halaman Rekanan Parked (daftar + aksi Unpark + riwayat aktivasi) sesuai cakupan
 * wewenang pengguna. Dipakai di /sb-specialist/rekanan-parked,
 * dan /regional-manager/rekanan-parked.
 */
export async function KontenRekananParked({
  user,
  tampilJudul = true,
}: {
  user: { id: string; role: RoleUser };
  tampilJudul?: boolean;
}) {
  const wewenang = await getCabangWewenang(user.id, user.role);
  const [parkedList, riwayat, namaCabangWewenang] = await Promise.all([
    getDaftarRekananParked(wewenang),
    getRiwayatUnpark(wewenang),
    wewenang === "SEMUA" ? Promise.resolve(null) : getNamaCabang(wewenang),
  ]);

  const teksCakupan =
    namaCabangWewenang === null
      ? "Seluruh cabang (HO)"
      : namaCabangWewenang.length > 0
        ? namaCabangWewenang.join(", ")
        : "Belum ada cabang yang ditugaskan";

  return (
    <div className="space-y-5">
      {tampilJudul ? (
        <div>
          <h1 className="text-lg font-bold text-slate-900">Rekanan Nonaktif Sementara (Parked)</h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-3xl">
            Rekanan otomatis dinonaktifkan di suatu cabang setelah menolak penetapan harga dua putaran
            berturut-turut. Mediasi dilakukan di luar sistem; setelah selesai, aktifkan kembali rekanan
            agar diundang lagi pada voting berikutnya di cabang tersebut.
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Cakupan wewenang: <span className="font-semibold text-slate-700">{teksCakupan}</span>
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          Cakupan wewenang: <span className="font-semibold text-slate-700">{teksCakupan}</span>
        </p>
      )}

      <TabelRekananParked data={parkedList} />

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
          <History className="w-4 h-4 text-[#005BAC]" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Riwayat Aktivasi Kembali</h2>
        </div>
        {riwayat.length === 0 ? (
          <p className="px-4 py-6 text-xs text-slate-500 text-center">Belum ada rekanan yang diaktifkan kembali.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#EEF2F6] text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 pl-4 pr-2">Tanggal</th>
                  <th className="py-2.5 px-2">Rekanan</th>
                  <th className="py-2.5 px-2">Cabang</th>
                  <th className="py-2.5 px-2">Diaktifkan oleh</th>
                  <th className="py-2.5 pl-2 pr-4">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riwayat.map((r) => (
                  <tr key={r.relasiId} className="align-top">
                    <td className="py-2.5 pl-4 pr-2 font-mono whitespace-nowrap text-slate-600">{formatTanggal(r.unparkedAt)}</td>
                    <td className="py-2.5 px-2 min-w-44">
                      <div className="font-semibold text-slate-900">{r.namaPerusahaan}</div>
                      <div className="font-mono text-[11px] text-slate-500">{r.kodeVendor}</div>
                    </td>
                    <td className="py-2.5 px-2 min-w-36">
                      {r.namaCabang}
                      <div className="text-[11px] text-slate-500">{r.namaDivisi}</div>
                      {r.statusKeaktifan === "NONAKTIF_SEMENTARA" && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-[#990F14]">
                          <ShieldAlert className="w-3 h-3" /> Parked lagi
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">{r.unparkedOleh}</td>
                    <td className="py-2.5 pl-2 pr-4 text-slate-700 min-w-56">{r.unparkReason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
