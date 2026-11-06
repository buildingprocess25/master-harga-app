/**
 * SPARTA-HARGA: Shared TypeScript Data Contracts
 * Single Source of Truth (SSOT) untuk modul pengajuan harga, survei pasar 3 toko,
 * kalkulasi koefisien AHSP, live margin, dan kuorum rekanan kontraktor.
 */

// ============================================================================
// ENUMS (ALIGNED WITH PRISMA 7 SCHEMA)
// ============================================================================

export type RoleUser =
  | 'BUILDING_COORDINATOR'
  | 'BM_MANAGER'
  | 'PP_MANAGER'
  | 'SB_SPECIALIST'
  | 'REGIONAL_MANAGER'
  | 'KONTRAKTOR'
  | 'ADMIN';

export type StatusPengajuanHarga =
  | 'DRAFT'
  | 'DIAJUKAN'
  | 'SIAP_SURVEI'
  | 'PENDING_BM_MGR'
  | 'PENDING_SB_SPECIALIST'
  | 'PENDING_REGIONAL_MGR'
  | 'PENDING_KONTRAKTOR'
  | 'USULAN_KONTRAKTOR'
  | 'DITOLAK_KONTRAKTOR'
  | 'PERLU_REVISI'
  | 'RETURNED_TO_BC'
  | 'DITOLAK'
  | 'RELEASED';

export type CakupanHarga = 'INDUK_CABANG' | 'KHUSUS_WILAYAH';

export type StatusVoteKontraktor = 'MENUNGGU' | 'SETUJU' | 'TOLAK' | 'TIMEOUT';

export type StatusKeaktifanCabang = 'AKTIF' | 'NONAKTIF_SEMENTARA' | 'BLACKLIST';

export type StatusHargaCabang = 'AKTIF' | 'NONAKTIF';

export type KategoriKoefisien = 'UPAH' | 'MATERIAL' | 'ALAT' | 'BONGKARAN';

export type TipeLampiranSurvei =
  | 'NOTA_PEMBELIAN'
  | 'FOTO_TOKO'
  | 'FOTO_MATERIAL'
  | 'LAINNYA';

// ============================================================================
// INTERFACES: SURVEI & LAMPIRAN BUKTI
// ============================================================================

export interface LampiranSurveiItem {
  id: string;
  tipe: TipeLampiranSurvei;
  namaFile: string;
  url: string;
  ukuranBytes?: number;
  keterangan?: string;
  createdAt?: string;
}

export interface SurveyTokoItem {
  id: string;
  noToko: number; // Slot 1, 2, atau 3
  namaToko: string;
  alamat?: string;
  kota?: string;
  kontak?: string;
  tanggalSurvei: string;
  harga: number; // Rupiah
  catatan?: string;
  lampiranList: LampiranSurveiItem[];
}

// ============================================================================
// INTERFACES: KOEFISIEN AHSP & MARGIN MULTI-DIVISI
// ============================================================================

export interface KoefisienDetailItem {
  id: string;
  kodeKomponen?: string;
  kategori: KategoriKoefisien;
  namaKomponen: string;
  satuan: string;
  koefisien: number; // e.g. 0.0188
  hargaAcuan: number; // Harga acuan rupiah dari rata-rata survei
  subtotal: number; // koefisien * hargaAcuan
  marginPersen: number; // e.g. 8%
  total: number; // subtotal * (1 + marginPersen / 100)
  isCustom?: boolean;
}

// ============================================================================
// INTERFACES: KUORUM REKANAN & BANDING
// ============================================================================

export interface LampiranBandingItem {
  id: string;
  namaFile: string;
  url: string;
  ukuranBytes?: number;
  keterangan?: string;
  createdAt?: string;
}

export interface VotingKontraktorItem {
  id: string;
  kontraktorId: string;
  namaPerusahaan: string;
  email?: string;
  statusVote: StatusVoteKontraktor;
  tanggalVote?: string;
  hargaBanding?: number;
  catatanBanding?: string;
  lampiranBandingList?: LampiranBandingItem[];
}

// ============================================================================
// INTERFACES: MASTER DATA & USER
// ============================================================================

export interface DivisiItem {
  id: string;
  kodeDivisi: string;
  namaDivisi: string;
  isActive: boolean;
}

export interface CabangItem {
  id: string;
  kodeCabang: string;
  namaCabang: string;
  regional: string;
}

export interface WilayahCabangItem {
  id: string;
  cabangId: string;
  kodeWilayah: string;
  namaWilayah: string;
}

export interface UserSessionProfile {
  id: string;
  email: string;
  fullName: string;
  role: RoleUser;
  divisiId?: string | null;
  namaDivisi?: string | null;
  cabangId?: string | null;
  namaCabang?: string | null;
  kontraktorId?: string | null;
  namaPerusahaanKontraktor?: string | null;
}

// ============================================================================
// CORE TICKET: PENGAJUAN HARGA LENGKAP
// ============================================================================

export interface PengajuanHargaItem {
  id: string;
  noTiket: string;
  kodeItem: string;
  namaItem: string;
  kategori: string;
  merk?: string;
  tipe?: string;
  ukuran?: string;
  warna?: string;
  lokasi?: string;

  // Organisasi & Lokasi
  divisiId: string;
  namaDivisi?: string;
  kodeDivisi?: string;
  cabangId: string;
  namaCabang?: string;
  kodeCabang?: string;
  cakupanHarga: CakupanHarga;
  wilayahCabangId?: string | null;
  namaWilayah?: string | null;

  // Siklus Status & Audit
  status: StatusPengajuanHarga;
  tanggalPengajuan: string;
  alasanPengajuan?: string;
  catatanReviewTerakhir?: string;

  // Survei 3 Toko Pasar
  surveiTokoList: SurveyTokoItem[];
  hargaAcuanPasar?: number; // Nilai rata-rata dari 3 toko

  // Rincian AHSP & Live Margin
  koefisienItems: KoefisienDetailItem[];
  liveMarginUpah: number;
  liveMarginMaterial: number;
  liveMarginBongkaran: number;
  totalHpp: number; // Subtotal murni tanpa margin
  totalHargaSatuan: number; // Grand total AHSP resmi dengan margin

  // Kuorum Rekanan Kontraktor (50% + 1)
  votingKontraktorList?: VotingKontraktorItem[];
  kuorumPersentase?: number;
  kuorumTerpenuhi?: boolean;
  deadlineVoting?: string; // ISO 8601 batas waktu SLA 3x24 jam

  // Aliases & Extended Properties untuk Fleksibilitas Tabel & Ekspor
  kode?: string;
  kodeMaster?: string;
  item?: string;
  cabang?: string;
  deskripsiOtomatis?: string;
  estimasiHarga?: number;
  hargaRataRata?: number;
  satuan?: string;
  implementasi?: string;
  tebal?: string;
  permukaan?: string;
  toleransi?: string;
  informasiTambahan?: string;
  isTrial?: boolean;
  catatanReview?: string;
  koefisienMaterial?: string;
  koefisienMaterialItems?: any[];
  surveyToko?: any[];
  historyLog?: ApprovalLog[];

  createdAt?: string;
  updatedAt?: string;
}

export interface ApprovalLog {
  role: 'B&M Manager' | 'Building Coordinator' | 'S&B Specialist' | 'Regional Manager' | 'Kontraktor' | string;
  action: 'APPROVE' | 'REVISE' | 'REJECT' | 'SUBMIT' | 'VOTE' | string;
  tanggal: string;
  catatan?: string;
}

// ============================================================================
// FILTER STATES & DTOs
// ============================================================================

export interface PengajuanHargaFilterState {
  search: string;
  kategori: string;
  cabangId?: string;
  divisiId?: string;
  status?: string;
  cakupanHarga?: string;
  merk?: string;
  implementasi?: string;
}


// ============================================================================
// DAFTAR CABANG ALFAMART & HELPER KODE/DESKRIPSI OTOMATIS
// ============================================================================

export const DAFTAR_CABANG_ALFAMART: string[] = [
  "Cikokol",
  "Balaraja",
  "Bekasi",
  "Parung",
  "Cileungsi",
  "Bogor",
  "Bandung",
  "Serang",
];

export function generateDeskripsiOtomatis(data: {
  item: string;
  ukuran: string;
  merk: string;
  warna: string;
  tipe: string;
  tebal?: string;
  permukaan: string;
  toleransi?: string;
  informasiTambahan?: string;
  implementasi?: string | string[];
  lokasi?: string | string[];
}): string {
  const parts: string[] = [];

  if (data.item?.trim()) parts.push(data.item.trim());
  if (data.ukuran?.trim()) parts.push(data.ukuran.trim());
  if (data.merk?.trim()) parts.push(data.merk.trim());
  if (data.warna?.trim()) parts.push(data.warna.trim());
  if (data.tipe?.trim()) {
    const cleanTipe = data.tipe.trim();
    parts.push(cleanTipe.toLowerCase().startsWith("tipe") ? cleanTipe : `Tipe ${cleanTipe}`);
  }
  if (data.tebal?.trim()) {
    const cleanTebal = data.tebal.trim();
    parts.push(cleanTebal.toLowerCase().startsWith("tebal") ? cleanTebal : `Tebal ${cleanTebal}`);
  }
  if (data.permukaan?.trim()) parts.push(data.permukaan.trim());
  if (data.toleransi?.trim()) {
    const cleanTol = data.toleransi.trim();
    parts.push(cleanTol.toLowerCase().startsWith("toleransi") ? cleanTol : `Toleransi ${cleanTol}`);

    if (data.tebal?.trim()) {
      const tebal = parseFloat(data.tebal);
      const tol = parseFloat(data.toleransi);
      if (!isNaN(tebal) && !isNaN(tol)) {
        const unitMatch = data.tebal.match(/[a-zA-Z]+/);
        const unit = unitMatch ? unitMatch[0] : "";
        let min = 0;
        if (data.toleransi.includes("%")) {
          min = tebal - (tebal * tol) / 100;
        } else {
          min = tebal - tol;
        }
        parts.push(`(Toleransi Terukur Minimal: ${Number.isInteger(min) ? min : min.toFixed(2)} ${unit})`);
      }
    }
  }
  if (data.lokasi && (Array.isArray(data.lokasi) ? data.lokasi.length > 0 : data.lokasi.trim().length > 0)) {
    const locs = Array.isArray(data.lokasi) ? data.lokasi.join(", ") : data.lokasi;
    const cleanLoc = locs.trim();
    parts.push(cleanLoc.toLowerCase().startsWith("lokasi") ? cleanLoc : `Lokasi ${cleanLoc}`);
  }
  if (data.implementasi && (Array.isArray(data.implementasi) ? data.implementasi.length > 0 : data.implementasi.trim().length > 0)) {
    const impls = Array.isArray(data.implementasi) ? data.implementasi.join(", ") : data.implementasi;
    const cleanImpls = impls.trim();
    parts.push(cleanImpls.toLowerCase().startsWith("implementasi") ? cleanImpls : `Implementasi ${cleanImpls}`);
  }
  if (data.informasiTambahan?.trim()) {
    parts.push(`(${data.informasiTambahan.trim()})`);
  }

  return parts.join(" ").trim();
}

export function getKodeData(data: {
  kategori?: string;
  item: string;
  implementasi?: string | string[];
  lokasi: string | string[];
  ukuran?: string;
  merk?: string;
  warna?: string;
  tipe?: string;
  permukaan?: string;
  tebal?: string;
  toleransi?: string;
  nextIndex?: number;
  existingItems?: PengajuanHargaItem[];
}): {
  kodeItem: string;
  kodeArea: string;
  kodeMaster: string;
  isDuplicate: boolean;
  duplicateItem?: PengajuanHargaItem;
} {
  const norm = (s?: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const normUkuran = (s?: string) => (s || "").trim().replace(/\s*cm$/i, "").replace(/\s+/g, "").toLowerCase();
  const normTebal = (s?: string) => (s || "").trim().replace(/\s*mm$/i, "").replace(/\s+/g, "").toLowerCase();

  const cleanKategori = (data.kategori || data.item || "Kategori").trim().replace(/\s+/g, "");
  const existingItems = data.existingItems || [];
  const nextIndex = data.nextIndex || (existingItems.length + 1);

  const cItem = norm(data.item);
  const cUkuran = normUkuran(data.ukuran);
  const cMerk = norm(data.merk);
  const cWarna = norm(data.warna);
  const cTipe = norm(data.tipe);
  const cPermukaan = norm(data.permukaan);
  const cTebal = normTebal(data.tebal);
  const cLokasi = data.lokasi
    ? Array.isArray(data.lokasi)
      ? data.lokasi.map((l) => norm(l)).sort().join(",")
      : norm(data.lokasi)
    : "";

  const isPhysicalMatch = (i: PengajuanHargaItem) => {
    const iItem = i.item || i.namaItem;
    if (!cItem || !iItem) return false;
    return (
      norm(iItem) === cItem &&
      normUkuran(i.ukuran) === cUkuran &&
      norm(i.merk) === cMerk &&
      norm(i.warna) === cWarna &&
      norm(i.tipe) === cTipe &&
      norm(i.permukaan) === cPermukaan &&
      normTebal(i.tebal) === cTebal
    );
  };

  const physicalMatches = existingItems.filter(isPhysicalMatch);

  let kodeItem = "";
  let kodeVarian = "A";
  let isDuplicate = false;
  let duplicateItem: PengajuanHargaItem | undefined;

  if (physicalMatches.length > 0) {
    const existingCode = physicalMatches[0].kode || physicalMatches[0].kodeItem || "";
    const matchSIP = existingCode.match(/^(SIP-\d+)/i);
    kodeItem = matchSIP ? matchSIP[1].toUpperCase() : `SIP-${String(nextIndex).padStart(3, "0")}`;

    const matchedLocationItem = physicalMatches.find((i) => {
      const iLok = i.lokasi;
      const iLokStr = Array.isArray(iLok)
        ? iLok.map((l) => norm(l)).sort().join(",")
        : norm(iLok);
      return iLokStr === cLokasi;
    });

    if (matchedLocationItem && cLokasi) {
      isDuplicate = true;
      duplicateItem = matchedLocationItem;
      const vMatch = (matchedLocationItem.kodeItem || matchedLocationItem.noTiket || "").match(/SIP-\d+-([A-Z])-/i);
      kodeVarian = vMatch ? vMatch[1].toUpperCase() : "A";
    } else {
      const usedVariants = new Set<string>();
      physicalMatches.forEach((i) => {
        const vMatch = (i.kodeItem || i.noTiket || "").match(/SIP-\d+-([A-Z])-/i);
        if (vMatch) {
          usedVariants.add(vMatch[1].toUpperCase());
        }
      });

      let nextCharCode = 65; // 'A'
      while (usedVariants.has(String.fromCharCode(nextCharCode)) && nextCharCode <= 90) {
        nextCharCode++;
      }
      kodeVarian = String.fromCharCode(nextCharCode);
    }
  } else {
    let maxSIP = 0;
    existingItems.forEach((i) => {
      const codeToCheck = i.kode || i.kodeItem || "";
      const match = codeToCheck.match(/SIP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSIP) {
          maxSIP = num;
        }
      }
    });

    const nextSIPNum = Math.max(maxSIP + 1, nextIndex);
    kodeItem = `SIP-${String(nextSIPNum).padStart(3, "0")}`;
    kodeVarian = "A";
  }

  const kodeMaster = `${kodeItem}-${kodeVarian}-${cleanKategori}`;

  return {
    kodeItem,
    kodeArea: kodeVarian,
    kodeMaster,
    isDuplicate,
    duplicateItem,
  };
}
