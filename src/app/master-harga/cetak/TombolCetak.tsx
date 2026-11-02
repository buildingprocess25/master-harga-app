"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/** Membuka dialog cetak otomatis sekali saat halaman cetak dimuat, plus tombol manual. */
export function TombolCetak() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#005BAC] hover:bg-[#004687] text-white text-xs font-bold cursor-pointer"
    >
      <Printer className="w-3.5 h-3.5" />
      Cetak / Simpan PDF
    </button>
  );
}
