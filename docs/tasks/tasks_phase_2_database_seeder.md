# Phase 2: Database Seeder & Local Testing Environment (`tasks_phase_2_database_seeder.md`)

> **Prioritas**: 2 (P1 - Data Baseline & Local Environment)  
> **Bobot Prioritas**: 85%  
> **Penanggung Jawab**: Person 1 (Tech Lead / Core Platform)  
> **Target File**: [`master-harga-app/prisma/seed.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/prisma/seed.ts)  
> **Referensi Arsitektur**: [`database-schema-erd.md`](../database-schema-erd.md), [`project-spec.md`](../project-spec.md)

---

## Overview

Fase 2 berfokus pada penyediaan data uji relasional yang solid di PostgreSQL lokal dan lingkungan pengujian instan bagi tim pengembang:
1. **Master Database Seeder (`prisma/seed.ts`)**: Mengisi data master baku terstandarisasi untuk 4 Divisi Alfamart (Building, Engineering, Maintenance, DC), Cabang dan Sub-Wilayah, Pustaka Koefisien Baku, Rekanan Kontraktor, serta Akun Whitelist untuk semua peran.
2. **Sampel Tiket Berbagai Tahapan**: Menyediakan data tiket pengajuan harga nyata pada berbagai status (`DIAJUKAN`, `SIAP_SURVEI`, `PENDING_BM_MGR`, `PENDING_SB_SPECIALIST`, `PENDING_KONTRAKTOR`, dan `RELEASED`).
3. **Dev Role Switcher (`DevRoleSwitcher.tsx`)**: Komponen switcher cepat berbasis cookie lokal (hanya aktif di `NODE_ENV === 'development'`) sehingga seluruh anggota tim dapat berganti peran secara instan untuk menguji antarmuka tanpa harus bolak-balik login ke portal SSO produksi.

---

## Tasks

### Kategori 1: Master Database Seeder (`prisma/seed.ts`)

- [x] **2.1 Script Seed Divisi & Master Cabang**
  - **Path**: [`prisma/seed.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/prisma/seed.ts)
  - **Spesifikasi**:
    - Seed 4 Divisi baku:
      - `DIV-BLD`: Building (Konstruksi & Sipil)
      - `DIV-ENG`: Engineering (M/E & HVAC)
      - `DIV-MNT`: Maintenance (Perawatan Gedung & Toko)
      - `DIV-DC`: Distribution Center (Fasilitas Logistik)
    - Seed Cabang Alfamart:
      - `CKK`: Cabang Cikokol (Regional Jabodetabek 1)
      - `BLR`: Cabang Balaraja (Regional Jabodetabek 2)
      - `BDG`: Cabang Bandung (Regional Jawa Barat)
    - Seed Sub-Wilayah di bawah Cabang Cikokol (`WilayahCabang`):
      - Wilayah Serang
      - Wilayah Pandeglang
      - Wilayah Rangkasbitung / Lebak
  - **Code Standard Check**: Menggunakan `prisma.divisi.upsert()` dan `prisma.cabang.upsert()` untuk mencegah duplikasi data jika seeder dijalankan berulang kali.

- [x] **2.2 Seed Pustaka Koefisien Baku (`MasterKoefisien`)**
  - **Path**: [`prisma/seed.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/prisma/seed.ts)
  - **Spesifikasi**:
    - Pustaka komponen upah tenaga kerja: Mandor (Oh), Kepala Tukang (Oh), Tukang (Oh), Pekerja (Oh).
    - Pustaka komponen material umum: Semen Portland (Kg), Pasir Pasang (M3), Keramik 60x60 (M2), Cat Dinding Eksterior (Kg), Cat Plafon (Kg), Gypsum Board 9mm (Lbr).
    - Pustaka peralatan & bongkaran: Sewa Scaffolding (Set/Hari), Bongkaran Keramik Eksisting (M2), Buang Puing Proyek (Rit).

- [x] **2.3 Seed Master Spesifikasi Item Baku (`MasterItem`)**
  - **Path**: [`prisma/seed.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/prisma/seed.ts)
  - **Spesifikasi**:
    - `SIP-001`: Pekerjaan Lantai Keramik Homogeneous Tile 60x60 Polish
    - `SIP-002`: Pengecatan Dinding Interior & Partisi
    - `ME-001`: Pemasangan Lampu LED Tube T8 16 Watt
    - `MNT-001`: Perbaikan & Pengecatan Rolling Door Manual

- [x] **2.4 Seed Master Kontraktor & Penugasan Cabang (`KontraktorCabang`)**
  - **Path**: [`prisma/seed.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/prisma/seed.ts)
  - **Spesifikasi**:
    - Rekanan Aktif 1: PT Cahaya Mandiri Perkasa (`AKTIF`)
    - Rekanan Aktif 2: PT Sinar Mitra Konstruksi (`AKTIF`)
    - Rekanan Aktif 3: CV Graha Indah Mandiri (`AKTIF`)
    - Rekanan Parked: PT Rekanan Nonaktif Bersyarat (`NONAKTIF_SEMENTARA`, untuk menguji fitur Unpark)

- [x] **2.5 Seed Akun Pengguna Whitelist Sesuai Role (`User`)**
  - **Path**: [`prisma/seed.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/prisma/seed.ts)
  - **Spesifikasi**:
    - Building Coordinator: `bc.cikokol@alfamart.co.id` (Cabang Cikokol, Divisi Building)
    - B&M Manager: `bm.cikokol@alfamart.co.id` (Cabang Cikokol)
    - S&B Specialist HO: `snb.specialist@alfamart.co.id` (Head Office)
    - Regional Manager: `reg.manager1@alfamart.co.id` (Regional Jabodetabek)
    - Kontraktor User: `vendor.cahaya@rekanan.com` (Terikat ke PT Cahaya Mandiri Perkasa)
    - Super Admin: `admin.harga@alfamart.co.id`

- [x] **2.6 Seed Sampel Tiket Siklus Pengajuan Lengkap (`PengajuanHarga`)**
  - **Path**: [`prisma/seed.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/prisma/seed.ts)
  - **Spesifikasi**:
    - Tiket 1: Status `DIAJUKAN` (Baru dibuat oleh BM Cikokol, menunggu validasi SNB).
    - Tiket 2: Status `SIAP_SURVEI` (Sudah di-mastering koefisiennya oleh SNB, menunggu input survei 3 toko oleh BC).
    - Tiket 3: Status `PENDING_BM_MGR` (Survei 3 toko sudah diinput BC, menunggu review BM).
    - Tiket 4: Status `PENDING_KONTRAKTOR` (Sedang dalam tahap voting kuorum rekanan 50%+1).
    - Tiket 5: Status `RELEASED` (Harga resmi induk Cabang Cikokol).
    - Tiket 6: Status `RELEASED` dengan `CakupanHarga: KHUSUS_WILAYAH` (Harga override Wilayah Serang).

---

### Kategori 2: Konfigurasi Database Runner

- [x] **2.7 Konfigurasi Script Pnpm Database Seeder Runner**
  - **Path**: [`package.json`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/package.json) & [`prisma.config.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/prisma.config.ts)
  - **Spesifikasi**:
    - Memastikan perintah `pnpm db:seed` mengeksekusi `tsx ./prisma/seed.ts` secara andal.
    - Mengisi data master baku, akun whitelist, dan 6 sampel tiket siklus pengajuan.

---

## Checkpoint

- [x] Menjalankan eksekusi seeder: `pnpm db:seed` berhasil dengan status exit code 0 tanpa error.
- [x] Memeriksa database: Seluruh 13 tabel relasional memiliki data uji realistis.
- [x] Menjalankan `pnpm exec tsc --noEmit` menghasilkan **0 error**.

---

## Outcome

Setelah Fase 2 selesai, setiap pengembang dalam tim memiliki database lokal yang terisi data relasional Alfamart yang valid dan representatif. Tidak ada lagi ketergantungan pada data palsu manual (*hardcoded mocks*), dan pengujian alur kerja approval lintas-peran dapat dilakukan langsung di laptop masing-masing.
