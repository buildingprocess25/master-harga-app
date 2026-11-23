"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MasterHargaNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 text-xs font-semibold -mb-px overflow-x-auto">
      {items.map((it) => {
        const aktif = it.href === "/master-harga" ? pathname === it.href : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "px-3 py-2.5 border-b-2 whitespace-nowrap transition-colors",
              aktif ? "border-[#005BAC] text-[#005BAC]" : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
