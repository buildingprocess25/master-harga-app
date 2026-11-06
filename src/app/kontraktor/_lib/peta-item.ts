import type { PengajuanHargaItem, StatusPengajuanHarga } from "@/types";
import type {
  getDetailPenawaranKontraktor,
  getPenawaranKontraktor,
} from "@/lib/services/kuorum-service";

export type BarisPenawaran = Awaited<ReturnType<typeof getPenawaranKontraktor>>[number];
export type DetailPenawaran = NonNullable<Awaited<ReturnType<typeof getDetailPenawaranKontraktor>>>;

/**
 * Bentuk minimum PengajuanHargaItem yang dibutuhkan komponen global (tabel, timeline,
 * spesifikasi). Field internal (survei, koefisien, margin, catatan review) sengaja
 * dikosongkan karena portal rekanan tidak boleh melihatnya.
 */
function dasar(p: {
  tiketId: string;
  nomorTiket: string;
  statusTiket: StatusPengajuanHarga;
  namaDivisi: string;
  namaCabang: string;
  cakupanHarga: PengajuanHargaItem["cakupanHarga"];
  namaWilayah: string | null;
  hargaDitawarkan: number | null;
  tanggalPengajuan: string;
  deadlineVoting: string | null;
}): PengajuanHargaItem {
  return {
    id: p.tiketId,
    noTiket: p.nomorTiket,
    kodeItem: p.nomorTiket,
    namaItem: "-",
    kategori: "-",
    divisiId: "",
    namaDivisi: p.namaDivisi,
    cabangId: "",
    namaCabang: p.namaCabang,
    cakupanHarga: p.cakupanHarga,
    namaWilayah: p.namaWilayah,
    status: p.statusTiket,
    tanggalPengajuan: p.tanggalPengajuan,
    surveiTokoList: [],
    koefisienItems: [],
    liveMarginUpah: 0,
    liveMarginMaterial: 0,
    liveMarginBongkaran: 0,
    totalHpp: 0,
    totalHargaSatuan: p.hargaDitawarkan ?? 0,
    deadlineVoting: p.deadlineVoting ?? undefined,
  };
}

/** Baris tabel penawaran: kode = nomor tiket, cabang menyertakan wilayah khusus bila ada. */
export function barisKeItem(p: BarisPenawaran): PengajuanHargaItem {
  return {
    ...dasar(p),
    kode: p.nomorTiket,
    kodeMaster: p.kodeMaster ?? undefined,
    namaItem: p.namaItem,
    item: p.namaItem,
    kategori: p.kategori ?? "-",
    merk: p.merk ?? undefined,
    ukuran: p.ukuran ?? undefined,
    lokasi: p.lokasi ?? undefined,
    satuan: p.satuan ?? undefined,
    deskripsiOtomatis: p.deskripsi ?? undefined,
    cabang: p.namaWilayah ? `${p.namaCabang} (Wilayah ${p.namaWilayah})` : p.namaCabang,
  };
}

/** Item untuk timeline & kartu spesifikasi di halaman detail penawaran. */
export function detailKeItem(d: DetailPenawaran): PengajuanHargaItem {
  const m = d.item;
  return {
    ...dasar(d),
    kode: m?.kodeMaster ?? d.nomorTiket,
    kodeItem: m?.kodeItem ?? d.nomorTiket,
    kodeMaster: m?.kodeMaster,
    namaItem: m?.namaItem ?? "Item pekerjaan",
    item: m?.namaItem,
    kategori: m?.kategori ?? "-",
    merk: m?.merk,
    ukuran: m?.ukuran,
    tipe: m?.tipe ?? undefined,
    warna: m?.warna ?? undefined,
    permukaan: m?.permukaan ?? undefined,
    tebal: m?.tebal ?? undefined,
    toleransi: m?.toleransi ?? undefined,
    lokasi: m?.lokasi,
    satuan: m?.satuan,
    deskripsiOtomatis: m?.deskripsi,
    cabang: d.namaWilayah ? `${d.namaCabang} (Wilayah ${d.namaWilayah})` : d.namaCabang,
  };
}
