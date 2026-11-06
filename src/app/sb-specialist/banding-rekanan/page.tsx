import { Scale } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { TabAntrean } from "@/components/pengajuan/TabAntrean";
import { TabelAntrean } from "@/components/pengajuan/TabelAntrean";
import { requireRolePage } from "@/lib/auth/require-role";
import { getAntreanPengajuan, hitungPerStatus } from "@/lib/services/pengajuan-service";
import { formatRupiah } from "@/lib/utils";
import { StatusPengajuanHarga } from "@/types";

const TAB = {
  banding: { label: "Perlu Evaluasi Banding", statuses: ["USULAN_KONTRAKTOR"] as StatusPengajuanHarga[] },
  kuorum: { label: "Kuorum Berjalan", statuses: ["PENDING_KONTRAKTOR"] as StatusPengajuanHarga[] },
};
type KunciTab = keyof typeof TAB;

export default async function BandingRekananPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  const sp = await searchParams;
  const tab: KunciTab = sp.tab && sp.tab in TAB ? (sp.tab as KunciTab) : "banding";
  const q = sp.q?.trim() || undefined;

  const [rows, jumlah] = await Promise.all([
    getAntreanPengajuan(user, { statuses: TAB[tab].statuses, q }),
    hitungPerStatus(user, ["USULAN_KONTRAKTOR", "PENDING_KONTRAKTOR"]),
  ]);

  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "S&B Specialist" }, { label: "Banding Kontraktor" }]}>
      <HeaderHalaman
        icon={Scale}
        judul="Banding Kontraktor"
        deskripsi="Kuorum rekanan tidak tercapai karena ada usulan banding harga. Evaluasi argumentasi dan bukti pasar rekanan, lalu revisi harga lewat evaluasi margin, pertahankan harga, atau tutup pengajuan."
      />

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <TabAntrean
          basePath="/sb-specialist/banding-rekanan"
          tabAktif={tab}
          q={q}
          tabs={[
            { key: "banding", label: TAB.banding.label, jumlah: jumlah.USULAN_KONTRAKTOR, urgen: true },
            { key: "kuorum", label: TAB.kuorum.label, jumlah: jumlah.PENDING_KONTRAKTOR },
          ]}
        />
        <TabelAntrean
          rows={rows}
          hrefDetail={(id) => `/sb-specialist/${id}`}
          labelAksi={tab === "banding" ? "Evaluasi" : "Lihat"}
          aksiUtama={tab === "banding"}
          kolomTambahan={{
            judul: "Harga Ditawarkan",
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
              : tab === "banding"
                ? { judul: "Tidak ada banding untuk dievaluasi", deskripsi: "Tiket muncul di sini bila kuorum gagal dan ada rekanan yang mengusulkan harga lain." }
                : { judul: "Tidak ada kuorum berjalan", deskripsi: "Penawaran yang sedang divoting rekanan akan tampil di sini." }
          }
        />
      </section>
    </AppLayoutShell>
  );
}
