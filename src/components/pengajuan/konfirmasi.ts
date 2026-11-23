"use client";

import Swal from "sweetalert2";

type Nada = "biru" | "hijau" | "merah" | "kuning";

const WARNA: Record<Nada, { hex: string; kelas: string }> = {
  biru: { hex: "#005BAC", kelas: "bg-[#005BAC] hover:bg-[#004687]" },
  hijau: { hex: "#0F8A5F", kelas: "bg-[#0F8A5F] hover:bg-[#0B6E4C]" },
  merah: { hex: "#ED1C24", kelas: "bg-[#ED1C24] hover:bg-red-700" },
  kuning: { hex: "#D99B00", kelas: "bg-[#D99B00] hover:bg-[#B88300]" },
};

/**
 * Dialog konfirmasi aksi kritis (SweetAlert2), gaya selaras dengan konfirmasi
 * logout di AppHeader: popup solid, tombol kontras tinggi, tombol batal di kiri.
 */
export async function konfirmasiAksi(opsi: {
  judul: string;
  teks: string;
  tombol: string;
  nada?: Nada;
}): Promise<boolean> {
  const w = WARNA[opsi.nada ?? "biru"];
  const hasil = await Swal.fire({
    title: opsi.judul,
    text: opsi.teks,
    icon: opsi.nada === "merah" ? "warning" : "question",
    showCancelButton: true,
    confirmButtonColor: w.hex,
    cancelButtonColor: "#475569",
    confirmButtonText: opsi.tombol,
    cancelButtonText: "Batal",
    reverseButtons: true,
    focusCancel: opsi.nada === "merah",
    customClass: {
      popup: "rounded-xl border-2 border-slate-300 shadow-xl",
      confirmButton: `px-4 py-2 rounded-lg font-bold text-white ${w.kelas}`,
      cancelButton: "px-4 py-2 rounded-lg font-bold text-white bg-slate-600 hover:bg-slate-700",
    },
  });
  return hasil.isConfirmed;
}

export function notifikasi(jenis: "sukses" | "gagal", pesan: string) {
  return Swal.fire({
    title: jenis === "sukses" ? "Berhasil" : "Gagal",
    text: pesan,
    icon: jenis === "sukses" ? "success" : "error",
    confirmButtonColor: jenis === "sukses" ? "#005BAC" : "#ED1C24",
    confirmButtonText: "Tutup",
    customClass: {
      popup: "rounded-xl border-2 border-slate-300 shadow-xl",
      confirmButton: `px-4 py-2 rounded-lg font-bold text-white ${
        jenis === "sukses" ? "bg-[#005BAC] hover:bg-[#004687]" : "bg-[#ED1C24] hover:bg-red-700"
      }`,
    },
  });
}
