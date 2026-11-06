"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, ArrowUpRight } from "lucide-react";
import { PengajuanHargaItem } from "@/types";

interface TableActionButtonsProps {
  item: PengajuanHargaItem;
  detailHref?: string | ((item: PengajuanHargaItem) => string);
  renderCustomAction?: (item: PengajuanHargaItem) => React.ReactNode;
  className?: string;
}

export function TableActionButtons({
  item,
  detailHref,
  renderCustomAction,
  className = "",
}: TableActionButtonsProps) {
  const pathname = usePathname();

  // Menentukan URL detail
  const href =
    typeof detailHref === "function"
      ? detailHref(item)
      : detailHref || `${pathname}/${item.id}`;

  const isPendingBm = item.status === "PENDING_BM_MGR";

  return (
    <div
      className={`flex items-center justify-center gap-1.5 whitespace-nowrap ${className}`}
    >
      {/* Primary Detail Action */}
      <Link
        href={href}
        className={`inline-flex items-center justify-center h-7 text-[11px] px-2.5 rounded-lg font-bold gap-1 cursor-pointer shadow-xs transition-colors ${
          isPendingBm
            ? "bg-[#ED1C24] hover:bg-red-700 text-white border-2 border-red-800"
            : "bg-white border-2 border-[#005BAC] text-[#005BAC] hover:bg-[#005BAC] hover:text-white"
        }`}
        title={isPendingBm ? "Review Hasil Survei 3 Toko" : "Buka rincian lengkap"}
      >
        {isPendingBm ? (
          <>
            <span>Review</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5" />
            <span>Detail</span>
          </>
        )}
      </Link>

      {/* Custom Action (Edit Revisi / Approve / Reject, dll.) */}
      {renderCustomAction && renderCustomAction(item)}
    </div>
  );
}
