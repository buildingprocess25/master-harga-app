# Desain Master Harga (View SNB vs BNM), Aktivasi Lintas Divisi, & Pemisahan Kontraktor vs Rekanan

Tanggal: 2026-11-18  
Status: Menunggu Persetujuan User

## 1. Latar Belakang & Tujuan
1. **Perbedaan Tampilan Master Harga SNB vs BNM**:
   - **S&B Specialist (`/sb-specialist/master-harga`)**: Melihat seluruh item rilis (`SIP` & `ME`) yang dikelompokkan **per Item**, dengan informasi cabang & divisi mana saja yang aktif serta harga induk + harga khusus wilayah per cabangnya masing-masing.
   - **B&M Manager (`/bm-manager/katalog-harga`)**: Melihat seluruh item rilis (`SIP` & `ME`), **tanpa menampilkan harga dari cabang lain**. Harga hanya ditampilkan untuk cabang milik BNM itu sendiri.
   - **Tanpa Ekspor Excel & Cetak**: Tombol Ekspor Excel dan Cetak/PDF belum ditampilkan pada halaman Master Harga SNB dan BNM.
2. **Alur Pengaktifan Item di Cabang / Divisi yang Belum Aktif**:
   - Mendukung kasus saat BNM ingin mengaktifkan item rilis untuk cabangnya sendiri, maupun mengaktifkan item yang **sudah aktif di Building** pada cabangnya tetapi **belum aktif di Maintenance atau Engineering** (atau DC).
   - Memicu **proses pengajuan penuh per divisi** via `TambahPengajuanModal` yang terisi otomatis (spesifikasi + referensi komponen material) dengan divisi tujuan terarah ke divisi yang belum aktif -> SNB (AHSP & Margin) -> Survei BC (bila diperlukan) -> Regional -> Kuorum Vendor divisi tujuan.
3. **Pemisahan Entitas Kontraktor (Building/DC) vs Rekanan (Maintenance & Engineering)**:
   - Pada tahap persetujuan kuorum vendor:
     - **Divisi Building (`DIV-BLD`) & DC (`DIV-DC`)** -> dikirim ke **Kontraktor**.
     - **Divisi Maintenance (`DIV-MNT`) & Engineering (`DIV-ENG`)** -> dikirim ke **Rekanan**.
   - Kontraktor dan Rekanan adalah dua entitas vendor yang terpisah secara data & relasi divisi, menggunakan mekanisme kuorum 50%+1 yang sama.

## 2. Non-Goals (Di Luar Lingkup Saat Ini)
- Tidak menambahkan fitur Ekspor Excel maupun Cetak / PDF pada halaman Master Harga SNB (`/sb-specialist/master-harga`) dan BNM (`/bm-manager/katalog-harga`).
- Tidak memisahkan portal menjadi dua aplikasi login berbeda selama mekanisme kuorum 50%+1 masih sama; pemisahan dijaga di level entitas data, kode vendor, relasi divisi, dan label UI.

## 3. Pendekatan Arsitektur yang Dipilih

### A. Skema Database (`prisma/schema.prisma`)
1. **Pemisahan `MasterHargaCabang` per Divisi**:
   - Menambahkan kolom `divisiId` pada `MasterHargaCabang` dengan relasi ke `Divisi`.
   - Mengubah constraint unik dari `@@unique([masterItemId, cabangId])` menjadi `@@unique([masterItemId, cabangId, divisiId])`.
   - Migrasi data existing: setiap baris `MasterHargaCabang` yang sudah ada diisi `divisiId` dari `pengajuanTerakhir.divisiId ?? masterItem.divisiId`.
   - Menyesuaikan seluruh query unik `masterItemId_cabangId` di `kuorum-service.ts`, `regional-service.ts`, `margin-service.ts`, `seed.ts`, dan integration test menjadi `masterItemId_cabangId_divisiId`.
2. **Pembeda Entitas `JenisMitra` pada `Kontraktor`**:
   - Menambahkan enum `JenisMitra { KONTRAKTOR REKANAN }` dan kolom `jenisMitra JenisMitra @default(KONTRAKTOR)` pada model `Kontraktor` (kode vendor `KTR-XXX` untuk `KONTRAKTOR`, `RKN-XXX` untuk `REKANAN`).
   - **Alasan 1 tabel + `jenisMitra` (bukan 2 tabel terpisah)**: Atribut profil, autentikasi `User.kontraktorId`, relasi cabang-divisi `KontraktorCabang`, histori `VotingKontraktor`, lampiran banding, dan mekanisme parked/unpark identik. Pemisahan tabel fisik akan memecah foreign key `User` & `VotingKontraktor` menjadi FK ganda nullable atau menduplikasi seluruh tabel dan servis kuorum. Dengan `jenisMitra`, integritas relasional tetap terjaga sambil memisahkan data dan penugasan Kontraktor vs Rekanan secara ketat.
   - **Aturan Wajib di Layanan Kuorum & Seed**:
     - `DIV-BLD` dan `DIV-DC` hanya boleh berelasi dan mengundang `kontraktor.jenisMitra = "KONTRAKTOR"`.
     - `DIV-MNT` dan `DIV-ENG` hanya boleh berelasi dan mengundang `kontraktor.jenisMitra = "REKANAN"`.
     - Query `teruskanKeKontraktor`, `hitungRekananAktif`, dan `cekPrasyaratKuorum` memfilter `kontraktorCabang` berdasarkan `(cabangId, divisiId, statusKeaktifan: "AKTIF", kontraktor: { jenisMitra: requiredJenisMitra })` sesuai divisi tiket.
     - Label UI di portal vendor (`/kontraktor`), monitoring (`VotingKontraktorMonitorCard`), dashboard SNB/Regional/BM, dan error message menyesuaikan secara dinamis (`"Kontraktor"` untuk Building/DC vs `"Rekanan"` untuk Maintenance/Engineering).

### B. Service Layer & Keamanan Data (`master-harga-service.ts`)
- Menambah dukungan filter `kelompok?: "SIP" | "ME"` (`kodeItem` `startsWith` `"SIP-"` atau `"ME-"`).
- **`getMasterHargaPerItem(filter, page)` (View SNB)**:
  - Query `MasterItem` yang memiliki minimal 1 `MasterHargaCabang` berstatus `AKTIF` sesuai filter (`q`, `kelompok`, `cabangId`, `divisiId`, `kategori`, `hanyaOverride`).
  - Mengembalikan baris terkelompok per `MasterItem` lengkap dengan: `kelompokKode` (`SIP`/`ME`), daftar ringkas cabang+divisi aktif, rentang harga `minHarga`–`maxHarga`, serta daftar lengkap `hargaCabangList` (`id`, `namaCabang`, `kodeCabang`, `regional`, `divisiId`, `kodeDivisi`, `namaDivisi`, `harga`, `marginPersen`, `berlakuSejak`, `nomorTiket`, `wilayahList`).
- **`getMasterHargaUntukBm(cabangId, filter, page)` (View BNM)**:
  - Query seluruh `MasterItem` yang sudah rilis (memiliki minimal 1 harga `AKTIF` di sistem) sesuai filter (`q`, `kelompok`, `divisiId`, `kategori`, `statusCabangSaya`).
  - **Isolasi Server-Side**: Query harga cabang hanya memfilter `where: { cabangId, statusHarga: "AKTIF" }`. Data harga cabang lain **tidak pernah diambil maupun dikirim** ke respons BNM.
  - Mengembalikan status per divisi (`DIV-BLD`, `DIV-MNT`, `DIV-ENG`, `DIV-DC`) di cabang BNM (`aktif`, `hargaCabangId`, `hargaInduk`, `wilayahList`, atau `belumAktif`), plus data spesifikasi lengkap & `refKomponenMaterial` (daftar komponen Bahan/Alat dari resep `pengajuanTerakhir` tanpa nominal harga cabang lain) untuk keperluan pre-fill pengajuan.

### C. Desain UI

#### 1. View S&B Specialist (`/sb-specialist/master-harga`)
- Header tanpa tombol Ekspor Excel & Cetak.
- Filter: Pencarian (`q`), **Kelompok (`Semua` / `SIP` / `ME`)**, Cabang, Divisi, Kategori, Checkbox Harga Khusus Wilayah.
- Tabel Accordion per `MasterItem`:
  - Baris utama: `No | Kelompok (SIP/ME) & Kode | Item Pekerjaan & Spesifikasi | Kategori & Divisi Utama | Info Cabang & Divisi Aktif (badge jumlah & daftar ringkas) | Rentang Harga | Tombol Expand`.
  - Isi Expand: tabel rincian tiap `(Cabang, Divisi)` aktif lengkap dengan sub-baris Khusus Wilayah, harga satuan, margin, berlaku sejak, tiket rilis, tombol **Rincian** (AHSP & survei 3 toko via `/api/sb-specialist/master-harga/[id]`), dan tombol **Nonaktifkan**.

#### 2. View B&M Manager (`/bm-manager/katalog-harga`)
- Header & KPI: Jumlah Item Katalog Rilis (`SIP`/`ME`), Item Aktif di Cabang Anda, Item Belum Aktif / Belum Lengkap Divisinya. Tanpa tombol Ekspor Excel & Cetak.
- Filter: Pencarian (`q`), **Kelompok (`Semua` / `SIP` / `ME`)**, Divisi, Kategori, Status di Cabang Saya (`Semua Item` / `Aktif di Cabang Saya` / `Belum Aktif / Sebagian Divisi`) — tanpa dropdown filter cabang lain.
- Tabel per `MasterItem`:
  - Kolom: `No | Kelompok (SIP/ME) & Kode | Item & Spesifikasi | Kategori | Status & Harga di Cabang Anda (per Divisi: BLD / MNT / ENG / DC) | Aksi`.
  - Di kolom Status & Harga:
    - Untuk divisi yang **Aktif** di cabang BNM: menampilkan badge divisi hijau + nominal `hargaInduk` cabang BNM (dan `hargaWilayah` cabang BNM bila ada).
    - Untuk divisi yang **Belum Aktif** di cabang BNM: menampilkan badge divisi netral `"Belum Aktif"` tanpa harga apa pun.
  - Kolom Aksi:
    - Tombol **Spesifikasi** (modal detail spesifikasi item; hanya menampilkan harga cabangnya sendiri untuk divisi yang sudah aktif di cabang BNM, nol info harga cabang lain).
    - Jika masih ada minimal 1 divisi yang belum aktif di cabang BNM: tombol **"Ajukan Aktivasi"** (bisa klik langsung dari dropdown/pilihan divisi yang belum aktif atau langsung membuka pengajuan dengan divisi yang belum aktif terpilih otomatis).

#### 3. Alur Aktivasi dari `/bm-manager/katalog-harga` ke `TambahPengajuanModal`
- Klik **"Ajukan Aktivasi"** mengarahkan ke `/bm-manager?aktivasiMasterItemId=<masterItemId>&targetDivisiId=<optionalDivisiId>`.
- Halaman `/bm-manager/page.tsx` membaca query param tersebut, mengambil detail spesifikasi & komponen referensi item (lewat server/API khusus yang terisolasi tanpa harga cabang lain), lalu otomatis membuka `TambahPengajuanModal`:
  - Seluruh kolom spesifikasi item (`kelompokKode`, `kategori`, `jenisCor`, `namaItem`, `ukuran`, `merk`, `tipe`, `warna`, `permukaan`, `tebal`, `toleransi`, `lokasi`) terisi otomatis dan dikunci/ditandai sebagai aktivasi dari `MasterItem` (`mode: "aktivasi"`, `masterItemId`), agar tidak membuat `MasterItem` duplikat.
  - `selectedDivisiIds` otomatis memprioritaskan divisi yang belum aktif di cabang BNM (divisi yang sudah aktif ditandai/terkunci tidak perlu diajukan ulang kecuali memang belum aktif).
  - Komponen Material (Bahan & Peralatan) dari resep referensi terisi otomatis bila ada (tetap bisa ditambah/diubah oleh BNM).
- Submit mengirim ke `POST /api/pengajuan` (`mode: "aktivasi"`, `masterItemId`) -> menghasilkan tiket `DIAJUKAN` pada cabang & divisi tujuan, melewati alur penuh (SNB -> Survei BC bila perlu -> Regional -> Kuorum Kontraktor untuk `DIV-BLD`/`DIV-DC` atau Kuorum Rekanan untuk `DIV-MNT`/`DIV-ENG`).
