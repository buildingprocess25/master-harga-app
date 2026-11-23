import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CabangItem {
  id: string;
  kodeCabang: string;
  namaCabang: string;
  regional: string;
}

export interface CabangState {
  list: CabangItem[];
  selectedCabangId: string | "ALL";
}

const INITIAL_CABANG_LIST: CabangItem[] = [
  {
    id: "CBG-BLJ",
    kodeCabang: "TZ01",
    namaCabang: "Cabang Balaraja",
    regional: "Regional 1 - Jabodetabek & Banten",
  },
  {
    id: "CBG-CKK",
    kodeCabang: "TZ02",
    namaCabang: "Cabang Cikokol",
    regional: "Regional 1 - Jabodetabek & Banten",
  },
  {
    id: "CBG-SRG",
    kodeCabang: "TZ03",
    namaCabang: "Cabang Serang",
    regional: "Regional 1 - Jabodetabek & Banten",
  },
  {
    id: "CBG-BKS",
    kodeCabang: "TZ04",
    namaCabang: "Cabang Bekasi",
    regional: "Regional 1 - Jabodetabek & Banten",
  },
  {
    id: "CBG-BGR",
    kodeCabang: "TZ05",
    namaCabang: "Cabang Bogor",
    regional: "Regional 1 - Jabodetabek & Banten",
  },
  {
    id: "CBG-BDG",
    kodeCabang: "JB01",
    namaCabang: "Cabang Bandung 1",
    regional: "Regional 2 - Jawa Barat",
  },
];

const initialState: CabangState = {
  list: INITIAL_CABANG_LIST,
  selectedCabangId: "ALL",
};

export const cabangSlice = createSlice({
  name: "cabang",
  initialState,
  reducers: {
    setSelectedCabangId(state, action: PayloadAction<string | "ALL">) {
      state.selectedCabangId = action.payload;
    },
    addCabang(state, action: PayloadAction<CabangItem>) {
      state.list.push(action.payload);
    },
  },
});

export const { setSelectedCabangId, addCabang } = cabangSlice.actions;
export default cabangSlice.reducer;
