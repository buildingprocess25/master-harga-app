"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuildingCoordinatorRevisiRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/building-coordinator");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-[#005BAC] border-t-transparent rounded-full mb-3" />
        <p className="text-xs font-bold text-slate-600">Mengarahkan ke antrean revisi survei...</p>
      </div>
    </div>
  );
}
