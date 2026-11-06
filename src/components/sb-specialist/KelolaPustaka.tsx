"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Pencil, Plus, Power, Store } from "lucide-react";
import type { BarisPustaka } from "@/lib/services/pustaka-service";
import { setStatusKoefisienAction, simpanKoefisienAction } from "@/app/sb-specialist/actions";
import { konfirmasiAksi, notifikasi } from "@/components/pengajuan/konfirmasi";
import { KategoriKoefisien } from "@/types";
import { cn, formatRupiah } from "@/lib/utils";
import { LABEL_KATEGORI, URUTAN_KATEGORI, formatAngka, parseAngka } from "./worksheet-util";

const INPUT =
  "w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]";

interface FormState {
  id?: string;
  kategori: KategoriKoefisien;
  nama: string;
  satuan: string;
  koef: string;
  harga: string;
  wajib: boolean;
}

/** Tabel Pustaka Koefisien Baku + dialog tambah/ubah + aktif/nonaktif (S&B Specialist). */
export function KelolaPustaka({ rows, divisiId }: { rows: BarisPustaka[]; divisiId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const bukaBaru = () =>
    setForm({ kategori: "MATERIAL", nama: "", satuan: "", koef: "1", harga: "", wajib: true });
  const bukaUbah = (r: BarisPustaka) =>
    setForm({
      id: r.id,
      kategori: r.kategori,
      nama: r.namaKomponen,
      satuan: r.satuan,
      koef: formatAngka(r.nilaiKoefisienDefault),
      harga: r.hargaAcuanDefault ? String(Math.round(r.hargaAcuanDefault)) : "",
      wajib: r.wajibSurveiToko,
    });

  const simpan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const koef = parseAngka(form.koef);
    if (form.nama.trim().length < 3) return setError("Nama komponen minimal 3 karakter.");
    if (!form.satuan.trim()) return setError("Satuan wajib diisi.");
    if (!(koef > 0)) return setError("Koefisien default harus lebih dari 0.");
    setError("");
    startTransition(async () => {
      const hasil = await simpanKoefisienAction({
        id: form.id,
        divisiId,
        kategori: form.kategori,
        namaKomponen: form.nama,
        satuan: form.satuan,
        nilaiKoefisienDefault: koef,
        hargaAcuanDefault: form.harga ? Number(form.harga.replace(/\D/g, "")) : null,
        wajibSurveiToko: form.wajib,
      });
      if (!hasil.success) {
        setError(hasil.message);
        return;
      }
      setForm(null);
      notifikasi("sukses", hasil.message);
      router.refresh();
    });
  };

  const ubahStatus = async (r: BarisPustaka) => {
    const ok = await konfirmasiAksi(
      r.isActive
        ? {
            judul: `Nonaktifkan "${r.namaKomponen}"?`,
            teks: `Komponen tidak muncul lagi di worksheet AHSP. Resep ${r.dipakai} tiket yang sudah memakainya tidak berubah.`,
            tombol: "Ya, nonaktifkan",
            nada: "merah",
          }
        : { judul: `Aktifkan kembali "${r.namaKomponen}"?`, teks: "Komponen kembali tersedia di worksheet AHSP.", tombol: "Ya, aktifkan", nada: "hijau" }
    );
    if (!ok) return;
    startTransition(async () => {
      const hasil = await setStatusKoefisienAction({ id: r.id, aktif: !r.isActive });
      notifikasi(hasil.success ? "sukses" : "gagal", hasil.message);
      if (hasil.success) router.refresh();
    });
  };

  const nilaiHarga = form ? Number(form.harga.replace(/\D/g, "")) || 0 : 0;

  return (
    <>
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={bukaBaru}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#005BAC] hover:bg-[#004687] text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah komponen
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500">Tidak ada komponen yang cocok dengan filter.</p>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#EEF2F6] text-slate-600 font-semibold text-[11px] uppercase tracking-wide">
              <tr>
                <th className="py-2.5 pl-4 pr-2">Komponen</th>
                <th className="py-2.5 px-2">Kategori</th>
                <th className="py-2.5 px-2 text-right">Koef. Default</th>
                <th className="py-2.5 px-2 text-right">Harga Acuan</th>
                <th className="py-2.5 px-2 text-right">Dipakai</th>
                <th className="py-2.5 pl-2 pr-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className={cn("align-top", !r.isActive && "bg-slate-50 text-slate-500")}>
                  <td className="py-2.5 pl-4 pr-2 min-w-52">
                    <div className={cn("font-semibold", r.isActive ? "text-slate-900" : "text-slate-500 line-through")}>{r.namaKomponen}</div>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[11px]">
                      <span className="text-slate-500">per {r.satuan}</span>
                      {r.wajibSurveiToko && (
                        <span className="inline-flex items-center gap-1 px-1.5 rounded bg-[#EAF3FB] border border-[#B8D8F3] text-[10px] font-bold text-[#003A70] uppercase">
                          <Store className="w-3 h-3" /> Wajib survei
                        </span>
                      )}
                      {!r.isActive && (
                        <span className="px-1.5 rounded bg-slate-200 text-[10px] font-bold text-slate-600 uppercase">Nonaktif</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 whitespace-nowrap">{LABEL_KATEGORI[r.kategori] ?? r.kategori}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatAngka(r.nilaiKoefisienDefault)}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                    {r.hargaAcuanDefault !== null ? formatRupiah(r.hargaAcuanDefault) : "-"}
                  </td>
                  <td className="py-2.5 px-2 text-right">{r.dipakai} tiket</td>
                  <td className="py-2.5 pl-2 pr-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => bukaUbah(r)}
                      aria-label={`Ubah ${r.namaKomponen}`}
                      className="p-1.5 rounded text-slate-500 hover:text-[#005BAC] hover:bg-[#EAF3FB] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => ubahStatus(r)}
                      disabled={pending}
                      aria-label={r.isActive ? `Nonaktifkan ${r.namaKomponen}` : `Aktifkan ${r.namaKomponen}`}
                      className={cn(
                        "p-1.5 rounded cursor-pointer",
                        r.isActive ? "text-slate-500 hover:text-[#ED1C24] hover:bg-[#FDECEE]" : "text-[#0F8A5F] hover:bg-[#E7F6F0]"
                      )}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-form-koef"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onKeyDown={(e) => e.key === "Escape" && !pending && setForm(null)}
        >
          <form onSubmit={simpan} className="bg-white rounded-xl shadow-xl max-w-md w-full border-2 border-slate-300 p-5 space-y-3">
            <h2 id="judul-form-koef" className="text-sm font-bold text-slate-900">
              {form.id ? "Ubah komponen pustaka" : "Tambah komponen pustaka"}
            </h2>
            {form.id ? (
              <p className="text-[11px] text-slate-600">
                Perubahan berlaku untuk penyusunan resep berikutnya. Resep tiket yang sudah disusun tidak berubah,
                kecuali tanda wajib survei untuk tiket yang belum disurvei.
              </p>
            ) : (
              <div>
                <label htmlFor="pk-kategori" className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  id="pk-kategori"
                  value={form.kategori}
                  onChange={(e) => {
                    const k = e.target.value as KategoriKoefisien;
                    setForm({ ...form, kategori: k, wajib: k === "MATERIAL" });
                  }}
                  className={INPUT}
                >
                  {URUTAN_KATEGORI.map((k) => (
                    <option key={k} value={k}>{LABEL_KATEGORI[k]}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="pk-nama" className="block text-xs font-bold text-slate-700 mb-1">Nama komponen</label>
              <input id="pk-nama" autoFocus value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className={INPUT} maxLength={120} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pk-satuan" className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
                <input id="pk-satuan" value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} className={INPUT} maxLength={20} />
              </div>
              <div>
                <label htmlFor="pk-koef" className="block text-xs font-bold text-slate-700 mb-1">Koefisien default</label>
                <input id="pk-koef" inputMode="decimal" value={form.koef} onChange={(e) => setForm({ ...form, koef: e.target.value })} className={`${INPUT} font-mono`} />
              </div>
            </div>
            <div>
              <label htmlFor="pk-harga" className="block text-xs font-bold text-slate-700 mb-1">Harga acuan default (opsional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-500">Rp</span>
                <input
                  id="pk-harga"
                  inputMode="numeric"
                  value={nilaiHarga ? nilaiHarga.toLocaleString("id-ID") : ""}
                  onChange={(e) => setForm({ ...form, harga: e.target.value.replace(/\D/g, "") })}
                  className={`${INPUT} pl-9 font-mono`}
                />
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.wajib} onChange={(e) => setForm({ ...form, wajib: e.target.checked })} className="mt-0.5 accent-[#005BAC]" />
              <span>
                <span className="font-semibold">Wajib survei 3 toko</span>
                <span className="block text-[11px] text-slate-500">Harga final komponen diambil dari rata-rata survei Building Coordinator.</span>
              </span>
            </label>
            {error && (
              <div className="flex items-start gap-1.5 text-xs text-[#990F14]" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setForm(null)} disabled={pending} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer">
                Batal
              </button>
              <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white bg-[#005BAC] hover:bg-[#004687] disabled:opacity-60 cursor-pointer">
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
