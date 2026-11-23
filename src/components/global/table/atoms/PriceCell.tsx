"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";

interface PriceCellProps {
  price?: number | null;
  satuan?: string;
  className?: string;
}

export function PriceCell({ price, satuan, className = "" }: PriceCellProps) {
  if (price === undefined || price === null || isNaN(price) || price <= 0) {
    return (
      <div className={`text-slate-400 font-bold text-xs ${className}`}>
        -
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-start ${className}`}>
      <span className="font-black text-slate-900 font-mono text-xs tracking-tight">
        {formatRupiah(price)}
      </span>
      {satuan && (
        <span className="text-[10px] text-slate-500 font-bold">
          / {satuan}
        </span>
      )}
    </div>
  );
}
