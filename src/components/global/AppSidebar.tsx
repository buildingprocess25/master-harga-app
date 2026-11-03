"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  AlertCircle,
  Store,
  LayoutDashboard,
  PlusCircle,
  CheckSquare,
  Tag,
  FileSpreadsheet,
  Sliders,
  Vote,
  Ban,
  BookOpen,
  Box,
  ShieldCheck,
  Users,
  Clock,
  History,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { UserSessionProfile, RoleUser } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  badgeVariant?: "red" | "blue" | "amber";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AppSidebarProps {
  user?: UserSessionProfile | null;
  isCollapsed: boolean;
  isOpenMobile: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function AppSidebar({
  user,
  isCollapsed,
  isOpenMobile,
  onToggleCollapse,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname();

  const getNavSections = (role?: RoleUser): NavSection[] => {
    switch (role) {
      case "BUILDING_COORDINATOR":
        return [
          {
            title: "Operasional Survei",
            items: [
              {
                label: "Siap Survei Pasar",
                href: "/building-coordinator",
                icon: ClipboardList,
                badgeCount: 2,
                badgeVariant: "red",
              },
              {
                label: "Survei Perbaikan",
                href: "/building-coordinator/revisi",
                icon: AlertCircle,
              },
            ],
          },
          {
            title: "Data Master Toko",
            items: [
              {
                label: "Master Toko Lokal",
                href: "/building-coordinator/master-toko",
                icon: Store,
              },
            ],
          },
        ];

      case "BM_MANAGER":
      case "PP_MANAGER":
        return [
          {
            title: "Pengajuan Cabang",
            items: [
              {
                label: "Dashboard Pengajuan",
                href: "/bm-manager",
                icon: LayoutDashboard,
              },
              {
                label: "Inisiasi Harga Baru",
                href: "/bm-manager/buat-pengajuan",
                icon: PlusCircle,
              },
              {
                label: "Review Survei Toko",
                href: "/bm-manager/review-survei",
                icon: CheckSquare,
                badgeCount: 1,
                badgeVariant: "amber",
              },
            ],
          },
          {
            title: "Katalog Cabang",
            items: [
              {
                label: "Katalog Harga Rilis",
                href: "/bm-manager/katalog-harga",
                icon: Tag,
              },
            ],
          },
        ];

      case "SB_SPECIALIST":
        return [
          {
            title: "Worksheet & Margin",
            items: [
              {
                label: "Mastering AHSP",
                href: "/sb-specialist",
                icon: FileSpreadsheet,
                badgeCount: 1,
                badgeVariant: "blue",
              },
              {
                label: "Evaluasi Live Margin",
                href: "/sb-specialist/evaluasi-margin",
                icon: Sliders,
              },
              {
                label: "Banding Kontraktor",
                href: "/sb-specialist/banding-rekanan",
                icon: Vote,
              },
              {
                label: "Rekanan Nonaktif (Parked)",
                href: "/sb-specialist/rekanan-parked",
                icon: Ban,
                badgeCount: 1,
                badgeVariant: "red",
              },
            ],
          },
          {
            title: "Pustaka Standar HO",
            items: [
              {
                label: "Pustaka Koefisien",
                href: "/sb-specialist/master-koefisien",
                icon: BookOpen,
              },
              {
                label: "Master Item Spek",
                href: "/sb-specialist/master-item",
                icon: Box,
              },
            ],
          },
        ];

      case "REGIONAL_MANAGER":
        return [
          {
            title: "Persetujuan Regional",
            items: [
              {
                label: "Approval Layer 3",
                href: "/regional-manager",
                icon: ShieldCheck,
                badgeCount: 2,
                badgeVariant: "red",
              },
              {
                label: "Monitoring Kuorum",
                href: "/regional-manager/monitoring-kuorum",
                icon: Users,
              },
              {
                label: "Rekanan Parked",
                href: "/regional-manager/rekanan-parked",
                icon: Ban,
              },
            ],
          },
          {
            title: "Master Regional",
            items: [
              {
                label: "Katalog Harga Regional",
                href: "/regional-manager/katalog-harga",
                icon: Tag,
              },
            ],
          },
        ];

      case "KONTRAKTOR":
        return [
          {
            title: "Kuorum Penawaran",
            items: [
              {
                label: "Penawaran Aktif",
                href: "/kontraktor",
                icon: Clock,
                badgeCount: 1,
                badgeVariant: "red",
              },
              {
                label: "Riwayat Voting",
                href: "/kontraktor/riwayat",
                icon: History,
              },
            ],
          },
        ];

      case "ADMIN":
        return [
          {
            title: "Master Data & Whitelist",
            items: [
              {
                label: "Katalog Master Harga",
                href: "/master-harga",
                icon: Tag,
              },
              {
                label: "Whitelist Pengguna",
                href: "/admin/users",
                icon: Users,
              },
              {
                label: "Divisi & Cabang",
                href: "/admin/organisasi",
                icon: Building2,
              },
              {
                label: "Audit Logs",
                href: "/admin/audit-logs",
                icon: FileText,
              },
            ],
          },
        ];

      default:
        return [
          {
            title: "Navigasi",
            items: [
              {
                label: "Katalog Master Harga",
                href: "/master-harga",
                icon: Tag,
              },
            ],
          },
        ];
    }
  };

  const navSections = getNavSections(user?.role);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b-2 border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <Image
            src="/alfamart-logo.png"
            alt="Logo Alfamart"
            width={120}
            height={38}
            className="h-8 w-auto object-contain shrink-0"
            priority
          />
          {!isCollapsed && (
            <div className="leading-tight">
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#005BAC] text-white inline-block">
                HARGA
              </span>
              <span className="block text-[11px] font-bold text-slate-900 mt-0.5">
                SPARTA MODULE
              </span>
            </div>
          )}
        </Link>

        {/* Tombol Collapse pada Desktop */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg border-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          title={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Role Banner Indicator */}
      {!isCollapsed && user && (
        <div className="px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Workspace Wewenang
          </div>
          <div className="font-extrabold text-[#005BAC] flex items-center gap-1.5 mt-0.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-[#E0A800] shrink-0" />
            <span className="truncate">{user.role}</span>
          </div>
        </div>
      )}

      {/* Navigasi Menu List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            {!isCollapsed && (
              <h3 className="px-2 mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item, iIdx) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" &&
                    item.href !== "/bm-manager" &&
                    item.href !== "/building-coordinator" &&
                    item.href !== "/sb-specialist" &&
                    item.href !== "/regional-manager" &&
                    item.href !== "/kontraktor" &&
                    pathname.startsWith(item.href));

                const Icon = item.icon;

                return (
                  <li key={iIdx}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#005BAC] text-white shadow-sm"
                          : "text-slate-700 hover:bg-blue-50 hover:text-[#005BAC]"
                      } ${isCollapsed ? "justify-center px-2" : ""}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!isCollapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}

                      {/* Badge Counter */}
                      {item.badgeCount && item.badgeCount > 0 && (
                        <span
                          className={`font-black text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                            item.badgeVariant === "red"
                              ? "bg-[#ED1C24] text-white"
                              : item.badgeVariant === "amber"
                              ? "bg-[#FFD100] text-slate-900 font-extrabold"
                              : "bg-white text-[#005BAC]"
                          }`}
                        >
                          {item.badgeCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Organisasi & Cabang */}
      {!isCollapsed && (
        <div className="p-3 border-t-2 border-slate-200 bg-slate-50 text-[11px] text-slate-600 shrink-0">
          <div className="font-bold text-slate-900 truncate">
            {user?.namaCabang || "Head Office Cikokol"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            PT Sumber Alfaria Trijaya Tbk
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop Scrim */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r-2 border-slate-300 transform transition-transform duration-200 ease-in-out md:hidden ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden md:block shrink-0 bg-white border-r-2 border-slate-200 transition-all duration-200 ease-in-out sticky top-0 h-screen ${
          isCollapsed ? "w-18" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
