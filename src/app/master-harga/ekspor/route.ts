import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { verifyUserWhitelist } from "@/lib/services/whitelist-service";
import {
  BATAS_EKSPOR_KATALOG,
  getKatalogUntukEkspor,
  parseFilterKatalog,
} from "@/lib/services/master-harga-service";
import { ROLE_KATALOG } from "../_lib/require-internal";

/**
 * GET /master-harga/ekspor?q=&cabang=&divisi=&kategori=&override=1
 * Ekspor katalog sesuai filter ke CSV yang langsung terbuka di Excel:
 * UTF-8 BOM, pemisah titik koma (default Excel locale Indonesia), angka tanpa pemisah ribuan.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionUser();
  const check = session ? await verifyUserWhitelist(session.email) : null;
  if (!check?.isWhitelisted || !check.profile || !ROLE_KATALOG.includes(check.profile.role)) {
    return NextResponse.json({ success: false, message: "Akses ditolak." }, { status: 403 });
  }

  const filter = parseFilterKatalog(Object.fromEntries(request.nextUrl.searchParams));
  const { rows, terpotong } = await getKatalogUntukEkspor(filter);

  const header = [
    "No",
    "Kode Master",
    "Nama Item",
    "Spesifikasi",
    "Kategori",
    "Divisi",
    "Satuan",
    "Kode Cabang",
    "Cabang",
    "Regional",
    "Cakupan",
    "Wilayah",
    "Harga Satuan (Rp)",
    "Selisih dari Induk (Rp)",
    "Selisih dari Induk (%)",
    "Margin (%)",
    "Berlaku Sejak",
    "Nomor Tiket",
  ];

  const baris: (string | number | null)[][] = [];
  rows.forEach((r, i) => {
    const umum = [r.kodeMaster, r.namaItem, r.spesifikasi, r.kategori, r.namaDivisi, r.satuan, r.kodeCabang, r.namaCabang, r.regional];
    baris.push([i + 1, ...umum, "Induk Cabang", "", r.harga, null, null, r.marginPersen, tgl(r.berlakuSejak), r.nomorTiket]);
    for (const w of r.wilayahList) {
      baris.push(["", ...umum, "Khusus Wilayah", w.namaWilayah, w.harga, w.selisihRp, w.selisihPersen, null, tgl(w.berlakuSejak), w.nomorTiket]);
    }
  });
  if (terpotong) {
    baris.push([`Data dipotong pada ${BATAS_EKSPOR_KATALOG} item. Persempit filter untuk ekspor lengkap.`]);
  }

  const csv = "﻿" + [header, ...baris].map((b) => b.map(sel).join(";")).join("\r\n");
  const tanggal = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="katalog-master-harga-${tanggal}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function tgl(iso: string) {
  return iso.slice(0, 10);
}

/** Escape sel CSV dan cegah formula injection pada teks (=, +, -, @). */
function sel(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v).replace(".", ",");
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
