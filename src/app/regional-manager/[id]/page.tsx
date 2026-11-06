import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import {
  AppLayoutShell,
  DetailSpesifikasiCard,
  PengajuanTimelineBar,
  RincianKalkulasiKoefisien,
  VotingKontraktorMonitorCard,
} from "@/components/global";
import { META_STATUS, StatusTiketBadge } from "@/components/pengajuan/StatusTiketBadge";
import { RiwayatAuditCard } from "@/components/pengajuan/RiwayatAuditCard";
import { SurveiPerKomponen } from "@/components/pengajuan/SurveiPerKomponen";
import { PerbandinganRegionalCard } from "@/components/regional-manager/PerbandinganRegionalCard";
import { KeputusanRegional } from "@/components/regional-manager/KeputusanRegional";
import { RingkasanBandingCard } from "@/components/pengajuan/RingkasanBandingCard";
import { getRingkasanBanding } from "@/lib/services/banding-service";
import { requireRolePage } from "@/lib/auth/require-role";
import { evaluasiJikaKedaluwarsa, getRingkasanKuorum } from "@/lib/services/kuorum-service";
import { getHargaBerlaku } from "@/lib/services/margin-service";
import { getPengajuanDetail } from "@/lib/services/pengajuan-service";
import { cekPrasyaratKuorum, getPerbandinganRegional } from "@/lib/services/regional-service";
import { cn, formatRupiah } from "@/lib/utils";
import { StatusPengajuanHarga } from "@/types";

const TAHAP_KUORUM: StatusPengajuanHarga[] = ["PENDING_KONTRAKTOR", "USULAN_KONTRAKTOR", "DITOLAK_KONTRAKTOR", "RELEASED"];

const INFO_STATUS: Partial<Record<StatusPengajuanHarga, string>> = {
  PENDING_KONTRAKTOR: "Kuorum rekanan sedang berjalan. Harga resmi terbit otomatis bila 50% + 1 rekanan setuju.",
  USULAN_KONTRAKTOR: "Kuorum tidak tercapai dan ada usulan banding rekanan. Menunggu evaluasi S&B Specialist.",
  PENDING_SB_SPECIALIST: "Tiket sedang dievaluasi ulang marginnya oleh S&B Specialist.",
  RELEASED: "Harga resmi sudah terbit di Katalog Master Harga.",
  DITOLAK: "Pengajuan ditutup permanen.",
};

export default async function DetailRegionalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRolePage(["REGIONAL_MANAGER"]);
  const { id } = await params;

  const awal = await getPengajuanDetail(user, id);
  if (!awal) notFound();
  // Tutup putaran voting yang SLA-nya lewat agar status yang ditinjau final.
  const dievaluasi = await evaluasiJikaKedaluwarsa(id);
  const detail = dievaluasi ? await getPengajuanDetail(user, id) : awal;
  if (!detail) notFound();

  const { item } = detail;
  const bisaPutus = item.status === "PENDING_REGIONAL_MGR" || item.status === "DITOLAK_KONTRAKTOR";
  const tahapKuorum = TAHAP_KUORUM.includes(item.status);
  const kembali =
    item.status === "PENDING_KONTRAKTOR"
      ? { href: "/regional-manager/monitoring-kuorum", label: "Monitoring Kuorum" }
      : { href: "/regional-manager", label: "Approval Layer 3" };

  const [perbandingan, hargaBerlaku, prasyarat, kuorum] = await Promise.all([
    getPerbandinganRegional({ masterItemId: detail.masterItemId, cabangId: item.cabangId }),
    getHargaBerlaku({
      masterItemId: detail.masterItemId,
      cabangId: item.cabangId,
      wilayahCabangId: item.wilayahCabangId ?? null,
      cakupanHarga: item.cakupanHarga,
    }),
    bisaPutus ? cekPrasyaratKuorum(id) : Promise.resolve(null),
    tahapKuorum ? getRingkasanKuorum(id) : Promise.resolve(null),
  ]);

  // totalHargaSatuan = hargaDitetapkanSNB bila sudah ada (lihat pengajuan-service).
  const hargaRekomendasi = item.totalHargaSatuan > 0 ? item.totalHargaSatuan : null;
  // Tiket kembali dari banding: tampilkan hasil voting putaran sebelumnya sebagai konteks.
  const bandingSebelumnya =
    item.status === "PENDING_REGIONAL_MGR" ? await getRingkasanBanding(id, hargaRekomendasi) : null;
  const pembanding =
    item.cakupanHarga === "KHUSUS_WILAYAH" && hargaBerlaku?.hargaWilayah != null
      ? { label: "Harga wilayah berlaku", harga: hargaBerlaku.hargaWilayah }
      : hargaBerlaku
        ? { label: "Harga induk berlaku", harga: hargaBerlaku.hargaInduk }
        : null;
  const selisihBerlaku = pembanding && hargaRekomendasi ? ((hargaRekomendasi - pembanding.harga) / pembanding.harga) * 100 : null;

  // Margin hanya untuk kategori yang benar-benar ada di resep (Alat selalu 0%).
  const adaKategori = (k: string) => item.koefisienItems.some((x) => x.kategori === k);
  const rincianMargin = (
    [
      ["upah", "UPAH", item.liveMarginUpah],
      ["material", "MATERIAL", item.liveMarginMaterial],
      ["bongkaran", "BONGKARAN", item.liveMarginBongkaran],
    ] as const
  )
    .filter(([, k]) => adaKategori(k))
    .map(([label, , v]) => `${label} ${v.toLocaleString("id-ID")}%`)
    .join(", ");

  const komponenSurvei = detail.rincian
    .filter((r) => r.wajibSurveiToko)
    .map((r) => ({ id: r.id, namaKomponen: r.namaKomponen, satuan: r.satuan, nilaiKoefisien: r.nilaiKoefisien, surveiList: r.surveiList }));

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[{ label: "Regional Manager" }, { label: kembali.label, href: kembali.href }, { label: item.noTiket }]}
    >
      <div className="space-y-5 pb-10">
        <Link href={kembali.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#005BAC]">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke {kembali.label}
        </Link>

        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-mono font-bold text-slate-700">{item.noTiket}</span>
              <StatusTiketBadge status={item.status} />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{item.namaItem}</h1>
            <p className="text-xs text-slate-600">
              {item.namaCabang}
              {item.namaWilayah ? ` · Wilayah ${item.namaWilayah}` : ""} · {item.namaDivisi}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Harga rekomendasi S&B</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">{formatRupiah(hargaRekomendasi)}</div>
            {detail.satuan && <div className="text-[11px] text-slate-500">per {detail.satuan}</div>}
          </div>
        </div>

        {/* Catatan keputusan terakhir sudah ditampilkan oleh PengajuanTimelineBar. */}
        <PengajuanTimelineBar item={item} />

        {/* Ringkasan rekomendasi */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kartu label="HPP (tanpa margin)" nilai={formatRupiah(item.totalHpp)} />
          <Kartu label="Harga rekomendasi" nilai={formatRupiah(hargaRekomendasi)} tone="hijau" />
          <Kartu
            label="Margin efektif S&B"
            nilai={item.totalHpp > 0 && hargaRekomendasi ? `${((hargaRekomendasi / item.totalHpp - 1) * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%` : "-"}
            catatan={rincianMargin}
          />
          {pembanding && selisihBerlaku !== null ? (
            <Kartu
              label={pembanding.label}
              nilai={formatRupiah(pembanding.harga)}
              catatan={`rekomendasi ${selisihBerlaku >= 0 ? "+" : ""}${selisihBerlaku.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`}
              tone={Math.abs(selisihBerlaku) > 10 ? "kuning" : "netral"}
            />
          ) : (
            <Kartu label="Harga berlaku saat ini" nilai="Belum ada" catatan="item baru di cabang ini" />
          )}
        </div>

        <PerbandinganRegionalCard data={perbandingan} hargaRekomendasi={hargaRekomendasi} namaCabangTiket={item.namaCabang ?? "-"} />

        {kuorum && kuorum.votingKontraktorList.length > 0 && (
          <VotingKontraktorMonitorCard votingList={kuorum.votingKontraktorList} deadlineVoting={kuorum.deadlineVoting} />
        )}

        {bandingSebelumnya && bandingSebelumnya.jumlahBanding > 0 && (
          <RingkasanBandingCard data={bandingSebelumnya} judul="Hasil Voting Putaran Sebelumnya" />
        )}

        {bisaPutus && prasyarat ? (
          <KeputusanRegional
            tiketId={item.id}
            status={item.status as "PENDING_REGIONAL_MGR" | "DITOLAK_KONTRAKTOR"}
            hargaRekomendasi={hargaRekomendasi}
            satuan={detail.satuan}
            rekananAktif={prasyarat.rekananAktif}
            masalah={prasyarat.masalah}
          />
        ) : (
          <div className="flex items-start gap-2 bg-[#EAF3FB] border border-[#B8D8F3] rounded-xl p-3 text-xs text-[#003A70]">
            <Info className="w-4 h-4 shrink-0 mt-px" />
            <div>
              <span className="font-bold block">{META_STATUS[item.status].label}</span>
              {INFO_STATUS[item.status] ?? "Tidak ada tindakan Regional Manager pada tahap ini."}
            </div>
          </div>
        )}

        <DetailSpesifikasiCard item={item} />
        <SurveiPerKomponen komponen={komponenSurvei} />
        {item.koefisienItems.length > 0 && (
          <RincianKalkulasiKoefisien
            koefisienItems={item.koefisienItems}
            mode="readonly"
            liveMarginUpah={item.liveMarginUpah}
            liveMarginMaterial={item.liveMarginMaterial}
            liveMarginBongkaran={item.liveMarginBongkaran}
          />
        )}
        <RiwayatAuditCard riwayat={detail.riwayat} />
      </div>
    </AppLayoutShell>
  );
}

function Kartu({ label, nilai, catatan, tone = "netral" }: { label: string; nilai: string; catatan?: string; tone?: "netral" | "hijau" | "kuning" }) {
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
