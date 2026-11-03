"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AppLayoutShell } from "@/components/global/AppLayoutShell";
import { PengajuanDetailLayout } from "@/components/global/PengajuanDetailLayout";
import { ApprovalActionPanel } from "@/components/global/ApprovalActionPanel";
import { PengajuanHargaItem, UserSessionProfile } from "@/types";
import { Loader2, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import Swal from "sweetalert2";

export default function BmManagerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [user, setUser] = useState<UserSessionProfile | null>(null);
  const [item, setItem] = useState<PengajuanHargaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    fetchSession();
    fetchDetail();
  }, [id]);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.success && json.user) {
        setUser(json.user);
      }
    } catch {
      // Abaikan
    }
  };

  const fetchDetail = async () => {
    setLoading(true);
    setErrorText("");
    try {
      const res = await fetch(`/api/pengajuan/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItem(json.data);
      } else {
        setErrorText(json.message || "Gagal mengambil data tiket pengajuan.");
      }
    } catch {
      setErrorText("Terjadi gangguan koneksi saat mengambil detail pengajuan.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (
    action: "approve" | "return" | "reject",
    catatan: string
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/pengajuan/${id}/review-bm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, catatan }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memproses keputusan BM.");
      }

      await Swal.fire({
        title: "Keputusan Berhasil!",
        text: json.message,
        icon: "success",
        confirmButtonColor: "#005BAC",
        confirmButtonText: "Selesai",
        customClass: {
          popup: "rounded-xl border-2 border-slate-300 shadow-xl",
          confirmButton: "px-4 py-2 rounded-lg font-bold text-white bg-[#005BAC]",
        },
      });

      // Refresh detail data
      fetchDetail();
    } catch (err: any) {
      await Swal.fire({
        title: "Gagal Memproses",
        text: err.message || "Terjadi kendala saat memperbarui status tiket.",
        icon: "error",
        confirmButtonColor: "#ED1C24",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppLayoutShell
      user={user}
      breadcrumbs={[
        { label: "B&M Manager", href: "/bm-manager" },
        { label: `Tiket #${item?.noTiket || "..."}` },
      ]}
    >
      {loading ? (
        <div className="bg-white rounded-xl border-2 border-slate-300 p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-[#005BAC] animate-spin mx-auto mb-3" />
          <p className="font-bold text-slate-800 text-sm">
            Memuat detail spesifikasi dan hasil survei 3 toko...
          </p>
        </div>
      ) : errorText || !item ? (
        <div className="bg-white rounded-xl border-2 border-red-300 p-8 text-center shadow-xs">
          <AlertCircle className="w-10 h-10 text-[#ED1C24] mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-900">Pengajuan Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 mt-1">{errorText}</p>
          <button
            type="button"
            onClick={() => router.push("/bm-manager")}
            className="mt-4 px-4 py-2 rounded-lg bg-[#005BAC] text-white font-bold text-xs"
          >
            Kembali ke Dashboard Cabang
          </button>
        </div>
      ) : (
        <PengajuanDetailLayout
          item={item}
          role="BM_MANAGER"
          backHref="/bm-manager"
          backLabel="Kembali ke Dashboard Cabang"
          actionSlot={
            item.status === "PENDING_BM_MGR" ? (
              <ApprovalActionPanel
                role="BM_MANAGER"
                status={item.status}
                onApprove={(catatan) => handleReviewAction("approve", catatan)}
                onReturn={(catatan) => handleReviewAction("return", catatan)}
                onReject={(catatan) => handleReviewAction("reject", catatan)}
                loading={actionLoading}
              />
            ) : (
              <div className="bg-white rounded-xl border-2 border-slate-300 p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <ShieldAlert className="w-4 h-4 text-[#005BAC]" />
                  <span>Informasi Tahapan Wewenang:</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Status tiket saat ini adalah{" "}
                  <span className="font-bold font-mono text-[#005BAC]">
                    [{item.status}]
                  </span>
                  . Keputusan review Layer 1 oleh B&M Manager hanya aktif saat tiket berstatus{" "}
                  <span className="font-bold text-[#ED1C24]">PENDING_BM_MGR</span>{" "}
                  (setelah Building Coordinator menginput survei 3 toko fisik).
                </p>
              </div>
            )
          }
        />
      )}
    </AppLayoutShell>
  );
}
