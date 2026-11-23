"use client";

import { PengajuanHargaItem } from "@/types/pengajuan";
import { INITIAL_MOCK_ITEMS } from "./mockData";

const STORAGE_KEY = "sparta_master_harga_items_v2";

export function getStoredPengajuan(): PengajuanHargaItem[] {
  if (typeof window === "undefined") {
    return INITIAL_MOCK_ITEMS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_ITEMS));
      return INITIAL_MOCK_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_MOCK_ITEMS;
  } catch {
    return INITIAL_MOCK_ITEMS;
  }
}

export function saveStoredPengajuan(items: PengajuanHargaItem[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Gagal menyimpan ke localStorage:", err);
  }
}
