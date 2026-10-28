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

  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// FILTER STATES & DTOs
// ============================================================================

export interface PengajuanHargaFilterState {
  search: string;
  kategori: string;
  cabangId: string;
  divisiId: string;
  status: string;
  cakupanHarga: string;
}
