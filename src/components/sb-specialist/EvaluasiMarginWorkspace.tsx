"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Save, Send, XCircle } from "lucide-react";
import { RincianKalkulasiKoefisien } from "@/components/global";
import { konfirmasiAksi, notifikasi } from "@/components/pengajuan/konfirmasi";
import { putuskanPascaSurveiAction, simpanEvaluasiMarginAction } from "@/app/sb-specialist/actions";
import { hitungAhsp, MarginKategori } from "@/lib/kalkulasi-ahsp";
import { KategoriKoefisien, KoefisienDetailItem } from "@/types";
import { cn, formatRupiah } from "@/lib/utils";

export interface KomponenEvaluasi {
  id: string;
  namaKomponen: string;
  kategori: KategoriKoefisien;
  satuan: string;
  koefisien: number;
  hargaAcuan: number;
  sumber: "SURVEI" | "PUSTAKA" | "SURVEI_KOSONG";
  jumlahToko: number;
  sebaranPersen: number | null;
}

type Mode = "KIRIM" | "REVISI" | "TOLAK";

/** Batas sebaran harga antar toko yang dianggap perlu dicermati. */
const SEBARAN_WASPADA = 25;

/**
 * Evaluasi pasca-survei S&B Specialist (status PENDING_SB_SPECIALIST): atur live margin
 * per kategori, bandingkan dengan harga berlaku, lalu kirim rekomendasi ke Regional Manager.
 */
export function EvaluasiMarginWorkspace({
  tiketId,
  komponen,
  marginAwal,
  satuan,
  hargaBerlaku,
}: {
  tiketId: string;
  komponen: KomponenEvaluasi[];
  marginAwal: MarginKategori;
  satuan: string | null;
  hargaBerlaku: { harga: number; label: string; berlakuSejak: string } | null;
}) {
  const router = useRouter();
  const [margin, setMargin] = useState<MarginKategori>(marginAwal);
  const [mode, setMode] = useState<Mode>("KIRIM");
  const [catatan, setCatatan] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [aksi, setAksi] = useState<"draft" | "utama" | null>(null);

  const berubah =
    margin.upah !== marginAwal.upah || margin.material !== marginAwal.material || margin.bongkaran !== marginAwal.bongkaran;

  useEffect(() => {
    if (!berubah) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [berubah]);

  const kalk = useMemo(
    () => hitungAhsp(komponen.map((k) => ({ kategori: k.kategori, koefisien: k.koefisien, hargaAcuan: k.hargaAcuan })), margin),
    [komponen, margin]
  );

  const itemsGlobal: KoefisienDetailItem[] = komponen.map((k) => ({
    id: k.id,
    kategori: k.kategori,
    namaKomponen: k.namaKomponen,
    satuan: k.satuan,
    koefisien: k.koefisien,
    hargaAcuan: k.hargaAcuan,
    subtotal: k.koefisien * k.hargaAcuan,
    marginPersen: 0,
    total: 0,
  }));

  const tanpaSurvei = komponen.filter((k) => k.sumber === "SURVEI_KOSONG");
  const kurangToko = komponen.filter((k) => k.sumber === "SURVEI" && k.jumlahToko < 3);
  const sebaranTinggi = komponen.filter((k) => (k.sebaranPersen ?? 0) > SEBARAN_WASPADA);
  const selisihBerlaku = hargaBerlaku ? ((kalk.hargaFinal - hargaBerlaku.harga) / hargaBerlaku.harga) * 100 : null;

  const jalankan = async (draft: boolean) => {
    setError("");
    if (mode !== "KIRIM" && catatan.trim().length < 5) {
      setError("Catatan wajib diisi (minimal 5 karakter).");
      return;
    }
    if (mode === "KIRIM" && tanpaSurvei.length > 0) {
      notifikasi("gagal", `Data survei belum ada untuk: ${tanpaSurvei.map((k) => k.namaKomponen).join(", ")}.`);
      return;
    }
    if (!draft) {
      const ok = await konfirmasiAksi(
        mode === "KIRIM"
          ? {
              judul: "Kirim rekomendasi ke Regional?",
              teks: `Harga rekomendasi ${formatRupiah(kalk.hargaFinal)}${satuan ? ` per ${satuan}` : ""} dengan margin efektif ${kalk.marginEfektif.toLocaleString("id-ID")}% akan dikirim ke Regional Manager untuk persetujuan Layer 3.`,
              tombol: "Ya, kirim",
              nada: "biru",
            }
          : mode === "REVISI"
            ? { judul: "Kembalikan untuk revisi?", teks: "Tiket berstatus PERLU_REVISI dan kembali ke pengaju.", tombol: "Ya, kembalikan", nada: "kuning" }
            : { judul: "Tolak pengajuan permanen?", teks: "Tiket ditutup dengan status DITOLAK.", tombol: "Ya, tolak", nada: "merah" }
      );
      if (!ok) return;
    }

    setAksi(draft ? "draft" : "utama");
    startTransition(async () => {
      const hasil =
        mode === "KIRIM"
          ? await simpanEvaluasiMarginAction({ tiketId, margin, teruskan: !draft, catatan: draft ? undefined : catatan })
          : await putuskanPascaSurveiAction({ tiketId, keputusan: mode, catatan });
      setAksi(null);
      if (!hasil.success) {
        notifikasi("gagal", hasil.message);
        return;
      }
      await notifikasi("sukses", hasil.message);
      if (draft) router.refresh();
      else router.push("/sb-specialist/evaluasi-margin");
    });
  };

  return (
    <div className="space-y-5">
      {(tanpaSurvei.length > 0 || kurangToko.length > 0 || sebaranTinggi.length > 0) && (
        <div className="bg-[#FFF8DB] border-2 border-[#F3D56B] rounded-xl p-3 text-xs text-[#6E4B00] space-y-1" role="status">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4" /> Perhatikan kualitas data survei
          </div>
          <ul className="list-disc pl-6 space-y-0.5">
            {tanpaSurvei.map((k) => (
              <li key={k.id}><span className="font-semibold">{k.namaKomponen}</span>: belum ada data survei, rekomendasi tidak dapat dikirim.</li>
            ))}
            {kurangToko.map((k) => (
              <li key={k.id}><span className="font-semibold">{k.namaKomponen}</span>: baru {k.jumlahToko} dari 3 toko yang disurvei.</li>
            ))}
            {sebaranTinggi.map((k) => (
              <li key={k.id}>
                <span className="font-semibold">{k.namaKomponen}</span>: selisih harga antar toko {k.sebaranPersen?.toLocaleString("id-ID")}% (di atas {SEBARAN_WASPADA}%).
              </li>
            ))}
          </ul>
        </div>
      )}

      <RincianKalkulasiKoefisien
        koefisienItems={itemsGlobal}
        mode="editable"
        liveMarginUpah={margin.upah}
        liveMarginMaterial={margin.material}
        liveMarginBongkaran={margin.bongkaran}
        onMarginChange={(upah, material, bongkaran) => setMargin({ upah, material, bongkaran })}
      />

      {/* Ringkasan rekomendasi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kartu label="HPP (tanpa margin)" nilai={formatRupiah(kalk.hpp)} />
        <Kartu
          label="Harga rekomendasi"
          nilai={formatRupiah(kalk.hargaFinal)}
          catatan={satuan ? `per ${satuan}, dibulatkan ke rupiah` : "dibulatkan ke rupiah"}
          tone="hijau"
        />
        <Kartu label="Margin efektif" nilai={`${kalk.marginEfektif.toLocaleString("id-ID")}%`} catatan="dari total HPP, alat tanpa margin" />
        {hargaBerlaku && selisihBerlaku !== null ? (
          <Kartu
            label={hargaBerlaku.label}
            nilai={formatRupiah(hargaBerlaku.harga)}
            catatan={`rekomendasi ${selisihBerlaku >= 0 ? "+" : ""}${selisihBerlaku.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`}
            tone={Math.abs(selisihBerlaku) > 10 ? "kuning" : "netral"}
          />
        ) : (
          <Kartu label="Harga berlaku saat ini" nilai="Belum ada" catatan="item baru di cabang ini" />
        )}
      </div>

      {/* Keputusan */}
      <section className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-3" aria-labelledby="judul-keputusan-margin">
        <h2 id="judul-keputusan-margin" className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Keputusan Evaluasi
        </h2>
        <div role="radiogroup" aria-label="Keputusan evaluasi" className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
          {(
            [
              { m: "KIRIM", label: "Kirim ke Regional", icon: CheckCircle2, aktif: "bg-[#E7F6F0] text-[#085438] ring-2 ring-[#0F8A5F]" },
              { m: "REVISI", label: "Kembalikan revisi", icon: RotateCcw, aktif: "bg-[#FFF8DB] text-[#6E4B00] ring-2 ring-[#D99B00]" },
              { m: "TOLAK", label: "Tolak pengajuan", icon: XCircle, aktif: "bg-[#FDECEE] text-[#990F14] ring-2 ring-[#D91920]" },
            ] as const
          ).map((o) => {
            const Icon = o.icon;
            const dipilih = mode === o.m;
            return (
              <button
                key={o.m}
                type="button"
                role="radio"
                aria-checked={dipilih}
                onClick={() => {
                  setMode(o.m);
                  setError("");
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs transition-colors cursor-pointer",
                  dipilih ? `${o.aktif} font-bold` : "text-slate-600 hover:bg-slate-200/70 font-medium"
                )}
              >
                <Icon className="w-4 h-4" />
                {o.label}
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor="catatan-margin" className="block text-xs font-bold text-slate-700 mb-1">
            {mode === "KIRIM" ? "Catatan untuk Regional Manager (opsional)" : mode === "REVISI" ? "Apa yang perlu direvisi?" : "Alasan penolakan"}
          </label>
          <textarea
            id="catatan-margin"
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            aria-invalid={!!error}
            placeholder={
              mode === "KIRIM"
                ? "Contoh: harga semen naik di 3 toko, margin material diturunkan agar tetap kompetitif."
                : mode === "REVISI"
                  ? "Contoh: harga toko 2 tidak wajar, mohon survei ulang dengan nota asli."
                  : "Contoh: harga pasar jauh di atas pagu anggaran pekerjaan."
            }
            className={cn(
              "w-full px-3 py-2 rounded-lg border text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]",
              error ? "border-[#D91920]" : "border-slate-300"
            )}
          />
          {error && <p className="text-xs text-[#990F14] mt-1">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {berubah && mode === "KIRIM" && (
            <span className="mr-auto text-[11px] font-semibold text-[#6E4B00] bg-[#FFF8DB] border border-[#F3D56B] rounded px-2 py-0.5">
              Margin berubah dari yang tersimpan
            </span>
          )}
          {mode === "KIRIM" && (
            <button
              type="button"
              onClick={() => jalankan(true)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
            >
              {aksi === "draft" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan Draft Margin
            </button>
          )}
          <button
            type="button"
            onClick={() => jalankan(false)}
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-60 cursor-pointer",
              mode === "KIRIM" && "bg-[#005BAC] hover:bg-[#004687]",
              mode === "REVISI" && "bg-[#D99B00] hover:bg-[#B88300]",
              mode === "TOLAK" && "bg-[#ED1C24] hover:bg-red-700"
            )}
          >
            {aksi === "utama" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {mode === "KIRIM" ? "Kirim Rekomendasi ke Regional" : mode === "REVISI" ? "Kembalikan Revisi" : "Tolak Pengajuan"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Kartu({
  label,
  nilai,
  catatan,
  tone = "netral",
}: {
  label: string;
  nilai: string;
  catatan?: string;
  tone?: "netral" | "hijau" | "kuning";
}) {
  const cls = {
    netral: "bg-white border-slate-200 text-slate-900",
    hijau: "bg-[#E7F6F0] border-2 border-[#B2DFCC] text-[#085438]",
    kuning: "bg-[#FFF8DB] border-[#F3D56B] text-[#6E4B00]",
  }[tone];
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", cls)}>
      <div className="text-[11px] font-semibold opacity-80">{label}</div>
      <div className="text-base font-bold font-mono tabular-nums">{nilai}</div>
      {catatan && <div className="text-[10px] opacity-75">{catatan}</div>}
    </div>
  );
}
