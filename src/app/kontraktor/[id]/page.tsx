import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Info, MapPin } from "lucide-react";
import {
  evaluasiJikaKedaluwarsa,
  getDetailPenawaranKontraktor,
} from "@/lib/services/kuorum-service";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";
import { requireKontraktor } from "../_lib/require-kontraktor";
import { SlaCountdown } from "@/components/kuorum/SlaCountdown";
import { StatusVoteBadge, labelStatusTiket } from "../_components/StatusBadge";
import { FormResponPenawaran } from "../_components/FormResponPenawaran";

export default async function DetailPenawaranPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireKontraktor();
  const { id } = await params;

  // Cek kepemilikan dulu agar tiket milik PT lain tidak ikut dievaluasi dari sini.
  const awal = await getDetailPenawaranKontraktor(id, user.kontraktorId);
  if (!awal) notFound();
  const evaluasi = await evaluasiJikaKedaluwarsa(id);
  const detail = evaluasi ? await getDetailPenawaranKontraktor(id, user.kontraktorId) : awal;
  if (!detail) notFound();

  const { item, voteAktif } = detail;
  const status = labelStatusTiket(detail.statusTiket);
  const bisaRespon = detail.statusTiket === "PENDING_KONTRAKTOR" && voteAktif.statusVote === "MENUNGGU";

  return (
    <div className="space-y-5">
      <Link
        href="/kontraktor"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#005BAC]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke daftar penawaran
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-mono text-slate-500">{detail.nomorTiket}</span>
            <span className="px-1.5 py-px rounded bg-[#EAF3FB] text-[#003A70] font-semibold">{detail.namaDivisi}</span>
            {voteAktif.putaran > 1 && (
              <span className="px-1.5 py-px rounded bg-[#EFEBFD] text-[#362387] font-semibold">
                Putaran {voteAktif.putaran}
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-1">{item?.namaItem ?? "Item pekerjaan"}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-0.5">
            <span>{detail.namaCabang}</span>
            {detail.namaWilayah && (
              <span className="inline-flex items-center gap-1 text-[#6E4B00] font-semibold">
                <MapPin className="w-3 h-3" /> Harga khusus wilayah {detail.namaWilayah}
              </span>
            )}
          </div>
        </div>
        <span className={cn("text-xs font-bold", status.tone)}>{status.label}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Respon */}
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Respon Perusahaan Anda</h2>
            {bisaRespon ? (
              <FormResponPenawaran
                tiketId={detail.tiketId}
                hargaDitawarkan={detail.hargaDitawarkan}
                satuan={item?.satuan}
                bolehBanding={detail.bolehBanding}
              />
            ) : (
              <>
                <RingkasanVote vote={voteAktif} />
                {detail.statusTiket === "PENDING_KONTRAKTOR" && voteAktif.statusVote !== "MENUNGGU" && (
                  <p className="mt-3 text-[11px] text-slate-600">
                    Respon Anda sudah tercatat. Hasil kuorum ditetapkan setelah cukup rekanan merespons
                    atau batas waktu berakhir.
                  </p>
                )}
              </>
            )}
          </section>

          {/* Spesifikasi */}
          {item && (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide px-4 pt-4 pb-2">
                Spesifikasi Item Pekerjaan
              </h2>
              <p className="px-4 pb-3 text-xs text-slate-600">{item.deskripsi}</p>
              <dl className="grid grid-cols-2 sm:grid-cols-3 border-t border-slate-100 text-xs">
                {[
                  ["Kode master", item.kodeMaster],
                  ["Kategori", item.kategori],
                  ["Merk", item.merk],
                  ["Ukuran", item.ukuran],
                  ["Tipe", item.tipe],
                  ["Warna", item.warna],
                  ["Lokasi pekerjaan", item.lokasi],
                  ["Satuan", item.satuan],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="px-4 py-2.5 border-b border-r border-slate-100">
                      <dt className="text-[11px] text-slate-500">{k}</dt>
                      <dd className="font-semibold text-slate-900 font-mono break-words">{v}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          )}

          {detail.riwayatPutaran.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Riwayat Putaran Sebelumnya</h2>
              <div className="space-y-3">
                {detail.riwayatPutaran.map((v) => (
                  <div key={v.id} className="border border-slate-200 rounded-lg p-3">
                    <div className="text-[11px] font-semibold text-slate-500 mb-2">Putaran {v.putaran}</div>
                    <RingkasanVote vote={v} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Kolom kanan: harga & SLA (di layar kecil tampil paling atas, sebelum form respon) */}
        <aside className="space-y-4 order-first lg:order-none">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Harga ditawarkan</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {formatRupiah(detail.hargaDitawarkan)}
            </div>
            {item?.satuan && <div className="text-xs text-slate-500">per {item.satuan}</div>}
          </div>

          {detail.statusTiket === "PENDING_KONTRAKTOR" && detail.deadlineVoting && (
            <SlaCountdown deadline={detail.deadlineVoting} variant="full" />
          )}

          <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
            <Info className="w-4 h-4 text-[#005BAC] shrink-0" />
            <ul className="space-y-1 list-disc pl-3">
              <li>Harga resmi berlaku bila minimal 50% + 1 rekanan cabang menyetujui.</li>
              <li>Banding hanya dapat diajukan satu kali per penawaran.</li>
              <li>Tidak merespons sampai batas waktu dianggap tidak setuju, tanpa sanksi penonaktifan.</li>
              <li>Menolak dua putaran berturut-turut menonaktifkan sementara perusahaan Anda di cabang ini.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface VoteRingkas {
  statusVote: "MENUNGGU" | "SETUJU" | "TOLAK" | "TIMEOUT";
  usulanHarga: number | null;
  catatan: string | null;
  tanggalRespon: string | null;
  lampiranList: { id: string; namaFile: string; url: string; ukuranFile: string | null }[];
}

function RingkasanVote({ vote }: { vote: VoteRingkas }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <StatusVoteBadge status={vote.statusVote} isBanding={vote.usulanHarga !== null} />
        {vote.tanggalRespon && <span className="text-slate-500">{formatTanggal(vote.tanggalRespon)}</span>}
      </div>
      {vote.statusVote === "MENUNGGU" && (
        <p className="text-slate-600">Putaran ini sudah ditutup sebelum perusahaan Anda merespons.</p>
      )}
      {vote.usulanHarga !== null && (
        <div>
          <span className="text-slate-500">Harga usulan: </span>
          <span className="font-mono font-bold tabular-nums text-[#005BAC]">{formatRupiah(vote.usulanHarga)}</span>
        </div>
      )}
      {vote.catatan && <p className="text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-2">{vote.catatan}</p>}
      {vote.lampiranList.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {vote.lampiranList.map((l) => (
            <li key={l.id}>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 text-[11px] font-medium text-[#005BAC] hover:bg-[#EAF3FB]"
              >
                <FileText className="w-3.5 h-3.5" />
                {l.namaFile}
                {l.ukuranFile && <span className="text-slate-500">{l.ukuranFile}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
