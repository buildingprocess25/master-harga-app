import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export interface KontraktorItem {
  id: string;
  kodeVendor: string;
  namaPerusahaan: string;
  picName: string;
  telepon: string;
  email: string;
}

export type StatusKeaktifanCabang = "AKTIF" | "NONAKTIF_SEMENTARA";

/**
 * Entitas relasi Many-to-Many antara Kontraktor dan Cabang.
 * Satu PT Kontraktor dapat terdaftar di beberapa Cabang, dan status keaktifannya
 * (AKTIF vs NONAKTIF_SEMENTARA / Parked) dikelola spesifik per Cabang.
 */
export interface RelasiKontraktorCabang {
  id: string;
  kontraktorId: string;
  cabangId: string;
  statusKeaktifan: StatusKeaktifanCabang;
  tanggalTerdaftar: string;
  alasanNonaktif?: string;
  tanggalNonaktif?: string;
}

export interface KontraktorState {
  kontraktorList: KontraktorItem[];
  relasiCabangList: RelasiKontraktorCabang[];
}

const INITIAL_KONTRAKTOR_LIST: KontraktorItem[] = [
  {
    id: "KTR-01",
    kodeVendor: "VND-2024-001",
    namaPerusahaan: "PT Mahakarya Konstruksi Mandiri",
    picName: "Hendra Wijaya",
    telepon: "0812-8890-1122",
    email: "hendra@mahakaryakonstruksi.co.id",
  },
  {
    id: "KTR-02",
    kodeVendor: "VND-2024-002",
    namaPerusahaan: "PT Sinergi Bangun Persada",
    picName: "Budi Santoso",
    telepon: "0811-9450-3344",
    email: "budi.s@sinergibangun.co.id",
  },
  {
    id: "KTR-03",
    kodeVendor: "VND-2024-003",
    namaPerusahaan: "CV Trijaya Teknik Utama",
    picName: "Dedi Kurniawan",
    telepon: "0813-7721-5566",
    email: "dedi@trijayateknik.id",
  },
  {
    id: "KTR-04",
    kodeVendor: "VND-2024-004",
    namaPerusahaan: "PT Cipta Karya Nusantara",
    picName: "Arif Rahman",
    telepon: "0812-3344-9988",
    email: "arif@ciptakaryanusantara.co.id",
  },
  {
    id: "KTR-05",
    kodeVendor: "VND-2024-005",
    namaPerusahaan: "PT Graha Mitra Konstruksi",
    picName: "Surya Pratama",
    telepon: "0815-6677-1234",
    email: "surya@grahamitra.co.id",
  },
];

const INITIAL_RELASI_CABANG_LIST: RelasiKontraktorCabang[] = [
  // PT Mahakarya Konstruksi Mandiri -> Balaraja (AKTIF), Cikokol (AKTIF), Serang (NONAKTIF_SEMENTARA)
  {
    id: "REL-01",
    kontraktorId: "KTR-01",
    cabangId: "CBG-BLJ",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-01-10",
  },
  {
    id: "REL-02",
    kontraktorId: "KTR-01",
    cabangId: "CBG-CKK",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-01-10",
  },
  {
    id: "REL-03",
    kontraktorId: "KTR-01",
    cabangId: "CBG-SRG",
    statusKeaktifan: "NONAKTIF_SEMENTARA",
    tanggalTerdaftar: "2025-02-01",
    tanggalNonaktif: "2026-10-18",
    alasanNonaktif: "Menolak hasil penetapan harga 2x berturut-turut pada item Pekerjaan Partisi Gypsum",
  },

  // PT Sinergi Bangun Persada -> Balaraja (AKTIF), Bekasi (AKTIF), Bogor (AKTIF)
  {
    id: "REL-04",
    kontraktorId: "KTR-02",
    cabangId: "CBG-BLJ",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-01-15",
  },
  {
    id: "REL-05",
    kontraktorId: "KTR-02",
    cabangId: "CBG-BKS",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-01-15",
  },
  {
    id: "REL-06",
    kontraktorId: "KTR-02",
    cabangId: "CBG-BGR",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-03-01",
  },

  // CV Trijaya Teknik Utama -> Balaraja (NONAKTIF_SEMENTARA), Cikokol (AKTIF)
  {
    id: "REL-07",
    kontraktorId: "KTR-03",
    cabangId: "CBG-BLJ",
    statusKeaktifan: "NONAKTIF_SEMENTARA",
    tanggalTerdaftar: "2025-01-20",
    tanggalNonaktif: "2026-10-20",
    alasanNonaktif: "Menolak harga final pasca negosiasi S&B pada item Pemasangan Keramik Lantai 60x60",
  },
  {
    id: "REL-08",
    kontraktorId: "KTR-03",
    cabangId: "CBG-CKK",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-01-20",
  },

  // PT Cipta Karya Nusantara -> Cikokol (AKTIF), Serang (AKTIF), Bandung 1 (AKTIF)
  {
    id: "REL-09",
    kontraktorId: "KTR-04",
    cabangId: "CBG-CKK",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-02-12",
  },
  {
    id: "REL-10",
    kontraktorId: "KTR-04",
    cabangId: "CBG-SRG",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-02-12",
  },
  {
    id: "REL-11",
    kontraktorId: "KTR-04",
    cabangId: "CBG-BDG",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-04-05",
  },

  // PT Graha Mitra Konstruksi -> Bekasi (AKTIF), Bogor (AKTIF), Bandung 1 (AKTIF)
  {
    id: "REL-12",
    kontraktorId: "KTR-05",
    cabangId: "CBG-BKS",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-03-10",
  },
  {
    id: "REL-13",
    kontraktorId: "KTR-05",
    cabangId: "CBG-BGR",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-03-10",
  },
  {
    id: "REL-14",
    kontraktorId: "KTR-05",
    cabangId: "CBG-BDG",
    statusKeaktifan: "AKTIF",
    tanggalTerdaftar: "2025-03-10",
  },
];

const initialState: KontraktorState = {
  kontraktorList: INITIAL_KONTRAKTOR_LIST,
  relasiCabangList: INITIAL_RELASI_CABANG_LIST,
};

export const kontraktorSlice = createSlice({
  name: "kontraktor",
  initialState,
  reducers: {
    toggleStatusKeaktifanRelasi(
      state,
      action: PayloadAction<{
        relasiId: string;
        statusBaru: StatusKeaktifanCabang;
        alasan?: string;
      }>
    ) {
      const target = state.relasiCabangList.find((r) => r.id === action.payload.relasiId);
      if (!target) return;
      target.statusKeaktifan = action.payload.statusBaru;
      if (action.payload.statusBaru === "NONAKTIF_SEMENTARA") {
        target.tanggalNonaktif = new Date().toISOString().slice(0, 10);
        target.alasanNonaktif = action.payload.alasan ?? "Dinonaktifkan sementara (Parked)";
      } else {
        target.tanggalNonaktif = undefined;
        target.alasanNonaktif = undefined;
      }
    },
    assignKontraktorKeCabang(
      state,
      action: PayloadAction<{ kontraktorId: string; cabangId: string }>
    ) {
      const exists = state.relasiCabangList.some(
        (r) =>
          r.kontraktorId === action.payload.kontraktorId &&
          r.cabangId === action.payload.cabangId
      );
      if (!exists) {
        state.relasiCabangList.push({
          id: `REL-${Date.now()}`,
          kontraktorId: action.payload.kontraktorId,
          cabangId: action.payload.cabangId,
          statusKeaktifan: "AKTIF",
          tanggalTerdaftar: new Date().toISOString().slice(0, 10),
        });
      }
    },
  },
});

export const { toggleStatusKeaktifanRelasi, assignKontraktorKeCabang } =
  kontraktorSlice.actions;

// ============================================================================
// Memoized Selectors (Relasi Kontraktor <-> Cabang)
// ============================================================================

const selectKontraktorList = (state: RootState) => state.kontraktor.kontraktorList;
const selectRelasiList = (state: RootState) => state.kontraktor.relasiCabangList;
const selectCabangList = (state: RootState) => state.cabang.list;

/**
 * Mengembalikan daftar seluruh Kontraktor lengkap dengan array Cabang tempat mereka terdaftar.
 */
export const selectKontraktorWithCabangRelations = createSelector(
  [selectKontraktorList, selectRelasiList, selectCabangList],
  (kontraktorList, relasiList, cabangList) => {
    const cabangMap = new Map(cabangList.map((c) => [c.id, c]));

    return kontraktorList.map((ktr) => {
      const relasi = relasiList
        .filter((r) => r.kontraktorId === ktr.id)
        .map((r) => ({
          ...r,
          cabang: cabangMap.get(r.cabangId),
        }))
        .filter((r) => r.cabang !== undefined);

      return {
        ...ktr,
        relasiCabang: relasi,
        totalCabangAktif: relasi.filter((r) => r.statusKeaktifan === "AKTIF").length,
        totalCabangNonaktif: relasi.filter(
          (r) => r.statusKeaktifan === "NONAKTIF_SEMENTARA"
        ).length,
      };
    });
  }
);

export default kontraktorSlice.reducer;
