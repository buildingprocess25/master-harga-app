"use client";

import Swal from "sweetalert2";
import type { BulkPengajuanPayloadItem } from "@/components/bm-manager/TambahPengajuanModal";

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Mengirim antrean pengajuan spesifikasi (baru atau aktivasi lintas cabang/divisi)
 * ke endpoint POST /api/pengajuan dan menampilkan ringkasan hasil via SweetAlert2.
 */
export async function submitBulkPengajuanApi({
  bulkItems,
  defaultCabang,
  onCreated,
}: {
  bulkItems: BulkPengajuanPayloadItem[];
  defaultCabang: string;
  onCreated?: () => Promise<void> | void;
}): Promise<boolean> {
  const actualCabang = defaultCabang || "Cikokol";

  try {
    const postRes = await fetch("/api/pengajuan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: bulkItems.map((entry) => ({
          mode: entry.mode || "new",
          ...(entry.masterItemId ? { masterItemId: entry.masterItemId } : {}),
          kelompokKode: entry.kelompokKode,
          divisiIds: entry.divisiIds,
          isTermasukBongkaran: entry.isTermasukBongkaran,
          item: entry.item,
          namaItem: entry.namaItem,
          kategori: entry.kategori,
          jenisCor: entry.jenisCor,
          merk: entry.merk,
          ukuran: entry.ukuran,
          tipe: entry.tipe,
          warna: entry.warna,
          permukaan: entry.permukaan,
          tebal: entry.tebal,
          toleransi: entry.toleransi,
          lokasi: entry.lokasi,
          satuan: entry.satuan,
          jenisPengajuan: entry.jenisPengajuan,
          komponenMaterial: (entry.komponenMaterial || []).map((k) => ({
            masterKoefisienId: k.masterKoefisienId,
            kategori: k.kategori,
            namaKomponen: k.namaKomponen,
            satuan: k.satuan,
          })),
          cabang: entry.cabang || actualCabang,
          kodeItem: entry.kodeItem,
          kodeArea: entry.kodeArea,
          kodeMaster: entry.kodeMaster,
          informasiTambahan: entry.informasiTambahan,
          alasanPengajuan: entry.informasiTambahan,
          cakupanHarga: "INDUK_CABANG",
        })),
      }),
    });

    const postJson = await postRes.json();
    if (!postRes.ok || !postJson.success) {
      await Swal.fire({
        icon: "error",
        title: "Gagal Mengajukan",
        text: postJson.message || "Terjadi kesalahan saat mengirim pengajuan ke server.",
        confirmButtonColor: "#ED1C24",
      });
      return false;
    }

    const createdCount = Number(
      postJson.createdCount ?? (Array.isArray(postJson.created) ? postJson.created.length : 0)
    );
    const skippedList: Array<{ itemName: string; divisiNama: string; reason: string }> =
      Array.isArray(postJson.skipped) ? postJson.skipped : [];
    const skippedCount = Number(postJson.skippedCount ?? skippedList.length);

    if (createdCount > 0 && onCreated) {
      await onCreated();
    }

    if (createdCount > 0 && skippedCount === 0) {
      await Swal.fire({
        icon: "success",
        title: "Pengajuan Berhasil",
        text: postJson.message || `${createdCount} tiket pengajuan berhasil dibuat.`,
        confirmButtonColor: "#005BAC",
      });
    } else if (createdCount > 0 && skippedCount > 0) {
      const previewSkipped = skippedList
        .slice(0, 5)
        .map(
          (s) =>
            `<li><strong>${escapeHtml(s.itemName)}</strong> (${escapeHtml(s.divisiNama)}) — ${escapeHtml(s.reason)}</li>`
        )
        .join("");
      const extraNote = skippedCount > 5 ? `<li>...dan ${skippedCount - 5} lainnya.</li>` : "";
      await Swal.fire({
        icon: "info",
        title: "Parsial Pintar: Sebagian Diajukan",
        html: `<div style="text-align:left;font-size:13px;line-height:1.5;">
          <p style="margin-bottom:8px;"><strong>${createdCount} tiket baru</strong> berhasil diajukan ke S&amp;B Specialist.</p>
          <p style="margin-bottom:4px;color:#b45309;font-weight:700;">${skippedCount} item/divisi dilewati (sudah terdaftar):</p>
          <ul style="padding-left:18px;margin:0;color:#475569;font-size:12px;">${previewSkipped}${extraNote}</ul>
        </div>`,
        confirmButtonColor: "#005BAC",
        confirmButtonText: "Mengerti",
      });
    } else {
      const previewSkipped = skippedList
        .slice(0, 5)
        .map(
          (s) =>
            `<li><strong>${escapeHtml(s.itemName)}</strong> (${escapeHtml(s.divisiNama)}) — ${escapeHtml(s.reason)}</li>`
        )
        .join("");
      await Swal.fire({
        icon: "warning",
        title: "Seluruh Pengajuan Dilewati",
        html: `<div style="text-align:left;font-size:13px;line-height:1.5;">
          <p style="margin-bottom:6px;">Semua item/divisi yang diajukan (${skippedCount}) sudah terdaftar di sistem:</p>
          <ul style="padding-left:18px;margin:0;color:#475569;font-size:12px;">${previewSkipped}</ul>
        </div>`,
        confirmButtonColor: "#ED1C24",
        confirmButtonText: "Tutup",
      });
    }
    return createdCount > 0;
  } catch (err) {
    console.error("Bulk POST Pengajuan Error:", err);
    await Swal.fire({
      icon: "error",
      title: "Koneksi Gagal",
      text: "Tidak dapat terhubung ke server saat mengirim pengajuan massal.",
      confirmButtonColor: "#ED1C24",
    });
    return false;
  }
}
