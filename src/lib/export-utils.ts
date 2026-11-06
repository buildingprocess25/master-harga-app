import { PengajuanHargaItem } from "@/types/pengajuan";

/**
 * Ekspor data ke format CSV
 */
export function exportToCSV(
  items: PengajuanHargaItem[],
  filename = "Pengajuan_Harga_Material"
): void {
  const headers = [
    "No",
    "Kode",
    "Tanggal Pengajuan",
    "Cabang",
    "Item",
    "Ukuran",
    "Merk",
    "Warna",
    "Tipe",
    "Tebal",
    "Permukaan",
    "Kategori",
    "Implementasi",
    "Lokasi",
    "Informasi Tambahan",
    "Deskripsi Lengkap (Otomatis)",
    "Status",
  ];

  const escapeCSV = (val: string | number | undefined | null) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = items.map((item, idx) => [
    idx + 1,
    escapeCSV(item.kode || item.kodeItem || item.noTiket),
    escapeCSV(item.tanggalPengajuan || "-"),
    escapeCSV(item.cabang || item.namaCabang || "-"),
    escapeCSV(item.item || item.namaItem),
    escapeCSV(item.ukuran),
    escapeCSV(item.merk),
    escapeCSV(item.warna),
    escapeCSV(item.tipe),
    escapeCSV(item.tebal),
    escapeCSV(item.permukaan),
    escapeCSV(item.kategori),
    escapeCSV(item.implementasi),
    escapeCSV(item.lokasi),
    escapeCSV(item.informasiTambahan),
    escapeCSV(item.deskripsiOtomatis),
    escapeCSV(item.status || "DIAJUKAN"),
  ]);

  const csvContent =
    "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Ekspor data ke format Excel HTML (.xls)
 */
export function exportToExcel(
  items: PengajuanHargaItem[],
  filename = "Pengajuan_Harga_Material"
): void {
  const headers = [
    "No",
    "Kode",
    "Tanggal Pengajuan",
    "Cabang",
    "Item",
    "Ukuran",
    "Merk",
    "Warna",
    "Tipe",
    "Tebal",
    "Permukaan",
    "Kategori",
    "Implementasi",
    "Lokasi",
    "Informasi Tambahan",
    "Deskripsi Lengkap (Otomatis)",
    "Status",
  ];

  const tableRows = items.map(
    (item, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="text-align: center; font-weight: bold; background-color: #eff6ff;">${item.kode || item.kodeItem || item.noTiket}</td>
      <td style="text-align: center;">${item.tanggalPengajuan || "-"}</td>
      <td style="text-align: center; font-weight: bold;">${item.cabang || item.namaCabang || "-"}</td>
      <td style="font-weight: bold;">${item.item || item.namaItem}</td>
      <td>${item.ukuran || "-"}</td>
      <td style="font-weight: bold;">${item.merk || "-"}</td>
      <td>${item.warna || "-"}</td>
      <td>${item.tipe || "-"}</td>
      <td>${item.tebal || "-"}</td>
      <td>${item.permukaan || "-"}</td>
      <td>${item.kategori || "-"}</td>
      <td>${item.implementasi || "-"}</td>
      <td>${item.lokasi || "-"}</td>
      <td>${item.informasiTambahan || "-"}</td>
      <td style="font-size: 11px;">${item.deskripsiOtomatis || "-"}</td>
      <td style="text-align: center; font-weight: bold;">${item.status || "DIAJUKAN"}</td>
    </tr>
  `
  );

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; font-size: 12px; }
          th { background-color: #ED1C24; color: white; border: 1px solid #b91c1c; padding: 8px; font-weight: bold; }
          td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: middle; }
        </style>
      </head>
      <body>
        <h3>DAFTAR PENGAJUAN SPESIFIKASI & SURVEI HARGA MATERIAL ALFAMART</h3>
        <p>Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID")}</p>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${tableRows.join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([htmlContent], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().slice(0, 10)}.xls`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
