import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock next/headers cookie store agar auth HMAC-SHA256 & whitelist DB berjalan penuh di lingkungan Vitest
const mockCookieMap = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = mockCookieMap.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      mockCookieMap.set(name, value);
    },
    delete: (name: string) => {
      mockCookieMap.delete(name);
    },
  }),
}));

import prisma from "@/lib/prisma";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth/session";
import { UserSessionProfile } from "@/types";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as createPengajuanPost } from "@/app/api/pengajuan/route";
import { PATCH as patchPengajuan } from "@/app/api/pengajuan/[id]/route";
import { POST as validasiSpekPost } from "@/app/api/pengajuan/[id]/validasi-spek/route";
import { POST as masteringPost } from "@/app/api/pengajuan/[id]/mastering/route";
import { POST as surveyPost } from "@/app/api/pengajuan/[id]/survey/route";
import { POST as reviewBmPost } from "@/app/api/pengajuan/[id]/review-bm/route";
import { POST as evaluasiMarginPost } from "@/app/api/pengajuan/[id]/evaluasi-margin/route";
import { POST as reviewRegionalPost } from "@/app/api/pengajuan/[id]/review-regional/route";
import { GET as penawaranGet } from "@/app/api/kuorum/penawaran/route";
import { POST as votePost } from "@/app/api/kuorum/[tiketId]/vote/route";
import { POST as unparkPost } from "@/app/api/kuorum/parked/[relasiId]/unpark/route";
import { putuskanBanding } from "@/lib/services/banding-service";

function makeRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function actingAs(profile: UserSessionProfile | null) {
  mockCookieMap.clear();
  if (!profile) return;
  const token = await signSessionToken(profile);
  mockCookieMap.set(SESSION_COOKIE_NAME, token);
}

async function resetTestDatabase() {
  await prisma.lampiranBanding.deleteMany();
  await prisma.votingKontraktor.deleteMany();
  await prisma.lampiranSurvei.deleteMany();
  await prisma.surveiTokoItem.deleteMany();
  await prisma.rincianAhspPengajuan.deleteMany();
  await prisma.approvalAuditLog.deleteMany();
  await prisma.masterHargaWilayah.deleteMany();
  await prisma.masterHargaCabang.deleteMany();
  await prisma.pengajuanHarga.deleteMany();
  await prisma.masterItem.deleteMany();
  await prisma.masterKoefisien.deleteMany();
  await prisma.kontraktorCabang.deleteMany();
  await prisma.userCabangCoverage.deleteMany();
  await prisma.user.deleteMany();
  await prisma.kontraktor.deleteMany();
  await prisma.wilayahCabang.deleteMany();
  await prisma.cabang.deleteMany();
  await prisma.divisi.deleteMany();
}

describe("Integration: Alur Lengkap SPARTA-PRICING (Database Test Terisolasi)", () => {
  let divBldId = "";
  let divMntId = "";
  let divEngId = "";
  let divDcId = "";
  let cabangUtamaId = "";
  let cabangLainId = "";

  let koefUpahId = "";
  let koefMaterialId = "";
  let koefAlatId = "";

  let bmProfile!: UserSessionProfile;
  let snbProfile!: UserSessionProfile;
  let bcProfile!: UserSessionProfile;
  let bcLainProfile!: UserSessionProfile;
  let rmProfile!: UserSessionProfile;
  let k1Profile!: UserSessionProfile;
  let k2Profile!: UserSessionProfile;
  let k3Profile!: UserSessionProfile;
  let relasiK1Id = "";

  let happyTiketId = "";
  let bandingTiketId = "";

  beforeAll(async () => {
    await resetTestDatabase();

    // 1. Seed 4 Divisi Resmi
    const [bld, mnt, eng, dc] = await Promise.all([
      prisma.divisi.create({ data: { kodeDivisi: "DIV-BLD", namaDivisi: "Building (Konstruksi & Sipil)" } }),
      prisma.divisi.create({ data: { kodeDivisi: "DIV-MNT", namaDivisi: "Maintenance (Perawatan Gedung)" } }),
      prisma.divisi.create({ data: { kodeDivisi: "DIV-ENG", namaDivisi: "Engineering (M/E & HVAC)" } }),
      prisma.divisi.create({ data: { kodeDivisi: "DIV-DC", namaDivisi: "Distribution Center (Logistik)" } }),
    ]);
    divBldId = bld.id;
    divMntId = mnt.id;
    divEngId = eng.id;
    divDcId = dc.id;

    // 2. Seed Cabang
    const cabUtama = await prisma.cabang.create({
      data: {
        kodeCabang: "TST-CKL",
        namaCabang: "Cabang Cikokol",
        regional: "Jawa Barat & Banten",
      },
    });
    const cabLain = await prisma.cabang.create({
      data: {
        kodeCabang: "TST-BDG",
        namaCabang: "Cabang Bandung",
        regional: "Jawa Barat & Banten",
      },
    });
    cabangUtamaId = cabUtama.id;
    cabangLainId = cabLain.id;

    // 3. Seed Pustaka Koefisien AHSP (DIV-BLD)
    const kUpah = await prisma.masterKoefisien.create({
      data: {
        divisiId: divBldId,
        kategoriKomponen: "UPAH",
        namaKomponen: "Tukang Pasang Keramik",
        satuan: "OH",
        nilaiKoefisienDefault: 0.5,
        hargaAcuanDefault: 120000,
        wajibSurveiToko: false,
      },
    });
    const kMaterial = await prisma.masterKoefisien.create({
      data: {
        divisiId: divBldId,
        kategoriKomponen: "MATERIAL",
        namaKomponen: "Homogeneous Tile 60x60",
        satuan: "M2",
        nilaiKoefisienDefault: 1.05,
        hargaAcuanDefault: null,
        wajibSurveiToko: true,
      },
    });
    const kAlat = await prisma.masterKoefisien.create({
      data: {
        divisiId: divBldId,
        kategoriKomponen: "ALAT",
        namaKomponen: "Alat Potong Keramik",
        satuan: "LS",
        nilaiKoefisienDefault: 1,
        hargaAcuanDefault: 10000,
        wajibSurveiToko: false,
      },
    });
    koefUpahId = kUpah.id;
    koefMaterialId = kMaterial.id;
    koefAlatId = kAlat.id;

    // 4. Seed 3 Kontraktor Aktif untuk Kuorum (target 50%+1 = 2 suara)
    const [pt1, pt2, pt3] = await Promise.all([
      prisma.kontraktor.create({
        data: {
          kodeVendor: "VND-TST-01",
          namaPerusahaan: "PT Rekanan Satu",
          picName: "PIC Satu",
          telepon: "08111111101",
          email: "pt1@test.local",
        },
      }),
      prisma.kontraktor.create({
        data: {
          kodeVendor: "VND-TST-02",
          namaPerusahaan: "PT Rekanan Dua",
          picName: "PIC Dua",
          telepon: "08111111102",
          email: "pt2@test.local",
        },
      }),
      prisma.kontraktor.create({
        data: {
          kodeVendor: "VND-TST-03",
          namaPerusahaan: "PT Rekanan Tiga",
          picName: "PIC Tiga",
          telepon: "08111111103",
          email: "pt3@test.local",
        },
      }),
    ]);

    const rel1 = await prisma.kontraktorCabang.create({
      data: { kontraktorId: pt1.id, cabangId: cabangUtamaId, divisiId: divBldId, statusKeaktifan: "AKTIF" },
    });
    await prisma.kontraktorCabang.create({
      data: { kontraktorId: pt2.id, cabangId: cabangUtamaId, divisiId: divBldId, statusKeaktifan: "AKTIF" },
    });
    await prisma.kontraktorCabang.create({
      data: { kontraktorId: pt3.id, cabangId: cabangUtamaId, divisiId: divBldId, statusKeaktifan: "AKTIF" },
    });
    relasiK1Id = rel1.id;

    // 5. Seed Whitelist Users
    const [uBm, uSnb, uBc, uBcLain, uRm, uK1, uK2, uK3] = await Promise.all([
      prisma.user.create({
        data: {
          email: "bm@test.local",
          fullName: "B&M Manager Test",
          role: "BM_MANAGER",
          cabangId: cabangUtamaId,
          divisiId: divBldId,
        },
      }),
      prisma.user.create({
        data: {
          email: "snb@test.local",
          fullName: "S&B Specialist Test",
          role: "SB_SPECIALIST",
          divisiId: divBldId,
        },
      }),
      prisma.user.create({
        data: {
          email: "bc@test.local",
          fullName: "BC Cikokol Test",
          role: "BUILDING_COORDINATOR",
          cabangId: cabangUtamaId,
          divisiId: divBldId,
        },
      }),
      prisma.user.create({
        data: {
          email: "bc.bandung@test.local",
          fullName: "BC Bandung Test",
          role: "BUILDING_COORDINATOR",
          cabangId: cabangLainId,
          divisiId: divBldId,
        },
      }),
      prisma.user.create({
        data: {
          email: "rm@test.local",
          fullName: "Regional Manager Test",
          role: "REGIONAL_MANAGER",
          cabangId: cabangUtamaId,
          divisiId: divBldId,
        },
      }),
      prisma.user.create({
        data: {
          email: "k1@test.local",
          fullName: "User PT Satu",
          role: "KONTRAKTOR",
          kontraktorId: pt1.id,
        },
      }),
      prisma.user.create({
        data: {
          email: "k2@test.local",
          fullName: "User PT Dua",
          role: "KONTRAKTOR",
          kontraktorId: pt2.id,
        },
      }),
      prisma.user.create({
        data: {
          email: "k3@test.local",
          fullName: "User PT Tiga",
          role: "KONTRAKTOR",
          kontraktorId: pt3.id,
        },
      }),
    ]);

    bmProfile = {
      id: uBm.id,
      email: uBm.email,
      fullName: uBm.fullName,
      role: "BM_MANAGER",
      cabangId: cabangUtamaId,
      namaCabang: "Cabang Cikokol",
      divisiId: divBldId,
    };
    snbProfile = {
      id: uSnb.id,
      email: uSnb.email,
      fullName: uSnb.fullName,
      role: "SB_SPECIALIST",
      divisiId: divBldId,
    };
    bcProfile = {
      id: uBc.id,
      email: uBc.email,
      fullName: uBc.fullName,
      role: "BUILDING_COORDINATOR",
      cabangId: cabangUtamaId,
      namaCabang: "Cabang Cikokol",
      divisiId: divBldId,
    };
    bcLainProfile = {
      id: uBcLain.id,
      email: uBcLain.email,
      fullName: uBcLain.fullName,
      role: "BUILDING_COORDINATOR",
      cabangId: cabangLainId,
      namaCabang: "Cabang Bandung",
      divisiId: divBldId,
    };
    rmProfile = {
      id: uRm.id,
      email: uRm.email,
      fullName: uRm.fullName,
      role: "REGIONAL_MANAGER",
      cabangId: cabangUtamaId,
      namaCabang: "Cabang Cikokol",
      divisiId: divBldId,
    };
    k1Profile = {
      id: uK1.id,
      email: uK1.email,
      fullName: uK1.fullName,
      role: "KONTRAKTOR",
      kontraktorId: pt1.id,
    };
    k2Profile = {
      id: uK2.id,
      email: uK2.email,
      fullName: uK2.fullName,
      role: "KONTRAKTOR",
      kontraktorId: pt2.id,
    };
    k3Profile = {
      id: uK3.id,
      email: uK3.email,
      fullName: uK3.fullName,
      role: "KONTRAKTOR",
      kontraktorId: pt3.id,
    };
  });

  afterAll(async () => {
    await resetTestDatabase();
    await prisma.$disconnect();
  });

  it("Tahap 0: Login whitelist & penegakan RBAC kuorum", async () => {
    const loginOk = await loginPost(
      makeRequest("http://localhost/api/auth/login", "POST", { email: "bm@test.local" })
    );
    const loginJson = await loginOk.json();
    expect(loginOk.status).toBe(200);
    expect(loginJson.success).toBe(true);
    expect(loginJson.targetUrl).toBe("/bm-manager");

    const loginUnknown = await loginPost(
      makeRequest("http://localhost/api/auth/login", "POST", { email: "hacker@unknown.test" })
    );
    expect(loginUnknown.status).toBe(403);

    // Non-kontraktor ditolak saat mengakses endpoint penawaran kontraktor
    await actingAs(bmProfile);
    const penawaranBm = await penawaranGet();
    expect(penawaranBm.status).toBe(403);
  });

  it("Tahap 1: B&M Manager mengajukan bulk multi-divisi dan Parsial Pintar melewatkan duplikat", async () => {
    await actingAs(bmProfile);

    // Pengajuan 2 material sekaligus: Material 1 ke DIV-BLD & DIV-MNT, Material 2 ke DIV-ENG
    const resBulk1 = await createPengajuanPost(
      makeRequest("http://localhost/api/pengajuan", "POST", {
        items: [
          {
            mode: "new",
            divisiIds: ["DIV-BLD", "DIV-MNT"],
            item: "Homogeneous Tile",
            namaItem: "Homogeneous Tile",
            kategori: "Pekerjaan Keramik",
            merk: "Roman",
            ukuran: "60x60 cm",
            tipe: "Sicily Grey Matte",
            warna: "Grey",
            permukaan: "Matte",
            tebal: "9 mm",
            toleransi: "0.5 mm",
            lokasi: "Sales Area",
            satuan: "m2",
            cabang: "Cikokol",
            kodeItem: "SIP-001",
            kodeArea: "A",
            kodeMaster: "SIP-001-A-PekerjaanKeramik",
          },
          {
            mode: "new",
            divisiIds: ["DIV-ENG"],
            item: "Lampu LED Downlight",
            namaItem: "Lampu LED Downlight",
            kategori: "Pekerjaan Elektrikal",
            merk: "Philips",
            ukuran: "18 W",
            tipe: "Meson",
            warna: "Cool Daylight",
            permukaan: "Matte",
            tebal: "3 cm",
            lokasi: "Plafon Sales Area",
            satuan: "bh",
            cabang: "Cikokol",
            kodeItem: "SIP-002",
            kodeArea: "A",
            kodeMaster: "SIP-002-A-PekerjaanElektrikal",
          },
        ],
      })
    );

    const jsonBulk1 = await resBulk1.json();
    expect(resBulk1.status).toBe(200);
    expect(jsonBulk1.success).toBe(true);
    expect(jsonBulk1.createdCount).toBe(3);
    expect(jsonBulk1.skippedCount).toBe(0);

    // Ambil tiket Building untuk alur E2E happy path
    const tiketBld = jsonBulk1.created.find((t: any) => t.divisiId === divBldId);
    expect(tiketBld).toBeDefined();
    expect(tiketBld.status).toBe("DIAJUKAN");
    happyTiketId = tiketBld.id;

    // Kirim pengajuan kedua untuk item fisik sama ke DIV-BLD (duplikat) + DIV-DC (baru) => Parsial Pintar
    const resBulk2 = await createPengajuanPost(
      makeRequest("http://localhost/api/pengajuan", "POST", {
        items: [
          {
            mode: "new",
            divisiIds: ["DIV-BLD", "DIV-DC"],
            item: "Homogeneous Tile",
            namaItem: "Homogeneous Tile",
            kategori: "Pekerjaan Keramik",
            merk: "Roman",
            ukuran: "60x60 cm",
            tipe: "Sicily Grey Matte",
            warna: "Grey",
            permukaan: "Matte",
            tebal: "9 mm",
            toleransi: "0.5 mm",
            lokasi: "Sales Area",
            satuan: "m2",
            cabang: "Cikokol",
            kodeItem: "SIP-001",
            kodeArea: "A",
            kodeMaster: "SIP-001-A-PekerjaanKeramik",
          },
        ],
      })
    );
    const jsonBulk2 = await resBulk2.json();
    expect(resBulk2.status).toBe(200);
    expect(jsonBulk2.createdCount).toBe(1);
    expect(jsonBulk2.skippedCount).toBe(1);
    expect(jsonBulk2.created[0].divisiId).toBe(divDcId);
    expect(jsonBulk2.skipped[0].divisiKode).toBe("DIV-BLD");

    // Buat 1 tiket kedua di DIV-BLD (varian Teras) khusus untuk skenario jalur Banding & Parked
    const resBanding = await createPengajuanPost(
      makeRequest("http://localhost/api/pengajuan", "POST", {
        items: [
          {
            mode: "new",
            divisiIds: ["DIV-BLD"],
            item: "Homogeneous Tile",
            namaItem: "Homogeneous Tile",
            kategori: "Pekerjaan Keramik",
            merk: "Roman",
            ukuran: "60x60 cm",
            tipe: "Sicily Grey Matte",
            warna: "Grey",
            permukaan: "Matte",
            tebal: "9 mm",
            lokasi: "Teras",
            satuan: "m2",
            cabang: "Cikokol",
            kodeItem: "SIP-001",
            kodeArea: "B",
            kodeMaster: "SIP-001-B-PekerjaanKeramik",
          },
        ],
      })
    );
    const jsonBanding = await resBanding.json();
    expect(jsonBanding.createdCount).toBe(1);
    bandingTiketId = jsonBanding.created[0].id;
  });

  it("Tahap 2: S&B Specialist meminta revisi spek -> B&M memperbaiki -> S&B setuju & terbitkan AHSP (SIAP_SURVEI)", async () => {
    // 1. S&B minta revisi spesifikasi
    await actingAs(snbProfile);
    const revRes = await validasiSpekPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/validasi-spek`, "POST", {
        keputusan: "REVISI",
        catatan: "Mohon tambahkan detail ketebalan keramik.",
        revisiFields: ["Tebal"],
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    expect(revRes.status).toBe(200);

    const afterRev = await prisma.pengajuanHarga.findUnique({ where: { id: happyTiketId } });
    expect(afterRev?.status).toBe("PERLU_REVISI");

    // 2. B&M memperbaiki dan mengajukan ulang (PERLU_REVISI -> DIAJUKAN)
    await actingAs(bmProfile);
    const patchRes = await patchPengajuan(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}`, "PATCH", {
        tebal: "10 mm",
        catatanReview: "Tebal diperbarui menjadi 10 mm sesuai standar toko.",
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    expect(patchRes.status).toBe(200);

    const afterPatch = await prisma.pengajuanHarga.findUnique({
      where: { id: happyTiketId },
      include: { masterItem: true },
    });
    expect(afterPatch?.status).toBe("DIAJUKAN");
    expect(afterPatch?.masterItem?.tebal).toBe("10 mm");

    // 3. S&B menyetujui spek dan menerbitkan resep AHSP
    await actingAs(snbProfile);
    const approveSpek = await validasiSpekPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/validasi-spek`, "POST", {
        keputusan: "SETUJU",
        catatan: "Spesifikasi telah sesuai.",
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    expect(approveSpek.status).toBe(200);

    const mastRes = await masteringPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/mastering`, "POST", {
        terbitkan: true,
        catatan: "Resep AHSP keramik dikunci untuk survei BC.",
        baris: [
          {
            masterKoefisienId: koefUpahId,
            kategori: "UPAH",
            namaKomponen: "Tukang Pasang Keramik",
            satuan: "OH",
            nilaiKoefisien: 0.5,
            hargaAcuanSatuan: 120000,
          },
          {
            masterKoefisienId: koefMaterialId,
            kategori: "MATERIAL",
            namaKomponen: "Homogeneous Tile 60x60",
            satuan: "M2",
            nilaiKoefisien: 1.0,
            hargaAcuanSatuan: 0,
          },
          {
            masterKoefisienId: koefAlatId,
            kategori: "ALAT",
            namaKomponen: "Alat Potong Keramik",
            satuan: "LS",
            nilaiKoefisien: 1,
            hargaAcuanSatuan: 10000,
          },
        ],
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    const mastJson = await mastRes.json();
    expect(mastRes.status).toBe(200);
    expect(mastJson.success).toBe(true);

    const afterMast = await prisma.pengajuanHarga.findUnique({ where: { id: happyTiketId } });
    expect(afterMast?.status).toBe("SIAP_SURVEI");
  });

  it("Tahap 3 & 4: Survei 3 toko BC (termasuk validasi cabang & revisi BM) hingga PENDING_SB_SPECIALIST", async () => {
    const rincianMat = await prisma.rincianAhspPengajuan.findFirst({
      where: { pengajuanHargaId: happyTiketId, kategoriKomponen: "MATERIAL" },
    });
    expect(rincianMat).not.toBeNull();

    // Negative: BC dari cabang lain ditolak 403
    await actingAs(bcLainProfile);
    const wrongBranchRes = await surveyPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/survey`, "POST", {
        materialItems: [],
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    expect(wrongBranchRes.status).toBe(403);

    // Negative: BC Cikokol dengan < 3 toko ditolak 400
    await actingAs(bcProfile);
    const lessStoreRes = await surveyPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/survey`, "POST", {
        materialItems: [
          {
            rincianAhspId: rincianMat!.id,
            namaKomponen: "Homogeneous Tile 60x60",
            surveyToko: [
              { noToko: 1, namaToko: "TB A", hargaSatuan: 100000 },
              { noToko: 2, namaToko: "TB B", hargaSatuan: 100000 },
            ],
          },
        ],
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    expect(lessStoreRes.status).toBe(400);

    // Positive: BC Cikokol input 3 toko valid (rata-rata = 100000)
    const surveyOk = await surveyPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/survey`, "POST", {
        materialItems: [
          {
            rincianAhspId: rincianMat!.id,
            namaKomponen: "Homogeneous Tile 60x60",
            koefisien: 1,
            surveyToko: [
              { noToko: 1, namaToko: "TB Maju Jaya", hargaSatuan: 95000 },
              { noToko: 2, namaToko: "Mitra10 Cikokol", hargaSatuan: 100000 },
              { noToko: 3, namaToko: "Depo Bangunan", hargaSatuan: 105000 },
            ],
          },
        ],
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    expect(surveyOk.status).toBe(200);

    const afterSurvey = await prisma.pengajuanHarga.findUnique({ where: { id: happyTiketId } });
    expect(afterSurvey?.status).toBe("PENDING_BM_MGR");
    expect(afterSurvey?.rataRataSurveiMaterial?.toNumber()).toBe(100000);

    // B&M kembalikan ke BC lalu BC submit survei ulang -> B&M Approve
    await actingAs(bmProfile);
    const returnRes = await reviewBmPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/review-bm`, "POST", {
        action: "return",
        catatan: "Mohon cek ulang toko ke-3.",
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    expect(returnRes.status).toBe(200);
    expect((await prisma.pengajuanHarga.findUnique({ where: { id: happyTiketId } }))?.status).toBe(
      "RETURNED_TO_BC"
    );

    await actingAs(bcProfile);
    const reSurveyOk = await surveyPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/survey`, "POST", {
        materialItems: [
          {
            rincianAhspId: rincianMat!.id,
            namaKomponen: "Homogeneous Tile 60x60",
            koefisien: 1,
            surveyToko: [
              { noToko: 1, namaToko: "TB Maju Jaya", hargaSatuan: 95000 },
              { noToko: 2, namaToko: "Mitra10 Cikokol", hargaSatuan: 100000 },
              { noToko: 3, namaToko: "Depo Bangunan", hargaSatuan: 105000 },
            ],
          },
        ],
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    expect(reSurveyOk.status).toBe(200);

    await actingAs(bmProfile);
    const approveBmRes = await reviewBmPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/review-bm`, "POST", {
        action: "approve",
        catatan: "Hasil survei disetujui Layer 1.",
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    expect(approveBmRes.status).toBe(200);
    expect((await prisma.pengajuanHarga.findUnique({ where: { id: happyTiketId } }))?.status).toBe(
      "PENDING_SB_SPECIALIST"
    );
  });

  it("Tahap 5: Evaluasi Margin S&B & Keputusan Layer 3 Regional membuka kuorum voting putaran #1", async () => {
    await actingAs(snbProfile);
    // HPP: UPAH (0.5*120000=60000) + MATERIAL (1*100000=100000) + ALAT (1*10000=10000) = 170000
    // Dengan margin UPAH 10% (66000) + MATERIAL 8% (108000) + ALAT 0% (10000) => hargaFinal = 184000
    const evalRes = await evaluasiMarginPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/evaluasi-margin`, "POST", {
        action: "APPROVE",
        margin: { upah: 10, material: 8, bongkaran: 8 },
        catatan: "Margin layak diajukan ke Regional Manager.",
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    const evalJson = await evalRes.json();
    expect(evalRes.status).toBe(200);
    expect(evalJson.data.hargaFinal).toBe(184000);

    const afterEval = await prisma.pengajuanHarga.findUnique({ where: { id: happyTiketId } });
    expect(afterEval?.status).toBe("PENDING_REGIONAL_MGR");
    expect(afterEval?.hargaDitetapkanSNB?.toNumber()).toBe(184000);

    // Regional Manager APPROVE -> status PENDING_KONTRAKTOR + buka putaran voting 3 rekanan aktif
    await actingAs(rmProfile);
    const regRes = await reviewRegionalPost(
      makeRequest(`http://localhost/api/pengajuan/${happyTiketId}/review-regional`, "POST", {
        action: "APPROVE",
        catatan: "Disetujui buka penawaran kuorum.",
      }),
      { params: Promise.resolve({ id: happyTiketId }) }
    );
    const regJson = await regRes.json();
    expect(regRes.status).toBe(200);
    expect(regJson.data.status).toBe("PENDING_KONTRAKTOR");
    expect(regJson.data.putaran).toBe(1);
    expect(regJson.data.totalDiundang).toBe(3);
  });

  it("Tahap 6A: Kuorum Kontraktor (2/3 SETUJU) merilis tiket menjadi RELEASED & menerbitkan MasterHargaCabang", async () => {
    // Kontraktor 1 mengecek penawaran lalu vote SETUJU -> kuorum belum tercapai (1 dari target 2)
    await actingAs(k1Profile);
    const listPenawaran = await penawaranGet();
    const listJson = await listPenawaran.json();
    expect(listPenawaran.status).toBe(200);
    expect(listJson.data.some((d: any) => d.tiketId === happyTiketId)).toBe(true);

    const vote1 = await votePost(
      makeRequest(`http://localhost/api/kuorum/${happyTiketId}/vote`, "POST", { keputusan: "SETUJU" }),
      { params: Promise.resolve({ tiketId: happyTiketId }) }
    );
    const vote1Json = await vote1.json();
    expect(vote1.status).toBe(200);
    expect(vote1Json.data.statusVote).toBe("SETUJU");
    expect(vote1Json.data.hasilKuorum).toBe("BERJALAN");

    // Kontraktor 2 vote SETUJU -> kuorum 2/3 tercapai! Tiket RELEASED & harga masuk MasterHargaCabang
    await actingAs(k2Profile);
    const vote2 = await votePost(
      makeRequest(`http://localhost/api/kuorum/${happyTiketId}/vote`, "POST", { keputusan: "SETUJU" }),
      { params: Promise.resolve({ tiketId: happyTiketId }) }
    );
    const vote2Json = await vote2.json();
    expect(vote2.status).toBe(200);
    expect(vote2Json.data.hasilKuorum).toBe("RELEASED");

    const finalTiket = await prisma.pengajuanHarga.findUnique({ where: { id: happyTiketId } });
    expect(finalTiket?.status).toBe("RELEASED");

    const katalogInduk = await prisma.masterHargaCabang.findUnique({
      where: {
        masterItemId_cabangId: {
          masterItemId: finalTiket!.masterItemId!,
          cabangId: cabangUtamaId,
        },
      },
    });
    expect(katalogInduk).not.toBeNull();
    expect(katalogInduk?.hargaFinalInduk.toNumber()).toBe(184000);
    expect(katalogInduk?.statusHarga).toBe("AKTIF");
  });

  it("Tahap 6B: Jalur Banding Kontraktor -> Putaran ke-2 Menolak Lagi menjadi PARKED -> Unpark kembali AKTIF", async () => {
    // Siapkan bandingTiketId cepat melalui alur yang sah hingga PENDING_KONTRAKTOR
    await actingAs(snbProfile);
    const bMast = await masteringPost(
      makeRequest(`http://localhost/api/pengajuan/${bandingTiketId}/mastering`, "POST", {
        terbitkan: true,
        baris: [
          {
            masterKoefisienId: koefMaterialId,
            kategori: "MATERIAL",
            namaKomponen: "Homogeneous Tile 60x60",
            satuan: "M2",
            nilaiKoefisien: 1,
            hargaAcuanSatuan: 0,
          },
        ],
      }),
      { params: Promise.resolve({ id: bandingTiketId }) }
    );
    expect(bMast.status).toBe(200);

    const rMat = await prisma.rincianAhspPengajuan.findFirst({
      where: { pengajuanHargaId: bandingTiketId, kategoriKomponen: "MATERIAL" },
    });
    expect(rMat).not.toBeNull();
    await actingAs(bcProfile);
    const bSurv = await surveyPost(
      makeRequest(`http://localhost/api/pengajuan/${bandingTiketId}/survey`, "POST", {
        materialItems: [
          {
            rincianAhspId: rMat!.id,
            namaKomponen: "Homogeneous Tile 60x60",
            surveyToko: [
              { noToko: 1, namaToko: "T1", hargaSatuan: 100000 },
              { noToko: 2, namaToko: "T2", hargaSatuan: 100000 },
              { noToko: 3, namaToko: "T3", hargaSatuan: 100000 },
            ],
          },
        ],
      }),
      { params: Promise.resolve({ id: bandingTiketId }) }
    );
    expect(bSurv.status).toBe(200);

    await actingAs(bmProfile);
    const bBm = await reviewBmPost(
      makeRequest(`http://localhost/api/pengajuan/${bandingTiketId}/review-bm`, "POST", {
        action: "approve",
        catatan: "OK survei banding.",
      }),
      { params: Promise.resolve({ id: bandingTiketId }) }
    );
    expect(bBm.status).toBe(200);

    await actingAs(snbProfile);
    const bEval = await evaluasiMarginPost(
      makeRequest(`http://localhost/api/pengajuan/${bandingTiketId}/evaluasi-margin`, "POST", {
        action: "APPROVE",
        margin: { upah: 8, material: 8, bongkaran: 8 },
        catatan: "Margin standar 8%.",
      }),
      { params: Promise.resolve({ id: bandingTiketId }) }
    );
    expect(bEval.status).toBe(200);

    await actingAs(rmProfile);
    const bReg = await reviewRegionalPost(
      makeRequest(`http://localhost/api/pengajuan/${bandingTiketId}/review-regional`, "POST", {
        action: "APPROVE",
        catatan: "Buka putaran #1.",
      }),
      { params: Promise.resolve({ id: bandingTiketId }) }
    );
    expect(bReg.status).toBe(200);

    // Putaran #1: Banding wajib menyertakan bukti pembanding pasar (tanpa lampiran -> 400)
    await actingAs(k1Profile);
    const v1NoFile = await votePost(
      makeRequest(`http://localhost/api/kuorum/${bandingTiketId}/vote`, "POST", {
        keputusan: "TOLAK",
        usulanHarga: 120000,
        catatan: "Harga pasar teras lebih tinggi.",
      }),
      { params: Promise.resolve({ tiketId: bandingTiketId }) }
    );
    expect(v1NoFile.status).toBe(400);

    // Putaran #1: Dari 3 kontraktor (target kuorum = 2), saat K1 & K2 TOLAK (dengan usulan harga & bukti),
    // kuorum mustahil tercapai (0 setuju + 1 menunggu < 2), sehingga putaran langsung ditutup
    // menjadi USULAN_KONTRAKTOR pada vote ke-2 dan vote ke-3 ditolak dengan 409.
    const v1 = await votePost(
      makeRequest(`http://localhost/api/kuorum/${bandingTiketId}/vote`, "POST", {
        keputusan: "TOLAK",
        usulanHarga: 120000,
        catatan: "Harga pasar teras lebih tinggi.",
        lampiranList: [
          {
            namaFile: "penawaran-supplier-1.pdf",
            fileUrl: "/api/kuorum/lampiran/11111111-1111-4111-8111-111111111111.pdf",
            ukuranFile: "120 KB",
          },
        ],
      }),
      { params: Promise.resolve({ tiketId: bandingTiketId }) }
    );
    const v1Json = await v1.json();
    expect(v1.status, JSON.stringify(v1Json)).toBe(200);
    expect(v1Json.data.hasilKuorum).toBe("BERJALAN");

    await actingAs(k2Profile);
    const v2 = await votePost(
      makeRequest(`http://localhost/api/kuorum/${bandingTiketId}/vote`, "POST", {
        keputusan: "TOLAK",
        usulanHarga: 122000,
        catatan: "Ongkos pasang area teras lebih besar.",
        lampiranList: [
          {
            namaFile: "penawaran-supplier-2.pdf",
            fileUrl: "/api/kuorum/lampiran/22222222-2222-4222-8222-222222222222.pdf",
            ukuranFile: "95 KB",
          },
        ],
      }),
      { params: Promise.resolve({ tiketId: bandingTiketId }) }
    );
    const v2Json = await v2.json();
    expect(v2.status, JSON.stringify(v2Json)).toBe(200);
    expect(v2Json.data.hasilKuorum).toBe("USULAN_KONTRAKTOR");

    await actingAs(k3Profile);
    const v3 = await votePost(
      makeRequest(`http://localhost/api/kuorum/${bandingTiketId}/vote`, "POST", {
        keputusan: "TOLAK",
        usulanHarga: 121000,
        catatan: "Harga perlu disesuaikan.",
      }),
      { params: Promise.resolve({ tiketId: bandingTiketId }) }
    );
    expect(v3.status).toBe(409);

    // S&B memilih PERTAHANKAN -> kembali ke Regional -> Regional membuka Putaran #2
    await putuskanBanding({
      tiketId: bandingTiketId,
      userId: snbProfile.id,
      keputusan: "PERTAHANKAN",
      catatan: "Harga sudah mengacu 3 toko fisik terdekat.",
    });

    await actingAs(rmProfile);
    const openRound2 = await reviewRegionalPost(
      makeRequest(`http://localhost/api/pengajuan/${bandingTiketId}/review-regional`, "POST", {
        action: "APPROVE",
        catatan: "Buka putaran #2 pertahankan harga.",
      }),
      { params: Promise.resolve({ id: bandingTiketId }) }
    );
    const openRound2Json = await openRound2.json();
    expect(openRound2.status, JSON.stringify(openRound2Json)).toBe(200);
    expect(openRound2Json.data.putaran).toBe(2);

    // Putaran #2: K1 yang sudah pernah menolak kembali TOLAK -> otomatis PARKED (NONAKTIF_SEMENTARA)
    await actingAs(k1Profile);
    const k1RejectRound2 = await votePost(
      makeRequest(`http://localhost/api/kuorum/${bandingTiketId}/vote`, "POST", {
        keputusan: "TOLAK",
        catatan: "Tetap tidak dapat memenuhi harga penawaran.",
      }),
      { params: Promise.resolve({ tiketId: bandingTiketId }) }
    );
    const k1RejectJson = await k1RejectRound2.json();
    expect(k1RejectRound2.status, JSON.stringify(k1RejectJson)).toBe(200);
    expect(k1RejectJson.data.diparkir).toBe(true);

    const relAfterPark = await prisma.kontraktorCabang.findUnique({ where: { id: relasiK1Id } });
    expect(relAfterPark?.statusKeaktifan).toBe("NONAKTIF_SEMENTARA");

    // S&B mengaktifkan kembali rekanan Parked via POST /api/kuorum/parked/[relasiId]/unpark
    await actingAs(snbProfile);
    const unparkRes = await unparkPost(
      makeRequest(`http://localhost/api/kuorum/parked/${relasiK1Id}/unpark`, "POST", {
        alasan: "Sudah klarifikasi kesanggupan harga dengan manajemen rekanan.",
      }),
      { params: Promise.resolve({ relasiId: relasiK1Id }) }
    );
    expect(unparkRes.status).toBe(200);

    const relAfterUnpark = await prisma.kontraktorCabang.findUnique({ where: { id: relasiK1Id } });
    expect(relAfterUnpark?.statusKeaktifan).toBe("AKTIF");
  });
});
