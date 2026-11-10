"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Plus,
  RotateCcw,
  Layers,
  Building2,
} from "lucide-react";
import Swal from "sweetalert2";
import CreatableSelect from "react-select/creatable";
import {
  PengajuanHargaItem,
  generateDeskripsiOtomatis,
  getKodeData,
} from "@/types/pengajuan";

export interface TambahPengajuanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: PengajuanHargaItem) => void;
  nextIndex?: number;
  existingItems?: PengajuanHargaItem[];
  itemToEdit?: PengajuanHargaItem | null;
  defaultCabang?: string;
}

const INITIAL_MATERIAL_OPTIONS = [
  "Keramik",
  "Granit",
  "Homogeneous Tile",
  "Keramik Dinding",
  "Vinyl",
  "Batu Alam",
  "Marmer",
  "Porselen",
];

const INITIAL_MERK_OPTIONS = [
  "Sandimas",
  "Roman",
  "Mosaic",
  "Toto",
  "KIA",
  "Inax",
];

const INITIAL_POSISI_OPTIONS = [
  "Dinding Gerai",
  "Lantai Gerai",
  "Dinding",
  "Lantai",
  "Area Teras Depan",
  "Plafon",
  "Tangga",
];

const INITIAL_AREA_OPTIONS = [
  "Area Teras Depan",
  "Sales Area",
  "Gudang",
  "Toilet",
  "Fascia Depan",
  "Area Parkir",
  "Back Office",
  "Dinding Area Depan",
  "Dinding Area Belakang",
];

const SATUAN_UKURAN_OPTIONS = [
  { label: "cm", value: "cm" },
  { label: "mm", value: "mm" },
  { label: "m", value: "m" },
  { label: "inch", value: "inch" },
];

const SATUAN_TEBAL_OPTIONS = [
  { label: "mm", value: "mm" },
  { label: "cm", value: "cm" },
  { label: "m", value: "m" },
];

const SATUAN_TOLERANSI_OPTIONS = [
  { label: "mm", value: "mm" },
  { label: "%", value: "%" },
  { label: "cm", value: "cm" },
];

const INITIAL_KATEGORI_OPTIONS = [
  "Pekerjaan Keramik",
  "Area Terbuka",
  "Pekerjaan Finishing",
  "Pekerjaan Pasangan",
  "Pekerjaan Sanitair",
  "Pekerjaan Lantai",
  "Pekerjaan Dinding",
  "Pekerjaan Plafon",
  "Pekerjaan Elektrikal",
  "Pekerjaan Pengecatan",
  "Pekerjaan Pintu & Jendela",
];

const INITIAL_UKURAN_OPTIONS = [
  "60x60",
  "40x40",
  "30x30",
  "30x60",
  "80x80",
  "50x50",
  "20x20",
  "15x90",
  "20x290",
  "20x400",
  "120",
  "120x240",
  "100x210",
  "300x300",
  "4",
  "6",
  "20",
];

const INITIAL_WARNA_OPTIONS = [
  "Grey",
  "White",
  "Cream",
  "Black",
  "Green",
  "Ivory",
  "Dark Grey",
  "Clear",
  "Oak Wood",
  "Teak Wood",
  "Signal Red",
  "Cool Daylight (6500K)",
  "Light Grey",
  "White Lily",
  "Natural Oak",
  "Hitam Anodized",
];

const INITIAL_TIPE_OPTIONS = [
  "Sicily Grey Matte",
  "Antique White",
  "Cream Carolina",
  "Green Moss",
  "Polish White",
  "Nero Portoro",
  "Travertine Cream Polish",
  "Pentalite Ultra Matt",
  "Rustic Stone Unpolished",
  "Moisture Shield 9mm",
  "Weatherbond Extreme",
  "Tempered Glass Frameless",
  "Plank Click Series",
  "One Sheet Solid",
  "dPorto Ivory Polished",
  "dPorto Ivory Matte Unpolished",
  "Shopfront 4\" Anodized",
  "Meson 59464 17W/18W",
  "Linear Fluted",
  "Linear Fluted 4-Groove",
  "Epogreen Multi-layer",
  "Hollow Anti-Sagging",
  "Essential SmartBright",
  "Silver Ion Shield",
  "Commercial Wear Layer 0.5mm",
  "Polos",
  "Wood",
];

const INITIAL_PERMUKAAN_OPTIONS = [
  "Matte",
  "Polish",
  "Glossy",
  "Unpolished",
  "Double Loading",
  "Nano Polish",
  "Embossed Wood",
  "Embossed Woodgrain",
  "Gloss Anti-Slip",
  "Matte Flat",
  "Diffuser Polycarbonate",
  "Satin Eggshell",
  "Deep Embossed Anti-Slip",
  "Semi Gloss",
  "Matt",
  "Halus",
  "Polished Edge",
  "Zincalume Coating",
  "Anodized",
  "Frosted Diffuser",
];

// Helper parsing & formatting
function parseNilaiDanSatuan(
  val?: string,
  defaultSatuan = "cm"
): { nilai: string; satuan: string } {
  if (!val) return { nilai: "", satuan: defaultSatuan };
  const trimmed = val.trim();
  const match = trimmed.match(/^(.+?)\s*([a-zA-Z%]+)$/);
  if (match) {
    return { nilai: match[1].trim(), satuan: match[2].trim() };
  }
  return { nilai: trimmed, satuan: defaultSatuan };
}

function formatTitleCase(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Solid Anti-Slop Style Configs for react-select/creatable
const solidComboboxStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "36px",
    height: "36px",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#005BAC" : "#cbd5e1",
    borderWidth: "2px",
    fontSize: "12px",
    backgroundColor: state.isDisabled ? "#f1f5f9" : "#ffffff",
    boxShadow: "none",
    "&:hover": {
      borderColor: state.isFocused ? "#005BAC" : "#94a3b8",
    },
  }),
  menu: (base: any) => ({
    ...base,
    fontSize: "12px",
    zIndex: 9999,
    borderRadius: "0.5rem",
    border: "2px solid #cbd5e1",
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "12px",
    backgroundColor: state.isSelected
      ? "#005BAC"
      : state.isFocused
      ? "#e0f2fe"
      : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    fontWeight: state.isSelected ? "700" : "500",
    cursor: "pointer",
  }),
  valueContainer: (base: any) => ({
    ...base,
    padding: "0 8px",
    overflow: "hidden",
  }),
  placeholder: (base: any) => ({
    ...base,
    color: "#94a3b8",
    fontSize: "12px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "#0f172a",
    fontWeight: "600",
    fontSize: "12px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  input: (base: any) => ({
    ...base,
    margin: "0",
    padding: "0",
    fontSize: "12px",
  }),
  indicatorsContainer: (base: any) => ({
    ...base,
    padding: "0 2px",
  }),
  dropdownIndicator: (base: any) => ({
    ...base,
    padding: "2px 4px",
    color: "#64748b",
  }),
  clearIndicator: (base: any) => ({
    ...base,
    padding: "2px 4px",
    color: "#64748b",
  }),
};

const solidMultiSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "36px",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#005BAC" : "#cbd5e1",
    borderWidth: "2px",
    fontSize: "12px",
    backgroundColor: state.isDisabled ? "#f1f5f9" : "#ffffff",
    boxShadow: "none",
    "&:hover": {
      borderColor: state.isFocused ? "#005BAC" : "#94a3b8",
    },
  }),
  menu: (base: any) => ({
    ...base,
    fontSize: "12px",
    zIndex: 9999,
    borderRadius: "0.5rem",
    border: "2px solid #cbd5e1",
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "12px",
    backgroundColor: state.isSelected
      ? "#005BAC"
      : state.isFocused
      ? "#e0f2fe"
      : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    fontWeight: state.isSelected ? "700" : "500",
    cursor: "pointer",
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "#005BAC",
    borderRadius: "0.375rem",
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    fontSize: "11px",
    color: "#ffffff",
    fontWeight: "700",
    padding: "2px 6px",
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: "#ffffff",
    ":hover": {
      backgroundColor: "#ED1C24",
      color: "#ffffff",
    },
  }),
};

const solidUnitSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "36px",
    height: "36px",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#005BAC" : "#cbd5e1",
    borderWidth: "2px",
    fontSize: "12px",
    boxShadow: "none",
    backgroundColor: state.isDisabled ? "#f1f5f9" : "#ffffff",
    "&:hover": {
      borderColor: state.isFocused ? "#005BAC" : "#94a3b8",
    },
  }),
  menu: (base: any) => ({
    ...base,
    minWidth: "90px",
    fontSize: "12px",
    zIndex: 9999,
    borderRadius: "0.5rem",
    border: "2px solid #cbd5e1",
    backgroundColor: "#ffffff",
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "12px",
    backgroundColor: state.isSelected
      ? "#005BAC"
      : state.isFocused
      ? "#e0f2fe"
      : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#0f172a",
    fontWeight: state.isSelected ? "700" : "500",
    cursor: "pointer",
  }),
  valueContainer: (base: any) => ({
    ...base,
    padding: "0 6px",
  }),
  indicatorsContainer: (base: any) => ({
    ...base,
    padding: "0",
  }),
  dropdownIndicator: (base: any) => ({
    ...base,
    padding: "2px",
  }),
};

export function TambahPengajuanModal({
  isOpen,
  onClose,
  onSubmit,
  nextIndex = 1,
  existingItems = [],
  itemToEdit = null,
  defaultCabang = "Cikokol",
}: TambahPengajuanModalProps) {
  // Form State
  const [kategori, setKategori] = useState("Pekerjaan Keramik");
  const [item, setItem] = useState("");

  // Ukuran dipisah nilai & satuan
  const [ukuranNilai, setUkuranNilai] = useState("");
  const [ukuranSatuan, setUkuranSatuan] = useState("cm");

  const [merk, setMerk] = useState("");
  const [warna, setWarna] = useState("");
  const [tipe, setTipe] = useState("");
  const [permukaan, setPermukaan] = useState("");

  // Ketebalan dipisah nilai & satuan
  const [tebalNilai, setTebalNilai] = useState("");
  const [tebalSatuan, setTebalSatuan] = useState("mm");

  // Toleransi dipisah nilai & satuan
  const [toleransiNilai, setToleransiNilai] = useState("");
  const [toleransiSatuan, setToleransiSatuan] = useState("mm");

  // Implementasi & Lokasi (Single-Select)
  const [implementasi, setImplementasi] = useState<string>("Dinding Gerai");
  const [lokasi, setLokasi] = useState<string>("");

  const [jenisPengajuan, setJenisPengajuan] = useState<"Hanya Jasa" | "Material">("Material");
  const [isTermasukBongkaran, setIsTermasukBongkaran] = useState(false);
  const [informasiTambahan, setInformasiTambahan] = useState("");
  const [cabang, setCabang] = useState(defaultCabang);

  const [kodeItem, setKodeItem] = useState(`SIP-${String(nextIndex).padStart(3, "0")}`);
  const [kodeMaster, setKodeMaster] = useState("");
  const [deskripsiOtomatis, setDeskripsiOtomatis] = useState("");
  const [copied, setCopied] = useState(false);

  // Nilai gabungan
  const combinedUkuran = useMemo(() => {
    if (!ukuranNilai.trim()) return "";
    return [ukuranNilai.trim(), ukuranSatuan.trim()].filter(Boolean).join(" ");
  }, [ukuranNilai, ukuranSatuan]);

  const combinedTebal = useMemo(() => {
    if (!tebalNilai.trim()) return "";
    return [tebalNilai.trim(), tebalSatuan.trim()].filter(Boolean).join(" ");
  }, [tebalNilai, tebalSatuan]);

  const combinedToleransi = useMemo(() => {
    if (!toleransiNilai.trim()) return "";
    return [toleransiNilai.trim(), toleransiSatuan.trim()].filter(Boolean).join(" ");
  }, [toleransiNilai, toleransiSatuan]);

  // Item lain tidak termasuk yang sedang diedit
  const otherItems = useMemo(() => {
    if (!itemToEdit) return existingItems;
    return existingItems.filter((i) => i.id !== itemToEdit.id && i.noTiket !== itemToEdit.noTiket);
  }, [existingItems, itemToEdit]);

  // Catatan revisi jika mode edit revisi
  const latestCatatanRevisi = useMemo(() => {
    if (!itemToEdit?.historyLog) return itemToEdit?.catatanReviewTerakhir || null;
    const revLog = [...itemToEdit.historyLog]
      .reverse()
      .find((l) => l.action === "REVISE" || l.action === "REJECT" || (l.role === "S&B Specialist" && l.catatan));
    return revLog?.catatan || itemToEdit?.catatanReviewTerakhir || null;
  }, [itemToEdit]);

  // Options Opsi Material Eksisting + Standar
  const materialReactSelectOptions = useMemo(() => {
    const uniqueMap = new Map();

    // 1. Existing items dari store
    existingItems.forEach((i) => {
      const name = i.item || i.namaItem || "";
      if (name.trim()) {
        const formattedName = formatTitleCase(name);
        if (!uniqueMap.has(formattedName.toLowerCase())) {
          uniqueMap.set(formattedName.toLowerCase(), {
            label: formattedName,
            value: formattedName,
            data: i,
          });
        }
      }
    });

    // 2. Initial static options
    INITIAL_MATERIAL_OPTIONS.forEach((name) => {
      const formattedName = formatTitleCase(name);
      if (!uniqueMap.has(formattedName.toLowerCase())) {
        uniqueMap.set(formattedName.toLowerCase(), {
          label: formattedName,
          value: formattedName,
          data: null,
        });
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [existingItems]);

  // Auto-fill form saat memilih material eksisting
  const handleItemSelect = (selectedOption: any) => {
    if (!selectedOption) {
      setItem("");
      return;
    }

    setItem(formatTitleCase(selectedOption.value));

    if (selectedOption.data) {
      const target = selectedOption.data as PengajuanHargaItem;
      setKategori(target.kategori || "Pekerjaan Keramik");

      const parsedUkuran = parseNilaiDanSatuan(target.ukuran, "cm");
      setUkuranNilai(parsedUkuran.nilai);
      setUkuranSatuan(parsedUkuran.satuan || "cm");

      setMerk(target.merk || "");
      setWarna(target.warna || "");
      setTipe(target.tipe || "");
      setPermukaan(target.permukaan || "");

      const parsedTebal = parseNilaiDanSatuan(target.tebal, "mm");
      setTebalNilai(parsedTebal.nilai);
      setTebalSatuan(parsedTebal.satuan || "mm");

      const parsedTol = parseNilaiDanSatuan(target.toleransi, "mm");
      setToleransiNilai(parsedTol.nilai);
      setToleransiSatuan(parsedTol.satuan || "mm");

      if (target.implementasi) {
        setImplementasi(
          Array.isArray(target.implementasi)
            ? target.implementasi[0] || ""
            : target.implementasi.trim()
        );
      }
      if (target.lokasi) {
        setLokasi(
          Array.isArray(target.lokasi)
            ? target.lokasi[0] || ""
            : target.lokasi.trim()
        );
      }
    }
  };

  // Koleksi Opsi Dropdown Berbasis Master Data
  const merkOptions = useMemo(() => {
    const fromExisting = existingItems.map((i) => i.merk).filter(Boolean) as string[];
    return Array.from(new Set([...INITIAL_MERK_OPTIONS, ...fromExisting]));
  }, [existingItems]);

  const posisiOptions = useMemo(() => {
    const fromExisting = existingItems
      .flatMap((i) => (Array.isArray(i.implementasi) ? i.implementasi : (i.implementasi ? i.implementasi.split(",") : [])))
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set([...INITIAL_POSISI_OPTIONS, ...fromExisting]));
  }, [existingItems]);

  const areaOptions = useMemo(() => {
    const fromExisting = existingItems
      .flatMap((i) => (Array.isArray(i.lokasi) ? i.lokasi : (i.lokasi ? i.lokasi.split(",") : [])))
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set([...INITIAL_AREA_OPTIONS, ...fromExisting]));
  }, [existingItems]);

  const kategoriOptions = useMemo(() => {
    const fromExisting = existingItems.map((i) => i.kategori).filter(Boolean) as string[];
    return Array.from(new Set([...INITIAL_KATEGORI_OPTIONS, ...fromExisting]));
  }, [existingItems]);

  const ukuranOptions = useMemo(() => {
    const fromExisting = existingItems
      .map((i) => parseNilaiDanSatuan(i.ukuran).nilai)
      .filter(Boolean);
    return Array.from(new Set([...INITIAL_UKURAN_OPTIONS, ...fromExisting]));
  }, [existingItems]);

  const warnaOptions = useMemo(() => {
    const fromExisting = existingItems.map((i) => i.warna).filter(Boolean) as string[];
    return Array.from(new Set([...INITIAL_WARNA_OPTIONS, ...fromExisting]));
  }, [existingItems]);

  const tipeOptions = useMemo(() => {
    const fromExisting = existingItems.map((i) => i.tipe).filter(Boolean) as string[];
    return Array.from(new Set([...INITIAL_TIPE_OPTIONS, ...fromExisting]));
  }, [existingItems]);

  const permukaanOptions = useMemo(() => {
    const fromExisting = existingItems.map((i) => i.permukaan).filter(Boolean) as string[];
    return Array.from(new Set([...INITIAL_PERMUKAAN_OPTIONS, ...fromExisting]));
  }, [existingItems]);

  // Kalkulasi Kode Master & Deteksi Duplikat
  // Objek berbeda jika implementasi atau lokasi berbeda (menghasilkan varian & kode master baru)
  const kodeData = useMemo(() => {
    return getKodeData({
      kategori,
      item,
      implementasi,
      lokasi,
      ukuran: combinedUkuran,
      merk,
      warna,
      tipe,
      permukaan,
      tebal: combinedTebal,
      toleransi: combinedToleransi,
      nextIndex,
      existingItems: otherItems,
    });
  }, [
    kategori,
    item,
    implementasi,
    lokasi,
    combinedUkuran,
    merk,
    warna,
    tipe,
    permukaan,
    combinedTebal,
    combinedToleransi,
    nextIndex,
    otherItems,
  ]);

  const isDuplicate = kodeData.isDuplicate;

  useEffect(() => {
    if (!itemToEdit) {
      setKodeItem(kodeData.kodeItem);
    }
    setKodeMaster(kodeData.kodeMaster);
  }, [kodeData, itemToEdit]);

  // Realtime Deskripsi Otomatis
  useEffect(() => {
    const desc = generateDeskripsiOtomatis({
      item,
      ukuran: combinedUkuran,
      merk,
      warna,
      tipe,
      permukaan,
      tebal: combinedTebal,
      toleransi: combinedToleransi,
      informasiTambahan,
      lokasi,
      implementasi,
    });
    setDeskripsiOtomatis(desc);
  }, [
    item,
    combinedUkuran,
    merk,
    warna,
    tipe,
    permukaan,
    combinedTebal,
    combinedToleransi,
    informasiTambahan,
    lokasi,
    implementasi,
  ]);

  const populateForm = (target: PengajuanHargaItem) => {
    setKategori(target.kategori || "Pekerjaan Keramik");
    setItem(target.item || target.namaItem || "");

    const parsedUkuran = parseNilaiDanSatuan(target.ukuran, "cm");
    setUkuranNilai(parsedUkuran.nilai);
    setUkuranSatuan(parsedUkuran.satuan || "cm");

    setMerk(target.merk || "");
    setWarna(target.warna || "");
    setTipe(target.tipe || "");
    setPermukaan(target.permukaan || "");

    const parsedTebal = parseNilaiDanSatuan(target.tebal, "mm");
    setTebalNilai(parsedTebal.nilai);
    setTebalSatuan(parsedTebal.satuan || "mm");

    const parsedTol = parseNilaiDanSatuan(target.toleransi, "mm");
    setToleransiNilai(parsedTol.nilai);
    setToleransiSatuan(parsedTol.satuan || "mm");

    setImplementasi(
      target.implementasi
        ? Array.isArray(target.implementasi)
          ? target.implementasi[0] || ""
          : target.implementasi.trim()
        : "Dinding Gerai"
    );
    setLokasi(
      target.lokasi
        ? Array.isArray(target.lokasi)
          ? target.lokasi[0] || ""
          : target.lokasi.trim()
        : ""
    );
    setJenisPengajuan((target.satuan === "ls" ? "Hanya Jasa" : "Material"));
    setIsTermasukBongkaran(false);
    setInformasiTambahan(target.informasiTambahan || "");
    setCabang(target.cabang || target.namaCabang || defaultCabang);
    setKodeItem(target.kode || target.kodeItem || "");
    setKodeMaster(target.kodeMaster || target.noTiket || "");
  };

  const handleReset = () => {
    setKategori("Pekerjaan Keramik");
    setItem("");
    setUkuranNilai("");
    setUkuranSatuan("cm");
    setMerk("");
    setWarna("");
    setTipe("");
    setPermukaan("");
    setTebalNilai("");
    setTebalSatuan("mm");
    setToleransiNilai("");
    setToleransiSatuan("mm");
    setImplementasi("Dinding Gerai");
    setLokasi("");
    setJenisPengajuan("Material");
    setIsTermasukBongkaran(false);
    setInformasiTambahan("");
    setCabang(defaultCabang);
  };

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        populateForm(itemToEdit);
      } else {
        handleReset();
      }
    }
  }, [isOpen, itemToEdit]);

  const handleCopyDescription = async () => {
    if (!deskripsiOtomatis) return;
    try {
      await navigator.clipboard.writeText(deskripsiOtomatis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isDuplicate && !itemToEdit) {
      Swal.fire({
        icon: "warning",
        title: "Material Sudah Terdaftar",
        text: `Spesifikasi fisik pada lokasi gerai ini sudah terdaftar dengan kode master: ${kodeData.kodeMaster}. Pilih lokasi / area gerai lain jika ingin mengajukan varian baru.`,
        confirmButtonColor: "#005BAC",
        confirmButtonText: "Mengerti",
      });
      return;
    }

    if (
      !kategori.trim() ||
      !item.trim() ||
      !ukuranNilai.trim() ||
      !merk.trim() ||
      !tipe.trim() ||
      !warna.trim() ||
      !permukaan.trim() ||
      !tebalNilai.trim() ||
      !implementasi.trim() ||
      !lokasi.trim() ||
      !kodeMaster.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Data Belum Lengkap",
        text: "Pastikan seluruh parameter spesifikasi (termasuk implementasi dan lokasi area) sudah dipilih.",
        confirmButtonColor: "#ED1C24",
        confirmButtonText: "Lengkapi Data",
      });
      return;
    }

    const finalKodeItem = kodeItem.trim() || kodeData.kodeItem;
    const finalKodeMaster = kodeMaster.trim() || kodeData.kodeMaster;
    const finalImplementasi = implementasi.trim();
    const finalLokasi = lokasi.trim();

    const updatedHistory = itemToEdit
      ? [
          ...(itemToEdit.historyLog || []),
          {
            role: "B&M Manager" as const,
            action: "SUBMIT" as const,
            tanggal: new Date().toISOString().slice(0, 16).replace("T", " "),
            catatan: "Spesifikasi diperbaiki dan diajukan ulang ke S&B Specialist.",
          },
        ]
      : [
          {
            role: "B&M Manager" as const,
            action: "SUBMIT" as const,
            tanggal: new Date().toISOString().slice(0, 16).replace("T", " "),
            catatan: "Pengajuan spesifikasi material baru oleh B&M Manager.",
          },
        ];

    const today = new Date().toISOString().slice(0, 10);

    const newItem: PengajuanHargaItem = {
      ...(itemToEdit || {}),
      id: itemToEdit?.id || `item-${Date.now()}`,
      noTiket: itemToEdit?.noTiket || finalKodeMaster,
      kodeItem: finalKodeItem,
      namaItem: item.trim(),
      kategori: kategori.trim(),
      merk: merk.trim(),
      tipe: tipe.trim(),
      ukuran: combinedUkuran,
      warna: warna.trim(),
      lokasi: finalLokasi,

      divisiId: itemToEdit?.divisiId || "div-sipil",
      cabangId: itemToEdit?.cabangId || "cab-cikokol",
      namaCabang: cabang || defaultCabang,
      cakupanHarga: itemToEdit?.cakupanHarga || "INDUK_CABANG",

      status: "DIAJUKAN",
      tanggalPengajuan: itemToEdit?.tanggalPengajuan || today,

      surveiTokoList: itemToEdit?.surveiTokoList || [],
      koefisienItems: itemToEdit?.koefisienItems || [],
      liveMarginUpah: itemToEdit?.liveMarginUpah ?? 8,
      liveMarginMaterial: itemToEdit?.liveMarginMaterial ?? 8,
      liveMarginBongkaran: itemToEdit?.liveMarginBongkaran ?? 8,
      totalHpp: itemToEdit?.totalHpp || 0,
      totalHargaSatuan: itemToEdit?.totalHargaSatuan || 0,

      // Aliases
      kode: finalKodeItem,
      kodeMaster: finalKodeMaster,
      item: item.trim(),
      cabang: cabang || defaultCabang,
      deskripsiOtomatis: deskripsiOtomatis,
      satuan: jenisPengajuan === "Hanya Jasa" ? "ls" : "m2",
      implementasi: finalImplementasi,
      tebal: combinedTebal,
      permukaan: permukaan.trim(),
      toleransi: combinedToleransi,
      informasiTambahan: informasiTambahan.trim(),
      historyLog: updatedHistory,
    };

    onSubmit(newItem);
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 overflow-y-auto">
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-4">
        {/* Header Modal (Solid Standard) */}
        <div className="px-5 py-4 border-b-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-5 rounded-sm inline-block ${itemToEdit ? "bg-amber-600" : "bg-[#ED1C24]"}`} />
              <h2 className="text-base md:text-lg font-black text-slate-900">
                {itemToEdit ? "Edit Revisi Spesifikasi" : "Pengajuan Spesifikasi Material Baru"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {itemToEdit
                ? "Perbaiki data material sesuai instruksi S&B Specialist."
                : "Isi data spesifikasi lengkap untuk diajukan verifikasi ke S&B Specialist."}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 ${
                itemToEdit
                  ? "bg-amber-50 text-amber-900 border-amber-400"
                  : "bg-emerald-50 text-emerald-900 border-emerald-400"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${itemToEdit ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span>{itemToEdit ? "Mode Revisi" : "Material Baru"}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Catatan Revisi jika ada */}
        {itemToEdit && latestCatatanRevisi && (
          <div className="mx-5 mt-4 bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950 shadow-2xs">
            <RotateCcw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-900">Catatan Revisi S&amp;B Specialist:</p>
              <p className="text-amber-800 text-[11px] leading-relaxed italic">
                "{latestCatatanRevisi}"
              </p>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Section 1: Jenis & Item Utama */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                1
              </span>
              <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                Jenis &amp; Item Utama
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Jenis Pengajuan <span className="text-red-500">*</span>
                </label>
                <select
                  value={jenisPengajuan}
                  onChange={(e) => setJenisPengajuan(e.target.value as "Hanya Jasa" | "Material")}
                  className="w-full h-9 px-3 rounded-lg border-2 border-slate-300 text-xs text-slate-800 bg-white font-bold focus:border-[#005BAC] focus:outline-none"
                >
                  <option value="Material">Material</option>
                  <option value="Hanya Jasa">Hanya Jasa</option>
                </select>

                <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-1">
                  <span className="text-[11px] font-bold text-slate-700">Termasuk Pekerjaan Bongkaran?</span>
                  <input
                    type="checkbox"
                    checked={isTermasukBongkaran}
                    onChange={(e) => setIsTermasukBongkaran(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-slate-300 text-[#005BAC] focus:ring-[#005BAC] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>
                    Nama Material / Item <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Pilih master / ketik baru</span>
                </label>
                <CreatableSelect
                  value={item ? { label: item, value: item } : null}
                  onChange={handleItemSelect}
                  options={materialReactSelectOptions}
                  placeholder="Cari item eksisting atau ketik nama baru..."
                  formatCreateLabel={(val) => `Buat item baru: "${val}"`}
                  styles={solidComboboxStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  maxMenuHeight={220}
                  isClearable
                />
                <span className="text-[10px] text-slate-400">Pilih dari master eksisting atau tambahkan jenis baru</span>
              </div>
            </div>

            {/* Dynamic Alert Banner */}
            {jenisPengajuan === "Hanya Jasa" && (
              <div className="bg-blue-50 border-2 border-blue-400 text-blue-900 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#005BAC] shrink-0" />
                <p className="font-semibold">
                  Mode <strong>Hanya Jasa</strong>: Pengajuan dihitung murni komponen upah tenaga tanpa pengadaan material.
                </p>
              </div>
            )}
            {jenisPengajuan === "Material" && item && existingItems.some((i) => (i.item || i.namaItem)?.toLowerCase() === item.toLowerCase()) && (
              <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs p-3 rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                <p className="font-semibold">
                  Material <strong>"{item}"</strong> terdaftar di katalog. Data spesifikasi otomatis diisikan dan siap disesuaikan.
                </p>
              </div>
            )}
            {jenisPengajuan === "Material" && item && !existingItems.some((i) => (i.item || i.namaItem)?.toLowerCase() === item.toLowerCase()) && (
              <div className="bg-amber-50 border-2 border-amber-400 text-amber-950 text-xs p-3 rounded-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <p className="font-semibold">
                  Material baru <strong>"{item}"</strong>. Sistem akan mendaftarkannya sebagai Master Harga baru.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Data Pokok Material */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                2
              </span>
              <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                Data Pokok Material
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Kategori Pekerjaan <span className="text-red-500">*</span>
                </label>
                <CreatableSelect
                  value={kategori ? { label: kategori, value: kategori } : null}
                  onChange={(opt: any) => setKategori(opt ? opt.value : "")}
                  options={kategoriOptions.map((opt) => ({ label: opt, value: opt }))}
                  isDisabled={jenisPengajuan === "Hanya Jasa"}
                  placeholder="Pilih / ketik kategori..."
                  formatCreateLabel={(val) => `Tambah "${val}"`}
                  styles={solidComboboxStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  maxMenuHeight={200}
                  isClearable
                />
                <span className="text-[10px] text-slate-400">Lingkup kelompok pekerjaan</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Ukuran / Dimensi <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0">
                    <CreatableSelect
                      value={ukuranNilai ? { label: ukuranNilai, value: ukuranNilai } : null}
                      onChange={(opt: any) => setUkuranNilai(opt ? opt.value : "")}
                      options={ukuranOptions.map((opt) => ({ label: opt, value: opt }))}
                      isDisabled={jenisPengajuan === "Hanya Jasa"}
                      placeholder="Nilai ukuran..."
                      formatCreateLabel={(val) => `Tambah "${val}"`}
                      styles={solidComboboxStyles}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                      maxMenuHeight={200}
                      isClearable
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <CreatableSelect
                      value={ukuranSatuan ? { label: ukuranSatuan, value: ukuranSatuan } : null}
                      onChange={(opt: any) => setUkuranSatuan(opt ? opt.value : "")}
                      options={SATUAN_UKURAN_OPTIONS}
                      isDisabled={jenisPengajuan === "Hanya Jasa"}
                      styles={solidUnitSelectStyles}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                      placeholder="Satuan"
                      formatCreateLabel={(val) => `"${val}"`}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">Contoh: 60x60 cm</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Merk / Brand <span className="text-red-500">*</span>
                </label>
                <CreatableSelect
                  value={merk ? { label: merk, value: merk } : null}
                  onChange={(opt: any) => setMerk(opt ? opt.value : "")}
                  options={merkOptions.map((opt) => ({ label: opt, value: opt }))}
                  isDisabled={jenisPengajuan === "Hanya Jasa"}
                  placeholder="Pilih / ketik merk..."
                  formatCreateLabel={(val) => `Tambah "${val}"`}
                  styles={solidComboboxStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  maxMenuHeight={200}
                  isClearable
                />
                <span className="text-[10px] text-slate-400">Contoh: Roman, Sandimas</span>
              </div>
            </div>
          </div>

          {/* Section 3: Fisik & Karakteristik */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                3
              </span>
              <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                Fisik &amp; Karakteristik
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Warna <span className="text-red-500">*</span>
                </label>
                <CreatableSelect
                  value={warna ? { label: warna, value: warna } : null}
                  onChange={(opt: any) => setWarna(opt ? opt.value : "")}
                  options={warnaOptions.map((opt) => ({ label: opt, value: opt }))}
                  isDisabled={jenisPengajuan === "Hanya Jasa"}
                  placeholder="Pilih warna..."
                  formatCreateLabel={(val) => `Tambah "${val}"`}
                  styles={solidComboboxStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  maxMenuHeight={200}
                  isClearable
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Tipe / Motif <span className="text-red-500">*</span>
                </label>
                <CreatableSelect
                  value={tipe ? { label: tipe, value: tipe } : null}
                  onChange={(opt: any) => setTipe(opt ? opt.value : "")}
                  options={tipeOptions.map((opt) => ({ label: opt, value: opt }))}
                  isDisabled={jenisPengajuan === "Hanya Jasa"}
                  placeholder="Pilih tipe..."
                  formatCreateLabel={(val) => `Tambah "${val}"`}
                  styles={solidComboboxStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  maxMenuHeight={200}
                  isClearable
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Permukaan <span className="text-red-500">*</span>
                </label>
                <CreatableSelect
                  value={permukaan ? { label: permukaan, value: permukaan } : null}
                  onChange={(opt: any) => setPermukaan(opt ? opt.value : "")}
                  options={permukaanOptions.map((opt) => ({ label: opt, value: opt }))}
                  isDisabled={jenisPengajuan === "Hanya Jasa"}
                  placeholder="Pilih tekstur..."
                  formatCreateLabel={(val) => `Tambah "${val}"`}
                  styles={solidComboboxStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  maxMenuHeight={200}
                  isClearable
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Ketebalan <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tebalNilai}
                    onChange={(e) => setTebalNilai(e.target.value)}
                    disabled={jenisPengajuan === "Hanya Jasa"}
                    placeholder="Nilai"
                    className="h-9 rounded-lg text-xs bg-white border-2 border-slate-300 px-2 font-bold text-slate-800 flex-1 min-w-0 focus:border-[#005BAC] focus:outline-none"
                    required
                  />
                  <div className="w-24 shrink-0">
                    <CreatableSelect
                      value={tebalSatuan ? { label: tebalSatuan, value: tebalSatuan } : null}
                      onChange={(opt: any) => setTebalSatuan(opt ? opt.value : "")}
                      options={SATUAN_TEBAL_OPTIONS}
                      isDisabled={jenisPengajuan === "Hanya Jasa"}
                      styles={solidUnitSelectStyles}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                      placeholder="Satuan"
                      formatCreateLabel={(val) => `"${val}"`}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">Contoh: 9 mm</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Toleransi
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={toleransiNilai}
                    onChange={(e) => setToleransiNilai(e.target.value)}
                    disabled={jenisPengajuan === "Hanya Jasa"}
                    placeholder="Contoh: 0.5"
                    className="h-9 rounded-lg text-xs bg-white border-2 border-slate-300 px-2 font-bold text-slate-800 flex-1 min-w-0 focus:border-[#005BAC] focus:outline-none"
                  />
                  <div className="w-24 shrink-0">
                    <CreatableSelect
                      value={toleransiSatuan ? { label: toleransiSatuan, value: toleransiSatuan } : null}
                      onChange={(opt: any) => setToleransiSatuan(opt ? opt.value : "")}
                      options={SATUAN_TOLERANSI_OPTIONS}
                      isDisabled={jenisPengajuan === "Hanya Jasa"}
                      styles={solidUnitSelectStyles}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                      placeholder="Satuan"
                      formatCreateLabel={(val) => `"${val}"`}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">Contoh: 0.5 mm</span>
              </div>
            </div>
          </div>

          {/* Section 4: Penempatan & Catatan (Multi-Select React Creatable) */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                4
              </span>
              <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                Penempatan &amp; Catatan
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Field 1: Implementasi / Posisi (SINGLE-SELECT) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Implementasi / Posisi <span className="text-red-500">*</span>
                </label>
                <CreatableSelect
                  value={implementasi ? { label: implementasi, value: implementasi } : null}
                  onChange={(opt: any) => setImplementasi(opt ? opt.value : "")}
                  options={posisiOptions.map((opt) => ({ label: opt, value: opt }))}
                  placeholder="Pilih atau ketik implementasi..."
                  formatCreateLabel={(val) => `Tambah "${val}"`}
                  styles={solidComboboxStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  maxMenuHeight={220}
                  isClearable
                />
                <span className="text-[10px] text-slate-500">
                  Posisi aplikasi pemasangan (misal: Lantai, Dinding Gerai).
                </span>
              </div>

              {/* Field 2: Lokasi / Area Gerai (SINGLE-SELECT: 1 Lokasi = 1 Varian) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Lokasi / Area Gerai <span className="text-red-500">*</span>
                </label>
                <CreatableSelect
                  value={lokasi ? { label: lokasi, value: lokasi } : null}
                  onChange={(opt: any) => setLokasi(opt ? opt.value : "")}
                  options={areaOptions.map((opt) => ({ label: opt, value: opt }))}
                  placeholder="Pilih atau ketik area gerai..."
                  formatCreateLabel={(val) => `Tambah "${val}"`}
                  styles={solidComboboxStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  maxMenuHeight={220}
                  isClearable
                />
                <span className="text-[10px] text-slate-500">
                  Area gerai tempat material digunakan (misal: Sales Area, Teras). Perbedaan lokasi otomatis membentuk kode varian baru (A, B, C, dst.).
                </span>
              </div>

              {/* Field 3: Informasi Tambahan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Informasi Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={informasiTambahan}
                  onChange={(e) => setInformasiTambahan(e.target.value)}
                  placeholder="Catatan teknis khusus..."
                  className="h-9 rounded-lg text-xs bg-white border-2 border-slate-300 px-3 font-medium text-slate-800 focus:border-[#005BAC] focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">
                  Akan otomatis dimasukkan dalam tanda kurung pada deskripsi
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Kode Master & Deskripsi Otomatis */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-[#ED1C24] text-white text-[11px] font-black flex items-center justify-center">
                5
              </span>
              <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                Kode Master &amp; Deskripsi Terstandarisasi
              </h3>
            </div>

            {/* Kode Item & Kode Master Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border-2 border-slate-200">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Kode Item Fisik
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-mono font-black text-xs inline-block">
                  {kodeData.kodeItem}
                </span>
                <span className="text-[10px] text-slate-400">
                  Berdasarkan 7 parameter fisik
                </span>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Kode Master Item (Objek Resep)
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-mono font-black text-xs inline-block flex-1 truncate">
                    {kodeData.kodeMaster}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900 shrink-0">
                    Varian {kodeData.kodeArea}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Perbedaan lokasi gerai otomatis menghasilkan varian baru (A, B, C, dst.)
                </span>
              </div>
            </div>

            {/* Alert Jika Duplikat */}
            {isDuplicate && !itemToEdit && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Objek Sudah Terdaftar: </span>
                  Spesifikasi fisik pada lokasi gerai ini sudah tercatat dengan kode master{" "}
                  <span className="font-mono font-bold">{kodeData.kodeMaster}</span>. Ubah lokasi / area gerai jika ingin mengajukan varian baru.
                </div>
              </div>
            )}

            {/* Live Deskripsi Otomatis */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Deskripsi Otomatis:
                </span>
                <button
                  type="button"
                  onClick={handleCopyDescription}
                  disabled={!deskripsiOtomatis}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{copied ? "Tersalin!" : "Salin Deskripsi"}</span>
                </button>
              </div>

              <div className="p-3 bg-white border-2 border-slate-300 rounded-xl text-xs font-semibold text-slate-800 leading-relaxed min-h-[46px]">
                {deskripsiOtomatis || "(Deskripsi otomatis akan tersusun saat parameter fisik diisi)"}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 cursor-pointer shadow-2xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isDuplicate && !itemToEdit}
              className="px-5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {itemToEdit ? "Simpan Perubahan" : "Ajukan Spesifikasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
