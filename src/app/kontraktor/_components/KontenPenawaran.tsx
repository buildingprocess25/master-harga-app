import { AlertTriangle, Hammer, Info } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import {
  evaluasiJikaKedaluwarsa,
  getCabangParkedKontraktor,
  getPenawaranKontraktor,
} from "@/lib/services/kuorum-service";
import { cn, formatTanggal } from "@/lib/utils";
import { requireKontraktor } from "../_lib/require-kontraktor";
import { TabelPenawaran, type ModePenawaran } from "./TabelPenawaran";

/** Isi halaman Penawaran Aktif (/kontraktor) dan Riwayat Voting (/kontraktor/riwayat). */
export async function KontenPenawaran({ mode }: { mode: ModePenawaran }) {
  const user = await requireKontraktor();

  let penawaran = await getPenawaranKontraktor(user.kontraktorId);

  // Tutup putaran yang SLA-nya sudah lewat agar status yang tampil final.
  const sekarang = new Date();
  const kedaluwarsa = penawaran.filter(
    (p) => p.statusTiket === "PENDING_KONTRAKTOR" && p.deadlineVoting && new Date(p.deadlineVoting) < sekarang
  );
  if (kedaluwarsa.length > 0) {
    for (const p of kedaluwarsa) await evaluasiJikaKedaluwarsa(p.tiketId);
    penawaran = await getPenawaranKontraktor(user.kontraktorId);
  }

  const perluRespon = penawaran.filter((p) => p.statusTiket === "PENDING_KONTRAKTOR" && p.statusVote === "MENUNGGU");
  const riwayat = penawaran.filter((p) => !perluRespon.includes(p));
  const resmi = penawaran.filter((p) => p.statusTiket === "RELEASED").length;
  const cabangParked = await getCabangParkedKontraktor(user.kontraktorId);

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "Portal Rekanan", href: "/kontraktor" },
        { label: mode === "aktif" ? "Penawaran Aktif" : "Riwayat Voting" },
      ]}
    >
      <HeaderHalaman
        icon={Hammer}
        judul="Portal Kontraktor"
        deskripsi="Konfirmasi dan kesepakatan harga satuan yang ditetapkan Alfamart untuk cabang tempat perusahaan Anda terdaftar. Berikan respon sebelum batas waktu 3x24 jam berakhir."
        aksi={
          <div className="flex flex-wrap gap-2">
            <Metrik label="Perlu Konfirmasi" nilai={perluRespon.length} kelas="text-[#B45309]" />
            <Metrik label="Riwayat Keputusan" nilai={riwayat.length} kelas="text-slate-800" />
            <Metrik label="Harga Resmi" nilai={resmi} kelas="text-[#0F8A5F]" />
          </div>
        }
      />

      {cabangParked.length > 0 && (
        <div className="rounded-xl border-2 border-[#F7C1C5] bg-[#FDECEE] p-4 text-xs text-[#990F14]">
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Perusahaan Anda dinonaktifkan sementara di {cabangParked.length} cabang
          </div>
          <ul className="mt-1.5 space-y-1 pl-5 list-disc">
            {cabangParked.map((c) => (
              <li key={c.relasiId}>
                <span className="font-semibold">{c.namaCabang}</span> ({c.namaDivisi})
                {c.parkedAt && <> sejak {formatTanggal(c.parkedAt)}</>}
                {c.alasanParked && <>: {c.alasanParked}</>}
              </li>
            ))}
          </ul>
          <p className="mt-1.5">
            Selama nonaktif, perusahaan Anda tidak diundang pada penawaran baru di cabang tersebut. Silakan hubungi tim
            S&B Controlling atau Regional Manager untuk mediasi.
          </p>
        </div>
      )}

      <TabelPenawaran
        mode={mode}
        baris={mode === "aktif" ? perluRespon : riwayat}
        jumlahAktif={perluRespon.length}
        jumlahRiwayat={riwayat.length}
      />

      <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-white border-2 border-slate-200 rounded-xl p-3">
        <Info className="w-4 h-4 text-[#005BAC] shrink-0" />
        <p>
          Harga resmi berlaku bila minimal 50% + 1 rekanan di cabang tersebut menyetujui. Setiap rekanan dapat mengajukan
          harga baru (banding) satu kali per penawaran. Menolak dua putaran berturut-turut akan menonaktifkan sementara
          keikutsertaan perusahaan Anda di cabang tersebut.
        </p>
      </div>
    </AppLayoutShell>
  );
}

function Metrik({ label, nilai, kelas }: { label: string; nilai: number; kelas: string }) {
  return (
    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-center min-w-24">
      <span className="text-[11px] text-slate-500 font-semibold block">{label}</span>
      <span className={cn("text-lg font-bold font-mono tabular-nums", kelas)}>{nilai}</span>
    </div>
  );
}
