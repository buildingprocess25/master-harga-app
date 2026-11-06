import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, FileText, History, RotateCcw, XCircle } from "lucide-react";
import { AppLayoutShell, PengajuanTimelineBar } from "@/components/global";
import { DetailSpesifikasi } from "@/components/global/DetailSpesifikasi";
import { SlaCountdown } from "@/components/kuorum/SlaCountdown";
import { evaluasiJikaKedaluwarsa, getDetailPenawaranKontraktor } from "@/lib/services/kuorum-service";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";
import { requireKontraktor } from "../_lib/require-kontraktor";
import { detailKeItem } from "../_lib/peta-item";
import { StatusVoteBadge, labelStatusTiket } from "../_components/StatusBadge";
import { FormResponPenawaran } from "../_components/FormResponPenawaran";
import { RingkasanHargaSatuan } from "../_components/RingkasanHargaSatuan";

export default async function DetailPenawaranPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireKontraktor();
  const { id } = await params;

  // Cek kepemilikan dulu agar tiket milik PT lain tidak ikut dievaluasi dari sini.
  const awal = await getDetailPenawaranKontraktor(id, user.kontraktorId);
  if (!awal) notFound();
  const evaluasi = await evaluasiJikaKedaluwarsa(id);
  const detail = evaluasi ? await getDetailPenawaranKontraktor(id, user.kontraktorId) : awal;
  if (!detail) notFound();

  const { voteAktif } = detail;
  const item = { ...detailKeItem(detail), tanggalPengajuan: formatTanggal(detail.tanggalPengajuan) };
  const status = labelStatusTiket(detail.statusTiket);
  const votingBerjalan = detail.statusTiket === "PENDING_KONTRAKTOR";
  const bisaRespon = votingBerjalan && voteAktif.statusVote === "MENUNGGU";
  const sudahRespon = voteAktif.statusVote === "SETUJU" || voteAktif.statusVote === "TOLAK";
  const namaPerusahaan = user.namaPerusahaanKontraktor ?? "Perusahaan Anda";

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "Portal Rekanan", href: "/kontraktor" },
        { label: bisaRespon ? "Penawaran Aktif" : "Riwayat Voting", href: bisaRespon ? "/kontraktor" : "/kontraktor/riwayat" },
        { label: detail.nomorTiket },
      ]}
    >
      <div className="max-w-5xl mx-auto space-y-5">
        <Link
          href={bisaRespon ? "/kontraktor" : "/kontraktor/riwayat"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#005BAC]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke daftar penawaran
        </Link>

        <PengajuanTimelineBar item={item} />

        {/* Status penawaran untuk perusahaan yang login & batas waktu SLA */}
        <section className="bg-white rounded-2xl p-4 md:p-5 border-2 border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-[#EAF3FB] border-2 border-[#B8D8F3] flex items-center justify-center text-[#005BAC] shrink-0">
                <Building2 className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-800 truncate">{namaPerusahaan}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px]">
                  <span className="font-mono text-slate-500">{detail.nomorTiket}</span>
                  <span className="px-1.5 py-px rounded bg-[#EAF3FB] text-[#003A70] font-semibold">{detail.namaDivisi}</span>
                  {voteAktif.putaran > 1 && (
                    <span className="px-1.5 py-px rounded bg-[#EFEBFD] text-[#362387] font-semibold">
                      Putaran {voteAktif.putaran}
                    </span>
                  )}
                  <StatusVoteBadge status={voteAktif.statusVote} isBanding={voteAktif.usulanHarga !== null} />
                  <span className={cn("font-bold", status.tone)}>{status.label}</span>
                </div>
              </div>
            </div>
            {votingBerjalan && detail.deadlineVoting && (
              <SlaCountdown deadline={detail.deadlineVoting} variant="full" className="sm:w-64" />
            )}
          </div>
        </section>

        <DetailSpesifikasi item={item} showDeskripsi />

        <RingkasanHargaSatuan
          hargaDitawarkan={detail.hargaDitawarkan}
          satuan={detail.item?.satuan}
          ringkasan={detail.ringkasanKomponen}
          namaWilayah={detail.namaWilayah}
        />

        {sudahRespon && <BannerRespon vote={voteAktif} namaPerusahaan={namaPerusahaan} votingBerjalan={votingBerjalan} />}

        {!votingBerjalan && <BannerStatusAkhir status={detail.statusTiket} belumRespon={voteAktif.statusVote === "MENUNGGU"} />}

        {bisaRespon && (
          <FormResponPenawaran
            tiketId={detail.tiketId}
            namaPerusahaan={namaPerusahaan}
            hargaDitawarkan={detail.hargaDitawarkan}
            satuan={detail.item?.satuan}
            bolehBanding={detail.bolehBanding}
          />
        )}

        {detail.riwayatPutaran.length > 0 && (
          <section className="bg-white rounded-2xl border-2 border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-[#005BAC]" />
              Riwayat Putaran Sebelumnya
            </h2>
            <div className="space-y-3">
              {detail.riwayatPutaran.map((v) => (
                <div key={v.id} className="border-2 border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-500 mb-2">Putaran {v.putaran}</div>
                  <RingkasanVote vote={v} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayoutShell>
  );
}

interface VoteRingkas {
  statusVote: "MENUNGGU" | "SETUJU" | "TOLAK" | "TIMEOUT";
  usulanHarga: number | null;
  catatan: string | null;
  tanggalRespon: string | null;
  lampiranList: { id: string; namaFile: string; url: string; ukuranFile: string | null }[];
}

function BannerRespon({
  vote,
  namaPerusahaan,
  votingBerjalan,
}: {
  vote: VoteRingkas;
  namaPerusahaan: string;
  votingBerjalan: boolean;
}) {
  const setuju = vote.statusVote === "SETUJU";
  const banding = vote.usulanHarga !== null;
  const tanggal = vote.tanggalRespon ? formatTanggal(vote.tanggalRespon) : "baru saja";
  return (
    <div
      className={cn(
        "rounded-2xl p-4 border-2 flex items-start gap-3",
        setuju
          ? "bg-[#E7F6F0] border-[#B2DFCC] text-[#085438]"
          : banding
            ? "bg-[#FFF8DB] border-[#F3D56B] text-[#6E4B00]"
            : "bg-[#FDECEE] border-[#F7C1C5] text-[#990F14]"
      )}
    >
      <span className="w-8 h-8 rounded-xl bg-white/70 border-2 border-current/20 flex items-center justify-center shrink-0">
        {setuju ? <CheckCircle2 className="w-4 h-4" /> : banding ? <RotateCcw className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      </span>
      <div className="space-y-1.5 min-w-0">
        <h3 className="text-sm font-bold">
          {setuju ? "Persetujuan Tercatat" : banding ? "Usulan Harga Tercatat" : "Penolakan Tercatat"} ({namaPerusahaan})
        </h3>
        <p className="text-xs leading-relaxed">
          {setuju
            ? `Perusahaan Anda menyetujui penawaran harga satuan ini pada ${tanggal}.`
            : banding
              ? `Perusahaan Anda mengajukan harga baru ${formatRupiah(vote.usulanHarga)} pada ${tanggal}. Usulan ditinjau oleh tim S&B Specialist.`
              : `Perusahaan Anda menolak penawaran ini pada ${tanggal}.`}
          {votingBerjalan && " Hasil kuorum ditetapkan setelah cukup rekanan merespons atau batas waktu berakhir."}
        </p>
        <RingkasanVote vote={vote} ringkas />
      </div>
    </div>
  );
}

function BannerStatusAkhir({ status, belumRespon }: { status: string; belumRespon: boolean }) {
  const isi =
    status === "RELEASED"
      ? { judul: "Harga Resmi Berlaku", teks: "Kuorum 50% + 1 rekanan tercapai. Harga ini sudah tercatat di katalog harga resmi cabang.", ok: true }
      : status === "DITOLAK_KONTRAKTOR"
        ? { judul: "Kuorum Tidak Tercapai", teks: "Mayoritas rekanan tidak menyetujui harga ini. Penawaran ditinjau ulang oleh tim internal Alfamart.", ok: false }
        : status === "DITOLAK"
          ? { judul: "Penawaran Dibatalkan", teks: "Penawaran harga ini ditutup dan tidak dilanjutkan.", ok: false }
          : { judul: "Ditinjau Ulang Internal", teks: "Penawaran sedang ditinjau ulang oleh tim internal. Anda akan menerima penawaran baru bila putaran voting dibuka kembali.", ok: true };
  return (
    <div
      className={cn(
        "rounded-2xl p-4 border-2 flex items-start gap-3",
        isi.ok ? "bg-[#EAF3FB] border-[#B8D8F3] text-[#003A70]" : "bg-[#FDECEE] border-[#F7C1C5] text-[#990F14]"
      )}
    >
      {isi.ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
      <div className="space-y-1">
        <h3 className="text-sm font-bold">{isi.judul}</h3>
        <p className="text-xs leading-relaxed">
          {isi.teks}
          {belumRespon && " Putaran ini ditutup sebelum perusahaan Anda merespons."}
        </p>
      </div>
    </div>
  );
}

function RingkasanVote({ vote, ringkas }: { vote: VoteRingkas; ringkas?: boolean }) {
  return (
    <div className="space-y-2 text-xs">
      {!ringkas && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusVoteBadge status={vote.statusVote} isBanding={vote.usulanHarga !== null} />
          {vote.tanggalRespon && <span className="text-slate-500">{formatTanggal(vote.tanggalRespon)}</span>}
        </div>
      )}
      {!ringkas && vote.statusVote === "MENUNGGU" && (
        <p className="text-slate-600">Putaran ini sudah ditutup sebelum perusahaan Anda merespons.</p>
      )}
      {!ringkas && vote.usulanHarga !== null && (
        <div>
          <span className="text-slate-500">Harga usulan: </span>
          <span className="font-mono font-bold tabular-nums text-[#005BAC]">{formatRupiah(vote.usulanHarga)}</span>
        </div>
      )}
      {vote.catatan && (
        <p className="text-slate-700 italic bg-white/80 border-2 border-slate-200 rounded-lg p-2.5">&ldquo;{vote.catatan}&rdquo;</p>
      )}
      {vote.lampiranList.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {vote.lampiranList.map((l) => (
            <li key={l.id}>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 border-slate-200 bg-white text-[11px] font-medium text-[#005BAC] hover:bg-[#EAF3FB]"
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
