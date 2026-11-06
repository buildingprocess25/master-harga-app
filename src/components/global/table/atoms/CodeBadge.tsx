"use client";

import React from "react";

interface CodeBadgeProps {
  code: string;
  codeMaster?: string;
  showMaster?: boolean;
  isTrial?: boolean;
  className?: string;
}

export function CodeBadge({
  code,
  codeMaster,
  showMaster = false,
  isTrial = false,
  className = "",
}: CodeBadgeProps) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <span
        className={`inline-block font-mono text-xs font-black px-2.5 py-1 rounded-md border-2 shadow-xs whitespace-nowrap ${
          isTrial
            ? "bg-purple-700 text-white border-purple-900"
            : "bg-[#005BAC] text-white border-blue-900"
        }`}
      >
        {code}
      </span>
      {showMaster && codeMaster && (
        <span
          className="text-[10px] text-slate-500 font-mono font-bold truncate max-w-[120px] text-center"
          title={codeMaster}
        >
          {codeMaster}
        </span>
      )}
    </div>
  );
}
