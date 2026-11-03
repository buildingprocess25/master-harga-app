import {
  deskripsiFilterKatalog,
  getKatalogUntukEkspor,
  parseFilterKatalog,
  BATAS_EKSPOR_KATALOG,
} from "@/lib/services/master-harga-service";
import { requireInternal } from "../_lib/require-internal";
import { TabelKatalog } from "../_components/TabelKatalog";
import { TombolCetak } from "./TombolCetak";

/**
 * Versi cetak Katalog (seluruh baris sesuai filter). Dibuka di tab baru,
 * dialog cetak browser muncul otomatis sehingga pengguna dapat "Simpan sebagai PDF".
 */
export default async function CetakKatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireInternal();
  const filter = parseFilterKatalog(await searchParams);
  const [{ rows, terpotong }, deskripsi] = await Promise.all([
    getKatalogUntukEkspor(filter),
    deskripsiFilterKatalog(filter),
  ]);
  const totalOverride = rows.reduce((n, r) => n + r.wilayahList.length, 0);
  const dicetak = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date());

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 print:border-0 print:p-0 print:rounded-none">
      <style>{`@page { size: A4 landscape; margin: 12mm; }
        @media print {
          body { background: #fff !important; }
          header { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          thead { display: table-header-group; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }`}</style>

      <div className="flex items-start justify-between gap-4 border-b-2 border-[#005BAC] pb-3 mb-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider text-[#ED1C24] uppercase">PT Sumber Alfaria Trijaya Tbk</div>
          <h1 className="text-base font-bold text-slate-900">Katalog Harga Satuan Resmi SPARTA-HARGA</h1>
          <p className="text-xs text-slate-600 mt-0.5">Filter: {deskripsi}</p>
        </div>
        <div className="text-right text-[11px] text-slate-600 shrink-0">
          <div>Dicetak {dicetak}</div>
          <div>oleh {user.fullName}</div>
          <div className="mt-1 font-semibold text-slate-800">
            {rows.length} item induk, {totalOverride} harga wilayah
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-3 print:hidden">
        <TombolCetak />
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Tidak ada harga resmi yang cocok dengan filter.</p>
      ) : (
        <TabelKatalog rows={rows} />
      )}

      {terpotong && (
        <p className="mt-3 text-xs font-semibold text-[#990F14]">
          Daftar dipotong pada {BATAS_EKSPOR_KATALOG} item pertama. Persempit filter untuk mencetak data lengkap.
        </p>
      )}
      <p className="mt-4 text-[10px] text-slate-500">
        Harga berlaku sejak tanggal yang tercantum dan dapat diperbarui melalui pengajuan harga berikutnya.
        Dokumen ini dihasilkan dari sistem SPARTA-HARGA.
      </p>
    </div>
  );
}
