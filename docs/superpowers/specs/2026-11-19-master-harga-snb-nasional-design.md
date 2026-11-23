# Desain Master Harga S&B Specialist Skala Nasional

**Tanggal:** 2026-11-19  
**Rute:** `/sb-specialist/master-harga`  
**Tujuan:** Menangani ratusan item (`SIP` & `ME`) serta puluhan cabang dan sub-wilayah nasional secara ringan, ringkas, dan cepat dipindai.

---

## 1. Halaman Utama `/sb-specialist/master-harga`

### A. Filter Utama (`FilterKatalog.tsx`)
- Search item (`q`: nama item, kode master, kode item, merk).
- Kelompok (`SIP` / `ME`).
- **Cabang (Searchable)**: menggunakan combobox yang dapat diketik (`react-select` solid style) agar cepat mencari di antara puluhan cabang nasional.
- Divisi (`Semua divisi` / `DIV-BLD`, `DIV-MNT`, `DIV-ENG`, `DIV-DC`).
- Kategori pekerjaan.
- Checkbox `Hanya ada harga wilayah`.
- *(Tanpa filter Regional.)*

### B. Tabel Utama (`MasterHargaClient.tsx`)
- Menghapus accordion in-table dan tombol `Buka Semua Cabang`.
- Kolom ringkas per baris `MasterItem`:
  1. **No**
  2. **Kelompok**: badge `SIP` / `ME` + `kodeItem`.
  3. **Item & Spesifikasi**: `namaItem`, `kodeMaster`, ringkasan spesifikasi, `Lokasi · Satuan`.
  4. **Kategori**: badge kategori + `namaDivisiUtama`.
  5. **Cakupan**: angka ringkas saja tanpa daftar chip cabang atau tag divisi — **`{totalCabangUnik} Cabang`**, **`{totalSlotAktif} Slot Divisi`**, dan **`{totalWilayah} Wilayah`** *(tampil bila `> 0`)*.
  6. **Rentang Harga**: harga tunggal atau `min – max` + `per {satuan}`.
  7. **Aksi**: tombol **`Lihat Harga`** yang membuka Modal Daftar Harga Cabang & Wilayah untuk item tersebut.

### C. Optimasi Query Halaman Utama (`getMasterHargaPerItem`)
- Server hanya mengambil data ringkasan per item pada halaman aktif (paginasi `20` item/halaman) menggunakan agregasi ringan (`cabangId` unik, `hargaFinalInduk`, hitungan wilayah aktif), **tanpa** eager-load penuh seluruh data relasi `MasterHargaWilayah` dan detail seluruh cabang ke payload halaman awal.

---

## 2. Modal Daftar Harga Cabang & Wilayah (On-Demand per Item)

Saat **`Lihat Harga`** diklik, modal terbuka dan memuat data cabang secara on-demand dari **`GET /api/sb-specialist/master-harga/item/[masterItemId]`**.

### A. Bar Filter di Dalam Modal
- **Auto-sync awal**: otomatis mewarisi filter `cabangId`, `divisiId`, dan `override` yang sedang aktif di halaman utama.
- Tersedia tombol **Reset Filter Modal** (untuk melihat seluruh cabang nasional item tersebut dengan 1 klik).
- Kontrol filter modal:
  - Search cabang / sub-wilayah (`qCabang`).
  - Filter Divisi.
  - Toggle `Hanya ada wilayah`.
  - Filter Cabang terpilih (ditandai dengan chip aktif + tombol reset jika terbawa dari halaman utama).

### B. Tampilan Data Cabang (Grouped & Paginated)
- Data di-paginate per cabang (`pageSize = 15` cabang per halaman modal) untuk menjaga responsivitas ketika item aktif di puluhan cabang.
- Setiap **Cabang Induk** ditampilkan dalam 1 kartu/grup rapi (`namaCabang`, `kodeCabang`, dan sub-info bila perlu):
  - Di dalam grup cabang terdapat daftar **Divisi Aktif** (`namaDivisi`, harga satuan, margin, tanggal berlaku & nomor tiket) beserta tombol **`Rincian`** (membuka Modal AHSP & Survei 3 Toko yang sudah ada via `GET /api/sb-specialist/master-harga/[id]`) dan **`Nonaktifkan`** (`setStatusHargaCabangAction`).
  - **Sub-Wilayah**: jika divisi tersebut memiliki override wilayah (`MasterHargaWilayah`), sub-baris wilayah langsung tampil rapi di bawah baris divisi (jika cabang memiliki > 3 wilayah, bisa di-expand/collapse per divisi atau cabang dengan toggle ringkas).

---

## 3. Verifikasi Rencana Implementasi
- `pnpm exec tsc --noEmit` (lulus tanpa error).
- `pnpm test:unit` (seluruh unit test lulus, tambah unit test helper aggregasi/pengelompokan cabang bila diekstrak).
- Tetap mematuhi aturan UI solid (`bg-white`, `border-2`, solid badge, `Swal.fire`), copy ringkas, serta tanpa Ekspor Excel / Cetak.
