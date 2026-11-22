/**
 * Mengevaluasi harga acuan efektif dan deteksi variasi/konflik harga antar survei
 * untuk sebuah komponen pada Master Survei.
 *
 * Aturan:
 * - Jika baru ada 1 variasi harga survei dan acuan DB masih kosong (`null`),
 *   otomatis menggunakan rata-rata survei tersebut tanpa perlu aksi manual.
 * - Jika ada >= 2 variasi harga rata-rata berbeda, atau survei baru berbeda
 *   dengan acuan DB tersimpan, acuan nasional tidak ditimpa otomatis dan
 *   `adaKonflikAcuan` bernilai `true` agar S&B dapat memilih acuan secara eksplisit.
 */
export function evaluasiAcuanSurveiKomponen<T extends { rataRataHarga: number }>(
  entriSurvei: T[],
  hargaAcuanTersimpan: number | null
): {
  variasiHargaList: T[];
  jumlahVariasiHarga: number;
  hargaAcuanEfektif: number | null;
  adaKonflikAcuan: boolean;
} {
  const validEntri = entriSurvei.filter((e) => e.rataRataHarga > 0);
  const variasiMap = new Map<number, T>();
  for (const e of validEntri) {
    const rounded = Math.round(e.rataRataHarga);
    if (!variasiMap.has(rounded)) {
      variasiMap.set(rounded, e);
    }
  }

  const variasiHargaList = Array.from(variasiMap.values());
  const jumlahVariasiHarga = variasiHargaList.length;

  const hargaAcuanEfektif =
    hargaAcuanTersimpan !== null
      ? hargaAcuanTersimpan
      : jumlahVariasiHarga === 1
        ? variasiHargaList[0].rataRataHarga
        : null;

  const adaKonflikAcuan =
    jumlahVariasiHarga > 1 ||
    (hargaAcuanTersimpan !== null &&
      variasiHargaList.some(
        (v) => Math.round(hargaAcuanTersimpan) !== Math.round(v.rataRataHarga)
      ));

  return {
    variasiHargaList,
    jumlahVariasiHarga,
    hargaAcuanEfektif,
    adaKonflikAcuan,
  };
}
