# Phase 4: Operasional Cabang & Survei Lapangan (`tasks_phase_4_operasional_cabang.md`)

> **Prioritas**: 3 (P1 - Core Domain Workflow)  
> **Bobot Prioritas**: 85%  
> **Penanggung Jawab**: Pengambilalihan Pekerjaan Person 2 (Dev A - Operasional Cabang & Survei Lapangan)  
> **Target Folder**: [`master-harga-app/src/app/bm-manager/`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/app/bm-manager), [`master-harga-app/src/app/building-coordinator/`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/app/building-coordinator), [`master-harga-app/src/components/bm-manager/`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/bm-manager), [`master-harga-app/src/components/building-coordinator/`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/components/building-coordinator)  
> **Referensi Arsitektur**: [`flow-bisnis-dan-aplikasi.md`](../flow-bisnis-dan-aplikasi.md), [`project-spec.md`](../project-spec.md), [`design-system.md`](../design-system.md)

---

## Overview

Fase 4 berfokus pada pembangunan seluruh modul operasional cabang (**B&M Manager / PP Manager** dan **Building Coordinator**), mencakup:
1. **Inisiasi Permohonan Harga Satuan Cabang (`/bm-manager`)**:
   - Dashboard antrean tiket cabang (Induk Cabang vs Khusus Wilayah).
   - Modal formulir inisiasi pengajuan item baru atau pembaruan harga existing (*Review Ulang*).
   - Validasi duplikasi kode spesifikasi dan penentuan cakupan wilayah.
2. **Survei Lapangan 3 Toko Material (`/building-coordinator`)**:
   - Workspace antrean tiket `SIAP_SURVEI` dan `RETURNED_TO_BC`.
   - Formulir survei pasar 3 toko fisik berdasarkan resep komponen AHSP yang telah ditetapkan oleh S&B Specialist (`wajibSurveiToko = true`).
   - Komponen multi-upload berkas bukti fisik (foto nota/struk pembelian, foto toko tampak depan, dan foto sampel material).
   - Kalkulasi otomatis disparitas harga, perbandingan 3 toko, dan nilai rata-rata pasar acuan.
3. **Review Survei Layer 1 oleh B&M Manager (`/bm-manager/[id]`)**:
   - Halaman detail verifikasi perbandingan 3 toko pasar dan berkas nota menggunakan `PengajuanDetailLayout`.
   - Panel keputusan aksi (`ApprovalActionPanel`): Setujui ke S&B (`PENDING_SB_SPECIALIST`), Kembalikan ke BC (`RETURNED_TO_BC`), atau Tolak (`DITOLAK`).
4. **Master Toko Material Cabang (`/building-coordinator/master-toko`)**:
   - Direktori master toko rekanan survei cabang untuk mempermudah pemilihan toko berulang.
5. **Integrasi Shell Global**:
   - Seluruh halaman dibungkus dalam `AppLayoutShell` dengan sidebar dinamis dan top header resmi.

---

## Tasks

### Kategori 1: Modul Inisiasi & Review B&M Manager (`/bm-manager`)

- [ ] **4.1 Dashboard Utama B&M Manager (`src/app/bm-manager/page.tsx`)**
  - **Path**: [`src/app/bm-manager/page.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/app/bm-manager/page.tsx)
  - **Spesifikasi**:
    - Dibungkus dengan `AppLayoutShell` (role: `BM_MANAGER`, breadcrumbs: `Dashboard Cabang`).
    - Kartu metrik statistik cabang: Total Tiket Diajukan, Sedang Survei (BC), Menunggu Review BM, Selesai Rilis.
    - Filter berdasarkan Divisi (Building, Engineering, Maintenance, DC) dan Status Tiket.
    - Tabel antrean tiket dengan kolom: Nomor Tiket, Item/Pekerjaan, Divisi, Cakupan (Induk / Wilayah), Status Badge (Solid bold), Tanggal Pengajuan, Aksi Detail.
    - Tombol aksi utama: **"Buat Pengajuan Harga"** (Solid Alfa Blue `#005BAC`).

- [ ] **4.2 Modal Form Inisiasi Penetapan Harga (`ModalRequestPenetapanHarga.tsx`)**
  - **Path**: `src/components/bm-manager/ModalRequestPenetapanHarga.tsx`
  - **Spesifikasi**:
    - Pilihan Tipe: **Item Spesifikasi Baru** vs **Update/Review Harga Existing**.
    - Pilihan Divisi (dropdown dari tabel `Divisi`).
    - Pilihan Cakupan Harga: `INDUK_CABANG` atau `KHUSUS_WILAYAH` (jika dipilih, muncul dropdown `WilayahCabang`).
    - Input Spesifikasi Fisik: Kategori, Nama Item, Merk, Ukuran, Tipe, Warna, Lokasi Toko, Satuan Ukur.
    - Checkbox / Toggle: *"Termasuk Pekerjaan Bongkaran?"*.
    - Alasan Pengajuan & Upload Dokumen Spesifikasi Awal (opsional).
    - Validasi form ketat: seluruh field wajib diisi sebelum tombol submit aktif.

- [ ] **4.3 API Route Pengajuan Tiket Cabang (`/api/pengajuan`)**
  - **Path**: `src/app/api/pengajuan/route.ts`
  - **Spesifikasi**:
    - `GET`: Mengambil daftar tiket milik cabang pengguna yang sedang login (dengan filter divisi, status, pencarian).
    - `POST`: Menyimpan tiket pengajuan baru berstatus `DIAJUKAN`, menautkan `masterItemId` (jika existing) atau membuat draft item baru, serta mencatat `ApprovalAuditLog` inisiasi.

- [ ] **4.4 Halaman Detail Review Survei BM Manager (`src/app/bm-manager/[id]/page.tsx`)**
  - **Path**: `src/app/bm-manager/[id]/page.tsx`
  - **Spesifikasi**:
    - Menggunakan `PengajuanDetailLayout` dengan parameter `role="BM_MANAGER"`.
    - Memeriksa keabsahan harga 3 toko material (`RincianSurvei3TokoCard`) dan ringkasan disparitas (`RingkasanBiayaMaterial`).
    - Slot aksi `ApprovalActionPanel`:
      - Tombol **"Setujui Hasil Survei & Teruskan ke S&B"** $\rightarrow$ transisi ke `PENDING_SB_SPECIALIST`.
      - Tombol **"Kembalikan ke BC (Perlu Survei Ulang)"** $\rightarrow$ transisi ke `RETURNED_TO_BC` + modal catatan perbaikan.
      - Tombol **"Tolak Pengajuan"** $\rightarrow$ transisi ke `DITOLAK`.

---

### Kategori 2: Modul Survei Lapangan Building Coordinator (`/building-coordinator`)

- [ ] **4.5 Workspace Antrean Survei BC (`src/app/building-coordinator/page.tsx`)**
  - **Path**: [`src/app/building-coordinator/page.tsx`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/app/building-coordinator/page.tsx)
  - **Spesifikasi**:
    - Dibungkus dengan `AppLayoutShell` (role: `BUILDING_COORDINATOR`, breadcrumbs: `Survei Pasar`).
    - Tab navigasi status:
      - **Siap Survei** (`SIAP_SURVEI`): Menampilkan tiket yang resep AHSP-nya telah dikunci S&B Specialist dan menunggu input harga pasar.
      - **Perlu Revisi** (`RETURNED_TO_BC`): Tiket yang dikembalikan oleh BM Manager karena data toko kurang lengkap atau janggal.
      - **Riwayat Survei**: Tiket yang surveinya sudah dikirim ke BM.
    - Tabel antrean survei dengan tombol aksi: **"Input Survei 3 Toko"** (Solid Alfa Blue).

- [ ] **4.6 Formulir Input Survei 3 Toko Pasar (`src/app/building-coordinator/[id]/survei/page.tsx`)**
  - **Path**: `src/app/building-coordinator/[id]/survei/page.tsx`
  - **Spesifikasi**:
    - Membaca daftar komponen material dari resep AHSP tiket terkait yang memiliki `wajibSurveiToko = true`.
    - Form 3 kolom berdampingan (*Toko 1, Toko 2, Toko 3*):
      - Nama Toko (bisa pilih dari Master Toko atau ketik baru).
      - Alamat Toko & Kota.
      - Nomor Telepon / Kontak PIC Toko.
      - Tanggal Pelaksanaan Survei.
      - Input Harga Satuan Barang Acuan per komponen material.
      - Catatan ketersediaan stok & syarat pengiriman toko.
    - Kalkulator Disparitas Real-time:
      - Menghitung otomatis Harga Terendah, Harga Tertinggi, Persentase Disparitas, dan Rata-Rata Acuan Pasar.
      - Menampilkan peringatan warna oranye/merah jika selisih harga antar-toko $> 15\%$.

- [ ] **4.7 Komponen Multi-Upload Berkas Survei (`MultiUploadLampiranSurvei.tsx`)**
  - **Path**: `src/components/building-coordinator/MultiUploadLampiranSurvei.tsx`
  - **Spesifikasi**:
    - Wadah upload berkas untuk masing-masing toko:
      - Tipe `NOTA_PEMBELIAN` (Wajib, minimal 1 berkas per toko: foto struk/nota/faktur pembelian resmi).
      - Tipe `FOTO_TOKO` (Foto plang toko atau tampak depan toko).
      - Tipe `FOTO_MATERIAL` (Foto sampel barang atau label kemasan).
    - Pratinjau berkas (thumbnail) dengan indikator ukuran dan tombol hapus.
    - Validasi: Format gambar JPEG/PNG/PDF, ukuran maksimal 5 MB per berkas.

- [ ] **4.8 API Endpoint Submit Survei & Upload Berkas (`/api/survei`)**
  - **Path**: `src/app/api/survei/route.ts` & `src/app/api/survei/upload/route.ts`
  - **Spesifikasi**:
    - Menyimpan data 3 toko ke tabel `SurveiTokoItem`.
    - Menyimpan metadata lampiran ke tabel `LampiranSurvei`.
    - Mengkalkulasi dan memperbarui `rataRataSurveiMaterial` pada tiket `PengajuanHarga`.
    - Memajukan status tiket dari `SIAP_SURVEI` / `RETURNED_TO_BC` ke `PENDING_BM_MGR` via `advanceTicketStatus` dengan audit log.

---

### Kategori 3: Manajemen Master Toko Cabang (`/building-coordinator/master-toko`)

- [ ] **4.9 Halaman Direktori Master Toko (`src/app/building-coordinator/master-toko/page.tsx`)**
  - **Path**: `src/app/building-coordinator/master-toko/page.tsx`
  - **Spesifikasi**:
    - Daftar toko material terdaftar pada cabang terkait (Tabel: Nama Toko, Alamat, Wilayah/Kota, Kontak PIC, No Telp, Status Aktif).
    - Tombol "Tambah Toko Baru" memicu modal form penambahan toko ke tabel `MasterToko`.
    - API Route `POST` & `GET` di `/api/master-toko`.

---

## Checkpoint

- [ ] BM Manager dapat membuat pengajuan baru dan melihat antrean tiket cabangnya.
- [ ] Building Coordinator dapat melihat tiket yang berstatus `SIAP_SURVEI`, menginput survei 3 toko fisik, dan mengunggah berkas nota pembelian.
- [ ] Rata-rata harga pasar dan disparitas terkalkulasi otomatis dengan presisi `Decimal`.
- [ ] BM Manager dapat meninjau hasil survei 3 toko dan meneruskan ke S&B Specialist (`PENDING_SB_SPECIALIST`) atau mengembalikan ke BC (`RETURNED_TO_BC`).
- [ ] Seluruh antarmuka menggunakan `AppLayoutShell` (sidebar dinamis + header resmi) dan mematuhi aturan *ui_solid_anti_slop* (100% solid surfaces, 2px borders, SweetAlert2 alerts).
- [ ] Menjalankan verifikasi typecheck: `pnpm exec tsc --noEmit` menghasilkan **0 error**.

---

## Outcome

Setelah Fase 4 selesai, seluruh siklus operasional cabang (mulai dari inisiasi oleh B&M Manager, pelaksanaan survei 3 toko fisik oleh Building Coordinator, multi-upload nota, hingga verifikasi survei Layer 1) berfungsi penuh secara nyata dengan database PostgreSQL dan antarmuka enterprise berstandar solid Alfamart.
