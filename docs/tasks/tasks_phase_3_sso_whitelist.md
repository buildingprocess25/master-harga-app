# Phase 3: SSO Whitelist Engine, Route Guard & State Machine (`tasks_phase_3_sso_whitelist.md`)

> **Prioritas**: 3 (P2 - Security & Integration Gate)  
> **Bobot Prioritas**: 75%  
> **Penanggung Jawab**: Person 1 (Tech Lead / Core Platform)  
> **Target File**: [`src/app/api/auth/sso/callback/route.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/app/api/auth/sso/callback/route.ts), [`src/middleware.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/middleware.ts), [`src/lib/auth/`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/lib/auth), [`src/lib/services/`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/lib/services)  
> **Referensi Arsitektur**: [`project-spec.md`](../project-spec.md) (Bagian 3: Zero-Trust Whitelist)

---

## Overview

Fase 3 berfokus pada penguncian gerbang keamanan enterprise, integrasi SSO, otorisasi ketat berbasis whitelist, dan pengendalian siklus transisi status tiket:
1. **SSO Token Exchange Handler (`/api/auth/sso/callback`)**: Menerima `launchToken` dari portal pusat `login-sparta`, menukarkan token via `POST /v1/sso/exchange`, dan mendapatkan identitas pengguna terverifikasi.
2. **Zero-Trust Whitelist Verification**: Memeriksa keberadaan pengguna di tabel `User` lokal (*Zero Auto-Provisioning*). Pengguna yang belum didaftarkan oleh Admin HO langsung ditolak dengan status `403 Forbidden`.
3. **Session Management & Role Auto-Redirect Middleware**: Membuat session cookie terenkripsi dan mengarahkan pengguna secara otomatis ke *workspace* perannya masing-masing (menghilangkan selector peran manual).
4. **State Machine Core Service & Audit Logger**: Service terpusat yang menjamin integritas alur status tiket dan mencatat setiap aksi ke tabel `RiwayatAuditHarga`.

---

## Tasks

### Kategori 1: Integrasi SSO & Otorisasi Whitelist

- [x] **3.1 Session Token & Cookie Utility (`src/lib/auth/session.ts`)**
  - **Path**: [`src/lib/auth/session.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/lib/auth/session.ts)
  - **Spesifikasi**:
    - Membuat payload session terenkripsi: `id`, `email`, `fullName`, `role`, `divisiId`, `cabangId`, `kontraktorId`.
    - Helper fungsi: `createSessionCookie()`, `getSessionUser()`, `clearSessionCookie()`.
    - Durasi TTL sesi: 8 jam (standar jam kerja shift Alfamart).
  - **Code Standard Check**: Menggunakan cookie HTTP-only, SameSite Strict, Secure pada environment non-local.

- [x] **3.2 Whitelist Verification Service (`src/lib/services/whitelist-service.ts`)**
  - **Path**: [`src/lib/services/whitelist-service.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/lib/services/whitelist-service.ts)
  - **Spesifikasi**:
    - Query Prisma: `prisma.user.findUnique({ where: { email, isActive: true }, include: { divisi: true, cabang: true, kontraktor: true } })`.
    - Validasi:
      - Jika email **tidak ditemukan** atau `isActive === false`: Lempar pengecualian `UnauthorizedWhitelistError` (403 Forbidden).
      - Jika email **ditemukan & aktif**: Kembalikan profil wewenang lokal pengguna.
    - Kebijakan tegas: Dilarang melakukan *upsert* atau *auto-create user* baru dari data SSO.

- [x] **3.3 Route Handler Callback SSO (`src/app/api/auth/sso/callback/route.ts`)**
  - **Path**: [`src/app/api/auth/sso/callback/route.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/app/api/auth/sso/callback/route.ts)
  - **Spesifikasi**:
    - Menerima parameter `launchToken` dari redirect portal `login-sparta`.
    - Memanggil endpoint pertukaran token:
      ```typescript
      POST ${process.env.SPARTA_AUTH_SERVICE_URL}/v1/sso/exchange
      Headers: { "Content-Type": "application/json" }
      Body: { moduleId: "harga", launchToken }
      ```
    - Memvalidasi respons identitas pengguna (`email`, `fullName`, `branch`).
    - Memanggil `whitelist-service.ts` untuk pengecekan hak akses lokal.
    - Jika valid: Buat session cookie dan redirect ke halaman utama `/` (yang akan diteruskan oleh middleware ke workspace role).
    - Jika tidak valid (403): Render halaman respons penolakan ramah pengguna: *"Akun Anda belum terdaftar di modul SPARTA-HARGA. Silakan hubungi Tim S&B Controlling HO."*

- [x] **3.4 Endpoint Logout (`src/app/api/auth/logout/route.ts`)**
  - **Path**: [`src/app/api/auth/logout/route.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/app/api/auth/logout/route.ts)
  - **Spesifikasi**: Menghapus session cookie dan mengarahkan pengguna kembali ke portal utama SPARTA.

---

### Kategori 2: Middleware & Routing Otomatis Sesuai Role

- [x] **3.5 Next.js Edge Middleware Auto-Redirect (`src/middleware.ts`)**
  - **Path**: [`src/middleware.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/middleware.ts)
  - **Spesifikasi**:
    - Proteksi seluruh rute privat (kecuali rute statis `/_next/`, `/public/`, `/api/auth/`).
    - Membaca session pengguna (atau `sparta_dev_user` jika `NODE_ENV === 'development'`).
    - Auto-Redirect pada rute akar (`/`):
      - `BUILDING_COORDINATOR` $\rightarrow$ arahkan ke `/building-coordinator`
      - `BM_MANAGER` $\rightarrow$ arahkan ke `/bm-manager`
      - `SB_SPECIALIST` $\rightarrow$ arahkan ke `/sb-specialist`
      - `REGIONAL_MANAGER` $\rightarrow$ arahkan ke `/regional-manager`
      - `KONTRAKTOR` $\rightarrow$ arahkan ke `/kontraktor`
      - `ADMIN` $\rightarrow$ arahkan ke `/master-harga`
    - Role Isolation Guard: Mencegah pengguna peran `KONTRAKTOR` mengakses halaman internal seperti `/sb-specialist` atau `/bm-manager`.

---

### Kategori 3: State Machine Service & Audit Logging

- [x] **3.6 State Machine Core Service (`src/lib/services/state-machine.ts`)**
  - **Path**: [`src/lib/services/state-machine.ts`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/lib/services/state-machine.ts)
  - **Spesifikasi**:
    - Matriks validasi transisi status:
      - `DIAJUKAN` $\rightarrow$ hanya bisa ke `SIAP_SURVEI` (oleh SNB) atau `PERLU_REVISI` / `DITOLAK`.
      - `SIAP_SURVEI` $\rightarrow$ hanya bisa ke `PENDING_BM_MGR` (setelah survei 3 toko BC lengkap).
      - `PENDING_BM_MGR` $\rightarrow$ hanya bisa ke `PENDING_SB_SPECIALIST` atau `RETURNED_TO_BC`.
      - `PENDING_SB_SPECIALIST` $\rightarrow$ hanya bisa ke `PENDING_REGIONAL_MGR` atau `PERLU_REVISI`.
      - `PENDING_REGIONAL_MGR` $\rightarrow$ hanya bisa ke `PENDING_KONTRAKTOR` atau `DITOLAK`.
      - `PENDING_KONTRAKTOR` $\rightarrow$ hanya bisa ke `RELEASED` (kuorum tercapai) atau `USULAN_KONTRAKTOR` / `DITOLAK_KONTRAKTOR`.
    - Fungsi `advanceTicketStatus(ticketId, newStatus, actorUserId, catatan, prismaTx)`.
    - Otomatis membuat record baru di tabel `RiwayatAuditHarga` pada setiap perubahan status.

---

## Checkpoint

- [x] Pengujian API Whitelist: Percobaan login dengan email yang tidak terdaftar di database menghasilkan respons **403 Forbidden**.
- [x] Pengujian Routing: Mengakses rute akar `/` langsung dialihkan (*auto-redirect*) ke workspace peran yang sesuai dengan sesi aktif.
- [x] Pengujian State Machine: Upaya melompati status yang tidak sah (misal: langsung dari `DIAJUKAN` ke `RELEASED`) diblokir oleh service.
- [x] Audit Log: Setiap perubahan status menghasilkan riwayat audit baru di tabel `RiwayatAuditHarga`.
- [x] Menjalankan verifikasi `pnpm exec tsc --noEmit` menghasilkan **0 error**.

---

## Outcome

Setelah Fase 3 selesai, sistem telah memiliki gerbang otentikasi enterprise yang aman, terintegrasi dengan SSO SPARTA tanpa celah auto-provisioning liar, serta memiliki routing otomatis berbasis wewenang peran dan engine state machine yang menjaga integritas siklus penetapan harga.
