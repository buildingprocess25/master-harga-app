import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/store/StoreProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SPARTA-HARGA | Sistem Pengelolaan Master Harga & Negosiasi Rekanan",
  description:
    "Aplikasi Independen Pengajuan Harga, Kuorum Kontraktor Cabang, dan Evaluasi Spesifikasi Trial 90 Hari PT Sumber Alfaria Trijaya Tbk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
