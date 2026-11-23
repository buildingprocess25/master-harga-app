import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));

import { extractGoogleDriveFileId, isPdfLampiran, toPreviewSource } from "@/lib/drive-url";
import { POLA_URL_LAMPIRAN_BANDING } from "@/lib/services/kuorum-service";
import { isGoogleDriveConfigured } from "@/lib/storage/google-drive";
import {
  bacaBerkasLokal,
  cocokSignature,
  formatUkuran,
  simpanBerkasLampiran,
} from "@/lib/storage/lampiran-storage";

describe("lampiran storage & Google Drive helpers", () => {
  const originalEnv = { ...process.env };
  const tempDirs: string[] = [];

  afterEach(() => {
    process.env = { ...originalEnv };
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it("memvalidasi magic bytes PDF, JPEG, PNG, dan WEBP secara akurat", () => {
    expect(cocokSignature(Buffer.from("%PDF-1.7\n"), "application/pdf")).toBe(true);
    expect(cocokSignature(Buffer.from("FAKE"), "application/pdf")).toBe(false);

    expect(cocokSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(true);
    expect(cocokSignature(Buffer.from([0x00, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(false);

    expect(
      cocokSignature(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
        "image/png"
      )
    ).toBe(true);

    const webp = Buffer.from("RIFF1234WEBP");
    expect(cocokSignature(webp, "image/webp")).toBe(true);
    expect(cocokSignature(Buffer.from("RIFF1234AVI "), "image/webp")).toBe(false);
  });

  it("memformat ukuran berkas KB dan MB dengan benar", () => {
    expect(formatUkuran(120)).toBe("1 KB");
    expect(formatUkuran(256 * 1024)).toBe("256 KB");
    expect(formatUkuran(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("mendeteksi konfigurasi OAuth2 Google Drive dari env vars", () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    expect(isGoogleDriveConfigured()).toBe(false);

    process.env.GOOGLE_OAUTH_CLIENT_ID = "cid";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "csec";
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN = "rtok";
    expect(isGoogleDriveConfigured()).toBe(true);
  });

  it("fallback ke penyimpanan lokal saat Google Drive env belum diisi dan dapat dibaca kembali", async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

    const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "mh-lampiran-"));
    tempDirs.push(tmpRoot);
    process.env.STORAGE_DIR = tmpRoot;

    const pdfBytes = Buffer.from("%PDF-1.4\n%test\n");
    const saved = await simpanBerkasLampiran({
      buffer: pdfBytes,
      originalName: "nota-uji.pdf",
      mimeType: "application/pdf",
      ext: "pdf",
      size: pdfBytes.length,
      bucket: "lampiran-survei",
      localUrlPrefix: "/api/pengajuan/lampiran",
    });

    expect(saved.storageProvider).toBe("local");
    expect(saved.driveFileId).toBeNull();
    expect(saved.fileUrl).toMatch(/^\/api\/pengajuan\/lampiran\/[a-f0-9-]{36}\.pdf$/);

    const loaded = await bacaBerkasLokal("lampiran-survei", saved.namaSimpan);
    expect(loaded).not.toBeNull();
    expect(loaded?.mimeType).toBe("application/pdf");
    expect(loaded?.buffer.equals(pdfBytes)).toBe(true);
  });

  it("POLA_URL_LAMPIRAN_BANDING menerima path lokal maupun tautan Google Drive, menolak URL lain", () => {
    expect(
      POLA_URL_LAMPIRAN_BANDING.test(
        "/api/kuorum/lampiran/11111111-1111-4111-8111-111111111111.pdf"
      )
    ).toBe(true);
    expect(
      POLA_URL_LAMPIRAN_BANDING.test(
        "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=drivesdk"
      )
    ).toBe(true);
    expect(
      POLA_URL_LAMPIRAN_BANDING.test(
        "https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz"
      )
    ).toBe(true);
    expect(POLA_URL_LAMPIRAN_BANDING.test("https://evil.example.com/file.pdf")).toBe(false);
    expect(POLA_URL_LAMPIRAN_BANDING.test("/api/pengajuan/lampiran/abc.pdf")).toBe(false);
  });

  it("mengonversi tautan Google Drive ke URL pratinjau gambar/PDF dengan benar", () => {
    const driveUrl = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing";
    expect(extractGoogleDriveFileId(driveUrl)).toBe("1AbCdEfGhIjKlMnOpQrStUvWxYz");
    expect(isPdfLampiran(driveUrl, "bukti-penawaran.pdf")).toBe(true);
    expect(isPdfLampiran(driveUrl, "foto-nota.jpg")).toBe(false);

    expect(toPreviewSource(driveUrl, "bukti-penawaran.pdf")).toEqual({
      kind: "iframe",
      src: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/preview",
      isGoogleDrive: true,
    });
    expect(toPreviewSource(driveUrl, "foto-nota.jpg")).toEqual({
      kind: "image",
      src: "https://drive.google.com/thumbnail?id=1AbCdEfGhIjKlMnOpQrStUvWxYz&sz=w1600",
      isGoogleDrive: true,
    });
  });
});
