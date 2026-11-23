import type { LucideIcon } from "lucide-react";

/** Kartu judul halaman workspace: ikon, judul, deskripsi, dan slot aksi di kanan. */
export function HeaderHalaman({
  icon: Icon,
  judul,
  deskripsi,
  aksi,
}: {
  icon: LucideIcon;
  judul: string;
  deskripsi: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-[#EAF3FB] border border-[#B8D8F3] flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-[#005BAC]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{judul}</h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">{deskripsi}</p>
        </div>
      </div>
      {aksi}
    </div>
  );
}
