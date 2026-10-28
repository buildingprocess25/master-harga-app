# Master Task Index: SPARTA-HARGA Implementation Plan

Dokumen ini merupakan indeks rencana implementasi bertahap (*Task Breakdown Plan*) untuk pengembangan sistem **SPARTA-HARGA** (Repositori `master-harga-app`), disusun berdasarkan urutan **Bobot Prioritas** dan prinsip **Clean Architecture**:

---

## Daftar Fase Implementasi Berdasarkan Bobot Prioritas

| Dokumen Tugas | Nama Fase & Fokus Utama | Prioritas | Bobot | Sasaran Target |
| :--- | :--- | :---: | :---: | :--- |
| **[`tasks_phase_1_global_kit.md`](./tasks_phase_1_global_kit.md)** | **Shared Contracts & Pustaka Komponen Global** | **P0** | **95%** | Mendefinisikan TypeScript contracts (`src/types/`) dan 8 komponen domain reusable + unified template di [`src/components/global/`](../../src/components/global) agar unblock Dev A, Dev B, dan Dev C. |
| **[`tasks_phase_2_database_seeder.md`](./tasks_phase_2_database_seeder.md)** | **Database Seeder & Master Data Baseline** | **P1** | **85%** | Menyediakan seed data master PostgreSQL lengkap (`prisma/seed.ts`): 4 Divisi, Cabang, Sub-Wilayah, Koefisien AHSP, Kontraktor, Akun Whitelist, dan 6 Sampel Tiket Siklus Lengkap. |
| **[`tasks_phase_3_sso_whitelist.md`](./tasks_phase_3_sso_whitelist.md)** | **SSO Whitelist & State Machine Engine** | **P2** | **75%** | Integrasi pertukaran token `login-sparta`, Zero-Trust Whitelist guard (403 jika tidak terdaftar), session management, auto-redirect middleware, dan state machine audit log. |

---

## Rujukan Dokumen Arsitektur & Standar

- **[`../project-spec.md`](../project-spec.md)**: Spesifikasi arsitektur sistem, aturan bisnis multi-divisi, dan alur pra-survei hingga rilis master harga.
- **[`../design-system.md`](../design-system.md)**: Standar desain Alfamart Industrial High-Legibility (HEX Solid `#005BAC`, `#ED1C24`, `#FFD100`, tanpa `oklch`).
- **[`../database-schema-erd.md`](../database-schema-erd.md)**: Skema fisik 13 tabel PostgreSQL dan konvensi mapping `snake_case` Prisma 7.
- **[`../task-breakdown.md`](../task-breakdown.md)**: Matriks pembagian peran tim 4 orang Fullstack dan panduan kolaborasi anti-conflict.
