"use client";

import Image from "next/image";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedCabangId } from "@/store/slices/cabangSlice";
import {
  assignKontraktorKeCabang,
  selectKontraktorWithCabangRelations,
  toggleStatusKeaktifanRelasi,
} from "@/store/slices/kontraktorSlice";

type FilterStatusRelasi = "ALL" | "HAS_AKTIF" | "HAS_PARKED";

export default function HomePage() {
  const dispatch = useAppDispatch();
  const cabangList = useAppSelector((state) => state.cabang.list);
  const selectedCabangId = useAppSelector((state) => state.cabang.selectedCabangId);
  const kontraktorRelations = useAppSelector(selectKontraktorWithCabangRelations);

  // Local UI state for search, status filter, modal assign, loading, and error states (R-27)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatusRelasi>("ALL");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Quick-assign form state
  const [selectedKontraktorForAssign, setSelectedKontraktorForAssign] = useState("KTR-01");
  const [selectedCabangForAssign, setSelectedCabangForAssign] = useState("CBG-BDG");
  const [assignFeedback, setAssignFeedback] = useState<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredKontraktor = kontraktorRelations.filter((ktr) => {
    const matchesCabang =
      selectedCabangId === "ALL" ||
      ktr.relasiCabang.some((rel) => rel.cabangId === selectedCabangId);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "HAS_AKTIF" && ktr.totalCabangAktif > 0) ||
      (statusFilter === "HAS_PARKED" && ktr.totalCabangNonaktif > 0);

    const matchesSearch =
      normalizedQuery.length === 0 ||
      ktr.namaPerusahaan.toLowerCase().includes(normalizedQuery) ||
      ktr.kodeVendor.toLowerCase().includes(normalizedQuery) ||
      ktr.picName.toLowerCase().includes(normalizedQuery) ||
      ktr.relasiCabang.some((rel) =>
        rel.cabang?.namaCabang.toLowerCase().includes(normalizedQuery)
      );

    return matchesCabang && matchesStatus && matchesSearch;
  });

  const totalRelasiAktif = kontraktorRelations.reduce(
    (acc, k) => acc + k.totalCabangAktif,
    0
  );
  const totalRelasiParked = kontraktorRelations.reduce(
    (acc, k) => acc + k.totalCabangNonaktif,
    0
  );

  function handleRefreshStore() {
    setSyncError(null);
    setIsSyncing(true);
    window.setTimeout(() => {
      setIsSyncing(false);
    }, 350);
  }

  function handleResetFilters() {
    dispatch(setSelectedCabangId("ALL"));
    setStatusFilter("ALL");
    setSearchQuery("");
    setSyncError(null);
  }

  function handleAssignCabang(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAssignFeedback(null);
    setSyncError(null);

    const targetKtr = kontraktorRelations.find(
      (k) => k.id === selectedKontraktorForAssign
    );
    const targetCbg = cabangList.find((c) => c.id === selectedCabangForAssign);

    if (!targetKtr || !targetCbg) {
      setSyncError("Data kontraktor atau cabang tujuan tidak ditemukan.");
      return;
    }

    const alreadyAssigned = targetKtr.relasiCabang.some(
      (r) => r.cabangId === selectedCabangForAssign
    );

    if (alreadyAssigned) {
      setSyncError(
        `${targetKtr.namaPerusahaan} sudah terdaftar pada ${targetCbg.namaCabang}.`
      );
      return;
    }

    dispatch(
      assignKontraktorKeCabang({
        kontraktorId: selectedKontraktorForAssign,
        cabangId: selectedCabangForAssign,
      })
    );
    setAssignFeedback(
      `Berhasil menambahkan relasi ${targetKtr.namaPerusahaan} ke ${targetCbg.namaCabang}.`
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Enterprise Header anchored by Alfamart Logo & Dual-Ribbon Motif */}
      <header className="sticky top-0 z-20 bg-card shadow-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center rounded-md border border-border bg-white px-2.5 py-1">
              <Image
                src="/alfamart-logo.png"
                alt="Logo Resmi Alfamart"
                width={116}
                height={38}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>
            <div className="border-l border-border pl-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-alfa-blue sm:text-lg">
                  SPARTA-HARGA
                </h1>
                <span className="rounded bg-pastel-blue px-2 py-0.5 font-mono text-[11px] font-semibold text-pastel-blue-ink border border-pastel-blue-border">
                  Building &amp; Maintenance
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                PT Sumber Alfaria Trijaya Tbk : Pengelolaan Master Harga, Kuorum Cabang &amp; Spesifikasi Trial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshStore}
              disabled={isSyncing}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-pastel-blue-border bg-pastel-blue px-3.5 py-2 text-xs font-semibold text-pastel-blue-ink transition hover:bg-accent disabled:opacity-60"
            >
              <span>{isSyncing ? "Memuat State..." : "Segarkan State Redux"}</span>
            </button>
          </div>
        </div>

        {/* Alfamart Signature Dual-Ribbon Bar (Solid Red #ED1C24 + Solid Yellow #FFD100) */}
        <div className="flex h-1.5 w-full flex-col">
          <div className="h-1 w-full bg-alfa-red" />
          <div className="h-0.5 w-full bg-alfa-yellow" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Asymmetric Brand-Anchored Summary Split (RHYTHM 2: Avoids 4 identical template cards) */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Focal Point Left: Operational Coverage & Token Preview */}
          <div className="flex flex-col justify-between rounded-lg border border-pastel-blue-border bg-pastel-blue p-5 lg:col-span-7">
            <div>
              <span className="inline-block rounded bg-alfa-blue px-2.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                FONDASI SISTEM &amp; RELASI REKANAN
              </span>
              <h2 className="mt-2 text-lg font-bold text-pastel-blue-ink sm:text-xl">
                Pemetaan Rekanan Kontraktor Lintas Cabang Alfamart
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-foreground/80 sm:text-sm">
                Setiap PT/CV kontraktor dapat beroperasi di lebih dari satu cabang. Status penonaktifan sementara (Parked akibat menolak penetapan harga 2x berturut-turut) dikunci spesifik pada cabang terjadinya penolakan tanpa mengganggu pekerjaan di cabang lain.
              </p>
            </div>

            {/* Solid & Pastel Brand Swatch Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-pastel-blue-border/80 pt-3.5 text-xs">
              <span className="font-semibold text-pastel-blue-ink">Token Identitas:</span>
              <span className="inline-flex items-center gap-1.5 rounded bg-alfa-blue px-2.5 py-1 font-mono text-[11px] font-semibold text-white">
                Alfa Blue #005BAC
              </span>
              <span className="inline-flex items-center gap-1.5 rounded bg-alfa-red px-2.5 py-1 font-mono text-[11px] font-semibold text-white">
                Alfa Red #ED1C24
              </span>
              <span className="inline-flex items-center gap-1.5 rounded border border-pastel-yellow-border bg-alfa-yellow px-2.5 py-1 font-mono text-[11px] font-bold text-foreground">
                Alfa Yellow #FFD100
              </span>
              <span className="inline-flex items-center gap-1.5 rounded border border-pastel-green-border bg-pastel-green px-2.5 py-1 font-mono text-[11px] font-semibold text-pastel-green-ink">
                Pastel Aktif #E7F6F0
              </span>
            </div>
          </div>

          {/* Right Column: Compact Metric Ledger */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 lg:col-span-5">
            <div className="rounded-md border border-border bg-background p-3.5">
              <span className="text-xs font-medium text-muted-foreground">
                Cakupan Cabang
              </span>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-alfa-blue">
                {cabangList.length} Cabang
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Regional 1 &amp; Regional 2
              </p>
            </div>

            <div className="rounded-md border border-border bg-background p-3.5">
              <span className="text-xs font-medium text-muted-foreground">
                Total Perusahaan Rekanan
              </span>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                {kontraktorRelations.length} PT/CV
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Terdaftar di Redux Store
              </p>
            </div>

            <div className="rounded-md border border-pastel-green-border bg-pastel-green p-3.5">
              <span className="text-xs font-semibold text-pastel-green-ink">
                Relasi Cabang Aktif
              </span>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-pastel-green-ink">
                {totalRelasiAktif}
              </p>
              <p className="mt-0.5 text-[11px] text-pastel-green-ink/90">
                Peserta kuorum 50% + 1
              </p>
            </div>

            <div className="rounded-md border border-pastel-red-border bg-pastel-red p-3.5">
              <span className="text-xs font-semibold text-pastel-red-ink">
                Relasi Parked (Nonaktif)
              </span>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-pastel-red-ink">
                {totalRelasiParked}
              </p>
              <p className="mt-0.5 text-[11px] text-pastel-red-ink/90">
                Perlu diskusi mediasi
              </p>
            </div>
          </div>
        </section>

        {/* Form Tambah Relasi Kontraktor ke Cabang Baru (Interactive Redux Mutation) */}
        <section className="rounded-lg border border-pastel-yellow-border bg-pastel-yellow p-4">
          <form
            onSubmit={handleAssignCabang}
            className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end"
          >
            <div className="space-y-1">
              <span className="inline-block rounded border border-pastel-yellow-border bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-pastel-yellow-ink">
                Simulasi Penugasan Cabang (Redux Action)
              </span>
              <h3 className="text-sm font-bold text-pastel-yellow-ink">
                Daftarkan Kontraktor ke Cabang Tambahan
              </h3>
              <p className="text-xs text-pastel-yellow-ink/90">
                Pilih perusahaan kontraktor dan cabang tujuan untuk menambahkan relasi kerja baru ke global state.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2.5">
              <div>
                <label
                  htmlFor="select-kontraktor"
                  className="block text-[11px] font-semibold text-pastel-yellow-ink"
                >
                  Perusahaan Kontraktor
                </label>
                <select
                  id="select-kontraktor"
                  value={selectedKontraktorForAssign}
                  onChange={(e) => setSelectedKontraktorForAssign(e.target.value)}
                  className="mt-1 min-h-11 rounded-md border border-pastel-yellow-border bg-white px-3 py-2 text-xs font-medium text-foreground"
                >
                  {kontraktorRelations.map((ktr) => (
                    <option key={ktr.id} value={ktr.id}>
                      {ktr.kodeVendor} : {ktr.namaPerusahaan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="select-cabang"
                  className="block text-[11px] font-semibold text-pastel-yellow-ink"
                >
                  Cabang Alfamart Tujuan
                </label>
                <select
                  id="select-cabang"
                  value={selectedCabangForAssign}
                  onChange={(e) => setSelectedCabangForAssign(e.target.value)}
                  className="mt-1 min-h-11 rounded-md border border-pastel-yellow-border bg-white px-3 py-2 text-xs font-medium text-foreground"
                >
                  {cabangList.map((cbg) => (
                    <option key={cbg.id} value={cbg.id}>
                      {cbg.kodeCabang} : {cbg.namaCabang}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="min-h-11 rounded-md bg-alfa-blue px-4 py-2 text-xs font-semibold text-white transition hover:bg-alfa-blue-hover"
              >
                Tambahkan Relasi Cabang
              </button>
            </div>
          </form>

          {assignFeedback && (
            <div
              role="status"
              className="mt-3 flex items-center justify-between rounded-md border border-pastel-green-border bg-pastel-green px-3 py-2 text-xs font-medium text-pastel-green-ink"
            >
              <span>{assignFeedback}</span>
              <button
                type="button"
                onClick={() => setAssignFeedback(null)}
                className="min-h-11 px-2 font-semibold underline"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Error State Banner (R-27) */}
          {syncError && (
            <div
              role="alert"
              className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-pastel-red-border bg-pastel-red px-3 py-2 text-xs font-semibold text-pastel-red-ink"
            >
              <span>Peringatan Validasi: {syncError}</span>
              <button
                type="button"
                onClick={() => setSyncError(null)}
                className="min-h-11 rounded border border-pastel-red-border bg-white px-3 py-1 text-xs font-semibold text-pastel-red-ink hover:bg-pastel-red"
              >
                Mengerti &amp; Bersihkan Pesan
              </button>
            </div>
          )}
        </section>

        {/* Main Relational Matrix Table */}
        <section className="rounded-lg border border-border bg-card shadow-xs">
          {/* Controls Bar: Search, Status Filter, and Branch Pills */}
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Daftar Rekanan Kontraktor &amp; Status Keaktifan per Cabang
                </h2>
                <p className="text-xs text-muted-foreground">
                  Klik langsung pada tombol cabang di kolom relasi untuk mengubah status antara{" "}
                  <strong className="text-pastel-green-ink">Aktif</strong> dan{" "}
                  <strong className="text-pastel-red-ink">Parked (Nonaktif Sementara)</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="search-kontraktor" className="sr-only">
                  Cari nama PT, kode vendor, atau PIC
                </label>
                <input
                  id="search-kontraktor"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari PT, kode vendor, PIC..."
                  className="min-h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground sm:w-64"
                />

                <label htmlFor="filter-status-relasi" className="sr-only">
                  Filter Status Keaktifan
                </label>
                <select
                  id="filter-status-relasi"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatusRelasi)}
                  className="min-h-11 rounded-md border border-input bg-white px-3 py-2 text-xs font-medium text-foreground"
                >
                  <option value="ALL">Semua Status Relasi</option>
                  <option value="HAS_AKTIF">Memiliki Cabang Aktif</option>
                  <option value="HAS_PARKED">Memiliki Cabang Parked</option>
                </select>
              </div>
            </div>

            {/* Filter Pill Cabang */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => dispatch(setSelectedCabangId("ALL"))}
                className={`min-h-11 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCabangId === "ALL"
                    ? "bg-alfa-blue text-white"
                    : "border border-pastel-blue-border bg-pastel-blue text-pastel-blue-ink hover:bg-accent"
                }`}
              >
                Semua Cabang ({cabangList.length})
              </button>
              {cabangList.map((cbg) => (
                <button
                  key={cbg.id}
                  type="button"
                  onClick={() => dispatch(setSelectedCabangId(cbg.id))}
                  className={`min-h-11 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    selectedCabangId === cbg.id
                      ? "bg-alfa-blue text-white"
                      : "border border-pastel-blue-border bg-pastel-blue text-pastel-blue-ink hover:bg-accent"
                  }`}
                >
                  {cbg.kodeCabang} : {cbg.namaCabang.replace("Cabang ", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State (R-27) */}
          {isSyncing ? (
            <div className="p-8 text-center">
              <p className="font-mono text-xs font-semibold text-alfa-blue">
                Menyinkronkan data relasi kontraktor dan cabang dari Redux Store...
              </p>
            </div>
          ) : filteredKontraktor.length === 0 ? (
            /* Empty State (R-27) */
            <div className="p-8 text-center">
              <p className="text-sm font-bold text-foreground">
                Tidak Ada Rekanan Kontraktor yang Cocok
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pencarian &quot;{searchQuery}&quot; atau kombinasi filter cabang saat ini tidak menghasilkan data.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex min-h-11 items-center rounded-md bg-alfa-blue px-4 py-2 text-xs font-semibold text-white hover:bg-alfa-blue-hover"
              >
                Reset Pencarian &amp; Filter Cabang
              </button>
            </div>
          ) : (
            /* Data Table State */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-foreground">
                      Kode Vendor
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-foreground">
                      Perusahaan Kontraktor (PT / CV)
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-foreground">
                      PIC &amp; Kontak
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-foreground">
                      Cakupan Cabang &amp; Status Keaktifan (Klik untuk Ubah)
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-foreground">
                      Rekapitulasi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredKontraktor.map((ktr) => (
                    <tr key={ktr.id} className="transition hover:bg-pastel-blue/40">
                      <td className="px-4 py-3.5 align-top font-mono text-xs font-bold tabular-nums text-alfa-blue">
                        {ktr.kodeVendor}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <p className="text-xs font-bold text-foreground sm:text-sm">
                          {ktr.namaPerusahaan}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {ktr.email}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <p className="text-xs font-semibold text-foreground">
                          {ktr.picName}
                        </p>
                        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {ktr.telepon}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-wrap gap-2">
                          {ktr.relasiCabang.map((rel) => {
                            const isAktif = rel.statusKeaktifan === "AKTIF";
                            return (
                              <button
                                key={rel.id}
                                type="button"
                                title={
                                  isAktif
                                    ? "Klik untuk simulasi Parkir (Nonaktifkan Sementara) di cabang ini"
                                    : `Alasan Nonaktif: ${rel.alasanNonaktif ?? "-"} (Klik untuk Aktifkan Kembali)`
                                }
                                onClick={() =>
                                  dispatch(
                                    toggleStatusKeaktifanRelasi({
                                      relasiId: rel.id,
                                      statusBaru: isAktif ? "NONAKTIF_SEMENTARA" : "AKTIF",
                                    })
                                  )
                                }
                                className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                                  isAktif
                                    ? "border-pastel-green-border bg-pastel-green text-pastel-green-ink hover:brightness-95"
                                    : "border-pastel-red-border bg-pastel-red text-pastel-red-ink hover:brightness-95"
                                }`}
                              >
                                <span>{rel.cabang?.namaCabang}</span>
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                                    isAktif
                                      ? "bg-success text-white"
                                      : "bg-alfa-red text-white"
                                  }`}
                                >
                                  {isAktif ? "Aktif" : "Parked"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right align-top font-mono text-xs tabular-nums">
                        <span className="inline-block rounded bg-pastel-green px-2 py-0.5 font-bold text-pastel-green-ink border border-pastel-green-border">
                          {ktr.totalCabangAktif} Aktif
                        </span>
                        {ktr.totalCabangNonaktif > 0 && (
                          <span className="ml-1.5 inline-block rounded bg-pastel-red px-2 py-0.5 font-bold text-pastel-red-ink border border-pastel-red-border">
                            {ktr.totalCabangNonaktif} Parked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
