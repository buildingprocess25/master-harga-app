import prisma from "../src/lib/prisma";

async function main() {
  console.log("🚀 Memulai seeding data resmi SPARTA-HARGA...");

  // ==========================================================================
  // 1. SEED DIVISI (4 DIVISI BAKU ALFAMART)
  // ==========================================================================
  const divisiBuilding = await prisma.divisi.upsert({
    where: { kodeDivisi: "DIV-BLD" },
    update: { namaDivisi: "Building (Konstruksi & Sipil)", isActive: true },
    create: {
      kodeDivisi: "DIV-BLD",
      namaDivisi: "Building (Konstruksi & Sipil)",
      isActive: true,
    },
  });

  const divisiEngineering = await prisma.divisi.upsert({
    where: { kodeDivisi: "DIV-ENG" },
    update: { namaDivisi: "Engineering (M/E & HVAC)", isActive: true },
    create: {
      kodeDivisi: "DIV-ENG",
      namaDivisi: "Engineering (M/E & HVAC)",
      isActive: true,
    },
  });

  const divisiMaintenance = await prisma.divisi.upsert({
    where: { kodeDivisi: "DIV-MNT" },
    update: { namaDivisi: "Maintenance (Perawatan Gedung)", isActive: true },
    create: {
      kodeDivisi: "DIV-MNT",
      namaDivisi: "Maintenance (Perawatan Gedung)",
      isActive: true,
    },
  });

  const divisiDC = await prisma.divisi.upsert({
    where: { kodeDivisi: "DIV-DC" },
    update: { namaDivisi: "Distribution Center (Logistik)", isActive: true },
    create: {
      kodeDivisi: "DIV-DC",
      namaDivisi: "Distribution Center (Logistik)",
      isActive: true,
    },
  });

  console.log("✅ 4 Divisi berhasil diseed.");

  // ==========================================================================
  // 2. SEED CABANG & WILAYAH CABANG
  // ==========================================================================
  const cabangCikokol = await prisma.cabang.upsert({
    where: { kodeCabang: "CKK" },
    update: { namaCabang: "Cabang Cikokol", regional: "Jabodetabek 1" },
    create: {
      kodeCabang: "CKK",
      namaCabang: "Cabang Cikokol",
      regional: "Jabodetabek 1",
    },
  });

  const cabangBalaraja = await prisma.cabang.upsert({
    where: { kodeCabang: "BLR" },
    update: { namaCabang: "Cabang Balaraja", regional: "Jabodetabek 2" },
    create: {
      kodeCabang: "BLR",
      namaCabang: "Cabang Balaraja",
      regional: "Jabodetabek 2",
    },
  });

  const cabangBandung = await prisma.cabang.upsert({
    where: { kodeCabang: "BDG" },
    update: { namaCabang: "Cabang Bandung 1", regional: "Jawa Barat" },
    create: {
      kodeCabang: "BDG",
      namaCabang: "Cabang Bandung 1",
      regional: "Jawa Barat",
    },
  });

  // Sub-Wilayah Khusus di bawah Cabang Cikokol
  const wilayahSerang = await prisma.wilayahCabang.upsert({
    where: { kodeWilayah: "WIL-SRG" },
    update: {
      namaWilayah: "Wilayah Serang Kota & Kabupaten",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      kodeWilayah: "WIL-SRG",
      namaWilayah: "Wilayah Serang Kota & Kabupaten",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
  });

  const wilayahPandeglang = await prisma.wilayahCabang.upsert({
    where: { kodeWilayah: "WIL-PDG" },
    update: {
      namaWilayah: "Wilayah Pandeglang",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      kodeWilayah: "WIL-PDG",
      namaWilayah: "Wilayah Pandeglang",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
  });

  const wilayahLebak = await prisma.wilayahCabang.upsert({
    where: { kodeWilayah: "WIL-LBK" },
    update: {
      namaWilayah: "Wilayah Lebak / Rangkasbitung",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      kodeWilayah: "WIL-LBK",
      namaWilayah: "Wilayah Lebak / Rangkasbitung",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
  });

  console.log("✅ Cabang & Sub-Wilayah berhasil diseed.");

  // ==========================================================================
  // 3. SEED PUSTAKA KOEFISIEN BAKU (MASTER KOEFISIEN)
  // ==========================================================================
  const koefisienData = [
    { kode: "KOEF-UPH-01", nama: "Mandor Proyek", kat: "UPAH", sat: "Oh", val: 0.0188 },
    { kode: "KOEF-UPH-02", nama: "Kepala Tukang", kat: "UPAH", sat: "Oh", val: 0.0375 },
    { kode: "KOEF-UPH-03", nama: "Tukang Keramik", kat: "UPAH", sat: "Oh", val: 0.1875 },
    { kode: "KOEF-UPH-04", nama: "Pekerja Terampil", kat: "UPAH", sat: "Oh", val: 0.1250 },
    { kode: "KOEF-MAT-01", nama: "Keramik 60x60 Polish", kat: "MATERIAL", sat: "M2", val: 1.0340 },
    { kode: "KOEF-MAT-02", nama: "Semen Portland (PC)", kat: "MATERIAL", sat: "Kg", val: 9.3270 },
    { kode: "KOEF-MAT-03", nama: "Pasir Pasang", kat: "MATERIAL", sat: "M3", val: 0.0436 },
    { kode: "KOEF-MAT-04", nama: "Semen Grout Pengisi Nut", kat: "MATERIAL", sat: "Kg", val: 1.5000 },
    { kode: "KOEF-MAT-05", nama: "Cat Dinding Eksterior", kat: "MATERIAL", sat: "Kg", val: 0.3600 },
    { kode: "KOEF-MAT-06", nama: "Gypsum Board 9mm", kat: "MATERIAL", sat: "Lbr", val: 0.3640 },
    { kode: "KOEF-ALT-01", nama: "Sewa Scaffolding", kat: "ALAT", sat: "Set/Hari", val: 1.0000 },
    { kode: "KOEF-BNG-01", nama: "Bongkaran Lantai Eksisting", kat: "BONGKARAN", sat: "M2", val: 1.0000 },
  ];

  for (const k of koefisienData) {
    await prisma.masterKoefisien.upsert({
      where: { kodeKomponen: k.kode },
      update: {
        namaKomponen: k.nama,
        kategori: k.kat,
        satuan: k.sat,
        nilaiBaku: k.val,
        divisiId: divisiBuilding.id,
        isActive: true,
      },
      create: {
        kodeKomponen: k.kode,
        namaKomponen: k.nama,
        kategori: k.kat,
        satuan: k.sat,
        nilaiBaku: k.val,
        divisiId: divisiBuilding.id,
        isActive: true,
      },
    });
  }

  console.log("✅ Pustaka MasterKoefisien berhasil diseed.");

  // ==========================================================================
  // 4. SEED MASTER ITEM SPESIFIKASI
  // ==========================================================================
  const itemKeramik = await prisma.masterItem.upsert({
    where: { kodeItem: "SIP-001" },
    update: {
      namaItem: "Pekerjaan Lantai Keramik Homogeneous Tile 60x60 Polish",
      kategori: "Pekerjaan Lantai",
      merk: "Roman / Granito",
      tipe: "Polish Glazed",
      ukuran: "60x60 cm",
      warna: "Cream Polos",
      lokasi: "Area Sales Utama Toko",
      satuan: "M2",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
    create: {
      kodeItem: "SIP-001",
      namaItem: "Pekerjaan Lantai Keramik Homogeneous Tile 60x60 Polish",
      kategori: "Pekerjaan Lantai",
      merk: "Roman / Granito",
      tipe: "Polish Glazed",
      ukuran: "60x60 cm",
      warna: "Cream Polos",
      lokasi: "Area Sales Utama Toko",
      satuan: "M2",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
  });

  const itemCat = await prisma.masterItem.upsert({
    where: { kodeItem: "SIP-002" },
    update: {
      namaItem: "Pengecatan Dinding Interior & Partisi Toko",
      kategori: "Pekerjaan Pengecatan",
      merk: "Dulux / Mowilex",
      tipe: "Interior Acrylic",
      ukuran: "1 Pail (20 Ltr)",
      warna: "Putih Alfamart",
      lokasi: "Dinding Sales & Gudang",
      satuan: "M2",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
    create: {
      kodeItem: "SIP-002",
      namaItem: "Pengecatan Dinding Interior & Partisi Toko",
      kategori: "Pekerjaan Pengecatan",
      merk: "Dulux / Mowilex",
      tipe: "Interior Acrylic",
      ukuran: "1 Pail (20 Ltr)",
      warna: "Putih Alfamart",
      lokasi: "Dinding Sales & Gudang",
      satuan: "M2",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
  });

  console.log("✅ MasterItem spesifikasi berhasil diseed.");

  // ==========================================================================
  // 5. SEED KONTRAKTOR REKANAN & PENUGASAN CABANG
  // ==========================================================================
  const kontraktor1 = await prisma.kontraktor.upsert({
    where: { kodeKontraktor: "KTR-001" },
    update: {
      namaPerusahaan: "PT Cahaya Mandiri Perkasa",
      email: "kontraktor.cahaya@rekanan.com",
      telepon: "021-5551234",
      alamat: "Kawasan Industri Jatake, Tangerang",
      isActive: true,
    },
    create: {
      kodeKontraktor: "KTR-001",
      namaPerusahaan: "PT Cahaya Mandiri Perkasa",
      email: "kontraktor.cahaya@rekanan.com",
      telepon: "021-5551234",
      alamat: "Kawasan Industri Jatake, Tangerang",
      isActive: true,
    },
  });

  const kontraktor2 = await prisma.kontraktor.upsert({
    where: { kodeKontraktor: "KTR-002" },
    update: {
      namaPerusahaan: "PT Sinar Mitra Konstruksi",
      email: "kontraktor.sinar@rekanan.com",
      telepon: "021-5555678",
      alamat: "Ruko Gading Serpong Blok A, Tangerang",
      isActive: true,
    },
    create: {
      kodeKontraktor: "KTR-002",
      namaPerusahaan: "PT Sinar Mitra Konstruksi",
      email: "kontraktor.sinar@rekanan.com",
      telepon: "021-5555678",
      alamat: "Ruko Gading Serpong Blok A, Tangerang",
      isActive: true,
    },
  });

  const kontraktor3 = await prisma.kontraktor.upsert({
    where: { kodeKontraktor: "KTR-003" },
    update: {
      namaPerusahaan: "CV Graha Indah Mandiri",
      email: "kontraktor.graha@rekanan.com",
      telepon: "021-5559012",
      alamat: "Jl. Raya Cikokol No. 45, Tangerang",
      isActive: true,
    },
    create: {
      kodeKontraktor: "KTR-003",
      namaPerusahaan: "CV Graha Indah Mandiri",
      email: "kontraktor.graha@rekanan.com",
      telepon: "021-5559012",
      alamat: "Jl. Raya Cikokol No. 45, Tangerang",
      isActive: true,
    },
  });

  const kontraktorParked = await prisma.kontraktor.upsert({
    where: { kodeKontraktor: "KTR-004" },
    update: {
      namaPerusahaan: "PT Rekanan Nonaktif Bersyarat",
      email: "kontraktor.parked@rekanan.com",
      telepon: "021-5553344",
      alamat: "Jl. Daan Mogot KM 19, Tangerang",
      isActive: true,
    },
    create: {
      kodeKontraktor: "KTR-004",
      namaPerusahaan: "PT Rekanan Nonaktif Bersyarat",
      email: "kontraktor.parked@rekanan.com",
      telepon: "021-5553344",
      alamat: "Jl. Daan Mogot KM 19, Tangerang",
      isActive: true,
    },
  });

  // Relasi KontraktorCabang (Aktif di Cikokol)
  const relasiKtr1 = await prisma.kontraktorCabang.upsert({
    where: {
      kontraktorId_cabangId_divisiId: {
        kontraktorId: kontraktor1.id,
        cabangId: cabangCikokol.id,
        divisiId: divisiBuilding.id,
      },
    },
    update: { statusKeaktifan: "AKTIF" },
    create: {
      kontraktorId: kontraktor1.id,
      cabangId: cabangCikokol.id,
      divisiId: divisiBuilding.id,
      statusKeaktifan: "AKTIF",
    },
  });

  const relasiKtr2 = await prisma.kontraktorCabang.upsert({
    where: {
      kontraktorId_cabangId_divisiId: {
        kontraktorId: kontraktor2.id,
        cabangId: cabangCikokol.id,
        divisiId: divisiBuilding.id,
      },
    },
    update: { statusKeaktifan: "AKTIF" },
    create: {
      kontraktorId: kontraktor2.id,
      cabangId: cabangCikokol.id,
      divisiId: divisiBuilding.id,
      statusKeaktifan: "AKTIF",
    },
  });

  const relasiKtr3 = await prisma.kontraktorCabang.upsert({
    where: {
      kontraktorId_cabangId_divisiId: {
        kontraktorId: kontraktor3.id,
        cabangId: cabangCikokol.id,
        divisiId: divisiBuilding.id,
      },
    },
    update: { statusKeaktifan: "AKTIF" },
    create: {
      kontraktorId: kontraktor3.id,
      cabangId: cabangCikokol.id,
      divisiId: divisiBuilding.id,
      statusKeaktifan: "AKTIF",
    },
  });

  // Rekanan Parked (Nonaktif Sementara untuk menguji fitur Unpark)
  await prisma.kontraktorCabang.upsert({
    where: {
      kontraktorId_cabangId_divisiId: {
        kontraktorId: kontraktorParked.id,
        cabangId: cabangCikokol.id,
        divisiId: divisiBuilding.id,
      },
    },
    update: {
      statusKeaktifan: "NONAKTIF_SEMENTARA",
      alasanNonaktif: "Menolak 2x berturut-turut pada penawaran paket harga Cikokol",
      tanggalNonaktif: new Date(),
    },
    create: {
      kontraktorId: kontraktorParked.id,
      cabangId: cabangCikokol.id,
      divisiId: divisiBuilding.id,
      statusKeaktifan: "NONAKTIF_SEMENTARA",
      alasanNonaktif: "Menolak 2x berturut-turut pada penawaran paket harga Cikokol",
      tanggalNonaktif: new Date(),
    },
  });

  console.log("✅ Kontraktor & Rekanan Cabang (Aktif & Parked) berhasil diseed.");

  // ==========================================================================
  // 6. SEED AKUN PENGGUNA WHITELIST RESMI (ZERO AUTO-PROVISIONING)
  // ==========================================================================
  const userBC = await prisma.user.upsert({
    where: { email: "bc.cikokol@alfamart.co.id" },
    update: {
      fullName: "Hendra Wijaya (Building Coord Cikokol)",
      role: "BUILDING_COORDINATOR",
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      email: "bc.cikokol@alfamart.co.id",
      fullName: "Hendra Wijaya (Building Coord Cikokol)",
      role: "BUILDING_COORDINATOR",
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      isActive: true,
    },
  });

  const userBM = await prisma.user.upsert({
    where: { email: "bm.cikokol@alfamart.co.id" },
    update: {
      fullName: "Bambang Soedirman (BM Manager Cikokol)",
      role: "BM_MANAGER",
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      email: "bm.cikokol@alfamart.co.id",
      fullName: "Bambang Soedirman (BM Manager Cikokol)",
      role: "BM_MANAGER",
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      isActive: true,
    },
  });

  const userSNB = await prisma.user.upsert({
    where: { email: "snb.specialist@alfamart.co.id" },
    update: {
      fullName: "Rian Prakoso (S&B Specialist HO)",
      role: "SB_SPECIALIST",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
    create: {
      email: "snb.specialist@alfamart.co.id",
      fullName: "Rian Prakoso (S&B Specialist HO)",
      role: "SB_SPECIALIST",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
  });

  const userRegMgr = await prisma.user.upsert({
    where: { email: "reg.manager1@alfamart.co.id" },
    update: {
      fullName: "David Hartono (Regional Manager Jabodetabek)",
      role: "REGIONAL_MANAGER",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
    create: {
      email: "reg.manager1@alfamart.co.id",
      fullName: "David Hartono (Regional Manager Jabodetabek)",
      role: "REGIONAL_MANAGER",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
  });

  const userVendor = await prisma.user.upsert({
    where: { email: "vendor.cahaya@rekanan.com" },
    update: {
      fullName: "Budi Santoso (PT Cahaya Mandiri Perkasa)",
      role: "KONTRAKTOR",
      kontraktorId: kontraktor1.id,
      isActive: true,
    },
    create: {
      email: "vendor.cahaya@rekanan.com",
      fullName: "Budi Santoso (PT Cahaya Mandiri Perkasa)",
      role: "KONTRAKTOR",
      kontraktorId: kontraktor1.id,
      isActive: true,
    },
  });

  const userAdmin = await prisma.user.upsert({
    where: { email: "admin.harga@alfamart.co.id" },
    update: {
      fullName: "Super Admin S&B Controlling HO",
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "admin.harga@alfamart.co.id",
      fullName: "Super Admin S&B Controlling HO",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Akun Pengguna Whitelist berhasil diseed.");

  // ==========================================================================
  // 7. SEED SAMPEL TIKET SIKLUS LENGKAP
  // ==========================================================================

  // Tiket 1: Status DIAJUKAN (Baru dibuat oleh BM Cikokol, menunggu validasi SNB)
  await prisma.pengajuanHarga.upsert({
    where: { noTiket: "REQ-2026-001" },
    update: {
      status: "DIAJUKAN",
      masterItemId: itemCat.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(),
      alasanPengajuan: "Penyesuaian spesifikasi cat interior toko tahan jamur standar baru 2026",
      diajukanOlehId: userBM.id,
    },
    create: {
      noTiket: "REQ-2026-001",
      status: "DIAJUKAN",
      masterItemId: itemCat.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(),
      alasanPengajuan: "Penyesuaian spesifikasi cat interior toko tahan jamur standar baru 2026",
      diajukanOlehId: userBM.id,
    },
  });

  // Tiket 2: Status SIAP_SURVEI (Sudah di-mastering koefisiennya oleh SNB, menunggu BC survei)
  await prisma.pengajuanHarga.upsert({
    where: { noTiket: "REQ-2026-002" },
    update: {
      status: "SIAP_SURVEI",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      alasanPengajuan: "Standarisasi keramik lantai sales area cabang Cikokol",
      diajukanOlehId: userBM.id,
      dimasteringSnbId: userSNB.id,
      liveMarginUpah: 8,
      liveMarginMaterial: 8,
      liveMarginBongkaran: 8,
    },
    create: {
      noTiket: "REQ-2026-002",
      status: "SIAP_SURVEI",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      alasanPengajuan: "Standarisasi keramik lantai sales area cabang Cikokol",
      diajukanOlehId: userBM.id,
      dimasteringSnbId: userSNB.id,
      liveMarginUpah: 8,
      liveMarginMaterial: 8,
      liveMarginBongkaran: 8,
    },
  });

  // Tiket 3: Status PENDING_BM_MGR (Survei 3 toko selesai oleh BC, menunggu review BM Cikokol)
  const tiket3 = await prisma.pengajuanHarga.upsert({
    where: { noTiket: "REQ-2026-003" },
    update: {
      status: "PENDING_BM_MGR",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      alasanPengajuan: "Pengadaan keramik granit renovasi toko Cikokol",
      diajukanOlehId: userBM.id,
      dimasteringSnbId: userSNB.id,
      hargaAcuanSurvei: 145000,
      totalHargaAkhir: 245000,
    },
    create: {
      noTiket: "REQ-2026-003",
      status: "PENDING_BM_MGR",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      alasanPengajuan: "Pengadaan keramik granit renovasi toko Cikokol",
      diajukanOlehId: userBM.id,
      dimasteringSnbId: userSNB.id,
      hargaAcuanSurvei: 145000,
      totalHargaAkhir: 245000,
    },
  });

  // Seed 3 Toko Survei untuk Tiket 3
  await prisma.surveiHargaPasarItem.deleteMany({
    where: { pengajuanHargaId: tiket3.id },
  });

  const toko1 = await prisma.surveiHargaPasarItem.create({
    data: {
      pengajuanHargaId: tiket3.id,
      noToko: 1,
      namaToko: "TB Bintang Bangunan Cikokol",
      alamatToko: "Jl. MH Thamrin No. 12, Kebon Nanas, Tangerang",
      kotaToko: "Tangerang",
      kontakToko: "021-55781234",
      tanggalSurvei: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      hargaBarang: 148000,
      catatan: "Stok tersedia 200 dus, pengiriman free ongkir area Tangerang",
    },
  });

  await prisma.lampiranSurvei.create({
    data: {
      surveiItemId: toko1.id,
      tipeLampiran: "NOTA_PEMBELIAN",
      namaFile: "nota_tb_bintang.jpg",
      fileUrl: "/mock-files/nota_tb_bintang.jpg",
      fileSizeBytes: 245000,
    },
  });

  const toko2 = await prisma.surveiHargaPasarItem.create({
    data: {
      pengajuanHargaId: tiket3.id,
      noToko: 2,
      namaToko: "Mitra 10 Gading Serpong",
      alamatToko: "Jl. Boulevard Gading Serpong Kav. 22",
      kotaToko: "Tangerang",
      kontakToko: "021-5461111",
      tanggalSurvei: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      hargaBarang: 142000,
      catatan: "Promo diskon pembelian borongan di atas 100 dus",
    },
  });

  const toko3 = await prisma.surveiHargaPasarItem.create({
    data: {
      pengajuanHargaId: tiket3.id,
      noToko: 3,
      namaToko: "Depo Bangunan Serpong",
      alamatToko: "Jl. Raya Serpong KM 8, Tangerang Selatan",
      kotaToko: "Tangerang Selatan",
      kontakToko: "021-5378899",
      tanggalSurvei: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      hargaBarang: 145000,
      catatan: "Harga netto belum termasuk bongkar muat",
    },
  });

  // Tiket 4: Status PENDING_KONTRAKTOR (Tahap Kuorum 50%+1)
  const tiket4 = await prisma.pengajuanHarga.upsert({
    where: { noTiket: "REQ-2026-004" },
    update: {
      status: "PENDING_KONTRAKTOR",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      diajukanOlehId: userBM.id,
      diapprovalBmId: userBM.id,
      dimasteringSnbId: userSNB.id,
      diapprovalRegionalId: userRegMgr.id,
      hargaAcuanSurvei: 145000,
      totalHargaAkhir: 248000,
      deadlineVoting: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Sisa 2 hari SLA
      kuorumTerpenuhi: false,
    },
    create: {
      noTiket: "REQ-2026-004",
      status: "PENDING_KONTRAKTOR",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      diajukanOlehId: userBM.id,
      diapprovalBmId: userBM.id,
      dimasteringSnbId: userSNB.id,
      diapprovalRegionalId: userRegMgr.id,
      hargaAcuanSurvei: 145000,
      totalHargaAkhir: 248000,
      deadlineVoting: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      kuorumTerpenuhi: false,
    },
  });

  // Seed Voting Kuorum Kontraktor untuk Tiket 4
  await prisma.votingPengajuanHarga.deleteMany({
    where: { pengajuanHargaId: tiket4.id },
  });

  await prisma.votingPengajuanHarga.create({
    data: {
      pengajuanHargaId: tiket4.id,
      kontraktorCabangId: relasiKtr1.id,
      statusVote: "SETUJU",
      tanggalVote: new Date(),
    },
  });

  await prisma.votingPengajuanHarga.create({
    data: {
      pengajuanHargaId: tiket4.id,
      kontraktorCabangId: relasiKtr2.id,
      statusVote: "TOLAK",
      tanggalVote: new Date(),
      hargaBanding: 265000,
      catatanBanding: "Kenaikan upah tukang lokal dan biaya angkut material wilayah Tangerang Barat",
    },
  });

  await prisma.votingPengajuanHarga.create({
    data: {
      pengajuanHargaId: tiket4.id,
      kontraktorCabangId: relasiKtr3.id,
      statusVote: "MENUNGGU",
    },
  });

  // Tiket 5: Status RELEASED (Harga Resmi Aktif Induk Cabang Cikokol)
  await prisma.pengajuanHarga.upsert({
    where: { noTiket: "REQ-2026-005" },
    update: {
      status: "RELEASED",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      diajukanOlehId: userBM.id,
      diapprovalBmId: userBM.id,
      dimasteringSnbId: userSNB.id,
      diapprovalRegionalId: userRegMgr.id,
      hargaAcuanSurvei: 140000,
      totalHargaAkhir: 242000,
      kuorumTerpenuhi: true,
    },
    create: {
      noTiket: "REQ-2026-005",
      status: "RELEASED",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      diajukanOlehId: userBM.id,
      diapprovalBmId: userBM.id,
      dimasteringSnbId: userSNB.id,
      diapprovalRegionalId: userRegMgr.id,
      hargaAcuanSurvei: 140000,
      totalHargaAkhir: 242000,
      kuorumTerpenuhi: true,
    },
  });

  // Tiket 6: Status RELEASED Khusus Wilayah Serang (Harga Override Wilayah)
  await prisma.pengajuanHarga.upsert({
    where: { noTiket: "REQ-2026-006" },
    update: {
      status: "RELEASED",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      wilayahCabangId: wilayahSerang.id,
      cakupanHarga: "KHUSUS_WILAYAH",
      tanggalPengajuan: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      alasanPengajuan: "Disparitas harga material dan transportasi wilayah Serang",
      diajukanOlehId: userBM.id,
      diapprovalBmId: userBM.id,
      dimasteringSnbId: userSNB.id,
      diapprovalRegionalId: userRegMgr.id,
      hargaAcuanSurvei: 152000,
      totalHargaAkhir: 258000,
      kuorumTerpenuhi: true,
    },
    create: {
      noTiket: "REQ-2026-006",
      status: "RELEASED",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      wilayahCabangId: wilayahSerang.id,
      cakupanHarga: "KHUSUS_WILAYAH",
      tanggalPengajuan: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      alasanPengajuan: "Disparitas harga material dan transportasi wilayah Serang",
      diajukanOlehId: userBM.id,
      diapprovalBmId: userBM.id,
      dimasteringSnbId: userSNB.id,
      diapprovalRegionalId: userRegMgr.id,
      hargaAcuanSurvei: 152000,
      totalHargaAkhir: 258000,
      kuorumTerpenuhi: true,
    },
  });

  console.log("✅ 6 Sampel Tiket Siklus Lengkap berhasil diseed.");
  console.log("🎉 Seeding database SPARTA-HARGA selesai 100%!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("❌ Seeding gagal:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
