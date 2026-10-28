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
    {
      id: "koef-uph-01",
      nama: "Mandor Proyek",
      kat: "UPAH",
      sat: "Oh",
      val: 0.0188,
      harga: 150000,
      wajibSurvei: false,
    },
    {
      id: "koef-uph-02",
      nama: "Kepala Tukang",
      kat: "UPAH",
      sat: "Oh",
      val: 0.0375,
      harga: 135000,
      wajibSurvei: false,
    },
    {
      id: "koef-uph-03",
      nama: "Tukang Keramik",
      kat: "UPAH",
      sat: "Oh",
      val: 0.1875,
      harga: 120000,
      wajibSurvei: false,
    },
    {
      id: "koef-uph-04",
      nama: "Pekerja Terampil",
      kat: "UPAH",
      sat: "Oh",
      val: 0.125,
      harga: 100000,
      wajibSurvei: false,
    },
    {
      id: "koef-mat-01",
      nama: "Keramik 60x60 Polish",
      kat: "MATERIAL",
      sat: "M2",
      val: 1.034,
      harga: 145000,
      wajibSurvei: true,
    },
    {
      id: "koef-mat-02",
      nama: "Semen Portland (PC)",
      kat: "MATERIAL",
      sat: "Kg",
      val: 9.327,
      harga: 1850,
      wajibSurvei: true,
    },
    {
      id: "koef-mat-03",
      nama: "Pasir Pasang",
      kat: "MATERIAL",
      sat: "M3",
      val: 0.0436,
      harga: 320000,
      wajibSurvei: true,
    },
    {
      id: "koef-mat-04",
      nama: "Semen Grout Pengisi Nut",
      kat: "MATERIAL",
      sat: "Kg",
      val: 1.5,
      harga: 18000,
      wajibSurvei: true,
    },
    {
      id: "koef-mat-05",
      nama: "Cat Dinding Eksterior",
      kat: "MATERIAL",
      sat: "Kg",
      val: 0.36,
      harga: 65000,
      wajibSurvei: true,
    },
    {
      id: "koef-mat-06",
      nama: "Gypsum Board 9mm",
      kat: "MATERIAL",
      sat: "Lbr",
      val: 0.364,
      harga: 78000,
      wajibSurvei: true,
    },
    {
      id: "koef-alt-01",
      nama: "Sewa Scaffolding",
      kat: "ALAT",
      sat: "Set/Hari",
      val: 1.0,
      harga: 35000,
      wajibSurvei: false,
    },
    {
      id: "koef-bng-01",
      nama: "Bongkaran Lantai Eksisting",
      kat: "BONGKARAN",
      sat: "M2",
      val: 1.0,
      harga: 25000,
      wajibSurvei: false,
    },
  ];

  const koefisienMap: Record<string, { id: string; namaKomponen: string }> = {};

  for (const k of koefisienData) {
    const record = await prisma.masterKoefisien.upsert({
      where: { id: k.id },
      update: {
        divisiId: divisiBuilding.id,
        kategoriKomponen: k.kat,
        namaKomponen: k.nama,
        satuan: k.sat,
        nilaiKoefisienDefault: k.val,
        hargaAcuanDefault: k.harga,
        wajibSurveiToko: k.wajibSurvei,
        isActive: true,
      },
      create: {
        id: k.id,
        divisiId: divisiBuilding.id,
        kategoriKomponen: k.kat,
        namaKomponen: k.nama,
        satuan: k.sat,
        nilaiKoefisienDefault: k.val,
        hargaAcuanDefault: k.harga,
        wajibSurveiToko: k.wajibSurvei,
        isActive: true,
      },
    });
    koefisienMap[k.id] = record;
  }

  console.log("✅ Pustaka MasterKoefisien berhasil diseed.");

  // ==========================================================================
  // 4. SEED MASTER TOKO CABANG CIKOKOL
  // ==========================================================================
  const toko1 = await prisma.masterToko.upsert({
    where: { id: "toko-ckk-01" },
    update: {
      namaToko: "TB Bintang Bangunan Cikokol",
      alamat: "Jl. MH Thamrin No. 12, Kebon Nanas",
      kota: "Tangerang",
      kontakPic: "Koh Alex",
      telepon: "021-55781234",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      id: "toko-ckk-01",
      namaToko: "TB Bintang Bangunan Cikokol",
      alamat: "Jl. MH Thamrin No. 12, Kebon Nanas",
      kota: "Tangerang",
      kontakPic: "Koh Alex",
      telepon: "021-55781234",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
  });

  const toko2 = await prisma.masterToko.upsert({
    where: { id: "toko-ckk-02" },
    update: {
      namaToko: "Mitra 10 Gading Serpong",
      alamat: "Jl. Boulevard Gading Serpong Kav. 22",
      kota: "Tangerang",
      kontakPic: "CS Mitra 10",
      telepon: "021-5461111",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      id: "toko-ckk-02",
      namaToko: "Mitra 10 Gading Serpong",
      alamat: "Jl. Boulevard Gading Serpong Kav. 22",
      kota: "Tangerang",
      kontakPic: "CS Mitra 10",
      telepon: "021-5461111",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
  });

  const toko3 = await prisma.masterToko.upsert({
    where: { id: "toko-ckk-03" },
    update: {
      namaToko: "Depo Bangunan Serpong",
      alamat: "Jl. Raya Serpong KM 8",
      kota: "Tangerang Selatan",
      kontakPic: "Bpk. Wibowo",
      telepon: "021-5378899",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      id: "toko-ckk-03",
      namaToko: "Depo Bangunan Serpong",
      alamat: "Jl. Raya Serpong KM 8",
      kota: "Tangerang Selatan",
      kontakPic: "Bpk. Wibowo",
      telepon: "021-5378899",
      cabangId: cabangCikokol.id,
      isActive: true,
    },
  });

  console.log("✅ MasterToko berhasil diseed.");

  // ==========================================================================
  // 5. SEED MASTER ITEM SPESIFIKASI
  // ==========================================================================
  const itemKeramik = await prisma.masterItem.upsert({
    where: { kodeMaster: "SIP-001-01" },
    update: {
      kodeItem: "SIP-001",
      kodeVarian: "01",
      namaItem: "Pekerjaan Lantai Keramik Homogeneous Tile 60x60 Polish",
      kategori: "Pekerjaan Lantai",
      merk: "Roman / Granito",
      tipe: "Polish Glazed",
      ukuran: "60x60 cm",
      warna: "Cream Polos",
      permukaan: "Glossy Polished",
      tebal: "9.5 mm",
      toleransi: "+/- 0.5 mm",
      lokasi: "Area Sales Utama Toko",
      satuan: "M2",
      deskripsiOtomatis:
        "Pekerjaan Lantai Keramik Homogeneous Tile Roman/Granito 60x60 Polish Glazed Cream Polos Glossy Polished Tebal 9.5 mm",
      divisiId: divisiBuilding.id,
    },
    create: {
      kodeMaster: "SIP-001-01",
      kodeItem: "SIP-001",
      kodeVarian: "01",
      namaItem: "Pekerjaan Lantai Keramik Homogeneous Tile 60x60 Polish",
      kategori: "Pekerjaan Lantai",
      merk: "Roman / Granito",
      tipe: "Polish Glazed",
      ukuran: "60x60 cm",
      warna: "Cream Polos",
      permukaan: "Glossy Polished",
      tebal: "9.5 mm",
      toleransi: "+/- 0.5 mm",
      lokasi: "Area Sales Utama Toko",
      satuan: "M2",
      deskripsiOtomatis:
        "Pekerjaan Lantai Keramik Homogeneous Tile Roman/Granito 60x60 Polish Glazed Cream Polos Glossy Polished Tebal 9.5 mm",
      divisiId: divisiBuilding.id,
    },
  });

  const itemCat = await prisma.masterItem.upsert({
    where: { kodeMaster: "SIP-002-01" },
    update: {
      kodeItem: "SIP-002",
      kodeVarian: "01",
      namaItem: "Pengecatan Dinding Interior & Partisi Toko",
      kategori: "Pekerjaan Pengecatan",
      merk: "Dulux / Mowilex",
      tipe: "Interior Acrylic",
      ukuran: "1 Pail (20 Ltr)",
      warna: "Putih Alfamart",
      permukaan: "Matt Finish",
      tebal: "2 Lapisan",
      toleransi: "Daya sebar 10-12 m2/liter",
      lokasi: "Dinding Sales & Gudang",
      satuan: "M2",
      deskripsiOtomatis:
        "Pengecatan Dinding Interior & Partisi Toko Dulux/Mowilex Putih Alfamart Interior Acrylic Matt Finish 2 Lapisan",
      divisiId: divisiBuilding.id,
    },
    create: {
      kodeMaster: "SIP-002-01",
      kodeItem: "SIP-002",
      kodeVarian: "01",
      namaItem: "Pengecatan Dinding Interior & Partisi Toko",
      kategori: "Pekerjaan Pengecatan",
      merk: "Dulux / Mowilex",
      tipe: "Interior Acrylic",
      ukuran: "1 Pail (20 Ltr)",
      warna: "Putih Alfamart",
      permukaan: "Matt Finish",
      tebal: "2 Lapisan",
      toleransi: "Daya sebar 10-12 m2/liter",
      lokasi: "Dinding Sales & Gudang",
      satuan: "M2",
      deskripsiOtomatis:
        "Pengecatan Dinding Interior & Partisi Toko Dulux/Mowilex Putih Alfamart Interior Acrylic Matt Finish 2 Lapisan",
      divisiId: divisiBuilding.id,
    },
  });

  console.log("✅ MasterItem spesifikasi berhasil diseed.");

  // ==========================================================================
  // 6. SEED KONTRAKTOR REKANAN & PENUGASAN CABANG
  // ==========================================================================
  const kontraktor1 = await prisma.kontraktor.upsert({
    where: { kodeVendor: "KTR-001" },
    update: {
      namaPerusahaan: "PT Cahaya Mandiri Perkasa",
      picName: "Budi Santoso",
      email: "kontraktor.cahaya@rekanan.com",
      telepon: "021-5551234",
      alamatKantor: "Kawasan Industri Jatake, Tangerang",
    },
    create: {
      kodeVendor: "KTR-001",
      namaPerusahaan: "PT Cahaya Mandiri Perkasa",
      picName: "Budi Santoso",
      email: "kontraktor.cahaya@rekanan.com",
      telepon: "021-5551234",
      alamatKantor: "Kawasan Industri Jatake, Tangerang",
    },
  });

  const kontraktor2 = await prisma.kontraktor.upsert({
    where: { kodeVendor: "KTR-002" },
    update: {
      namaPerusahaan: "PT Sinar Mitra Konstruksi",
      picName: "Herry Gunawan",
      email: "kontraktor.sinar@rekanan.com",
      telepon: "021-5555678",
      alamatKantor: "Ruko Gading Serpong Blok A, Tangerang",
    },
    create: {
      kodeVendor: "KTR-002",
      namaPerusahaan: "PT Sinar Mitra Konstruksi",
      picName: "Herry Gunawan",
      email: "kontraktor.sinar@rekanan.com",
      telepon: "021-5555678",
      alamatKantor: "Ruko Gading Serpong Blok A, Tangerang",
    },
  });

  const kontraktor3 = await prisma.kontraktor.upsert({
    where: { kodeVendor: "KTR-003" },
    update: {
      namaPerusahaan: "CV Graha Indah Mandiri",
      picName: "Agus Pratama",
      email: "kontraktor.graha@rekanan.com",
      telepon: "021-5559012",
      alamatKantor: "Jl. Raya Cikokol No. 45, Tangerang",
    },
    create: {
      kodeVendor: "KTR-003",
      namaPerusahaan: "CV Graha Indah Mandiri",
      picName: "Agus Pratama",
      email: "kontraktor.graha@rekanan.com",
      telepon: "021-5559012",
      alamatKantor: "Jl. Raya Cikokol No. 45, Tangerang",
    },
  });

  const kontraktorParked = await prisma.kontraktor.upsert({
    where: { kodeVendor: "KTR-004" },
    update: {
      namaPerusahaan: "PT Rekanan Nonaktif Bersyarat",
      picName: "Surya Dharma",
      email: "kontraktor.parked@rekanan.com",
      telepon: "021-5553344",
      alamatKantor: "Jl. Daan Mogot KM 19, Tangerang",
    },
    create: {
      kodeVendor: "KTR-004",
      namaPerusahaan: "PT Rekanan Nonaktif Bersyarat",
      picName: "Surya Dharma",
      email: "kontraktor.parked@rekanan.com",
      telepon: "021-5553344",
      alamatKantor: "Jl. Daan Mogot KM 19, Tangerang",
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
      alasanParked: "Menolak 2x berturut-turut pada penawaran paket harga Cikokol",
      parkedAt: new Date(),
    },
    create: {
      kontraktorId: kontraktorParked.id,
      cabangId: cabangCikokol.id,
      divisiId: divisiBuilding.id,
      statusKeaktifan: "NONAKTIF_SEMENTARA",
      alasanParked: "Menolak 2x berturut-turut pada penawaran paket harga Cikokol",
      parkedAt: new Date(),
    },
  });

  console.log("✅ Kontraktor & Rekanan Cabang (Aktif & Parked) berhasil diseed.");

  // ==========================================================================
  // 7. SEED AKUN PENGGUNA WHITELIST RESMI (ZERO AUTO-PROVISIONING)
  // ==========================================================================
  const userBC = await prisma.user.upsert({
    where: { email: "bc.cikokol@alfamart.co.id" },
    update: {
      fullName: "Hendra Wijaya (Building Coord Cikokol)",
      role: "BUILDING_COORDINATOR",
      branchName: "Cabang Cikokol",
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      email: "bc.cikokol@alfamart.co.id",
      fullName: "Hendra Wijaya (Building Coord Cikokol)",
      role: "BUILDING_COORDINATOR",
      branchName: "Cabang Cikokol",
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
      branchName: "Cabang Cikokol",
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      isActive: true,
    },
    create: {
      email: "bm.cikokol@alfamart.co.id",
      fullName: "Bambang Soedirman (BM Manager Cikokol)",
      role: "BM_MANAGER",
      branchName: "Cabang Cikokol",
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
      branchName: "Head Office",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
    create: {
      email: "snb.specialist@alfamart.co.id",
      fullName: "Rian Prakoso (S&B Specialist HO)",
      role: "SB_SPECIALIST",
      branchName: "Head Office",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
  });

  const userRegMgr = await prisma.user.upsert({
    where: { email: "reg.manager1@alfamart.co.id" },
    update: {
      fullName: "David Hartono (Regional Manager Jabodetabek)",
      role: "REGIONAL_MANAGER",
      branchName: "Regional Jabodetabek",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
    create: {
      email: "reg.manager1@alfamart.co.id",
      fullName: "David Hartono (Regional Manager Jabodetabek)",
      role: "REGIONAL_MANAGER",
      branchName: "Regional Jabodetabek",
      divisiId: divisiBuilding.id,
      isActive: true,
    },
  });

  // User Cabang Coverage untuk Regional Manager
  await prisma.userCabangCoverage.upsert({
    where: {
      userId_cabangId: {
        userId: userRegMgr.id,
        cabangId: cabangCikokol.id,
      },
    },
    update: {},
    create: {
      userId: userRegMgr.id,
      cabangId: cabangCikokol.id,
    },
  });

  await prisma.userCabangCoverage.upsert({
    where: {
      userId_cabangId: {
        userId: userRegMgr.id,
        cabangId: cabangBalaraja.id,
      },
    },
    update: {},
    create: {
      userId: userRegMgr.id,
      cabangId: cabangBalaraja.id,
    },
  });

  const userVendor = await prisma.user.upsert({
    where: { email: "vendor.cahaya@rekanan.com" },
    update: {
      fullName: "Budi Santoso (PT Cahaya Mandiri Perkasa)",
      role: "KONTRAKTOR",
      branchName: "PT Cahaya Mandiri Perkasa",
      kontraktorId: kontraktor1.id,
      isActive: true,
    },
    create: {
      email: "vendor.cahaya@rekanan.com",
      fullName: "Budi Santoso (PT Cahaya Mandiri Perkasa)",
      role: "KONTRAKTOR",
      branchName: "PT Cahaya Mandiri Perkasa",
      kontraktorId: kontraktor1.id,
      isActive: true,
    },
  });

  const userAdmin = await prisma.user.upsert({
    where: { email: "admin.harga@alfamart.co.id" },
    update: {
      fullName: "Super Admin S&B Controlling HO",
      role: "ADMIN",
      branchName: "Head Office",
      isActive: true,
    },
    create: {
      email: "admin.harga@alfamart.co.id",
      fullName: "Super Admin S&B Controlling HO",
      role: "ADMIN",
      branchName: "Head Office",
      isActive: true,
    },
  });

  console.log("✅ Akun Pengguna Whitelist berhasil diseed.");

  // ==========================================================================
  // 8. SEED SAMPEL TIKET SIKLUS LENGKAP
  // ==========================================================================

  // Tiket 1: Status DIAJUKAN (Baru dibuat oleh BM Cikokol, menunggu validasi SNB)
  const tiket1 = await prisma.pengajuanHarga.upsert({
    where: { nomorTiket: "REQ-2026-001" },
    update: {
      status: "DIAJUKAN",
      masterItemId: itemCat.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(),
      catatanReview:
        "Penyesuaian spesifikasi cat interior toko tahan jamur standar baru 2026",
      pembuatUserId: userBM.id,
      marginAwalPersen: 8.0,
    },
    create: {
      nomorTiket: "REQ-2026-001",
      status: "DIAJUKAN",
      masterItemId: itemCat.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(),
      catatanReview:
        "Penyesuaian spesifikasi cat interior toko tahan jamur standar baru 2026",
      pembuatUserId: userBM.id,
      marginAwalPersen: 8.0,
    },
  });

  await prisma.approvalAuditLog.create({
    data: {
      pengajuanHargaId: tiket1.id,
      userId: userBM.id,
      roleActor: "BM_MANAGER",
      action: "SUBMIT_PENGAJUAN",
      catatan: "Pengajuan harga cat interior diajukan oleh BM Cikokol",
    },
  });

  // Tiket 2: Status SIAP_SURVEI (Sudah di-mastering koefisiennya oleh SNB, menunggu BC survei)
  const tiket2 = await prisma.pengajuanHarga.upsert({
    where: { nomorTiket: "REQ-2026-002" },
    update: {
      status: "SIAP_SURVEI",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      catatanReview:
        "Standarisasi keramik lantai sales area cabang Cikokol - Koefisien AHSP sudah ditetapkan S&B",
      pembuatUserId: userBM.id,
      marginAwalPersen: 8.0,
    },
    create: {
      nomorTiket: "REQ-2026-002",
      status: "SIAP_SURVEI",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      catatanReview:
        "Standarisasi keramik lantai sales area cabang Cikokol - Koefisien AHSP sudah ditetapkan S&B",
      pembuatUserId: userBM.id,
      marginAwalPersen: 8.0,
    },
  });

  // Hapus rincian AHSP lama tiket 2 jika ada
  await prisma.rincianAhspPengajuan.deleteMany({
    where: { pengajuanHargaId: tiket2.id },
  });

  // Rincian AHSP Tiket 2
  await prisma.rincianAhspPengajuan.create({
    data: {
      pengajuanHargaId: tiket2.id,
      masterKoefisienId: "koef-uph-03",
      namaKomponen: "Tukang Keramik",
      kategoriKomponen: "UPAH",
      satuan: "Oh",
      nilaiKoefisien: 0.1875,
      hargaAcuanSatuan: 120000,
      marginPersen: 8.0,
      subtotal: 24300,
    },
  });

  await prisma.rincianAhspPengajuan.create({
    data: {
      pengajuanHargaId: tiket2.id,
      masterKoefisienId: "koef-mat-01",
      namaKomponen: "Keramik 60x60 Polish",
      kategoriKomponen: "MATERIAL",
      satuan: "M2",
      nilaiKoefisien: 1.034,
      hargaAcuanSatuan: 145000,
      marginPersen: 8.0,
      subtotal: 161921,
    },
  });

  await prisma.rincianAhspPengajuan.create({
    data: {
      pengajuanHargaId: tiket2.id,
      masterKoefisienId: "koef-mat-02",
      namaKomponen: "Semen Portland (PC)",
      kategoriKomponen: "MATERIAL",
      satuan: "Kg",
      nilaiKoefisien: 9.327,
      hargaAcuanSatuan: 1850,
      marginPersen: 8.0,
      subtotal: 18635,
    },
  });

  // Tiket 3: Status PENDING_BM_MGR (Survei 3 toko selesai oleh BC, menunggu review BM Cikokol)
  const tiket3 = await prisma.pengajuanHarga.upsert({
    where: { nomorTiket: "REQ-2026-003" },
    update: {
      status: "PENDING_BM_MGR",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      catatanReview:
        "Survei 3 toko fisik selesai diinput oleh Building Coordinator, menunggu verifikasi BM",
      pembuatUserId: userBM.id,
      rataRataSurveiMaterial: 145000,
      hargaDitetapkanSNB: 245000,
      marginAwalPersen: 8.0,
    },
    create: {
      nomorTiket: "REQ-2026-003",
      status: "PENDING_BM_MGR",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      catatanReview:
        "Survei 3 toko fisik selesai diinput oleh Building Coordinator, menunggu verifikasi BM",
      pembuatUserId: userBM.id,
      rataRataSurveiMaterial: 145000,
      hargaDitetapkanSNB: 245000,
      marginAwalPersen: 8.0,
    },
  });

  await prisma.rincianAhspPengajuan.deleteMany({
    where: { pengajuanHargaId: tiket3.id },
  });

  const rincianMatTiket3 = await prisma.rincianAhspPengajuan.create({
    data: {
      pengajuanHargaId: tiket3.id,
      masterKoefisienId: "koef-mat-01",
      namaKomponen: "Keramik 60x60 Polish",
      kategoriKomponen: "MATERIAL",
      satuan: "M2",
      nilaiKoefisien: 1.034,
      hargaAcuanSatuan: 145000,
      marginPersen: 8.0,
      subtotal: 161921,
    },
  });

  // Seed 3 Toko Survei untuk Rincian Material Tiket 3
  const surveiToko1 = await prisma.surveiTokoItem.create({
    data: {
      rincianAhspId: rincianMatTiket3.id,
      masterTokoId: toko1.id,
      urutanToko: 1,
      namaToko: "TB Bintang Bangunan Cikokol",
      alamatToko: "Jl. MH Thamrin No. 12, Kebon Nanas, Tangerang",
      volumeAcuan: 1.0,
      hargaSatuanSurvei: 148000,
      tanggalSurvei: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      catatanSurvei:
        "Stok tersedia 200 dus, pengiriman free ongkir area Tangerang",
    },
  });

  await prisma.lampiranSurvei.create({
    data: {
      surveiTokoId: surveiToko1.id,
      jenisLampiran: "NOTA_PEMBELIAN",
      namaFile: "nota_tb_bintang.jpg",
      fileUrl: "/mock-files/nota_tb_bintang.jpg",
      ukuranFile: "245 KB",
    },
  });

  const surveiToko2 = await prisma.surveiTokoItem.create({
    data: {
      rincianAhspId: rincianMatTiket3.id,
      masterTokoId: toko2.id,
      urutanToko: 2,
      namaToko: "Mitra 10 Gading Serpong",
      alamatToko: "Jl. Boulevard Gading Serpong Kav. 22",
      volumeAcuan: 1.0,
      hargaSatuanSurvei: 142000,
      tanggalSurvei: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      catatanSurvei: "Promo diskon pembelian borongan di atas 100 dus",
    },
  });

  await prisma.lampiranSurvei.create({
    data: {
      surveiTokoId: surveiToko2.id,
      jenisLampiran: "FOTO_MATERIAL",
      namaFile: "foto_material_mitra10.jpg",
      fileUrl: "/mock-files/foto_material_mitra10.jpg",
      ukuranFile: "512 KB",
    },
  });

  const surveiToko3 = await prisma.surveiTokoItem.create({
    data: {
      rincianAhspId: rincianMatTiket3.id,
      masterTokoId: toko3.id,
      urutanToko: 3,
      namaToko: "Depo Bangunan Serpong",
      alamatToko: "Jl. Raya Serpong KM 8, Tangerang Selatan",
      volumeAcuan: 1.0,
      hargaSatuanSurvei: 145000,
      tanggalSurvei: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      catatanSurvei: "Harga netto belum termasuk ongkos bongkar muat",
    },
  });

  await prisma.lampiranSurvei.create({
    data: {
      surveiTokoId: surveiToko3.id,
      jenisLampiran: "FOTO_TOKO",
      namaFile: "depo_bangunan_plang.jpg",
      fileUrl: "/mock-files/depo_bangunan_plang.jpg",
      ukuranFile: "380 KB",
    },
  });

  // Tiket 4: Status PENDING_KONTRAKTOR (Tahap Kuorum 50%+1)
  const tiket4 = await prisma.pengajuanHarga.upsert({
    where: { nomorTiket: "REQ-2026-004" },
    update: {
      status: "PENDING_KONTRAKTOR",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      pembuatUserId: userBM.id,
      rataRataSurveiMaterial: 145000,
      hargaDitetapkanSNB: 248000,
      marginSNBPersen: 8.0,
      deadlineVoting: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Sisa 2 hari SLA
      catatanReview:
        "Persetujuan berjenjang BM, S&B, dan Regional Mgr selesai. Tahap voting kuorum rekanan.",
    },
    create: {
      nomorTiket: "REQ-2026-004",
      status: "PENDING_KONTRAKTOR",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      pembuatUserId: userBM.id,
      rataRataSurveiMaterial: 145000,
      hargaDitetapkanSNB: 248000,
      marginSNBPersen: 8.0,
      deadlineVoting: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      catatanReview:
        "Persetujuan berjenjang BM, S&B, dan Regional Mgr selesai. Tahap voting kuorum rekanan.",
    },
  });

  // Seed Voting Kuorum Kontraktor untuk Tiket 4
  await prisma.votingKontraktor.deleteMany({
    where: { pengajuanHargaId: tiket4.id },
  });

  await prisma.votingKontraktor.create({
    data: {
      pengajuanHargaId: tiket4.id,
      kontraktorCabangId: relasiKtr1.id,
      putaranVote: 1,
      statusVote: "SETUJU",
      tanggalRespon: new Date(),
    },
  });

  const vote2 = await prisma.votingKontraktor.create({
    data: {
      pengajuanHargaId: tiket4.id,
      kontraktorCabangId: relasiKtr2.id,
      putaranVote: 1,
      statusVote: "TOLAK",
      usulanHarga: 265000,
      catatanPenolakan:
        "Kenaikan upah tukang lokal dan biaya angkut material wilayah Tangerang Barat",
      hasRejectedOnce: true,
      tanggalRespon: new Date(),
    },
  });

  await prisma.lampiranBanding.create({
    data: {
      votingKontraktorId: vote2.id,
      namaFile: "justifikasi_rekanan_sinar.pdf",
      fileUrl: "/mock-files/justifikasi_rekanan_sinar.pdf",
      ukuranFile: "680 KB",
    },
  });

  await prisma.votingKontraktor.create({
    data: {
      pengajuanHargaId: tiket4.id,
      kontraktorCabangId: relasiKtr3.id,
      putaranVote: 1,
      statusVote: "MENUNGGU",
    },
  });

  // Tiket 5: Status RELEASED (Harga Resmi Aktif Induk Cabang Cikokol)
  const tiket5 = await prisma.pengajuanHarga.upsert({
    where: { nomorTiket: "REQ-2026-005" },
    update: {
      status: "RELEASED",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      pembuatUserId: userBM.id,
      rataRataSurveiMaterial: 140000,
      hargaDitetapkanSNB: 242000,
      marginSNBPersen: 8.0,
      catatanReview:
        "Kuorum 50%+1 tercapai. Harga resmi berlaku aktif untuk cabang Cikokol.",
    },
    create: {
      nomorTiket: "REQ-2026-005",
      status: "RELEASED",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      cakupanHarga: "INDUK_CABANG",
      tanggalPengajuan: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      pembuatUserId: userBM.id,
      rataRataSurveiMaterial: 140000,
      hargaDitetapkanSNB: 242000,
      marginSNBPersen: 8.0,
      catatanReview:
        "Kuorum 50%+1 tercapai. Harga resmi berlaku aktif untuk cabang Cikokol.",
    },
  });

  // Rilis Harga Induk Cabang
  const hargaCabangCikokol = await prisma.masterHargaCabang.upsert({
    where: {
      masterItemId_cabangId: {
        masterItemId: itemKeramik.id,
        cabangId: cabangCikokol.id,
      },
    },
    update: {
      pengajuanTerakhirId: tiket5.id,
      hargaFinalInduk: 242000,
      marginTotalPersen: 8.0,
      statusHarga: "AKTIF",
      berlakuSejak: new Date(),
    },
    create: {
      masterItemId: itemKeramik.id,
      cabangId: cabangCikokol.id,
      pengajuanTerakhirId: tiket5.id,
      hargaFinalInduk: 242000,
      marginTotalPersen: 8.0,
      statusHarga: "AKTIF",
      berlakuSejak: new Date(),
    },
  });

  // Tiket 6: Status RELEASED Khusus Wilayah Serang (Harga Override Wilayah)
  const tiket6 = await prisma.pengajuanHarga.upsert({
    where: { nomorTiket: "REQ-2026-006" },
    update: {
      status: "RELEASED",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      wilayahCabangId: wilayahSerang.id,
      cakupanHarga: "KHUSUS_WILAYAH",
      tanggalPengajuan: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      catatanReview:
        "Disparitas harga material dan transportasi wilayah Serang (+6.6%). Resmi berlaku.",
      pembuatUserId: userBM.id,
      rataRataSurveiMaterial: 152000,
      hargaDitetapkanSNB: 258000,
      marginSNBPersen: 8.0,
    },
    create: {
      nomorTiket: "REQ-2026-006",
      status: "RELEASED",
      masterItemId: itemKeramik.id,
      divisiId: divisiBuilding.id,
      cabangId: cabangCikokol.id,
      wilayahCabangId: wilayahSerang.id,
      cakupanHarga: "KHUSUS_WILAYAH",
      tanggalPengajuan: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      catatanReview:
        "Disparitas harga material dan transportasi wilayah Serang (+6.6%). Resmi berlaku.",
      pembuatUserId: userBM.id,
      rataRataSurveiMaterial: 152000,
      hargaDitetapkanSNB: 258000,
      marginSNBPersen: 8.0,
    },
  });

  // Rilis Harga Khusus Wilayah Serang
  await prisma.masterHargaWilayah.upsert({
    where: {
      masterHargaCabangId_wilayahCabangId: {
        masterHargaCabangId: hargaCabangCikokol.id,
        wilayahCabangId: wilayahSerang.id,
      },
    },
    update: {
      pengajuanTerakhirId: tiket6.id,
      hargaFinalWilayah: 258000,
      selisihDariIndukRp: 16000,
      selisihDariIndukPersen: 6.61,
      statusHarga: "AKTIF",
      berlakuSejak: new Date(),
    },
    create: {
      masterHargaCabangId: hargaCabangCikokol.id,
      wilayahCabangId: wilayahSerang.id,
      pengajuanTerakhirId: tiket6.id,
      hargaFinalWilayah: 258000,
      selisihDariIndukRp: 16000,
      selisihDariIndukPersen: 6.61,
      statusHarga: "AKTIF",
      berlakuSejak: new Date(),
    },
  });

  console.log("✅ 6 Sampel Tiket Siklus Lengkap & Rilis Harga berhasil diseed.");
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
