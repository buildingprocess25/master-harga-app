"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  ShieldCheck,
  ChevronRight,
  User,
  Building,
} from "lucide-react";
import Swal from "sweetalert2";
import { UserSessionProfile, RoleUser } from "@/types";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  user?: UserSessionProfile | null;
  breadcrumbs?: BreadcrumbItem[];
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebarMobile: () => void;
  onToggleSidebarCollapse: () => void;
}

const ROLE_DISPLAY_NAMES: Record<RoleUser, string> = {
  BUILDING_COORDINATOR: "Building Coordinator",
  BM_MANAGER: "B&M Manager",
  PP_MANAGER: "PP Manager",
  SB_SPECIALIST: "S&B Specialist HO",
  REGIONAL_MANAGER: "Regional Manager",
  KONTRAKTOR: "Rekanan Kontraktor",
  ADMIN: "Super Admin HO",
};

export function AppHeader({
  user,
  breadcrumbs = [],
  isSidebarOpen,
  isSidebarCollapsed,
  onToggleSidebarMobile,
  onToggleSidebarCollapse,
}: AppHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Konfirmasi Keluar",
      text: "Apakah Anda yakin ingin keluar dari sistem SPARTA-HARGA?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ED1C24",
      cancelButtonColor: "#475569",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      reverseButtons: true,
      customClass: {
        popup: "rounded-xl border-2 border-slate-300 shadow-xl",
        confirmButton:
          "px-4 py-2 rounded-lg font-bold text-white bg-[#ED1C24] hover:bg-red-700",
        cancelButton:
          "px-4 py-2 rounded-lg font-bold text-white bg-slate-600 hover:bg-slate-700",
      },
    });

    if (result.isConfirmed) {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
      } catch {
        router.push("/login");
      }
    }
  };

  const roleLabel = user?.role
    ? ROLE_DISPLAY_NAMES[user.role] || user.role
    : "Pengguna";

  return (
    <header className="sticky top-0 z-40 bg-white border-b-2 border-slate-200 shadow-xs">
      {/* Dual-Ribbon Alfamart Accent Bar (Red & Yellow) */}
      <div className="h-1 w-full flex">
        <div className="h-full w-2/3 bg-[#ED1C24]" />
        <div className="h-full w-1/3 bg-[#FFD100]" />
      </div>

      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Sisi Kiri: Toggle Sidebar & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Tombol Mobile Hamburger */}
          <button
            type="button"
            onClick={onToggleSidebarMobile}
            className="md:hidden p-2 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle menu mobile"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5 text-slate-800" />
            ) : (
              <Menu className="w-5 h-5 text-slate-800" />
            )}
          </button>

          {/* Tombol Collapse Desktop */}
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden md:flex p-2 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-blue-50 hover:text-[#005BAC] hover:border-[#005BAC] cursor-pointer transition-colors"
            title={
              isSidebarCollapsed
                ? "Perluas Menu Sidebar"
                : "Ciutkan Menu Sidebar"
            }
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Logo Brand Mini jika Sidebar Ciut */}
          {isSidebarCollapsed && (
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 pr-2 border-r-2 border-slate-200 shrink-0"
            >
              <Image
                src="/alfamart-logo.png"
                alt="Alfamart"
                width={85}
                height={26}
                className="h-6 w-auto object-contain"
                priority
              />
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#005BAC] text-white">
                HARGA
              </span>
            </Link>
          )}

          {/* Navigasi Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 truncate"
          >
            <span className="font-bold text-slate-900 shrink-0 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#005BAC]" />
              <span>SPARTA</span>
            </span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="font-medium hover:text-[#005BAC] truncate"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-bold text-slate-900 truncate">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Sisi Kanan: Info Profil Pengguna & Logout */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Badge Cabang / Wilayah */}
          {(user?.namaCabang || user?.namaPerusahaanKontraktor) && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border-2 border-slate-300 text-[11px] font-bold text-slate-700">
              <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate max-w-[160px]">
                {user.namaPerusahaanKontraktor || user.namaCabang}
              </span>
            </div>
          )}

          {/* User Info Pill */}
          <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg bg-white border-2 border-slate-300">
            <div className="w-7 h-7 rounded-md bg-[#005BAC] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user?.fullName ? (
                user.fullName.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="text-left hidden md:block leading-tight">
              <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                {user?.fullName || "Tamu"}
              </div>
              <div className="text-[10px] font-semibold text-[#005BAC]">
                {roleLabel}
              </div>
            </div>
          </div>

          {/* Tombol Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-red-50 hover:text-[#ED1C24] hover:border-[#ED1C24] cursor-pointer transition-colors"
            title="Keluar dari SPARTA-HARGA"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
