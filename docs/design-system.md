# Master Design System & UI Standards: SPARTA-HARGA (`design.md`)

> [!IMPORTANT]
> Dokumen ini merupakan **Single Source of Truth (SSOT)** untuk seluruh aturan antarmuka visual (UI), token desain, tipografi, dan pola interaksi pada aplikasi independen **SPARTA-HARGA**. Seluruh komponen wajib menggunakan sistem **HEX Solid & Pastel Identitas Alfamart** (tanpa `oklch`) dan mematuhi filter kualitas **antislop**.

---

## 1. Design Philosophy, Brand Identity & Antislop Read

### 1.1 Design Read & Liveliness Dials
> **Reading this as:** Internal B2B Enterprise Pricing & Contractor Quorum Management App for PT Sumber Alfaria Trijaya Tbk (Alfamart) staff and partner contractors, in an **Alfamart Brand-Anchored Solid & Pastel Industrial** language, dial **ENERGY 2 / RHYTHM 2 / MOTION 1**.

### 1.2 Karakter Visual Khas Alfamart (Solid & Pastel Harmony)
Alih-alih menggunakan warna generik atau ruang warna `oklch` yang terasa asing, **SPARTA-HARGA** berakar langsung pada **3 warna anatomi logo resmi Alfamart**:
1. **Alfa Corporate Blue (`#005BAC`)**: Diambil dari tipografi **"Alfa"**. Digunakan sebagai warna **Solid Primary** untuk navigasi aktif, tombol keputusan utama, dan fokus tabel. Dipasangkan dengan **Pastel Alfa Blue (`#EAF3FB`)** untuk latar indikator informasi dan sorotan baris aktif.
2. **Alfa Corporate Red (`#ED1C24`)**: Diambil dari tipografi **"mart"** dan garis pita atas logo. Digunakan sebagai aksen identitas korporat serta status **Penolakan (`Tolak`) / Kontraktor Nonaktif (`Parked`)**. Dipasangkan dengan **Pastel Alfa Red (`#FDECEE`)** untuk permukaan badge/kartu peringatan.
3. **Alfa Ribbon Yellow (`#FFD100` / `#E0A800`)**: Diambil dari garis pita bawah logo. Digunakan sebagai penanda **Perlu Tindakan Segera / Menunggu Kuorum**. Dipasangkan dengan **Pastel Alfa Yellow (`#FFF8DB`)** untuk kartu antrean prioritas #1.
4. **Identity Motif (Pita Ganda Alfamart)**: Bagian bawah *Top Header* selalu menampilkan garis aksen ganda (*dual-ribbon bar*) Merah (`#ED1C24`) dan Kuning (`#FFD100`) setebal `3px` yang merepresentasikan pita khas di bawah logo Alfamart.

---

## 2. CSS Variables & Tailwind v4 `@theme inline` (Solid & Pastel HEX)

Seluruh token warna didefinisikan pada [`src/app/globals.css`](file:///c:/Users/UDevran/Documents/Sumber%20Alfaria%20Trijaya/system/master-harga-app/src/app/globals.css) menggunakan nilai **HEX Solid & Pastel** yang pasti, terukur rasio kontrasnya (**WCAG AA $\ge 4.5:1$**), dan bebas dari `oklch`:

```css
@import "tailwindcss";

:root {
  color-scheme: light;

  /* 1. Alfamart Core Brand Anchors (Solid) */
  --alfa-blue: #005BAC;          /* Kata "Alfa" pada logo */
  --alfa-blue-hover: #004687;
  --alfa-red: #ED1C24;           /* Kata "mart" & pita atas logo */
  --alfa-yellow: #FFD100;        /* Pita bawah logo */

  /* 2. Alfamart Pastel Surface Palette (Tints) */
  --pastel-blue: #EAF3FB;
  --pastel-blue-border: #B8D8F3;
  --pastel-red: #FDECEE;
  --pastel-red-border: #F7C1C5;
  --pastel-yellow: #FFF8DB;
  --pastel-yellow-border: #F3D56B;
  --pastel-green: #E7F6F0;
  --pastel-green-border: #B2DFCC;

  /* 3. App Surface & Hierarchy Tokens */
  --background: #F5F7FA;         /* Soft Cool-Warm Canvas */
  --foreground: #111827;         /* Deep Charcoal Text (Contrast 16:1) */
  --card: #FFFFFF;               /* Pure Solid White Surface */
  --card-foreground: #111827;
  --popover: #FFFFFF;
  --popover-foreground: #111827;

  /* 4. Semantic Interactive Tokens */
  --primary: #005BAC;            /* Solid Alfa Blue */
  --primary-foreground: #FFFFFF;
  --secondary: #EAF3FB;          /* Pastel Alfa Blue Surface */
  --secondary-foreground: #00427E;

  --muted: #EEF2F6;              /* Pastel Slate Table Header */
  --muted-foreground: #4B5563;   /* Neutral Dark Grey (Contrast 7.2:1) */
  --accent: #E2ECF7;             /* Hover Row & Filter Surface */
  --accent-foreground: #003A70;

  /* 5. Workflow Status Tokens (Solid + Pastel Pairings) */
  --success: #0F8A5F;            /* Solid Emerald - Setuju / Aktif */
  --success-soft: #E7F6F0;       /* Pastel Mint */
  --success-ink: #085438;        /* High-contrast text on pastel green */

  --warning: #D99B00;            /* Solid Deep Alfa Gold - Perlu Tindakan */
  --warning-soft: #FFF8DB;       /* Pastel Alfa Yellow */
  --warning-ink: #6E4B00;        /* High-contrast text on pastel yellow */

  --destructive: #D91920;        /* Solid Alfa Red - Tolak / Parked */
  --destructive-soft: #FDECEE;   /* Pastel Alfa Red */
  --destructive-ink: #990F14;    /* High-contrast text on pastel red */

  --trial: #4F39B8;              /* Solid Royal Indigo - Jalur B Trial 90 Hari */
  --trial-soft: #EFEBFD;         /* Pastel Lavender */
  --trial-ink: #362387;

  /* 6. Borders, Inputs & Focus Ring */
  --border: #D8E0EA;             /* Solid Crisp 1px Border */
  --input: #CBD5E1;
  --ring: #005BAC;               /* Solid Alfa Blue Focus Ring */

  /* 7. Border Radius Hierarchy (R-11 Compliant: Varied by Role, Not All Pill) */
  --radius-sm: 0.25rem;          /* 4px - Status Tags & Technical Code Pills */
  --radius-md: 0.5rem;           /* 8px - Buttons, Inputs, Filter Controls */
  --radius-lg: 0.75rem;          /* 12px - Data Table Containers & Cards */
  --radius-xl: 1rem;             /* 16px - Modal Dialogs */
}
```

---

## 3. Palet Warna Solid & Pastel serta Alasan Penggunaannya (Rule R-29 & R-31)

Sesuai aturan **R-29** (maksimal 2-3 warna inti + 1 aksen, di luar warna netral) dan **R-31** (setiap keputusan visual wajib memiliki alasan 1 kalimat):

| Kategori Warna | Kode HEX Solid | Kode HEX Pastel | Teks di Atas Pastel | Alasan Pemilihan 1 Kalimat (R-31) |
| :--- | :--- | :--- | :--- | :--- |
| **Alfa Blue (Primary)** | `#005BAC` | `#EAF3FB` | `#003A70` | Mewakili warna huruf "Alfa" pada logo resmi untuk mengikat identitas korporat pada seluruh tombol aksi utama dan filter aktif. |
| **Alfa Red (Destructive / Brand)** | `#ED1C24` | `#FDECEE` | `#990F14` | Mewakili warna huruf "mart" pada logo sekaligus memberi sinyal visual tegas untuk penolakan harga (`Tolak`) dan status kontraktor `Parked`. |
| **Alfa Yellow (Warning / Priority)** | `#FFD100` | `#FFF8DB` | `#6E4B00` | Mewakili pita kuning bawah logo Alfamart untuk menyorot item antrean prioritas #1 yang memerlukan tindakan segera. |
| **Functional Green (Success / Aktif)** | `#0F8A5F` | `#E7F6F0` | `#085438` | Memberikan pembeda semantik yang jelas ketika kuorum 50%+1 tercapai atau kontraktor berstatus `Aktif` di cabang terkait. |

---

## 4. Tipografi & Keterbacaan Angka (Rule R-06 & R-25)

- **Alasan Pemilihan Font (R-06 & R-31)**: `Geist Sans` dipilih karena proporsi x-height yang tinggi untuk membaca nama PT dan spesifikasi pekerjaan bangunan di tabel padat, sedangkan `Geist Mono` (`tabular-nums`) dipilih khusus untuk kode vendor, nominal Rupiah, dan angka kuorum agar digit sejajar vertikal.
- **Aturan Kontras (R-25)**: Dilarang menggunakan teks abu-abu muda di atas latar abu-abu. Seluruh teks sekunder menggunakan `#4B5563` di atas `#FFFFFF`/`#F5F7FA` (rasio kontras **7.2:1**, melampaui batas minimum WCAG AA 4.5:1).
- **Aturan Copywriting (R-02)**: Dilarang menggunakan karakter *em dash* (`—`) pada seluruh teks UI; gunakan tanda titik dua (`:`), koma (`,`), atau tanda hubung standar (`-`).
