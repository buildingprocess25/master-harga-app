import { ShieldCheck } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { TabAntrean } from "@/components/pengajuan/TabAntrean";
import { TabelAntrean } from "@/components/pengajuan/TabelAntrean";
import { requireRolePage } from "@/lib/auth/require-role";
import { getCabangWewenang, getNamaCabang } from "@/lib/services/kuorum-service";
import { getAntreanPengajuan, hitungPerStatus } from "@/lib/services/pengajuan-service";
import { formatRupiah } from "@/lib/utils";
import { StatusPengajuanHarga } from "@/types";

const TAB = {
  approval: { label: "Perlu Persetujuan", statuses: ["PENDING_REGIONAL_MGR"] as StatusPengajuanHarga[] },
  gagal: { label: "Kuorum Gagal", statuses: ["DITOLAK_KONTRAKTOR"] as StatusPengajuanHarga[] },
};
type KunciTab = keyof typeof TAB;

export default async function ApprovalRegionalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await requireRolePage(["REGIONAL_MANAGER"]);
  const sp = await searchParams;
  const tab: KunciTab = sp.tab && sp.tab in TAB ? (sp.tab as KunciTab) : "approval";
  const q = sp.q?.trim() || undefined;

  const wewenang = await getCabangWewenang(user.id, user.role);
  const [rows, jumlah, namaCabang] = await Promise.all([
    getAntreanPengajuan(user, { statuses: TAB[tab].statuses, q }),
    hitungPerStatus(user, ["PENDING_REGIONAL_MGR", "DITOLAK_KONTRAKTOR"]),
    wewenang === "SEMUA" ? Promise.resolve(null) : getNamaCabang(wewenang),
  ]);

  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "Regional Manager" }, { label: "Approval Layer 3" }]}>
      <HeaderHalaman
        icon={ShieldCheck}
        judul="Approval Layer 3"
        deskripsi="Tinjau rekomendasi harga S&B Specialist, bandingkan dengan harga cabang lain di regional, lalu setujui pembukaan kuorum rekanan atau kembalikan untuk tinjauan ulang."
        aksi={
          <div className="text-[11px] text-slate-600 max-w-xs">
            <span className="font-semibold text-slate-800 block">Cakupan cabang</span>
            {namaCabang === null ? "Seluruh cabang" : namaCabang.length ? namaCabang.join(", ") : "Belum ada cabang ditugaskan"}
          </div>
        }
      />

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <TabAntrean
          basePath="/regional-manager"
          tabAktif={tab}
          q={q}
          tabs={[
            { key: "approval", label: TAB.approval.label, jumlah: jumlah.PENDING_REGIONAL_MGR, urgen: true },
            { key: "gagal", label: TAB.gagal.label, jumlah: jumlah.DITOLAK_KONTRAKTOR, urgen: true },
          ]}
        />
        <TabelAntrean
          rows={rows}
          hrefDetail={(id) => `/regional-manager/${id}`}
          labelAksi={tab === "approval" ? "Tinjau" : "Tindak Lanjut"}
          aksiUtama
          kolomTambahan={{
            judul: "Harga Rekomendasi",
            isi: (r) => (
              <span className="font-mono font-bold tabular-nums text-slate-900">
                {formatRupiah(r.hargaDitetapkanSNB)}
                {r.satuan && <span className="block text-[11px] font-sans font-normal text-slate-500">per {r.satuan}</span>}
              </span>
            ),
          }}
          pesanKosong={
            q
              ? { judul: "Tidak ada tiket yang cocok", deskripsi: "Ubah kata kunci pencarian." }
              : tab === "approval"
                ? { judul: "Tidak ada tiket menunggu persetujuan", deskripsi: "Rekomendasi harga dari S&B Specialist akan muncul di sini." }
                : { judul: "Tidak ada kuorum gagal", deskripsi: "Tiket yang tidak mencapai kuorum tanpa usulan banding akan muncul di sini." }
          }
        />
      </section>
    </AppLayoutShell>
  );
}
