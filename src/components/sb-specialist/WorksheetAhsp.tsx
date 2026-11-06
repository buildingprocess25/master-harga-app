"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ClipboardCheck, Loader2, Save, Send, Store, Trash2 } from "lucide-react";
import type { OpsiKoefisien } from "@/lib/services/ahsp-service";
import { simpanWorksheetAction } from "@/app/sb-specialist/actions";
import { konfirmasiAksi, notifikasi } from "@/components/pengajuan/konfirmasi";
import { KategoriKoefisien } from "@/types";
import { cn, formatRupiah } from "@/lib/utils";
import { KomboboxKoefisien } from "./KomboboxKoefisien";
import { DialogKomponenBaru } from "./DialogKomponenBaru";
import { LABEL_KATEGORI, URUTAN_KATEGORI, formatAngka, parseAngka } from "./worksheet-util";

export interface BarisAwal {
  masterKoefisienId: string;
  namaKomponen: string;
  kategori: KategoriKoefisien;
  satuan: string;
  wajibSurveiToko: boolean;
  nilaiKoefisien: number;
  hargaAcuanSatuan: number;
}

interface BarisState {
  masterKoefisienId: string;
  namaKomponen: string;
  kategori: KategoriKoefisien;
  satuan: string;
  wajibSurveiToko: boolean;
  koef: string;
  harga: string;
}

function keState(b: BarisAwal): BarisState {
  return {
    masterKoefisienId: b.masterKoefisienId,
    namaKomponen: b.namaKomponen,
    kategori: b.kategori,
    satuan: b.satuan,
    wajibSurveiToko: b.wajibSurveiToko,
    koef: formatAngka(b.nilaiKoefisien),
    harga: b.hargaAcuanSatuan ? String(Math.round(b.hargaAcuanSatuan)) : "",
  };
}

/** Pesan error per baris; null bila valid. */
function cekBaris(b: BarisState): string | null {
  const k = parseAngka(b.koef);
  if (!(k > 0)) return "Koefisien harus lebih dari 0";
  if (Math.round(k * 10_000) / 10_000 !== k) return "Maksimal 4 angka desimal";
  const h = Number(b.harga.replace(/\D/g, "")) || 0;
  if (!b.wajibSurveiToko && h <= 0) return "Harga acuan wajib diisi (tidak disurvei)";
  return null;
}

/**
 * Worksheet resep AHSP S&B Specialist untuk tiket DIAJUKAN.
 * Komponen dipilih dari pustaka koefisien (atau ditambah baru), lalu disimpan
 * sebagai draft atau dikunci dan diterbitkan ke Building Coordinator (SIAP_SURVEI).
 */
export function WorksheetAhsp({
  tiketId,
  divisiId,
  marginAwal,
  opsiAwal,
  barisAwal,
}: {
  tiketId: string;
  divisiId: string;
  marginAwal: number;
  opsiAwal: OpsiKoefisien[];
  barisAwal: BarisAwal[];
}) {
  const router = useRouter();
  const [opsi, setOpsi] = useState(opsiAwal);
  const [baris, setBaris] = useState<BarisState[]>(() => barisAwal.map(keState));
  const [dirty, setDirty] = useState(false);
  const [dialogBaru, setDialogBaru] = useState<{ kategori: KategoriKoefisien; nama: string } | null>(null);
  const [catatan, setCatatan] = useState("");
  const [tampilError, setTampilError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [aksiBerjalan, setAksiBerjalan] = useState<"draft" | "terbit" | null>(null);

  // Peringatkan bila meninggalkan halaman dengan perubahan yang belum disimpan.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const dipilih = useMemo(() => new Set(baris.map((b) => b.masterKoefisienId)), [baris]);

  const ubah = (id: string, patch: Partial<BarisState>) => {
    setBaris((prev) => prev.map((b) => (b.masterKoefisienId === id ? { ...b, ...patch } : b)));
    setDirty(true);
  };
  const hapus = (id: string) => {
    setBaris((prev) => prev.filter((b) => b.masterKoefisienId !== id));
    setDirty(true);
  };
  const tambah = (o: OpsiKoefisien) => {
    setBaris((prev) => [
      ...prev,
      {
        masterKoefisienId: o.id,
        namaKomponen: o.namaKomponen,
        kategori: o.kategori,
        satuan: o.satuan,
        wajibSurveiToko: o.wajibSurveiToko,
        koef: formatAngka(o.nilaiKoefisienDefault),
        harga: o.hargaAcuanDefault ? String(Math.round(o.hargaAcuanDefault)) : "",
      },
    ]);
    setDirty(true);
  };

  const hitung = (b: BarisState) => {
    const k = parseAngka(b.koef);
    const h = Number(b.harga.replace(/\D/g, "")) || 0;
    return Number.isFinite(k) ? k * h : 0;
  };
  const marginKat = (kat: KategoriKoefisien) => (kat === "ALAT" ? 0 : marginAwal);
  const hppKat = (kat: KategoriKoefisien) => baris.filter((b) => b.kategori === kat).reduce((a, b) => a + hitung(b), 0);
  const totalHpp = URUTAN_KATEGORI.reduce((a, k) => a + hppKat(k), 0);
  const estimasi = URUTAN_KATEGORI.reduce((a, k) => a + hppKat(k) * (1 + marginKat(k) / 100), 0);
  const jumlahWajibSurvei = baris.filter((b) => b.wajibSurveiToko).length;
  const adaError = baris.some((b) => cekBaris(b) !== null);

  const kirim = async (terbitkan: boolean) => {
    setTampilError(true);
    if (baris.length === 0) return notifikasi("gagal", "Tambahkan minimal satu komponen AHSP.");
    if (adaError) return notifikasi("gagal", "Masih ada baris yang belum valid. Periksa kolom yang ditandai merah.");
    if (terbitkan) {
      if (jumlahWajibSurvei === 0) {
        return notifikasi("gagal", "Belum ada komponen wajib survei. Tambahkan minimal satu komponen material yang disurvei BC.");
      }
      const ok = await konfirmasiAksi({
        judul: "Kunci resep & terbitkan ke survei?",
        teks: `${baris.length} komponen akan dikunci dan tiket diteruskan ke Building Coordinator untuk survei 3 toko (${jumlahWajibSurvei} komponen wajib survei). Resep tidak dapat diubah lagi setelah ini.`,
        tombol: "Ya, terbitkan",
        nada: "biru",
      });
      if (!ok) return;
    }

    setAksiBerjalan(terbitkan ? "terbit" : "draft");
    startTransition(async () => {
      const hasil = await simpanWorksheetAction({
        tiketId,
        terbitkan,
        catatan: terbitkan ? catatan : undefined,
        baris: baris.map((b) => ({
          masterKoefisienId: b.masterKoefisienId,
          nilaiKoefisien: parseAngka(b.koef),
          hargaAcuanSatuan: Number(b.harga.replace(/\D/g, "")) || 0,
        })),
      });
      setAksiBerjalan(null);
      if (!hasil.success) {
        notifikasi("gagal", hasil.message);
        return;
      }
      setDirty(false);
      await notifikasi("sukses", hasil.message);
      if (terbitkan) router.push("/sb-specialist");
      else router.refresh();
    });
  };

  return (
    <section className="space-y-4" aria-labelledby="judul-worksheet">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="judul-worksheet" className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Langkah 2: Worksheet Resep AHSP
          </h2>
          <p className="text-xs text-slate-600">
            Harga material yang wajib survei masih estimasi; harga final diambil dari rata-rata survei 3 toko.
          </p>
        </div>
        {dirty && (
          <span className="text-[11px] font-semibold text-[#6E4B00] bg-[#FFF8DB] border border-[#F3D56B] rounded px-2 py-0.5">
            Ada perubahan belum disimpan
          </span>
        )}
      </div>

      {URUTAN_KATEGORI.map((kat) => {
        const barisKat = baris.filter((b) => b.kategori === kat);
        const opsiKat = opsi.filter((o) => o.kategori === kat);
        return (
          // Tanpa overflow-hidden agar dropdown combobox tidak terpotong kartu.
          <div key={kat} className="bg-white border border-slate-200 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{LABEL_KATEGORI[kat]}</h3>
                <span className="px-1.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold font-mono">{barisKat.length}</span>
              </div>
              <div className="text-[11px] text-slate-600">
                HPP <span className="font-mono font-bold text-slate-900 tabular-nums">{formatRupiah(hppKat(kat))}</span>
                <span className="ml-2">margin awal {marginKat(kat)}%</span>
              </div>
            </div>

            {barisKat.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2 pl-4 pr-2">Komponen</th>
                      <th className="py-2 px-2 w-20">Satuan</th>
                      <th className="py-2 px-2 w-32 text-right">Koefisien</th>
                      <th className="py-2 px-2 w-44 text-right">Harga Acuan</th>
                      <th className="py-2 px-2 w-36 text-right">Subtotal HPP</th>
                      <th className="py-2 pl-2 pr-4 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {barisKat.map((b) => {
                      const err = tampilError ? cekBaris(b) : null;
                      const nilaiHarga = Number(b.harga.replace(/\D/g, "")) || 0;
                      const idK = `koef-${b.masterKoefisienId}`;
                      const idH = `harga-${b.masterKoefisienId}`;
                      return (
                        <tr key={b.masterKoefisienId} className="align-top">
                          <td className="py-2 pl-4 pr-2 min-w-52">
                            <div className="font-semibold text-slate-900">{b.namaKomponen}</div>
                            {b.wajibSurveiToko && (
                              <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#003A70] bg-[#EAF3FB] border border-[#B8D8F3] rounded px-1.5">
                                <Store className="w-3 h-3" /> Wajib survei
                              </span>
                            )}
                            {err && <div className="text-[11px] text-[#990F14] mt-0.5">{err}</div>}
                          </td>
                          <td className="py-2 px-2 text-slate-700">{b.satuan}</td>
                          <td className="py-2 px-2">
                            <label htmlFor={idK} className="sr-only">Koefisien {b.namaKomponen}</label>
                            <input
                              id={idK}
                              inputMode="decimal"
                              value={b.koef}
                              onChange={(e) => ubah(b.masterKoefisienId, { koef: e.target.value })}
                              className={cn(
                                "w-full px-2 py-1 rounded border text-right font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]",
                                err ? "border-[#D91920]" : "border-slate-300"
                              )}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <label htmlFor={idH} className="sr-only">Harga acuan {b.namaKomponen}</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-[11px] text-slate-500">Rp</span>
                              <input
                                id={idH}
                                inputMode="numeric"
                                value={nilaiHarga ? nilaiHarga.toLocaleString("id-ID") : ""}
                                placeholder={b.wajibSurveiToko ? "estimasi" : "0"}
                                onChange={(e) => ubah(b.masterKoefisienId, { harga: e.target.value.replace(/\D/g, "") })}
                                className="w-full pl-7 pr-2 py-1 rounded border border-slate-300 text-right font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                            {formatRupiah(hitung(b))}
                          </td>
                          <td className="py-2 pl-2 pr-4 text-right">
                            <button
                              type="button"
                              onClick={() => hapus(b.masterKoefisienId)}
                              aria-label={`Hapus ${b.namaKomponen}`}
                              className="p-1 rounded text-slate-400 hover:text-[#ED1C24] hover:bg-[#FDECEE] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-4 py-2.5 border-t border-slate-100">
              <KomboboxKoefisien
                opsi={opsiKat}
                sudahDipilih={dipilih}
                onPilih={tambah}
                onBuatBaru={(nama) => setDialogBaru({ kategori: kat, nama })}
                placeholder={`Tambah komponen ${LABEL_KATEGORI[kat].toLowerCase()}`}
              />
            </div>
          </div>
        );
      })}

      {/* Ringkasan HPP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metrik label="Total HPP (tanpa margin)" nilai={formatRupiah(totalHpp)} />
        <Metrik label="Estimasi harga satuan" nilai={formatRupiah(estimasi)} tone="biru" catatan={`margin awal ${marginAwal}%, alat 0%`} />
        <Metrik label="Jumlah komponen" nilai={String(baris.length)} />
        <Metrik
          label="Wajib survei toko"
          nilai={String(jumlahWajibSurvei)}
          tone={jumlahWajibSurvei === 0 ? "merah" : "hijau"}
          catatan={jumlahWajibSurvei === 0 ? "minimal 1 untuk diterbitkan" : "akan disurvei BC"}
        />
      </div>

      {/* Aksi */}
      <div className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <label htmlFor="catatan-bc" className="block text-xs font-bold text-slate-700 mb-1">
            Catatan untuk Building Coordinator (opsional)
          </label>
          <textarea
            id="catatan-bc"
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: survei keramik merk setara di toko bangunan sekitar wilayah, minta nota asli."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]"
          />
        </div>
        {tampilError && adaError && (
          <div className="flex items-center gap-1.5 text-xs text-[#990F14]">
            <AlertCircle className="w-3.5 h-3.5" /> Masih ada baris yang belum valid.
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => kirim(false)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            {aksiBerjalan === "draft" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Draft
          </button>
          <button
            type="button"
            onClick={() => kirim(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#005BAC] hover:bg-[#004687] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
          >
            {aksiBerjalan === "terbit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Kunci & Terbitkan ke Survei
          </button>
        </div>
      </div>

      {dialogBaru && (
        <DialogKomponenBaru
          divisiId={divisiId}
          kategori={dialogBaru.kategori}
          namaAwal={dialogBaru.nama}
          onBatal={() => setDialogBaru(null)}
          onTersimpan={(o) => {
            setOpsi((prev) => [...prev, o]);
            tambah(o);
            setDialogBaru(null);
          }}
        />
      )}
    </section>
  );
}

function Metrik({
  label,
  nilai,
  tone = "netral",
  catatan,
}: {
  label: string;
  nilai: string;
  tone?: "netral" | "biru" | "hijau" | "merah";
  catatan?: string;
}) {
  const cls = {
    netral: "bg-white border-slate-200 text-slate-900",
    biru: "bg-[#EAF3FB] border-[#B8D8F3] text-[#003A70]",
    hijau: "bg-[#E7F6F0] border-[#B2DFCC] text-[#085438]",
    merah: "bg-[#FDECEE] border-[#F7C1C5] text-[#990F14]",
  }[tone];
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", cls)}>
      <div className="text-[11px] font-semibold opacity-80 flex items-center gap-1">
        {tone === "biru" && <ClipboardCheck className="w-3 h-3" />}
        {label}
      </div>
      <div className="text-base font-bold font-mono tabular-nums">{nilai}</div>
      {catatan && <div className="text-[10px] opacity-75">{catatan}</div>}
    </div>
  );
}
