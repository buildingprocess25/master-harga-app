"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import type { OpsiKoefisien } from "@/lib/services/ahsp-service";
import { cn, formatRupiah } from "@/lib/utils";

/**
 * Combobox creatable pustaka koefisien: ketik untuk mencari komponen baku,
 * atau pilih "Tambah komponen baru" bila belum ada di pustaka.
 * Navigasi keyboard: panah atas/bawah, Enter memilih, Escape menutup.
 */
export function KomboboxKoefisien({
  opsi,
  sudahDipilih,
  onPilih,
  onBuatBaru,
  placeholder = "Cari atau tambah komponen",
}: {
  opsi: OpsiKoefisien[];
  sudahDipilih: Set<string>;
  onPilih: (o: OpsiKoefisien) => void;
  onBuatBaru: (nama: string) => void;
  placeholder?: string;
}) {
  const idList = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [terbuka, setTerbuka] = useState(false);
  const [q, setQ] = useState("");
  const [aktif, setAktif] = useState(0);

  const kunci = q.trim().toLowerCase();
  const hasil = useMemo(
    () => opsi.filter((o) => !kunci || o.namaKomponen.toLowerCase().includes(kunci)).slice(0, 50),
    [opsi, kunci]
  );
  const adaPersis = opsi.some((o) => o.namaKomponen.toLowerCase() === kunci);
  const bisaBuat = kunci.length >= 3 && !adaPersis;
  const jumlahPilihan = hasil.length + (bisaBuat ? 1 : 0);

  useEffect(() => {
    const tutup = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setTerbuka(false);
    };
    document.addEventListener("mousedown", tutup);
    return () => document.removeEventListener("mousedown", tutup);
  }, []);

  const pilihIndeks = (i: number) => {
    if (i < hasil.length) {
      const o = hasil[i];
      if (sudahDipilih.has(o.id)) return;
      onPilih(o);
    } else if (bisaBuat) {
      onBuatBaru(q.trim());
    }
    setQ("");
    setTerbuka(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setTerbuka(true);
      setAktif((a) => Math.min(a + 1, Math.max(0, jumlahPilihan - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktif((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (terbuka && jumlahPilihan > 0) pilihIndeks(aktif);
    } else if (e.key === "Escape") {
      setTerbuka(false);
    }
  };

  const idOpsi = (i: number) => `${idList}-opsi-${i}`;

  return (
    <div ref={wrapRef} className="relative w-full sm:w-80">
      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        role="combobox"
        aria-expanded={terbuka}
        aria-controls={idList}
        aria-autocomplete="list"
        aria-activedescendant={terbuka && jumlahPilihan > 0 ? idOpsi(aktif) : undefined}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAktif(0);
          setTerbuka(true);
        }}
        onFocus={() => setTerbuka(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 rounded-md border border-dashed border-slate-400 bg-white text-xs focus:outline-hidden focus:border-solid focus:ring-2 focus:ring-[#005BAC]/20 focus:border-[#005BAC]"
      />
      {terbuka && (
        <ul
          id={idList}
          role="listbox"
          className="absolute z-40 mt-1 w-full max-h-64 overflow-auto bg-white border border-slate-300 rounded-lg shadow-lg py-1 text-xs"
        >
          {hasil.length === 0 && !bisaBuat && (
            <li className="px-3 py-2 text-slate-500">
              {kunci.length < 3 ? "Ketik minimal 3 huruf untuk menambah komponen baru." : "Komponen sudah ada di daftar."}
            </li>
          )}
          {hasil.map((o, i) => {
            const dipakai = sudahDipilih.has(o.id);
            return (
              <li
                key={o.id}
                id={idOpsi(i)}
                role="option"
                aria-selected={i === aktif}
                aria-disabled={dipakai}
                onMouseEnter={() => setAktif(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pilihIndeks(i);
                }}
                className={cn(
                  "px-3 py-2 flex items-center justify-between gap-2",
                  dipakai ? "text-slate-400 cursor-not-allowed" : "cursor-pointer",
                  i === aktif && !dipakai && "bg-[#EAF3FB]"
                )}
              >
                <span className="min-w-0">
                  <span className="font-semibold text-slate-900 block truncate">{o.namaKomponen}</span>
                  <span className="text-[11px] text-slate-500">
                    {o.satuan} · koef {o.nilaiKoefisienDefault}
                    {o.hargaAcuanDefault !== null && ` · ${formatRupiah(o.hargaAcuanDefault)}`}
                    {o.wajibSurveiToko && " · wajib survei"}
                  </span>
                </span>
                {dipakai && <Check className="w-3.5 h-3.5 shrink-0" aria-label="Sudah dipakai" />}
              </li>
            );
          })}
          {bisaBuat && (
            <li
              id={idOpsi(hasil.length)}
              role="option"
              aria-selected={aktif === hasil.length}
              onMouseEnter={() => setAktif(hasil.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                pilihIndeks(hasil.length);
              }}
              className={cn(
                "px-3 py-2 flex items-center gap-1.5 cursor-pointer border-t border-slate-100 font-semibold text-[#005BAC]",
                aktif === hasil.length && "bg-[#EAF3FB]"
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah komponen baru: &quot;{q.trim()}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
