import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import {
  AppLayoutShell,
  DetailSpesifikasiCard,
  PengajuanTimelineBar,
  RincianKalkulasiKoefisien,
} from "@/components/global";
import { StatusTiketBadge, META_STATUS } from "@/components/pengajuan/StatusTiketBadge";
import { RiwayatAuditCard } from "@/components/pengajuan/RiwayatAuditCard";
import { MasteringWorkspace } from "@/components/sb-specialist/MasteringWorkspace";
import { EvaluasiMarginWorkspace } from "@/components/sb-specialist/EvaluasiMarginWorkspace";
import { SurveiPerKomponen } from "@/components/pengajuan/SurveiPerKomponen";
import { getHargaBerlaku, hargaAcuanEfektif, marginTersimpan } from "@/lib/services/margin-service";
import { getRingkasanBanding } from "@/lib/services/banding-service";
import { getPerbandinganRegional } from "@/lib/services/regional-service";
import { evaluasiJikaKedaluwarsa } from "@/lib/services/kuorum-service";
import { RingkasanBandingCard } from "@/components/pengajuan/RingkasanBandingCard";
import { PerbandinganRegionalCard } from "@/components/regional-manager/PerbandinganRegionalCard";
import { KeputusanBanding } from "@/components/sb-specialist/KeputusanBanding";
import { requireRolePage } from "@/lib/auth/require-role";
import { cariKoefisien } from "@/lib/services/ahsp-service";
import { getPengajuanDetail } from "@/lib/services/pengajuan-service";
import { StatusPengajuanHarga } from "@/types";

/** Keterangan untuk status yang tidak memerlukan tindakan S&B di halaman ini. */
const INFO_STATUS: Partial<Record<StatusPengajuanHarga, string>> = {
  PERLU_REVISI: "Tiket dikembalikan untuk revisi. Menunggu pengaju memperbaiki dan mengirim ulang.",
  SIAP_SURVEI: "Resep AHSP sudah dikunci. Menunggu Building Coordinator melakukan survei 3 toko.",
  RETURNED_TO_BC: "Hasil survei dikembalikan ke Building Coordinator untuk diperbaiki.",
  PENDING_BM_MGR: "Survei selesai. Menunggu review B&M Manager (Layer 1).",
  PENDING_SB_SPECIALIST: "Survei sudah disetujui BM. Tiket siap dievaluasi margin oleh S&B Specialist.",
  PENDING_REGIONAL_MGR: "Rekomendasi harga sudah dikirim. Menunggu persetujuan Regional Manager.",
  PENDING_KONTRAKTOR: "Harga sedang ditawarkan ke rekanan kontraktor (kuorum 50% + 1).",
  USULAN_KONTRAKTOR: "Ada usulan banding dari rekanan kontraktor yang perlu dievaluasi S&B.",
  DITOLAK_KONTRAKTOR: "Kuorum rekanan tidak tercapai. Menunggu keputusan Regional Manager.",
  DITOLAK: "Pengajuan ditutup permanen.",
  RELEASED: "Harga resmi sudah terbit di Katalog Master Harga.",
};

export default async function DetailMasteringPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  const { id } = await params;
  const awal = await getPengajuanDetail(user, id);
  if (!awal) notFound();
  // Putaran voting yang SLA-nya lewat ditutup dulu (setelah cek cakupan) agar status yang tampil final.
  const dievaluasi = awal.item.status === "PENDING_KONTRAKTOR" ? await evaluasiJikaKedaluwarsa(id) : null;
  const detail = dievaluasi ? await getPengajuanDetail(user, id) : awal;
  if (!detail) notFound();

  const { item } = detail;
  const bisaMastering = item.status === "DIAJUKAN";
  const bisaEvaluasi = item.status === "PENDING_SB_SPECIALIST";
  const opsiKoefisien = bisaMastering ? await cariKoefisien({ divisiId: detail.divisiId }) : [];

  const bisaBanding = item.status === "USULAN_KONTRAKTOR";

  // Tautan kembali mengikuti antrean tempat tiket berada pada tahapnya.
  const tahapMargin = ["PENDING_SB_SPECIALIST", "PENDING_REGIONAL_MGR"].includes(item.status);
  const tahapRekanan = ["USULAN_KONTRAKTOR", "PENDING_KONTRAKTOR"].includes(item.status);
  const kembali = tahapRekanan
    ? { href: "/sb-specialist/banding-rekanan", label: "Banding Kontraktor" }
    : tahapMargin
      ? { href: "/sb-specialist/evaluasi-margin", label: "Evaluasi Live Margin" }
      : { href: "/sb-specialist", label: "Mastering AHSP" };

  // Hasil voting putaran terakhir: dievaluasi saat banding, dan jadi konteks saat revisi margin.
  const tampilBanding = bisaBanding || bisaEvaluasi || item.status === "PENDING_KONTRAKTOR";
  const ringkasanBanding = tampilBanding ? await getRingkasanBanding(id, item.totalHargaSatuan || null) : null;
  const perbandingan = bisaBanding
    ? await getPerbandinganRegional({ masterItemId: detail.masterItemId, cabangId: item.cabangId })
    : null;

  const komponenSurvei = detail.rincian
    .filter((r) => r.wajibSurveiToko)
    .map((r) => ({ id: r.id, namaKomponen: r.namaKomponen, satuan: r.satuan, nilaiKoefisien: r.nilaiKoefisien, surveiList: r.surveiList }));
  const adaSurvei = komponenSurvei.some((k) => k.surveiList.length > 0);

  const komponenEvaluasi = bisaEvaluasi
    ? detail.rincian.map((r) => {
        const ef = hargaAcuanEfektif({
          wajibSurveiToko: r.wajibSurveiToko,
          hargaAcuanSatuan: r.hargaAcuanSatuan,
          hargaSurvei: r.surveiList.map((s) => s.harga),
        });
        return {
          id: r.id,
          namaKomponen: r.namaKomponen,
          kategori: r.kategori,
          satuan: r.satuan,
          koefisien: r.nilaiKoefisien,
          hargaAcuan: ef.harga,
          sumber: ef.sumber,
          jumlahToko: ef.stat?.jumlah ?? 0,
          sebaranPersen: ef.stat?.sebaranPersen ?? null,
        };
      })
    : [];
  const hargaBerlaku = bisaEvaluasi
    ? await getHargaBerlaku({
        masterItemId: detail.masterItemId,
        cabangId: item.cabangId,
        wilayahCabangId: item.wilayahCabangId ?? null,
        cakupanHarga: item.cakupanHarga,
      })
    : null;
  const pembanding =
    hargaBerlaku && item.cakupanHarga === "KHUSUS_WILAYAH" && hargaBerlaku.hargaWilayah !== null
      ? { harga: hargaBerlaku.hargaWilayah, label: "Harga wilayah berlaku", berlakuSejak: hargaBerlaku.berlakuSejak }
      : hargaBerlaku
        ? { harga: hargaBerlaku.hargaInduk, label: "Harga induk berlaku", berlakuSejak: hargaBerlaku.berlakuSejak }
        : null;

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[{ label: "S&B Specialist" }, { label: kembali.label, href: kembali.href }, { label: item.noTiket }]}
    >
      <div className="space-y-5 pb-10">
        <Link
          href={kembali.href}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#005BAC]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke {kembali.label}
        </Link>

        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-mono font-bold text-slate-700">{item.noTiket}</span>
              <StatusTiketBadge status={item.status} />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{item.namaItem}</h1>
            <p className="text-xs text-slate-600">
              {item.namaCabang}
              {item.namaWilayah ? ` · Wilayah ${item.namaWilayah}` : ""} · {item.namaDivisi}
              {detail.pembuat ? ` · diajukan oleh ${detail.pembuat}` : ""}
            </p>
          </div>
        </div>

        {/* Catatan keputusan terakhir sudah ditampilkan oleh PengajuanTimelineBar. */}
        <PengajuanTimelineBar item={item} />
        <DetailSpesifikasiCard item={item} />

        {ringkasanBanding && (bisaBanding || (bisaEvaluasi && ringkasanBanding.jumlahBanding > 0)) && (
          <RingkasanBandingCard
            data={ringkasanBanding}
            judul={bisaBanding ? "Usulan Banding Rekanan" : "Hasil Voting Putaran Sebelumnya"}
          />
        )}
        {ringkasanBanding && item.status === "PENDING_KONTRAKTOR" && (
          <RingkasanBandingCard data={ringkasanBanding} judul="Voting Rekanan Berjalan" />
        )}
        {bisaBanding && (
          <>
            <PerbandinganRegionalCard
              data={perbandingan}
              hargaRekomendasi={item.totalHargaSatuan || null}
              namaCabangTiket={item.namaCabang ?? "-"}
            />
            <KeputusanBanding
              tiketId={item.id}
              hargaDitawarkan={item.totalHargaSatuan || null}
              usulanRata={ringkasanBanding?.usulanRata ?? null}
            />
          </>
        )}

        {adaSurvei && <SurveiPerKomponen komponen={komponenSurvei} />}

        {bisaEvaluasi ? (
          <EvaluasiMarginWorkspace
            tiketId={item.id}
            komponen={komponenEvaluasi}
            marginAwal={marginTersimpan(detail.rincian, detail.marginAwalPersen)}
            satuan={detail.satuan}
            hargaBerlaku={pembanding}
          />
        ) : bisaMastering ? (
          <MasteringWorkspace
            tiketId={item.id}
            divisiId={detail.divisiId}
            marginAwal={detail.marginAwalPersen}
            opsiKoefisien={opsiKoefisien}
            barisAwal={detail.rincian.map((r) => ({
              masterKoefisienId: r.masterKoefisienId,
              namaKomponen: r.namaKomponen,
              kategori: r.kategori,
              satuan: r.satuan,
              wajibSurveiToko: r.wajibSurveiToko,
              nilaiKoefisien: r.nilaiKoefisien,
              hargaAcuanSatuan: r.hargaAcuanSatuan,
            }))}
          />
        ) : (
          <>
            <div className="flex items-start gap-2 bg-[#EAF3FB] border border-[#B8D8F3] rounded-xl p-3 text-xs text-[#003A70]">
              <Info className="w-4 h-4 shrink-0 mt-px" />
              <div>
                <span className="font-bold block">{META_STATUS[item.status].label}</span>
                {INFO_STATUS[item.status] ?? "Tidak ada tindakan S&B pada tahap ini."}
              </div>
            </div>
            {item.koefisienItems.length > 0 && (
              <RincianKalkulasiKoefisien
                koefisienItems={item.koefisienItems}
                mode="readonly"
                liveMarginUpah={item.liveMarginUpah}
                liveMarginMaterial={item.liveMarginMaterial}
                liveMarginBongkaran={item.liveMarginBongkaran}
              />
            )}
          </>
        )}

        <RiwayatAuditCard riwayat={detail.riwayat} />
      </div>
    </AppLayoutShell>
  );
}
