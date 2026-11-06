"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

export interface OpsiFilter {
  cabangList: { id: string; namaCabang: string; regional: string }[];
  divisiList: { id: string; namaDivisi: string }[];
  kategoriList: string[];
}

const SELECT =
  "h-9 px-2 rounded-lg border-2 border-slate-300 text-xs bg-white focus:outline-hidden focus:border-[#005BAC] min-w-0";

/** Filter katalog berbasis URL agar hasil filter bisa dibagikan dan dipakai untuk ekspor. */
export function FilterKatalog({ opsi }: { opsi: OpsiFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const terapkan = (ubah: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(ubah)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Pencarian diterapkan otomatis setelah pengguna berhenti mengetik.
  useEffect(() => {
    if ((params.get("q") ?? "") === q.trim()) return;
    const t = setTimeout(() => terapkan({ q: q.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const adaFilter = ["q", "cabang", "divisi", "kategori", "override"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-48 sm:max-w-72">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kode master, nama material, merk..."
          aria-label="Cari item"
          className="w-full h-9 pl-8 pr-3 rounded-lg border-2 border-slate-300 text-xs focus:outline-hidden focus:border-[#005BAC]"
        />
      </div>
      <select
        aria-label="Filter cabang"
        className={SELECT}
        value={params.get("cabang") ?? ""}
        onChange={(e) => terapkan({ cabang: e.target.value || null })}
      >
        <option value="">Semua cabang</option>
        {opsi.cabangList.map((c) => (
          <option key={c.id} value={c.id}>
            {c.namaCabang}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter divisi"
        className={SELECT}
        value={params.get("divisi") ?? ""}
        onChange={(e) => terapkan({ divisi: e.target.value || null })}
      >
        <option value="">Semua divisi</option>
        {opsi.divisiList.map((d) => (
          <option key={d.id} value={d.id}>
            {d.namaDivisi}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter kategori pekerjaan"
        className={SELECT}
        value={params.get("kategori") ?? ""}
        onChange={(e) => terapkan({ kategori: e.target.value || null })}
      >
        <option value="">Semua kategori</option>
        {opsi.kategoriList.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={params.get("override") === "1"}
          onChange={(e) => terapkan({ override: e.target.checked ? "1" : null })}
          className="accent-[#005BAC]"
        />
        Hanya ada harga wilayah
      </label>
      {adaFilter && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#ED1C24] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Reset
        </button>
      )}
      {pending && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#005BAC]" aria-label="Memuat" />}
    </div>
  );
}
