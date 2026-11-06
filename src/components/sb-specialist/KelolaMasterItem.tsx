"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Pencil, Plus } from "lucide-react";
import type { BarisMasterItem, SpesifikasiItem } from "@/lib/services/master-item-service";
import { simpanMasterItemAction } from "@/app/sb-specialist/actions";
import { notifikasi } from "@/components/pengajuan/konfirmasi";

const INPUT =
  "w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC] disabled:bg-slate-100 disabled:text-slate-500";

interface FormItem extends Required<{ [K in keyof SpesifikasiItem]: string }> {
  id?: string;
  divisiId: string;
  kodeItem: string;
  kodeVarian: string;
}

const KOSONG = (divisiId: string): FormItem => ({
  divisiId,
  kodeItem: "",
  kodeVarian: "01",
  kategori: "",
  namaItem: "",
  ukuran: "",
  merk: "",
  tipe: "",
  warna: "",
  permukaan: "",
  tebal: "",
  toleransi: "",
  lokasi: "",
  satuan: "",
});

/** Pratinjau deskripsi otomatis (selaras buatDeskripsiOtomatis di server). */
function pratinjauDeskripsi(f: FormItem) {
  const r = (s: string) => s.trim().replace(/\s+/g, " ");
  return [
    r(f.namaItem),
    f.ukuran && `ukuran ${r(f.ukuran)}`,
    f.merk && `merk ${r(f.merk)}`,
    f.tipe && `tipe ${r(f.tipe)}`,
    f.warna && `warna ${r(f.warna)}`,
    f.permukaan && `permukaan ${r(f.permukaan)}`,
    f.tebal && `tebal ${r(f.tebal)}`,
    f.toleransi && `toleransi ${r(f.toleransi)}`,
    f.lokasi && `lokasi ${r(f.lokasi)}`,
  ]
    .filter(Boolean)
    .join(", ");
}

const FIELD: { key: keyof SpesifikasiItem; label: string; wajib?: boolean; contoh?: string }[] = [
  { key: "namaItem", label: "Nama item", wajib: true, contoh: "Pasang Keramik Lantai" },
  { key: "kategori", label: "Kategori pekerjaan", wajib: true, contoh: "Pekerjaan Lantai" },
  { key: "ukuran", label: "Ukuran / dimensi", wajib: true, contoh: "60x60 cm" },
  { key: "merk", label: "Merk", wajib: true, contoh: "Granito" },
  { key: "tipe", label: "Tipe / varian" },
  { key: "warna", label: "Warna" },
  { key: "permukaan", label: "Permukaan" },
  { key: "tebal", label: "Tebal" },
  { key: "toleransi", label: "Toleransi" },
  { key: "lokasi", label: "Lokasi pekerjaan", wajib: true, contoh: "Area Sales" },
  { key: "satuan", label: "Satuan", wajib: true, contoh: "M2" },
];

/** Direktori Master Item Spesifikasi + dialog tambah/ubah (S&B Specialist). */
export function KelolaMasterItem({
  rows,
  divisiList,
}: {
  rows: BarisMasterItem[];
  divisiList: { id: string; namaDivisi: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormItem | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const ubah = (r: BarisMasterItem) =>
    setForm({
      id: r.id,
      divisiId: r.divisiId,
      kodeItem: r.kodeItem,
      kodeVarian: r.kodeVarian,
      kategori: r.kategori,
      namaItem: r.namaItem,
      ukuran: r.ukuran,
      merk: r.merk,
      tipe: r.tipe ?? "",
      warna: r.warna ?? "",
      permukaan: r.permukaan ?? "",
      tebal: r.tebal ?? "",
      toleransi: r.toleransi ?? "",
      lokasi: r.lokasi,
      satuan: r.satuan,
    });

  const simpan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const kosong = FIELD.find((f) => f.wajib && !form[f.key].trim());
    if (kosong) return setError(`${kosong.label} wajib diisi.`);
    if (!form.id && (!form.kodeItem.trim() || !form.kodeVarian.trim())) return setError("Kode item dan kode varian wajib diisi.");
    setError("");
    const { id, divisiId, kodeItem, kodeVarian, ...spesifikasi } = form;
    startTransition(async () => {
      const hasil = await simpanMasterItemAction({ id, divisiId, kodeItem, kodeVarian, spesifikasi });
      if (!hasil.success) {
        setError(hasil.message);
        return;
      }
      setForm(null);
      notifikasi("sukses", hasil.message);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={() => setForm(KOSONG(divisiList[0]?.id ?? ""))}
          disabled={divisiList.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#005BAC] hover:bg-[#004687] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah item
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500">Tidak ada item yang cocok dengan filter.</p>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#EEF2F6] text-slate-600 font-semibold text-[11px] uppercase tracking-wide">
              <tr>
                <th className="py-2.5 pl-4 pr-2">Kode & Item</th>
                <th className="py-2.5 px-2">Spesifikasi</th>
                <th className="py-2.5 px-2 text-right">Harga Cabang</th>
                <th className="py-2.5 px-2 text-right">Pengajuan</th>
                <th className="py-2.5 pl-2 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-[#EAF3FB]/50">
                  <td className="py-2.5 pl-4 pr-2 min-w-52">
                    <div className="font-mono text-[11px] font-bold text-slate-700">{r.kodeMaster}</div>
                    <div className="font-semibold text-slate-900">{r.namaItem}</div>
                    <div className="text-[11px] text-slate-500">{r.kategori} · {r.namaDivisi}</div>
                  </td>
                  <td className="py-2.5 px-2 min-w-64 text-slate-700">{r.deskripsiOtomatis}</td>
                  <td className="py-2.5 px-2 text-right">{r.jumlahHargaCabang} cabang</td>
                  <td className="py-2.5 px-2 text-right">{r.jumlahPengajuan} tiket</td>
                  <td className="py-2.5 pl-2 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() => ubah(r)}
                      aria-label={`Ubah ${r.namaItem}`}
                      className="p-1.5 rounded text-slate-500 hover:text-[#005BAC] hover:bg-[#EAF3FB] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
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
          aria-labelledby="judul-form-item"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto"
          onKeyDown={(e) => e.key === "Escape" && !pending && setForm(null)}
        >
          <form onSubmit={simpan} className="bg-white rounded-xl shadow-xl max-w-2xl w-full border-2 border-slate-300 p-5 space-y-3 my-8">
            <h2 id="judul-form-item" className="text-sm font-bold text-slate-900">
              {form.id ? `Ubah spesifikasi ${form.kodeItem}-${form.kodeVarian}` : "Tambah master item"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="mi-divisi" className="block text-xs font-bold text-slate-700 mb-1">Divisi</label>
                <select
                  id="mi-divisi"
                  value={form.divisiId}
                  disabled={!!form.id || divisiList.length < 2}
                  onChange={(e) => setForm({ ...form, divisiId: e.target.value })}
                  className={INPUT}
                >
                  {divisiList.map((d) => (
                    <option key={d.id} value={d.id}>{d.namaDivisi}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mi-kode" className="block text-xs font-bold text-slate-700 mb-1">Kode item</label>
                <input id="mi-kode" value={form.kodeItem} disabled={!!form.id} onChange={(e) => setForm({ ...form, kodeItem: e.target.value.toUpperCase() })} placeholder="SIP-001" className={`${INPUT} font-mono`} />
              </div>
              <div>
                <label htmlFor="mi-varian" className="block text-xs font-bold text-slate-700 mb-1">Kode varian</label>
                <input id="mi-varian" value={form.kodeVarian} disabled={!!form.id} onChange={(e) => setForm({ ...form, kodeVarian: e.target.value.toUpperCase() })} placeholder="01" className={`${INPUT} font-mono`} />
              </div>
            </div>
            {form.id ? (
              <p className="text-[11px] text-slate-500">Kode tidak dapat diubah karena menjadi acuan katalog harga dan tiket yang berjalan.</p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Kode master: <span className="font-mono font-semibold text-slate-700">{form.kodeItem && form.kodeVarian ? `${form.kodeItem.trim()}-${form.kodeVarian.trim()}` : "-"}</span>
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELD.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`mi-${f.key}`} className="block text-xs font-bold text-slate-700 mb-1">
                    {f.label}
                    {!f.wajib && <span className="font-normal text-slate-500"> (opsional)</span>}
                  </label>
                  <input
                    id={`mi-${f.key}`}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.contoh}
                    maxLength={150}
                    className={INPUT}
                  />
                </div>
              ))}
            </div>

            <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="font-bold text-slate-700 block mb-0.5">Deskripsi otomatis</span>
              <span className="text-slate-700">{pratinjauDeskripsi(form) || "-"}</span>
            </div>

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
