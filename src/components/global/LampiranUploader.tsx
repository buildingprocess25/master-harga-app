"use client";

import React, { useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { isPdfLampiran, toPreviewSource } from "@/lib/drive-url";
import { cn } from "@/lib/utils";

export interface UploadedLampiranItem {
  id?: string;
  tipe?: string;
  jenisLampiran?: string;
  namaFile: string;
  url: string;
  fileUrl: string;
  ukuranFile?: string;
  storageProvider?: "google-drive" | "local";
  driveFileId?: string | null;
}

export interface LampiranUploaderProps {
  endpoint?: string;
  fieldName?: "files" | "file";
  uploadMode?: "batch" | "per-file";
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  compact?: boolean;
  dashed?: boolean;
  itemCount?: number;
  label?: string;
  addMoreLabel?: string;
  uploadingLabel?: string;
  title?: string;
  className?: string;
  buttonClassName?: string;
  /** Jika diisi, daftar berkas terunggah juga dirender langsung oleh komponen ini. */
  items?: UploadedLampiranItem[];
  showList?: boolean;
  onRemoveItem?: (item: UploadedLampiranItem, index: number) => void;
  onUploaded: (newItems: UploadedLampiranItem[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onError?: (message: string) => void;
}

function normalizeServerItems(payload: unknown): UploadedLampiranItem[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const rawList = Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.data)
      ? obj.data
      : obj.data && typeof obj.data === "object"
        ? [obj.data]
        : [];

  return rawList
    .map((entry): UploadedLampiranItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const r = entry as Record<string, unknown>;
      const resolvedUrl = String(r.fileUrl || r.url || "").trim();
      const resolvedName = String(r.namaFile || "Lampiran").trim();
      if (!resolvedUrl) return null;

      return {
        id: typeof r.id === "string" ? r.id : undefined,
        tipe: typeof r.tipe === "string" ? r.tipe : undefined,
        jenisLampiran: typeof r.jenisLampiran === "string" ? r.jenisLampiran : undefined,
        namaFile: resolvedName,
        url: String(r.url || resolvedUrl),
        fileUrl: resolvedUrl,
        ukuranFile: typeof r.ukuranFile === "string" ? r.ukuranFile : undefined,
        storageProvider:
          r.storageProvider === "google-drive" || r.storageProvider === "local"
            ? r.storageProvider
            : undefined,
        driveFileId: typeof r.driveFileId === "string" ? r.driveFileId : null,
      };
    })
    .filter((v): v is UploadedLampiranItem => v !== null);
}

/**
 * Komponen upload berkas reusable untuk survei toko, lampiran banding,
 * maupun fitur unggah dokumen lain (terhubung ke endpoint Google Drive / fallback lokal).
 */
export function LampiranUploader({
  endpoint = "/api/pengajuan/lampiran",
  fieldName = "files",
  uploadMode = "batch",
  multiple = true,
  accept = "image/*,application/pdf",
  maxFiles,
  maxSizeBytes = 10 * 1024 * 1024,
  disabled = false,
  compact = false,
  dashed = false,
  itemCount = 0,
  label = "Unggah Berkas",
  addMoreLabel,
  uploadingLabel = "Mengunggah berkas...",
  title = "Unggah berkas lampiran",
  className,
  buttonClassName,
  items,
  showList = false,
  onRemoveItem,
  onUploaded,
  onUploadingChange,
  onError,
}: LampiranUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const reportError = async (message: string) => {
    if (onError) {
      onError(message);
      return;
    }
    await Swal.fire({
      icon: "error",
      title: "Gagal Mengunggah",
      text: message,
      confirmButtonColor: "#ED1C24",
    });
  };

  const setBusy = (next: boolean) => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    const selected = Array.from(fileList || []);
    if (selected.length === 0) return;

    const currentTotal = items ? items.length : itemCount;
    if (maxFiles && currentTotal + selected.length > maxFiles) {
      await reportError(`Maksimal ${maxFiles} berkas lampiran.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    for (const f of selected) {
      if (f.size === 0 || f.size > maxSizeBytes) {
        const mb = Math.max(1, Math.round(maxSizeBytes / (1024 * 1024)));
        await reportError(`${f.name}: ukuran berkas harus di bawah ${mb} MB.`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setBusy(true);
    try {
      const uploadedItems: UploadedLampiranItem[] = [];

      if (uploadMode === "per-file") {
        for (const file of selected) {
          const fd = new FormData();
          fd.append(fieldName, file);
          const res = await fetch(endpoint, { method: "POST", body: fd });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) {
            throw new Error(json?.message || `Gagal mengunggah ${file.name}.`);
          }
          uploadedItems.push(...normalizeServerItems(json));
        }
      } else {
        const fd = new FormData();
        selected.forEach((file) => fd.append(fieldName, file));
        const res = await fetch(endpoint, { method: "POST", body: fd });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Gagal mengunggah berkas.");
        }
        uploadedItems.push(...normalizeServerItems(json));
      }

      if (uploadedItems.length === 0) {
        throw new Error("Server tidak mengembalikan metadata berkas yang diunggah.");
      }

      onUploaded(uploadedItems);
    } catch (err: unknown) {
      await reportError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah berkas."
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const reachedMax = Boolean(maxFiles && (items ? items.length : itemCount) >= maxFiles);
  const countToDisplay = items ? items.length : itemCount;
  const activeLabel =
    countToDisplay > 0 && addMoreLabel
      ? addMoreLabel
      : label;

  return (
    <div className={cn("space-y-2", className)}>
      {showList && items && items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li
              key={item.id || `${item.fileUrl}-${idx}`}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-xs"
            >
              <a
                href={item.fileUrl || item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-w-0 flex-1 text-slate-800 hover:text-[#005BAC]"
              >
                <FileText className="w-3.5 h-3.5 text-[#005BAC] shrink-0" />
                <span className="truncate font-semibold">{item.namaFile}</span>
                {item.ukuranFile && (
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {item.ukuranFile}
                  </span>
                )}
              </a>
              {onRemoveItem && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item, idx)}
                  className="text-slate-500 hover:text-rose-700 hover:bg-rose-100 rounded p-1 cursor-pointer transition-colors"
                  aria-label={`Hapus ${item.namaFile}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {uploading ? (
        <div
          className={cn(
            "flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#005BAC] bg-white border-2 border-[#005BAC] rounded-lg py-1.5 px-3",
            compact ? "w-full" : ""
          )}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>{uploadingLabel}</span>
        </div>
      ) : (
        <button
          type="button"
          title={title}
          disabled={disabled || reachedMax}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 font-bold rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:border-[#005BAC] hover:bg-[#005BAC] hover:text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer transition-colors",
            compact ? "px-2.5 py-1.5 text-[11px] w-full" : "px-3 py-1.5 text-xs",
            dashed ? "border-dashed w-full font-extrabold" : "",
            buttonClassName
          )}
        >
          {countToDisplay > 0 && addMoreLabel ? (
            <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
          ) : showList ? (
            <Paperclip className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Upload className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{activeLabel}</span>
        </button>
      )}
    </div>
  );
}

/** Modal pratinjau bersama yang mendukung berkas lokal maupun tautan Google Drive (`webViewLink`). */
export function LampiranPreviewDialog({
  url,
  namaFile,
  title,
  onClose,
}: {
  url: string;
  namaFile?: string;
  title: string;
  onClose: () => void;
}) {
  const preview = toPreviewSource(url, namaFile);
  const isPdf = isPdfLampiran(url, namaFile);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full border-2 border-slate-300 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-slate-100 px-5 py-3 border-b-2 border-slate-200 flex items-center justify-between gap-2">
          <h4 className="text-sm font-black text-slate-900 truncate">{title}</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 p-1 rounded-lg cursor-pointer"
            aria-label="Tutup pratinjau"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-50 min-h-[250px]">
          {preview.kind === "iframe" || isPdf ? (
            <iframe
              src={preview.src}
              title="Pratinjau Dokumen"
              className="w-full h-96 border-2 border-slate-300 rounded-lg bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.src}
              alt="Pratinjau Lampiran"
              className="max-h-[60vh] max-w-full rounded-lg border-2 border-slate-300 object-contain bg-white"
            />
          )}
        </div>

        <div className="bg-slate-100 px-5 py-2.5 border-t-2 border-slate-200 flex items-center justify-between gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-[#005BAC] bg-white text-[#005BAC] hover:bg-[#005BAC] hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{preview.isGoogleDrive ? "Buka di Google Drive" : "Buka di Tab Baru"}</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
