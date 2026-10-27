# Dokumentasi Arsitektur & Spesifikasi: SPARTA-HARGA

Folder ini berisi dokumen **Single Source of Truth (SSOT)** rekayasa perangkat lunak untuk aplikasi **SPARTA-HARGA** (*Sistem Pengelolaan Master Harga Satuan, Survei Pasar & Kuorum Rekanan*) PT Sumber Alfaria Trijaya Tbk:

## Daftar Dokumen Resmi

1. **[`project-spec.md`](./project-spec.md)**
   * **Master Project Specification & SDLC Blueprint**: Identitas proyek, cakupan multi-divisi (Building, Engineering, Maintenance, DC), arsitektur keamanan Zero-Trust Whitelist terintegrasi SSO `login-sparta`, alur bisnis survei 3 toko, kuorum kontraktor 50%+1, dan sitemap rute aplikasi.
2. **[`task-breakdown.md`](./task-breakdown.md)**
   * **Master Task Breakdown & Implementation Blueprint**: Panduan operasional pembagian tugas rekayasa untuk 4 pengembang Fullstack (termasuk Tech Lead), urutan alur bisnis sekuensial (Inisiasi BM -> SNB Mastering Koefisien -> BC Survei 3 Toko -> BM Review -> SNB Margin -> Reg Mgr Approval -> Kuorum Kontraktor -> Release), pemusatan komponen reusable, dan rencana sprint.
3. **[`design-system.md`](./design-system.md)**
   * **Master Design System & UI Standards**: Panduan desain *Industrial High-Legibility* berakar pada warna resmi Alfamart (HEX Solid `#005BAC` Alfa Blue, `#ED1C24` Alfa Red, `#FFD100` Alfa Yellow, dan Pastel Tints), tipografi Geist Sans & Mono (`tabular-nums`), aturan kontras WCAG AA (> 4.5:1), serta standar *Dense Data Table & Matrix UX*.
4. **[`database-schema-erd.md`](./database-schema-erd.md)**
   * **Master Database Schema & ERD (PostgreSQL + Prisma 7)**: Diagram relasi entitas (ERD) lengkap untuk 13 model tabel, konvensi mapping fisik `snake_case` (`@@map` dan `@map`), penamaan kunci eksplisit (`pk_`, `fk_`, `uq_`, `idx_`), serta rancangan skema Prisma yang siap dimigrasikan.
