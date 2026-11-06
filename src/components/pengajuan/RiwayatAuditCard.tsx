import { History } from "lucide-react";

const LABEL_AKSI: Record<string, string> = {
  SIMPAN_DRAFT_AHSP: "Simpan draft resep AHSP",
  TERBITKAN_SIAP_SURVEI: "Resep AHSP dikunci, terbit ke survei",
  KEMBALIKAN_REVISI_SPESIFIKASI: "Dikembalikan ke BM (revisi spesifikasi)",
  TOLAK_PENGAJUAN: "Pengajuan ditolak",
  SIMPAN_DRAFT_MARGIN: "Simpan draft live margin",
  REKOMENDASI_HARGA_KE_REGIONAL: "Rekomendasi harga dikirim ke Regional",
  KEMBALIKAN_REVISI_PASCA_SURVEI: "Dikembalikan untuk revisi (pasca-survei)",
  KEMBALIKAN_TINJAUAN_MARGIN: "Regional meminta tinjauan ulang margin",
  BUKA_ULANG_SETELAH_MEDIASI: "Kuorum dibuka ulang setelah mediasi",
  BANDING_REVISI_MARGIN: "Banding diterima, harga direvisi lewat margin",
  BANDING_PERTAHANKAN_HARGA: "Banding ditolak, harga dipertahankan",
  TERUSKAN_KE_KONTRAKTOR: "Diteruskan ke kuorum rekanan",
  KUORUM_TERCAPAI: "Kuorum tercapai, harga terbit",
  KUORUM_GAGAL: "Kuorum gagal",
  VOTE_SETUJU: "Rekanan setuju",
  VOTE_BANDING: "Rekanan mengajukan banding",
  VOTE_TOLAK: "Rekanan menolak",
};

export interface EntriRiwayat {
  id: string;
  aksi: string;
  roleActor: string;
  oleh: string;
  catatan: string | null;
  waktu: string;
}

/** Jejak audit tiket (ApprovalAuditLog), terbaru di atas. */
export function RiwayatAuditCard({ riwayat }: { riwayat: EntriRiwayat[] }) {
  const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" aria-labelledby="judul-riwayat">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <History className="w-4 h-4 text-[#005BAC]" />
        <h2 id="judul-riwayat" className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          Riwayat Keputusan
        </h2>
      </div>
      {riwayat.length === 0 ? (
        <p className="px-4 py-5 text-xs text-slate-500">Belum ada riwayat keputusan pada tiket ini.</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {riwayat.map((r) => (
            <li key={r.id} className="px-4 py-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">{LABEL_AKSI[r.aksi] ?? r.aksi}</span>
                <span className="font-mono text-[11px] text-slate-500">{fmt.format(new Date(r.waktu))}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {r.oleh} · {r.roleActor.replace(/_/g, " ")}
              </div>
              {r.catatan && <p className="mt-1 text-slate-700">{r.catatan}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
