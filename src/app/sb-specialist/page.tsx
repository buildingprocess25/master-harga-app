import { Ruler } from "lucide-react";
import { AppLayoutShell } from "@/components/global";
import { HeaderHalaman } from "@/components/pengajuan/HeaderHalaman";
import { TabAntrean } from "@/components/pengajuan/TabAntrean";
import { TabelAntrean } from "@/components/pengajuan/TabelAntrean";
import { requireRolePage } from "@/lib/auth/require-role";
import { getAntreanPengajuan, hitungPerStatus } from "@/lib/services/pengajuan-service";
import { StatusPengajuanHarga } from "@/types";

const TAB = {
  mastering: { label: "Perlu Validasi & Mastering", statuses: ["DIAJUKAN"] as StatusPengajuanHarga[] },
  revisi: { label: "Menunggu Revisi BM", statuses: ["PERLU_REVISI"] as StatusPengajuanHarga[] },
  survei: {
    label: "Dalam Survei Cabang",
    statuses: ["SIAP_SURVEI", "RETURNED_TO_BC", "PENDING_BM_MGR"] as StatusPengajuanHarga[],
  },
};
type KunciTab = keyof typeof TAB;

export default async function MasteringAhspPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await requireRolePage(["SB_SPECIALIST"]);
  const sp = await searchParams;
  const tab: KunciTab = sp.tab && sp.tab in TAB ? (sp.tab as KunciTab) : "mastering";
  const q = sp.q?.trim() || undefined;

  const semuaStatus = Object.values(TAB).flatMap((t) => t.statuses);
  const [rows, jumlah] = await Promise.all([
    getAntreanPengajuan(user, { statuses: TAB[tab].statuses, q }),
    hitungPerStatus(user, semuaStatus),
  ]);
  const total = (k: KunciTab) => TAB[k].statuses.reduce((a, s) => a + jumlah[s], 0);

  return (
    <AppLayoutShell user={user} breadcrumbs={[{ label: "S&B Specialist" }, { label: "Mastering AHSP" }]}>
      <HeaderHalaman
        icon={Ruler}
        judul="Mastering AHSP"
        deskripsi="Validasi spesifikasi pengajuan cabang, lalu susun resep koefisien AHSP (upah, material, alat, bongkaran) sebelum tiket diterbitkan ke Building Coordinator untuk survei 3 toko."
      />

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <TabAntrean
          basePath="/sb-specialist"
          tabAktif={tab}
          q={q}
          tabs={(Object.keys(TAB) as KunciTab[]).map((k) => ({
            key: k,
            label: TAB[k].label,
            jumlah: total(k),
            urgen: k === "mastering",
          }))}
        />
        <TabelAntrean
          rows={rows}
          hrefDetail={(id) => `/sb-specialist/${id}`}
          labelAksi={tab === "mastering" ? "Mastering" : "Lihat"}
          aksiUtama={tab === "mastering"}
          kolomTambahan={{
            judul: "Resep AHSP",
            isi: (r) =>
              r.jumlahKomponen > 0 ? (
                <span className="font-semibold text-slate-800">{r.jumlahKomponen} komponen</span>
              ) : (
                <span className="text-slate-500">Belum disusun</span>
              ),
          }}
          pesanKosong={
            q
              ? { judul: "Tidak ada tiket yang cocok", deskripsi: "Ubah kata kunci pencarian." }
              : tab === "mastering"
                ? { judul: "Antrean mastering kosong", deskripsi: "Pengajuan baru dari B&M Manager akan muncul di sini." }
                : { judul: "Tidak ada tiket di tahap ini", deskripsi: "Tiket akan muncul sesuai perkembangan alurnya." }
          }
        />
      </section>
    </AppLayoutShell>
  );
}
