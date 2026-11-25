"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { UserSessionProfile } from "@/types";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppLayoutShellProps {
  children: React.ReactNode;
  user?: UserSessionProfile | null;
  breadcrumbs?: BreadcrumbItem[];
}

export function AppLayoutShell({
  children,
  user,
  breadcrumbs = [],
}: AppLayoutShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [fetchedUser, setFetchedUser] = useState<UserSessionProfile | null>(null);

  // Bila halaman client tidak meneruskan prop user, ambil otomatis sesi aktif dari /api/auth/me
  useEffect(() => {
    if (user !== undefined) return;
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.success && json?.user) {
          setFetchedUser(json.user as UserSessionProfile);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  const resolvedUser = user !== undefined ? user : fetchedUser;

  // Baca preferensi collapse dari localStorage saat mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sparta_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sparta_sidebar_collapsed", String(next));
      } catch {
        // Abaikan
      }
      return next;
    });
  };

  const handleToggleMobile = () => {
    setIsOpenMobile((prev) => !prev);
  };

  const handleCloseMobile = () => {
    setIsOpenMobile(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 flex">
      {/* 1. Collapsible Sidebar (Desktop Sticky & Mobile Drawer) */}
      <AppSidebar
        user={resolvedUser}
        isCollapsed={isCollapsed}
        isOpenMobile={isOpenMobile}
        onToggleCollapse={handleToggleCollapse}
        onCloseMobile={handleCloseMobile}
      />

      {/* 2. Main Wrapper (Header + Content Area) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <AppHeader
          user={resolvedUser}
          breadcrumbs={breadcrumbs}
          isSidebarOpen={isOpenMobile}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebarMobile={handleToggleMobile}
          onToggleSidebarCollapse={handleToggleCollapse}
        />

        {/* Canvas Area Konten Utama */}
        <main className="flex-1 p-4 md:p-6 min-w-0">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
