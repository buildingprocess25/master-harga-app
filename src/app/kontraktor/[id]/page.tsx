import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Coins,
  FileText,
  Info,
  MapPin,
} from "lucide-react";
import {
  evaluasiJikaKedaluwarsa,
  getDetailPenawaranKontraktor,
} from "@/lib/services/kuorum-service";
import { cn, formatRupiah, formatTanggal } from "@/lib/utils";
import { requireKontraktor } from "../_lib/require-kontraktor";
import { SlaCountdown } from "@/components/kuorum/SlaCountdown";
import { StatusVoteBadge, labelStatusTiket } from "../_components/StatusBadge";
import { FormResponPenawaran } from "../_components/FormResponPenawaran";
import { PengajuanTimelineBar } from "@/components/global/PengajuanTimelineBar";
import { DetailSpesifikasiCard } from "@/components/global/DetailSpesifikasiCard";
import { PengajuanHargaItem } from "@/types";

export default async function DetailPenawaranPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireKontraktor();
  const { id } = await params;

  // Cek kepemilikan penawaran untuk PT kontraktor
  const awal = await getDetailPenawaranKontraktor(id, user.kontraktorId);
  if (!awal) notFound();
  const evaluasi = await evaluasiJikaKedaluwarsa(id);
  const detail = evaluasi
    ? await getDetailPenawaranKontraktor(id, user.kontraktorId)
    : awal;
  if (!detail) notFound();

  const { item, voteAktif } = detail;
  const status = labelStatusTiket(detail.statusTiket);
  const bisaRespon =
    detail.statusTiket === "PENDING_KONTRAKTOR" &&
    voteAktif.statusVote === "MENUNGGU";

  // Bentuk item untuk PengajuanTimelineBar dan DetailSpesifikasiCard
  const timelineItem: PengajuanHargaItem = {
    id: detail.tiketId,
    noTiket: detail.nomorTiket,
    kodeItem: item?.kodeMaster || detail.nomorTiket,
    namaItem: item?.namaItem || "Item Pekerjaan",
    kategori: item?.kategori || "Pekerjaan Standar",
    merk: item?.merk ?? undefined,
    tipe: item?.tipe ?? undefined,
    ukuran: item?.ukuran ?? undefined,
    warna: item?.warna ?? undefined,
    lokasi: item?.lokasi ?? undefined,
    satuan: item?.satuan ?? undefined,
    divisiId: "",
    namaDivisi: detail.namaDivisi,
    cabangId: "",
    namaCabang: detail.namaCabang,
    cakupanHarga: detail.cakupanHarga as any,
    namaWilayah: detail.namaWilayah,
    status: detail.statusTiket,
    tanggalPengajuan: "",
    surveiTokoList: [],
    koefisienItems: [],
    liveMarginUpah: 8,
    liveMarginMaterial: 8,
    liveMarginBongkaran: 8,
    totalHpp: detail.hargaDitawarkan || 0,
    totalHargaSatuan: detail.hargaDitawarkan || 0,
    deadlineVoting: detail.deadlineVoting || undefined,
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Navigasi Atas & Status Ringkas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-slate-200">
        <Link
          href="/kontraktor"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#005BAC] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Penawaran</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Cabang:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#005BAC] text-white">
            <Building2 className="w-3.5 h-3.5" />
            <span>{detail.namaCabang}</span>
          </span>
          {voteAktif.putaran > 1 && (
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-purple-700 text-white">
              Putaran {voteAktif.putaran}
            </span>
          )}
        </div>
      </div>

      {/* Stepper Timeline Siklus Hidup */}
      <PengajuanTimelineBar item={timelineItem} className="shadow-2xs" />

      {/* Kartu Ringkasan Harga Ditawarkan & SLA Timer */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#005BAC] text-white flex items-center justify-center font-bold shrink-0">
            <Coins className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Harga Satuan yang Ditawarkan
            </span>
            <h2 className="text-xl md:text-2xl font-black text-[#005BAC] font-mono tabular-nums">
              {formatRupiah(detail.hargaDitawarkan)}
              {item?.satuan && (
                <span className="text-xs font-sans font-bold text-slate-500 ml-1">
                  / {item.satuan}
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {detail.statusTiket === "PENDING_KONTRAKTOR" && detail.deadlineVoting && (
            <div className="bg-white border-2 border-slate-300 px-3.5 py-2 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Batas Waktu Respon
              </span>
              <SlaCountdown deadline={detail.deadlineVoting} />
            </div>
          )}

          <div className="bg-white border-2 border-slate-300 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
              Status Tiket
            </span>
            <span className={cn("inline-block px-2.5 py-0.5 rounded-lg text-xs font-black shadow-2xs", status.badge)}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Detail Spesifikasi Pekerjaan */}
      <DetailSpesifikasiCard item={timelineItem} />

      {/* Panel Form Respon Perusahaan */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
            Respon Perusahaan Anda
          </h3>
          <span className="text-xs font-semibold text-slate-600">
            {user.namaPerusahaanKontraktor}
          </span>
        </div>

        {bisaRespon ? (
          <FormResponPenawaran
            tiketId={detail.tiketId}
            hargaDitawarkan={detail.hargaDitawarkan}
            satuan={item?.satuan}
            bolehBanding={detail.bolehBanding}
          />
        ) : (
          <div className="space-y-3">
            <RingkasanVote vote={voteAktif} />
            {detail.statusTiket === "PENDING_KONTRAKTOR" &&
              voteAktif.statusVote !== "MENUNGGU" && (
                <p className="text-xs text-slate-600 bg-slate-50 border-2 border-slate-200 rounded-xl p-3">
                  Respon perusahaan Anda sudah tersimpan. Keputusan kuorum akan
                  ditetapkan setelah rekanan lainnya merespons atau batas waktu berakhir.
                </p>
              )}
          </div>
        )}
      </div>

      {/* Riwayat Putaran Sebelumnya jika ada */}
      {detail.riwayatPutaran.length > 0 && (
        <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
            Riwayat Putaran Sebelumnya
          </h3>
          <div className="space-y-2">
            {detail.riwayatPutaran.map((v) => (
              <div
                key={v.id}
                className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50"
              >
                <div className="text-[11px] font-bold text-slate-500 mb-2">
                  Putaran {v.putaran}
                </div>
                <RingkasanVote vote={v} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface VoteRingkas {
  statusVote: "MENUNGGU" | "SETUJU" | "TOLAK" | "TIMEOUT";
  usulanHarga: number | null;
  catatan: string | null;
  tanggalRespon: string | null;
  lampiranList: {
    id: string;
    namaFile: string;
    url: string;
    ukuranFile: string | null;
  }[];
}

function RingkasanVote({ vote }: { vote: VoteRingkas }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <StatusVoteBadge
          status={vote.statusVote}
          isBanding={vote.usulanHarga !== null}
        />
        {vote.tanggalRespon && (
          <span className="text-slate-500 font-semibold">
            {formatTanggal(vote.tanggalRespon)}
          </span>
        )}
      </div>

      {vote.statusVote === "MENUNGGU" && (
        <p className="text-slate-600">
          Putaran ini telah ditutup sebelum perusahaan Anda memberikan respon.
        </p>
      )}

      {vote.usulanHarga !== null && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
          <span className="text-slate-600 font-bold block mb-0.5">
            Usulan Harga Banding:
          </span>
          <span className="font-mono font-black text-sm text-[#005BAC]">
            {formatRupiah(vote.usulanHarga)}
          </span>
        </div>
      )}

      {vote.catatan && (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3">
          <span className="text-[11px] text-slate-500 font-bold block mb-1">
            Catatan:
          </span>
          <p className="text-slate-800 font-medium whitespace-pre-wrap">
            {vote.catatan}
          </p>
        </div>
      )}

      {vote.lampiranList.length > 0 && (
        <div className="space-y-1 pt-1">
          <span className="text-[11px] text-slate-500 font-bold block">
            Berkas Lampiran:
          </span>
          <ul className="flex flex-wrap gap-2">
            {vote.lampiranList.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-200 text-xs font-bold text-[#005BAC] bg-white hover:bg-slate-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{l.namaFile}</span>
                  {l.ukuranFile && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {l.ukuranFile}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
