import { SlidersHorizontal } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { TabAntrean } from "@/components/pengajuan/TabAntrean";
import { TabelAntrean } from "@/components/pengajuan/TabelAntrean";
import { requireRolePage } from "@/lib/auth/require-role";
import { getAntreanPengajuan, hitungPerStatus } from "@/lib/services/pengajuan-service";
import { formatRupiah } from "@/lib/utils";
import { StatusPengajuanHarga } from "@/types";

const TAB = {
  evaluasi: { label: "Perlu Evaluasi Margin", statuses: ["PENDING_SB_SPECIALIST"] as StatusPengajuanHarga[] },
  regional: { label: "Menunggu Regional", statuses: ["PENDING_REGIONAL_MGR"] as StatusPengajuanHarga[] },
};
type KunciTab = keyof typeof TAB;

export default async function EvaluasiMarginPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  const sp = await searchParams;
  const tab: KunciTab = sp.tab && sp.tab in TAB ? (sp.tab as KunciTab) : "evaluasi";
  const q = sp.q?.trim() || undefined;

  const [rows, jumlah] = await Promise.all([
    getAntreanPengajuan(user, { statuses: TAB[tab].statuses, q }),
    hitungPerStatus(user, ["PENDING_SB_SPECIALIST", "PENDING_REGIONAL_MGR"]),
  ]);

  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "S&B Specialist" }, { label: "Evaluasi Live Margin" }]}>
      <HeaderHalaman
        icon={SlidersHorizontal}
        judul="Evaluasi Live Margin"
        deskripsi="Tiket yang hasil survei 3 tokonya sudah disetujui B&M Manager. Tetapkan margin upah, material, dan bongkaran berdasarkan harga pasar, lalu kirim rekomendasi harga ke Regional Manager."
      />

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <TabAntrean
          basePath="/sb-specialist/evaluasi-margin"
          tabAktif={tab}
          q={q}
          tabs={[
            { key: "evaluasi", label: TAB.evaluasi.label, jumlah: jumlah.PENDING_SB_SPECIALIST, urgen: true },
            { key: "regional", label: TAB.regional.label, jumlah: jumlah.PENDING_REGIONAL_MGR },
          ]}
        />
        <TabelAntrean
          rows={rows}
          hrefDetail={(id) => `/sb-specialist/${id}`}
          labelAksi={tab === "evaluasi" ? "Evaluasi" : "Lihat"}
          aksiUtama={tab === "evaluasi"}
          kolomTambahan={{
            judul: tab === "evaluasi" ? "Resep AHSP" : "Harga Rekomendasi",
            isi: (r) =>
              tab === "evaluasi" ? (
                <span className="font-semibold text-slate-800">{r.jumlahKomponen} komponen</span>
              ) : (
                <span className="font-mono font-bold tabular-nums text-slate-900">
                  {formatRupiah(r.hargaDitetapkanSNB)}
                  {r.satuan && <span className="block text-[11px] font-sans font-normal text-slate-500">per {r.satuan}</span>}
                </span>
              ),
          }}
          pesanKosong={
            q
              ? { judul: "Tidak ada tiket yang cocok", deskripsi: "Ubah kata kunci pencarian." }
              : tab === "evaluasi"
                ? { judul: "Tidak ada tiket untuk dievaluasi", deskripsi: "Tiket muncul di sini setelah B&M Manager menyetujui hasil survei 3 toko." }
                : { judul: "Tidak ada tiket menunggu Regional", deskripsi: "Rekomendasi yang sudah dikirim akan tampil di sini." }
          }
        />
      </section>
    </AppLayoutShell>
  );
}
