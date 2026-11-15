import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { CakupanHarga, StatusPengajuanHarga, PengajuanHargaItem } from "@/types";

export async function GET(request: NextRequest) {
  try {
    let user = await getSessionUser();
    // Jika sesi belum ada di dev/preview, fallback sesuai konteks halaman
    if (!user) {
      const referer = request.headers.get("referer") || "";
      const requestedRole = request.nextUrl.searchParams.get("role");
      let targetRole: any = "BM_MANAGER";
      if (requestedRole) {
        targetRole = requestedRole;
      } else if (referer.includes("sb-specialist")) {
        targetRole = "SB_SPECIALIST";
      } else if (referer.includes("regional-manager")) {
        targetRole = "REGIONAL_MANAGER";
      } else if (referer.includes("building-coordinator")) {
        targetRole = "BUILDING_COORDINATOR";
      } else if (referer.includes("kontraktor")) {
        targetRole = "KONTRAKTOR";
      }

      const defaultUser = await prisma.user.findFirst({
        where: { role: targetRole },
        include: { cabang: true },
      });
      if (defaultUser) {
        user = {
          id: defaultUser.id,
          email: defaultUser.email,
          fullName: defaultUser.fullName,
          role: defaultUser.role,
          cabangId: defaultUser.cabangId,
          namaCabang: defaultUser.cabang?.namaCabang || "Cikokol",
          divisiId: defaultUser.divisiId,
        };
      }
    }

    const { searchParams } = new URL(request.url);
    const divisiId = searchParams.get("divisiId");
    const status = searchParams.get("status");
    const cakupan = searchParams.get("cakupan");
    const cabangParam = searchParams.get("cabang");
    const search = searchParams.get("q")?.trim() || "";

    const where: any = {};

    // Jika role adalah BM_MANAGER atau BUILDING_COORDINATOR, wajib dikunci ke cabang pengguna saja
    if (user && (user.role === "BM_MANAGER" || user.role === "BUILDING_COORDINATOR")) {
      if (user.cabangId) {
        where.cabangId = user.cabangId;
      }
    } else if (cabangParam && cabangParam !== "all") {
      where.cabang = {
        namaCabang: { contains: cabangParam, mode: "insensitive" },
      };
    } else if (
      user &&
      user.role !== "ADMIN" &&
      user.role !== "SB_SPECIALIST" &&
      user.role !== "REGIONAL_MANAGER" &&
      user.cabangId
    ) {
      // Jika tidak ada query spesifik, default ke cabang pengguna
      where.cabangId = user.cabangId;
    }

    if (divisiId && divisiId !== "ALL") {
      where.divisiId = divisiId;
    }

    if (status && status !== "ALL") {
      where.status = status as StatusPengajuanHarga;
    }

    if (cakupan && cakupan !== "ALL") {
      where.cakupanHarga = cakupan as CakupanHarga;
    }

    if (search) {
      where.OR = [
        { nomorTiket: { contains: search, mode: "insensitive" } },
        { masterItem: { namaItem: { contains: search, mode: "insensitive" } } },
        { masterItem: { kodeItem: { contains: search, mode: "insensitive" } } },
        { masterItem: { merk: { contains: search, mode: "insensitive" } } },
      ];
    }

    const items = await prisma.pengajuanHarga.findMany({
      where,
      orderBy: { tanggalPengajuan: "desc" },
      include: {
        divisi: { select: { id: true, kodeDivisi: true, namaDivisi: true } },
        cabang: { select: { id: true, kodeCabang: true, namaCabang: true } },
        wilayahCabang: { select: { id: true, kodeWilayah: true, namaWilayah: true } },
        masterItem: true,
        pembuatUser: { select: { id: true, fullName: true, role: true } },
        _count: {
          select: {
            rincianAHSP: true,
            votingKontraktorList: true,
          },
        },
      },
    });

    // Petakan ke antarmuka PengajuanHargaItem yang komprehensif
    const formattedData: PengajuanHargaItem[] = items.map((t) => {
      const cleanCabang = (t.cabang?.namaCabang || "").replace(/^Cabang\s+/i, "");
      return {
        id: t.id,
        noTiket: t.nomorTiket,
        kodeItem: t.masterItem?.kodeItem || "ITEM",
        namaItem: t.masterItem?.namaItem || "Material",
        kategori: t.masterItem?.kategori || "Pekerjaan",
        merk: t.masterItem?.merk || "",
        tipe: t.masterItem?.tipe || "",
        ukuran: t.masterItem?.ukuran || "",
        warna: t.masterItem?.warna || "",
        lokasi: t.masterItem?.lokasi || "",
        divisiId: t.divisiId,
        namaDivisi: t.divisi?.namaDivisi,
        kodeDivisi: t.divisi?.kodeDivisi,
        cabangId: t.cabangId,
        namaCabang: t.cabang?.namaCabang,
        kodeCabang: t.cabang?.kodeCabang,
        cakupanHarga: t.cakupanHarga,
        wilayahCabangId: t.wilayahCabangId,
        namaWilayah: t.wilayahCabang?.namaWilayah,
        status: t.status,
        tanggalPengajuan: t.tanggalPengajuan.toISOString().slice(0, 10),
        alasanPengajuan: t.catatanReview || undefined,
        catatanReviewTerakhir: t.catatanReview || undefined,
        surveiTokoList: [],
        hargaAcuanPasar: t.rataRataSurveiMaterial ? Number(t.rataRataSurveiMaterial) : undefined,
        koefisienItems: [],
        liveMarginUpah: Number(t.marginAwalPersen) || 8.0,
        liveMarginMaterial: Number(t.marginAwalPersen) || 8.0,
        liveMarginBongkaran: Number(t.marginAwalPersen) || 8.0,
        totalHpp: 0,
        totalHargaSatuan: 0,

        // Aliases untuk kesesuaian tabel
        kode: t.masterItem?.kodeItem || "ITEM",
        kodeMaster: t.masterItem?.kodeMaster || "",
        item: t.masterItem?.namaItem || "Material",
        cabang: cleanCabang || "Cikokol",
        deskripsiOtomatis: t.masterItem?.deskripsiOtomatis || "",
        satuan: t.masterItem?.satuan || "m2",
        tebal: t.masterItem?.tebal || "",
        permukaan: t.masterItem?.permukaan || "",
        toleransi: t.masterItem?.toleransi || "",
        implementasi: "Lantai",
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("GET Pengajuan Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar pengajuan." },
      { status: 500 }
    );
  }
}

interface PengajuanInputPayload {
  mode?: string;
  divisiId?: string;
  divisiIds?: string[];
  cakupanHarga?: string;
  wilayahCabangId?: string | null;
  alasanPengajuan?: string;
  informasiTambahan?: string;
  isTermasukBongkaran?: boolean;
  masterItemId?: string;
  kodeItem?: string;
  kodeMaster?: string;
  kodeArea?: string;
  namaItem?: string;
  item?: string;
  kategori?: string;
  merk?: string;
  ukuran?: string;
  tipe?: string;
  warna?: string;
  permukaan?: string;
  tebal?: string;
  toleransi?: string;
  lokasi?: string;
  satuan?: string;
  cabang?: string;
  cabangId?: string;
}

interface SkippedBulkEntry {
  itemName: string;
  kodeMaster: string;
  divisiKode: string;
  divisiNama: string;
  existingNomorTiket: string | null;
  reason: string;
}

const DIVISI_LABEL_ALIASES: Record<string, string[]> = {
  "DIV-BLD": ["building", "sipil", "bld"],
  "DIV-MNT": ["maintenance", "perawatan", "mnt"],
  "DIV-ENG": ["engineering", "me", "m/e", "hvac", "eng"],
  "DIV-DC": ["dc", "distribution center", "logistik"],
};

export async function POST(request: NextRequest) {
  try {
    let user = await getSessionUser();
    // Fallback user di dev/preview
    if (!user) {
      const defaultBm = await prisma.user.findFirst({
        where: { role: "BM_MANAGER" },
      });
      if (defaultBm) {
        user = {
          id: defaultBm.id,
          email: defaultBm.email,
          fullName: defaultBm.fullName,
          role: defaultBm.role,
          cabangId: defaultBm.cabangId,
          divisiId: defaultBm.divisiId,
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const isBulkRequest = Array.isArray(body?.items);
    const rawInputs: PengajuanInputPayload[] = isBulkRequest ? body.items : [body];

    if (rawInputs.length === 0) {
      return NextResponse.json(
        { success: false, message: "Daftar pengajuan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const allDivisi = await prisma.divisi.findMany({
      where: { isActive: true },
      orderBy: { kodeDivisi: "asc" },
    });

    if (allDivisi.length === 0) {
      return NextResponse.json(
        { success: false, message: "Divisi aktif tidak ditemukan di sistem." },
        { status: 400 }
      );
    }

    const resolveTargetDivisions = (entry: PengajuanInputPayload) => {
      const requested = Array.isArray(entry.divisiIds) && entry.divisiIds.length > 0
        ? entry.divisiIds
        : entry.divisiId
        ? [entry.divisiId]
        : user.divisiId
        ? [user.divisiId]
        : [allDivisi[0].id];

      const matched: typeof allDivisi = [];
      const seen = new Set<string>();

      for (const rawKey of requested) {
        const key = String(rawKey || "").trim();
        if (!key) continue;
        const lower = key.toLowerCase();

        const found = allDivisi.find((d) => {
          if (d.id === key || d.kodeDivisi.toLowerCase() === lower || d.namaDivisi.toLowerCase() === lower) {
            return true;
          }
          const aliases = DIVISI_LABEL_ALIASES[d.kodeDivisi.toUpperCase()] || [];
          return aliases.some((alias) => lower === alias || lower.includes(alias));
        });

        if (found && !seen.has(found.id)) {
          seen.add(found.id);
          matched.push(found);
        }
      }

      if (matched.length === 0) {
        matched.push(allDivisi[0]);
      }
      return matched;
    };

    const cabangCache = new Map<string, string>();
    const defaultCabangRecord = await prisma.cabang.findFirst({ where: { isActive: true } });

    const resolveCabangId = async (entry: PengajuanInputPayload): Promise<string | null> => {
      if (entry.cabangId) return entry.cabangId;
      if (user.cabangId && !entry.cabang) return user.cabangId;

      const cabangName = (entry.cabang || "").trim();
      if (cabangName) {
        const cacheKey = cabangName.toLowerCase();
        if (cabangCache.has(cacheKey)) {
          return cabangCache.get(cacheKey)!;
        }
        const foundCabang = await prisma.cabang.findFirst({
          where: { namaCabang: { contains: cabangName, mode: "insensitive" } },
        });
        if (foundCabang) {
          cabangCache.set(cacheKey, foundCabang.id);
          return foundCabang.id;
        }
      }

      return user.cabangId || defaultCabangRecord?.id || null;
    };

    // Validasi awal nama item & cabang untuk seluruh entry
    const preparedEntries: Array<{
      entry: PengajuanInputPayload;
      actualItemName: string;
      resolvedCabangId: string;
      targetDivisions: typeof allDivisi;
    }> = [];

    for (const entry of rawInputs) {
      const actualItemName = (entry.namaItem || entry.item || "").trim();
      if (!actualItemName) {
        return NextResponse.json(
          { success: false, message: "Nama item material wajib diisi untuk seluruh baris." },
          { status: 400 }
        );
      }

      const resolvedCabangId = await resolveCabangId(entry);
      if (!resolvedCabangId) {
        return NextResponse.json(
          { success: false, message: "Cabang operasional tidak ditemukan di sistem." },
          { status: 400 }
        );
      }

      preparedEntries.push({
        entry,
        actualItemName,
        resolvedCabangId,
        targetDivisions: resolveTargetDivisions(entry),
      });
    }

    // Eksekusi transaksional pembuatan tiket (Parsial Pintar)
    const txResult = await prisma.$transaction(async (tx) => {
      const currentYear = new Date().getFullYear();
      let nextSeq = (await tx.pengajuanHarga.count()) + 1;

      const existingCodes = await tx.masterItem.findMany({
        select: { kodeItem: true },
      });
      let maxSipNum = 0;
      for (const row of existingCodes) {
        const m = row.kodeItem.match(/^SIP-(\d+)/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxSipNum) maxSipNum = n;
        }
      }

      const allocateNomorTiket = async (): Promise<string> => {
        let candidate = `REQ-${currentYear}-${String(nextSeq).padStart(3, "0")}`;
        nextSeq++;
        const existingTiket = await tx.pengajuanHarga.findUnique({
          where: { nomorTiket: candidate },
          select: { id: true },
        });
        if (existingTiket) {
          candidate = `REQ-${currentYear}-${String(nextSeq).padStart(3, "0")}-${Math.floor(10 + Math.random() * 90)}`;
        }
        return candidate;
      };

      const created: any[] = [];
      const skipped: SkippedBulkEntry[] = [];
      const seenSubmissionKeys = new Set<string>();
      const masterCache = new Map<string, { id: string; kodeMaster: string }>();

      for (const { entry, actualItemName, resolvedCabangId, targetDivisions } of preparedEntries) {
        const primaryDivisi = targetDivisions[0];
        const cleanLokasi = (entry.lokasi || "Area Toko").trim();
        const cleanMerk = (entry.merk || "Standar Alfamart").trim();
        const cleanUkuran = (entry.ukuran || "-").trim();
        const cleanKategori = (entry.kategori || "Pekerjaan Konstruksi").trim();
        const cleanTipe = entry.tipe?.trim() || null;
        const cleanWarna = entry.warna?.trim() || null;
        const cleanPermukaan = entry.permukaan?.trim() || null;
        const cleanTebal = entry.tebal?.trim() || null;
        const cleanToleransi = entry.toleransi?.trim() || null;

        const specSignature = [
          actualItemName.toLowerCase(),
          cleanUkuran.toLowerCase(),
          cleanMerk.toLowerCase(),
          (cleanWarna || "").toLowerCase(),
          (cleanTipe || "").toLowerCase(),
          (cleanPermukaan || "").toLowerCase(),
          (cleanTebal || "").toLowerCase(),
          cleanLokasi.toLowerCase(),
        ].join("|");

        let resolvedMaster: { id: string; kodeMaster: string } | null = null;

        if (entry.mode !== "new" && entry.masterItemId) {
          const existingById = await tx.masterItem.findUnique({
            where: { id: entry.masterItemId },
            select: { id: true, kodeMaster: true },
          });
          if (existingById) {
            resolvedMaster = existingById;
          }
        }

        if (!resolvedMaster && masterCache.has(specSignature)) {
          resolvedMaster = masterCache.get(specSignature)!;
        }

        // Cek kecocokan fisik + lokasi eksisting di MasterItem DB
        if (!resolvedMaster) {
          const existingBySpec = await tx.masterItem.findFirst({
            where: {
              namaItem: { equals: actualItemName, mode: "insensitive" },
              ukuran: { equals: cleanUkuran, mode: "insensitive" },
              merk: { equals: cleanMerk, mode: "insensitive" },
              lokasi: { equals: cleanLokasi, mode: "insensitive" },
              warna: cleanWarna ? { equals: cleanWarna, mode: "insensitive" } : null,
              tipe: cleanTipe ? { equals: cleanTipe, mode: "insensitive" } : null,
              permukaan: cleanPermukaan ? { equals: cleanPermukaan, mode: "insensitive" } : null,
              tebal: cleanTebal ? { equals: cleanTebal, mode: "insensitive" } : null,
            },
            select: { id: true, kodeMaster: true },
          });
          if (existingBySpec) {
            resolvedMaster = existingBySpec;
          }
        }

        if (!resolvedMaster) {
          const cleanKatToken = (cleanKategori || "Umum").replace(/\s+/g, "");
          let candidateKodeItem = (entry.kodeItem || "").trim().toUpperCase();
          if (!candidateKodeItem) {
            maxSipNum += 1;
            candidateKodeItem = `SIP-${String(maxSipNum).padStart(3, "0")}`;
          }
          const candidateVarian = (entry.kodeArea || "01").trim().toUpperCase();
          let candidateKodeMaster = (entry.kodeMaster || "").trim() || `${candidateKodeItem}-${candidateVarian}-${cleanKatToken}`;

          // Hindari bentrok kodeMaster / (kodeItem, kodeVarian) dengan item fisik berbeda
          let guard = 0;
          while (guard < 50) {
            const conflict = await tx.masterItem.findFirst({
              where: {
                OR: [
                  { kodeMaster: candidateKodeMaster },
                  { kodeItem: candidateKodeItem, kodeVarian: candidateVarian },
                ],
              },
              select: { id: true },
            });
            if (!conflict) break;
            maxSipNum += 1;
            candidateKodeItem = `SIP-${String(maxSipNum).padStart(3, "0")}`;
            candidateKodeMaster = `${candidateKodeItem}-${candidateVarian}-${cleanKatToken}`;
            guard++;
          }

          const autoDesc = [
            actualItemName,
            cleanUkuran !== "-" ? cleanUkuran : "",
            cleanMerk,
            cleanWarna || "",
            cleanTipe ? `Tipe ${cleanTipe}` : "",
            cleanTebal ? `Tebal ${cleanTebal}` : "",
            cleanPermukaan || "",
            cleanToleransi ? `Toleransi ${cleanToleransi}` : "",
            cleanLokasi ? `Lokasi ${cleanLokasi}` : "",
          ]
            .filter(Boolean)
            .join(" ");

          const newItem = await tx.masterItem.create({
            data: {
              divisiId: primaryDivisi.id,
              kodeItem: candidateKodeItem,
              kodeVarian: candidateVarian,
              kodeMaster: candidateKodeMaster,
              kategori: cleanKategori,
              namaItem: actualItemName,
              ukuran: cleanUkuran,
              merk: cleanMerk,
              tipe: cleanTipe,
              warna: cleanWarna,
              permukaan: cleanPermukaan,
              tebal: cleanTebal,
              toleransi: cleanToleransi,
              lokasi: cleanLokasi,
              satuan: (entry.satuan || "m2").toUpperCase(),
              deskripsiOtomatis: autoDesc,
            },
            select: { id: true, kodeMaster: true },
          });

          resolvedMaster = newItem;
        }

        masterCache.set(specSignature, resolvedMaster);

        const catatanInput = (entry.alasanPengajuan || entry.informasiTambahan || "").trim() || null;
        const resolvedCakupan = (entry.cakupanHarga as CakupanHarga) || "INDUK_CABANG";

        // Buat 1 tiket PengajuanHarga untuk setiap divisi terpilih (dengan deteksi duplikat Parsial Pintar)
        for (const divisi of targetDivisions) {
          const batchKey = `${resolvedCabangId}::${divisi.id}::${resolvedMaster.id}`;
          if (seenSubmissionKeys.has(batchKey)) {
            skipped.push({
              itemName: actualItemName,
              kodeMaster: resolvedMaster.kodeMaster,
              divisiKode: divisi.kodeDivisi,
              divisiNama: divisi.namaDivisi,
              existingNomorTiket: null,
              reason: "Duplikat dalam daftar pengajuan yang sama.",
            });
            continue;
          }

          const existingTicket = await tx.pengajuanHarga.findFirst({
            where: {
              cabangId: resolvedCabangId,
              divisiId: divisi.id,
              masterItemId: resolvedMaster.id,
              status: { notIn: ["DITOLAK"] },
            },
            select: { nomorTiket: true },
          });

          if (existingTicket) {
            skipped.push({
              itemName: actualItemName,
              kodeMaster: resolvedMaster.kodeMaster,
              divisiKode: divisi.kodeDivisi,
              divisiNama: divisi.namaDivisi,
              existingNomorTiket: existingTicket.nomorTiket,
              reason: `Sudah terdaftar di cabang & divisi ini (${existingTicket.nomorTiket}).`,
            });
            continue;
          }

          const nomorTiket = await allocateNomorTiket();
          const pengajuan = await tx.pengajuanHarga.create({
            data: {
              nomorTiket,
              divisiId: divisi.id,
              cabangId: resolvedCabangId,
              wilayahCabangId: resolvedCakupan === "KHUSUS_WILAYAH" ? entry.wilayahCabangId : null,
              masterItemId: resolvedMaster.id,
              pembuatUserId: user.id,
              cakupanHarga: resolvedCakupan,
              status: "DIAJUKAN",
              isTermasukBongkaran: Boolean(entry.isTermasukBongkaran),
              marginAwalPersen: 8.0,
              catatanReview: catatanInput,
            },
            include: {
              masterItem: true,
              divisi: true,
              cabang: true,
              wilayahCabang: true,
            },
          });

          await tx.approvalAuditLog.create({
            data: {
              pengajuanHargaId: pengajuan.id,
              userId: user.id,
              roleActor: user.role,
              action: "SUBMIT_PENGAJUAN",
              catatan: catatanInput || `Inisiasi spesifikasi material oleh ${user.fullName} (${divisi.namaDivisi})`,
            },
          });

          seenSubmissionKeys.add(batchKey);
          created.push(pengajuan);
        }
      }

      return { created, skipped };
    }, { maxWait: 10000, timeout: 30000 });

    const { created, skipped } = txResult;
    const summaryMessage =
      created.length > 0 && skipped.length > 0
        ? `${created.length} tiket pengajuan berhasil dibuat, ${skipped.length} item/divisi dilewati karena sudah terdaftar.`
        : created.length > 0
        ? isBulkRequest || created.length > 1
          ? `${created.length} tiket pengajuan berhasil diajukan ke server.`
          : `Permohonan spesifikasi #${created[0].nomorTiket} berhasil diajukan ke server.`
        : `Semua pengajuan (${skipped.length}) dilewati karena sudah terdaftar sebelumnya.`;

    return NextResponse.json({
      success: true,
      message: summaryMessage,
      data: isBulkRequest ? created : created[0] ?? null,
      created,
      skipped,
      createdCount: created.length,
      skippedCount: skipped.length,
    });
  } catch (error: any) {
    console.error("POST Pengajuan Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuat pengajuan harga." },
      { status: 500 }
    );
  }
}
