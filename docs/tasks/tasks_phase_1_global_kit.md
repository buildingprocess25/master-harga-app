# Phase 1: Shared Data Contracts & Global UI Component Library (`tasks_phase_1_global_kit.md`)

> **Prioritas**: 1 (P0 - Critical Blocker)  
> **Bobot Prioritas**: 95%  
> **Penanggung Jawab**: Person 1 (Tech Lead / Core Platform)  
> **Target Folder**: [`master-harga-app/src/components/global/`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global) & [`master-harga-app/src/types/`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/types)  
> **Referensi Arsitektur**: [`project-spec.md`](../project-spec.md), [`design-system.md`](../design-system.md), [`task-breakdown.md`](../task-breakdown.md)

---

## Overview

Fase 1 berfokus pada penyediaan fondasi bersama (*shared foundation*) bagi seluruh tim pengembang:
1. **Shared TypeScript Contracts**: Mendefinisikan kontrak tipe data tunggal (*Single Source of Truth*) untuk model pengajuan harga, survei 3 toko, komponen AHSP, margin, dan kuorum rekanan.
2. **Pustaka Komponen Global (`src/components/global/`)**: Membangun 8 komponen domain reusable berstandar desain Alfamart Industrial High-Legibility (HEX Solid `#005BAC`, `#ED1C24`, `#FFD100`, tanpa `oklch`).
3. **Unified Detail Page Template (`PengajuanDetailLayout`)**: Satu layout universal yang merangkai komponen domain dan slot aksi dinamis sesuai wewenang peran, sehingga Person 2 (Dev A), Person 3 (Dev B), dan Person 4 (Dev C) tidak perlu menulis ulang ribuan baris kode tampilan.

---

## Tasks

### Kategori 1: Shared TypeScript Data Contracts (`src/types/`)

- [ ] **1.1 Kontrak Domain Pengajuan Harga & Survei (`src/types/pengajuan.ts`)**
  - **Path**: [`src/types/pengajuan.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/types/pengajuan.ts)
  - **Spesifikasi**:
    - Ekspor enum relasional: `RoleUser`, `StatusPengajuanHarga`, `CakupanHarga`, `StatusVoteKontraktor`, `StatusKeaktifanCabang`.
    - Interface `PengajuanHargaItem`: id, kodeItem, namaItem, kategori, spesifikasi (merk, ukuran, tipe, warna), divisiId, namaDivisi, cabangId, namaCabang, wilayahCabangId, namaWilayah, status, tanggalPengajuan, hargaAkhir, marginPersen.
    - Interface `SurveyTokoItem`: id, noToko (1, 2, 3), namaToko, alamat, kota, kontak, tanggalSurvei, hargaBarang, catatan, lampiranList (`LampiranSurveiItem[]`).
    - Interface `LampiranSurveiItem`: id, tipeLampiran (`NOTA_PEMBELIAN` | `FOTO_TOKO` | `FOTO_MATERIAL`), fileUrl, fileName, fileSize.
    - Interface `KoefisienDetailItem`: id, kodeKoefisien, namaKomponen, kategori (`UPAH` | `MATERIAL` | `ALAT` | `BONGKARAN`), nilaiKoefisien, satuan, hargaAcuan, subtotal, marginPersen.
    - Interface `VotingKontraktorItem`: kontraktorId, namaPerusahaan, statusVote, tanggalVote, hargaBanding, catatanBanding, lampiranBandingList.
  - **Code Standard Check**: Strict typing, tidak ada tipe `any`, kompatibel dengan Prisma output model.

- [ ] **1.2 Ekspor Index Types (`src/types/index.ts`)**
  - **Path**: [`src/types/index.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/types/index.ts)
  - **Spesifikasi**: Re-export seluruh tipe domain dari `pengajuan.ts` untuk mempermudah impor dengan format `@/types`.

---

### Kategori 2: Pustaka Komponen Global Domain (`src/components/global/`)

- [ ] **1.3 Stepper Siklus Hidup Tiket (`PengajuanTimelineBar.tsx`)**
  - **Path**: [`src/components/global/PengajuanTimelineBar.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global/PengajuanTimelineBar.tsx)
  - **Spesifikasi**:
    - Visualisasi horizontal 7 tahap:
      1. Inisiasi Request (BM)
      2. Validasi & AHSP Mastering (SNB)
      3. Survei 3 Toko (BC)
      4. Review Layer 1 (BM)
      5. Verifikasi & Margin (SNB)
      6. Approval Layer 3 (Regional)
      7. Kuorum Rekanan & Released
    - Indikator status: Aktif (Biru Alfa `#005BAC`), Selesai (Hijau `#008A00`), Menunggu (Abu Netral `#94A3B8`), Ditolak/Revisi (Merah Alfa `#ED1C24`).
    - Tooltip catatan revisi jika tiket berstatus `PERLU_REVISI` atau `RETURNED_TO_BC`.
  - **Code Standard Check**: Responsif di desktop dan mobile, bebas tanda em-dash (`—`).

- [ ] **1.4 Kartu Identitas Spesifikasi Master (`DetailSpesifikasiCard.tsx`)**
  - **Path**: [`src/components/global/DetailSpesifikasiCard.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global/DetailSpesifikasiCard.tsx)
  - **Spesifikasi**:
    - Header dense card berlatar `bg-white` dengan border halus `#E2E8F0`.
    - Badge Divisi (Building: Biru, Engineering: Oranye, Maintenance: Hijau, DC: Ungu).
    - Badge Cakupan: `Induk Cabang` (Abu Solid) vs `Khusus Wilayah` (Kuning Alfa `#FFD100` teks hitam tebal).
    - Grid atribut: Kode Item (font mono `Geist Mono`), Kategori, Merk, Tipe, Ukuran, Permukaan/Warna, Lokasi Implementasi.
    - Informasi pemohon: Nama pengaju, cabang, tanggal inisiasi.

- [ ] **1.5 Kartu Rincian Survei 3 Toko Pasar & Viewer Bukti (`RincianSurvei3TokoCard.tsx`)**
  - **Path**: [`src/components/global/RincianSurvei3TokoCard.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global/RincianSurvei3TokoCard.tsx)
  - **Spesifikasi**:
    - Grid komparasi berdampingan untuk 3 toko survei (Toko 1, Toko 2, Toko 3).
    - Data per toko: Nama Toko, Tanggal Survei, Kontak/Alamat, Nominal Harga (Rupiah `tabular-nums`), Badge Status Kelengkapan Nota.
    - Tombol modal interaktif: **"Lihat Bukti Survei"** membuka modal penampil multi-lampiran (Nota Pembelian, Foto Fisik Toko, Foto Sampel Material).
    - Mode: Mendukung `readonly={true}` untuk reviewer (BM, SNB, Regional) dan slot aksi edit untuk BC.

- [ ] **1.6 Tabel Ringkasan Biaya Acuan Material (`RingkasanBiayaMaterial.tsx`)**
  - **Path**: [`src/components/global/RingkasanBiayaMaterial.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global/RingkasanBiayaMaterial.tsx)
  - **Spesifikasi**:
    - Tabel ringkasan komparasi harga Toko 1, Toko 2, dan Toko 3 per item material.
    - Baris kalkulasi otomatis: Harga Terendah, Harga Tertinggi, dan **Harga Rata-Rata Acuan Pasar**.
    - Pewarnaan sel: Highlight harga acuan pasar terpilih dengan latar lembut Alfamart Blue 5% (`#F0F7FD`).

- [ ] **1.7 Tabel Kalkulasi AHSP Multi-Divisi (`RincianKalkulasiKoefisien.tsx`)**
  - **Path**: [`src/components/global/RincianKalkulasiKoefisien.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global/RincianKalkulasiKoefisien.tsx)
  - **Spesifikasi**:
    - Pengelompokan baris terstruktur: Upah Kerja, Material Bahan, Peralatan Kerja, dan Pekerjaan Bongkaran.
    - Kolom tabel: No, Komponen Pekerjaan, Satuan, Koefisien (desimal 4 angka di belakang koma), Harga Satuan Acuan, Subtotal, Margin (%), Total Akhir.
    - Mode fleksibel:
      - `mode="editable"` (khusus S&B Specialist): Mendukung input/edit koefisien, pemilihan komponen via combobox, dan slider kontrol *Live Margin* (Upah, Material, Bongkaran).
      - `mode="readonly"` (untuk BM, Regional, Kontraktor): Tampilan tabel bersih dengan hasil kalkulasi terkunci.
    - Baris total reaktif: Grand Total Harga Satuan Pekerjaan (AHSP) dengan font tebal ukuran besar.

- [ ] **1.8 Panel Aksi Keputusan Berbasis Peran (`ApprovalActionPanel.tsx`)**
  - **Path**: [`src/components/global/ApprovalActionPanel.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global/ApprovalActionPanel.tsx)
  - **Spesifikasi**:
    - Panel aksi mengambang (*sticky bottom*) atau *embedded card*.
    - Props: `role: RoleUser`, `status: StatusPengajuanHarga`, `onApprove`, `onReject`, `onReturn`, `loading: boolean`.
    - Textarea wajib: Input "Catatan Keputusan / Alasan Revisi".
    - Render tombol adaptif:
      - Role `BM_MANAGER`: Tombol "Teruskan ke S&B Specialist" (Biru `#005BAC`) vs "Kembalikan Revisi ke BC" (Kuning/Oranye `#D97706`).
      - Role `SB_SPECIALIST`: Tombol "Simpan Koefisien & Buka Survei" vs "Teruskan ke Regional Manager" vs "Kembalikan ke BM".
      - Role `REGIONAL_MANAGER`: Tombol "Tetapkan Harga & Rilis ke Kontraktor" (Hijau `#008A00`) vs "Tolak Pengajuan" (Merah `#ED1C24`).
    - Validasi: Konfirmasi modal wajib muncul sebelum eksekusi aksi approval berisiko.

- [ ] **1.9 Kartu Pemantau Kuorum Rekanan Kontraktor (`VotingKontraktorMonitorCard.tsx`)**
  - **Path**: [`src/components/global/VotingKontraktorMonitorCard.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global/VotingKontraktorMonitorCard.tsx)
  - **Spesifikasi**:
    - Progress bar persentase kuorum (Target: minimal **50% + 1** rekanan aktif di cabang).
    - Countdown SLA Timer (3×24 jam) dengan indikator warna (Hijau > 24 jam, Kuning < 24 jam, Merah < 6 jam).
    - Rangkuman metrik: Total Rekanan Diundang, Setuju, Menolak/Banding, Belum Merespons.
    - Tabel status per rekanan: Nama PT Kontraktor, Status Vote, Tanggal Respon, Aksi lihat usulan banding (jika ada).

---

### Kategori 3: Unified Template & Entrypoint (`PengajuanDetailLayout.tsx`)

- [ ] **1.10 Layout Universal Halaman Detail (`PengajuanDetailLayout.tsx`)**
  - **Path**: [`src/components/global/PengajuanDetailLayout.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global/PengajuanDetailLayout.tsx)
  - **Spesifikasi**:
    - Menerima props item tiket dan slot aksi.
    - Merakit komponen secara vertikal:
      1. Back Button & Header Breadcrumb
      2. `PengajuanTimelineBar`
      3. `DetailSpesifikasiCard`
      4. `RincianSurvei3TokoCard` & `RingkasanBiayaMaterial` (hanya tampil jika status $\ge$ `SIAP_SURVEI`)
      5. `RincianKalkulasiKoefisien` (tampil jika sudah di-mastering SNB)
      6. `VotingKontraktorMonitorCard` (tampil saat tahap kuorum kontraktor)
      7. Slot Action Panel (`actionSlot`)
  - **Code Standard Check**: Responsif, terstruktur, zero code duplication.

- [ ] **1.11 Ekspor Index Global Components (`src/components/global/index.ts`)**
  - **Path**: [`src/components/global/index.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global/index.ts)
  - **Spesifikasi**: Barrel export seluruh komponen global agar dapat diimpor bersih melalui `@/components/global`.

---

## Checkpoint

- [ ] Seluruh file berada di folder [`src/components/global/`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/global) (bukan `/shared`).
- [ ] Menjalankan verifikasi typecheck: `pnpm exec tsc --noEmit` menghasilkan **0 error**.
- [ ] Seluruh komponen menggunakan styling resmi Alfamart (HEX Solid `#005BAC`, `#ED1C24`, `#FFD100`, dan pastel tints).
- [ ] Seluruh nominal rupiah diformat menggunakan font Geist Mono dengan kelas `tabular-nums`.
- [ ] Tidak ada penggunaan karakter em-dash (`—`) pada teks UI atau label tombol.

---

## Outcome

Setelah Fase 1 selesai, seluruh kontrak tipe data dan 8 blok bangunan UI utama telah tersedia di `src/components/global/`. Pengembang Person 2, Person 3, dan Person 4 dapat langsung mengimpor komponen-komponen ini untuk merakit halaman kerja masing-masing tanpa ada risiko bentrok desain atau duplikasi kode.
