"use client";

import React from "react";

interface CategoryAreaCellProps {
  kategori: string;
  implementasi?: string;
  lokasi?: string;
  className?: string;
}

export function CategoryAreaCell({
  kategori,
  implementasi,
  lokasi,
  className = "",
}: CategoryAreaCellProps) {
  const subDetails = [implementasi, lokasi].filter(Boolean).join(" &bull; ");

  return (
    <div className={`flex flex-col min-w-[120px] max-w-[220px] ${className}`}>
      <span className="font-bold text-slate-800 text-xs truncate" title={kategori}>
        {kategori || "-"}
      </span>
      {subDetails ? (
        <span
          className="text-[11px] text-slate-500 font-medium truncate mt-0.5"
          dangerouslySetInnerHTML={{ __html: subDetails }}
          title={subDetails.replace(/&bull;/g, "•")}
        />
      ) : (
        <span className="text-[11px] text-slate-400 font-medium mt-0.5">-</span>
      )}
    </div>
  );
}
