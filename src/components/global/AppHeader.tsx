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
import { UserSessionProfile } from "@/types";
import { cn, getLokasiUnitLabel, getRoleDisplayName } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface AppHeaderProps {
  user?: UserSessionProfile | null;
  breadcrumbs?: BreadcrumbItem[];
  isSidebarOpen?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleSidebarMobile?: () => void;
  onToggleSidebarCollapse?: () => void;
  /** Mode mandiri tanpa sidebar (digunakan di Portal Kontraktor & Master Harga) */
  standalone?: boolean;
  homeHref?: string;
  title?: string;
  badgeTitle?: string;
  subNavigation?: React.ReactNode;
}

export function AppHeader({
  user,
  breadcrumbs = [],
  isSidebarOpen = false,
  isSidebarCollapsed = false,
  onToggleSidebarMobile,
  onToggleSidebarCollapse,
  standalone = false,
  homeHref = "/",
  title = "SPARTA-PRICING",
  badgeTitle,
  subNavigation,
}: AppHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Konfirmasi Keluar",
      text: "Apakah Anda yakin ingin keluar dari sistem SPARTA-PRICING?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ED1C24",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      } catch {
        router.push("/login");
      }
    }
  };

  const roleLabel = getRoleDisplayName(user?.role);
  const unitLabel = user ? getLokasiUnitLabel(user) : null;

  return (
    <header className="sticky top-0 z-40 bg-white border-b-2 border-slate-200 shadow-2xs">
      {/* Pita Ganda Khas Alfamart (Merah 2/3 & Kuning 1/3) */}
      <div className="h-1 w-full flex shrink-0">
        <div className="h-full w-2/3 bg-[#ED1C24]" />
        <div className="h-full w-1/3 bg-[#FFD100]" />
      </div>

      <div
        className={cn(
          "px-4 py-2.5 flex items-center justify-between gap-3",
          standalone && "max-w-6xl mx-auto"
        )}
      >
        {/* Sisi Kiri: Brand Logo atau Toggle Sidebar & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {standalone ? (
            <Link href={homeHref} className="flex items-center gap-3 shrink-0">
              <Image
                src="/alfamart-logo.png"
                alt="Logo Alfamart"
                width={110}
                height={32}
                className="h-7 w-auto object-contain"
                priority
              />
              <span className="hidden sm:block h-6 w-px bg-slate-300" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                  {title}
                </span>
                {badgeTitle && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[#005BAC] text-white text-[10px] font-black uppercase tracking-wider">
                    {badgeTitle}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <>
              {/* Tombol Mobile Hamburger */}
              {onToggleSidebarMobile && (
                <button
                  type="button"
                  onClick={onToggleSidebarMobile}
                  className="md:hidden p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                  aria-label="Toggle menu mobile"
                >
                  {isSidebarOpen ? (
                    <X className="w-5 h-5 text-slate-800" />
                  ) : (
                    <Menu className="w-5 h-5 text-slate-800" />
                  )}
                </button>
              )}

              {/* Tombol Collapse Desktop */}
              {onToggleSidebarCollapse && (
                <button
                  type="button"
                  onClick={onToggleSidebarCollapse}
                  className="hidden md:flex p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-blue-50 hover:text-[#005BAC] hover:border-[#005BAC] cursor-pointer transition-colors"
                  title={
                    isSidebarCollapsed
                      ? "Perluas Menu Sidebar"
                      : "Ciutkan Menu Sidebar"
                  }
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}

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
                    PRICING
                  </span>
                </Link>
              )}

              {/* Navigasi Breadcrumbs */}
              <nav
                aria-label="Breadcrumb"
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 truncate"
              >
                <span className="font-black text-slate-900 shrink-0 flex items-center gap-1">
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
            </>
          )}
        </div>

        {/* Sisi Kanan: Info Profil Pengguna & Logout */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Badge Cabang / Unit Kerja */}
          {unitLabel && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border-2 border-slate-300 text-xs font-bold text-slate-700">
              <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate max-w-[180px]">{unitLabel}</span>
            </div>
          )}

          {/* User Info Pill */}
          <div className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-xl bg-white border-2 border-slate-300">
            <div className="w-7 h-7 rounded-lg bg-[#005BAC] text-white flex items-center justify-center font-black text-xs shrink-0">
              {user?.fullName ? (
                user.fullName.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="text-left hidden md:block leading-tight">
              <div className="text-xs font-black text-slate-900 truncate max-w-[150px]">
                {user?.fullName || "Pengguna"}
              </div>
              <div className="text-[10px] font-bold text-[#005BAC]">
                {roleLabel}
              </div>
            </div>
          </div>

          {/* Tombol Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 cursor-pointer transition-colors"
            title="Keluar dari SPARTA-PRICING"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-Navigasi opsional (mis. Katalog Harga / Rekanan Parked) */}
      {subNavigation && (
        <div className="bg-white border-t-2 border-slate-200">
          <div className="max-w-6xl mx-auto px-4">{subNavigation}</div>
        </div>
      )}
    </header>
  );
}
