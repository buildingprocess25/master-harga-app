-- CreateEnum
CREATE TYPE "role_user" AS ENUM ('BUILDING_COORDINATOR', 'BM_MANAGER', 'PP_MANAGER', 'SB_SPECIALIST', 'REGIONAL_MANAGER', 'KONTRAKTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "status_keaktifan_cabang" AS ENUM ('AKTIF', 'NONAKTIF_SEMENTARA', 'BLACKLIST');

-- CreateEnum
CREATE TYPE "status_harga_cabang" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "cakupan_harga" AS ENUM ('INDUK_CABANG', 'KHUSUS_WILAYAH');

-- CreateEnum
CREATE TYPE "status_pengajuan_harga" AS ENUM ('DRAFT', 'DIAJUKAN', 'SIAP_SURVEI', 'PENDING_BM_MGR', 'PENDING_SB_SPECIALIST', 'PENDING_REGIONAL_MGR', 'PENDING_KONTRAKTOR', 'USULAN_KONTRAKTOR', 'DITOLAK_KONTRAKTOR', 'PERLU_REVISI', 'RETURNED_TO_BC', 'DITOLAK', 'RELEASED');

-- CreateEnum
CREATE TYPE "status_vote_kontraktor" AS ENUM ('MENUNGGU', 'SETUJU', 'TOLAK', 'TIMEOUT');

-- CreateTable
CREATE TABLE "divisi" (
    "id" TEXT NOT NULL,
    "kode_divisi" TEXT NOT NULL,
    "nama_divisi" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_divisi" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabang" (
    "id" TEXT NOT NULL,
    "kode_cabang" TEXT NOT NULL,
    "nama_cabang" TEXT NOT NULL,
    "regional" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_cabang" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wilayah_cabang" (
    "id" TEXT NOT NULL,
    "cabang_id" TEXT NOT NULL,
    "kode_wilayah" TEXT NOT NULL,
    "nama_wilayah" TEXT NOT NULL,
    "keterangan_lokasi" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_wilayah_cabang" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "branch_name" TEXT,
    "role" "role_user" NOT NULL DEFAULT 'BUILDING_COORDINATOR',
    "divisi_id" TEXT,
    "cabang_id" TEXT,
    "kontraktor_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_users" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cabang_coverage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cabang_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_user_cabang_coverage" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kontraktor" (
    "id" TEXT NOT NULL,
    "kode_vendor" TEXT NOT NULL,
    "nama_perusahaan" TEXT NOT NULL,
    "pic_name" TEXT NOT NULL,
    "telepon" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "alamat_kantor" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_kontraktor" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kontraktor_cabang" (
    "id" TEXT NOT NULL,
    "kontraktor_id" TEXT NOT NULL,
    "cabang_id" TEXT NOT NULL,
    "divisi_id" TEXT NOT NULL,
    "status_keaktifan" "status_keaktifan_cabang" NOT NULL DEFAULT 'AKTIF',
    "tanggal_terdaftar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parked_at" TIMESTAMP(3),
    "alasan_parked" TEXT,
    "item_pemicu_kode" TEXT,
    "unparked_at" TIMESTAMP(3),
    "unparked_by" TEXT,
    "unpark_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_kontraktor_cabang" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_toko" (
    "id" TEXT NOT NULL,
    "cabang_id" TEXT NOT NULL,
    "wilayah_cabang_id" TEXT,
    "nama_toko" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "kontak_pic" TEXT,
    "telepon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_master_toko" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_item" (
    "id" TEXT NOT NULL,
    "divisi_id" TEXT NOT NULL,
    "kode_item" TEXT NOT NULL,
    "kode_varian" TEXT NOT NULL,
    "kode_master" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "nama_item" TEXT NOT NULL,
    "ukuran" TEXT NOT NULL,
    "merk" TEXT NOT NULL,
    "warna" TEXT,
    "tipe" TEXT,
    "permukaan" TEXT,
    "tebal" TEXT,
    "toleransi" TEXT,
    "lokasi" TEXT NOT NULL,
    "satuan" TEXT NOT NULL,
    "deskripsi_otomatis" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_master_item" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_koefisien" (
    "id" TEXT NOT NULL,
    "divisi_id" TEXT NOT NULL,
    "kategori_komponen" TEXT NOT NULL,
    "nama_komponen" TEXT NOT NULL,
    "satuan" TEXT NOT NULL,
    "nilai_koefisien_default" DECIMAL(10,4) NOT NULL,
    "harga_acuan_default" DECIMAL(15,2),
    "wajib_survei_toko" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_master_koefisien" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_harga_cabang" (
    "id" TEXT NOT NULL,
    "master_item_id" TEXT NOT NULL,
    "cabang_id" TEXT NOT NULL,
    "pengajuan_terakhir_id" TEXT,
    "harga_final_induk" DECIMAL(15,2) NOT NULL,
    "margin_total_persen" DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    "status_harga" "status_harga_cabang" NOT NULL DEFAULT 'AKTIF',
    "berlaku_sejak" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_master_harga_cabang" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_harga_wilayah" (
    "id" TEXT NOT NULL,
    "master_harga_cabang_id" TEXT NOT NULL,
    "wilayah_cabang_id" TEXT NOT NULL,
    "pengajuan_terakhir_id" TEXT,
    "harga_final_wilayah" DECIMAL(15,2) NOT NULL,
    "selisih_dari_induk_rp" DECIMAL(15,2) NOT NULL,
    "selisih_dari_induk_persen" DECIMAL(5,2) NOT NULL,
    "status_harga" "status_harga_cabang" NOT NULL DEFAULT 'AKTIF',
    "berlaku_sejak" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_master_harga_wilayah" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengajuan_harga" (
    "id" TEXT NOT NULL,
    "nomor_tiket" TEXT NOT NULL,
    "divisi_id" TEXT NOT NULL,
    "cabang_id" TEXT NOT NULL,
    "wilayah_cabang_id" TEXT,
    "master_item_id" TEXT,
    "pembuat_user_id" TEXT,
    "cakupan_harga" "cakupan_harga" NOT NULL DEFAULT 'INDUK_CABANG',
    "status" "status_pengajuan_harga" NOT NULL DEFAULT 'DIAJUKAN',
    "is_termasuk_bongkaran" BOOLEAN NOT NULL DEFAULT false,
    "rata_rata_survei_material" DECIMAL(15,2),
    "margin_awal_persen" DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    "is_hasil_negosiasi" BOOLEAN NOT NULL DEFAULT false,
    "margin_snb_persen" DECIMAL(5,2),
    "harga_ditetapkan_snb" DECIMAL(15,2),
    "catatan_review" TEXT,
    "deadline_voting" TIMESTAMP(3),
    "tanggal_pengajuan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_pengajuan_harga" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rincian_ahsp_pengajuan" (
    "id" TEXT NOT NULL,
    "pengajuan_harga_id" TEXT NOT NULL,
    "master_koefisien_id" TEXT NOT NULL,
    "nama_komponen" TEXT NOT NULL,
    "kategori_komponen" TEXT NOT NULL,
    "satuan" TEXT NOT NULL,
    "nilai_koefisien" DECIMAL(10,4) NOT NULL,
    "harga_acuan_satuan" DECIMAL(15,2) NOT NULL,
    "margin_persen" DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    "subtotal" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "pk_rincian_ahsp_pengajuan" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survei_toko_item" (
    "id" TEXT NOT NULL,
    "rincian_ahsp_id" TEXT NOT NULL,
    "master_toko_id" TEXT,
    "urutan_toko" INTEGER NOT NULL,
    "nama_toko" TEXT NOT NULL,
    "alamat_toko" TEXT,
    "volume_acuan" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "harga_satuan_survei" DECIMAL(15,2) NOT NULL,
    "tanggal_survei" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catatan_survei" TEXT,

    CONSTRAINT "pk_survei_toko_item" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lampiran_survei" (
    "id" TEXT NOT NULL,
    "survei_toko_id" TEXT NOT NULL,
    "jenis_lampiran" TEXT NOT NULL,
    "nama_file" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "ukuran_file" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_lampiran_survei" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_kontraktor" (
    "id" TEXT NOT NULL,
    "pengajuan_harga_id" TEXT NOT NULL,
    "kontraktor_cabang_id" TEXT NOT NULL,
    "putaran_vote" INTEGER NOT NULL DEFAULT 1,
    "status_vote" "status_vote_kontraktor" NOT NULL DEFAULT 'MENUNGGU',
    "usulan_harga" DECIMAL(15,2),
    "usulan_margin_persen" DECIMAL(5,2),
    "catatan_penolakan" TEXT,
    "has_rejected_once" BOOLEAN NOT NULL DEFAULT false,
    "tanggal_respon" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_voting_kontraktor" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lampiran_banding" (
    "id" TEXT NOT NULL,
    "voting_kontraktor_id" TEXT NOT NULL,
    "nama_file" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "ukuran_file" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_lampiran_banding" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_audit_log" (
    "id" TEXT NOT NULL,
    "pengajuan_harga_id" TEXT NOT NULL,
    "user_id" TEXT,
    "role_actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_approval_audit_log" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_divisi_kode_divisi" ON "divisi"("kode_divisi");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cabang_kode_cabang" ON "cabang"("kode_cabang");

-- CreateIndex
CREATE UNIQUE INDEX "uq_wilayah_cabang_kode_wilayah" ON "wilayah_cabang"("kode_wilayah");

-- CreateIndex
CREATE INDEX "idx_wilayah_cabang_cabang_id" ON "wilayah_cabang"("cabang_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role_is_active" ON "users"("role", "is_active");

-- CreateIndex
CREATE INDEX "idx_users_cabang_id" ON "users"("cabang_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_cabang_coverage_user_cabang" ON "user_cabang_coverage"("user_id", "cabang_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_kontraktor_kode_vendor" ON "kontraktor"("kode_vendor");

-- CreateIndex
CREATE UNIQUE INDEX "uq_kontraktor_email" ON "kontraktor"("email");

-- CreateIndex
CREATE INDEX "idx_kontraktor_cabang_status" ON "kontraktor_cabang"("cabang_id", "status_keaktifan");

-- CreateIndex
CREATE UNIQUE INDEX "uq_kontraktor_cabang_divisi" ON "kontraktor_cabang"("kontraktor_id", "cabang_id", "divisi_id");

-- CreateIndex
CREATE INDEX "idx_master_toko_cabang_id" ON "master_toko"("cabang_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_master_item_kode_master" ON "master_item"("kode_master");

-- CreateIndex
CREATE INDEX "idx_master_item_divisi_kategori" ON "master_item"("divisi_id", "kategori");

-- CreateIndex
CREATE UNIQUE INDEX "uq_master_item_kode_varian" ON "master_item"("kode_item", "kode_varian");

-- CreateIndex
CREATE INDEX "idx_master_koefisien_divisi_kategori" ON "master_koefisien"("divisi_id", "kategori_komponen");

-- CreateIndex
CREATE INDEX "idx_master_harga_cabang_status" ON "master_harga_cabang"("cabang_id", "status_harga");

-- CreateIndex
CREATE UNIQUE INDEX "uq_master_harga_cabang_item_cabang" ON "master_harga_cabang"("master_item_id", "cabang_id");

-- CreateIndex
CREATE INDEX "idx_master_harga_wilayah_status" ON "master_harga_wilayah"("wilayah_cabang_id", "status_harga");

-- CreateIndex
CREATE UNIQUE INDEX "uq_master_harga_wilayah_induk_wilayah" ON "master_harga_wilayah"("master_harga_cabang_id", "wilayah_cabang_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pengajuan_harga_nomor_tiket" ON "pengajuan_harga"("nomor_tiket");

-- CreateIndex
CREATE INDEX "idx_pengajuan_harga_cabang_status" ON "pengajuan_harga"("cabang_id", "status");

-- CreateIndex
CREATE INDEX "idx_pengajuan_harga_status" ON "pengajuan_harga"("status");

-- CreateIndex
CREATE INDEX "idx_rincian_ahsp_pengajuan_id" ON "rincian_ahsp_pengajuan"("pengajuan_harga_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_survei_toko_item_rincian_urutan" ON "survei_toko_item"("rincian_ahsp_id", "urutan_toko");

-- CreateIndex
CREATE INDEX "idx_lampiran_survei_survei_toko_id" ON "lampiran_survei"("survei_toko_id");

-- CreateIndex
CREATE INDEX "idx_voting_kontraktor_pengajuan_status" ON "voting_kontraktor"("pengajuan_harga_id", "status_vote");

-- CreateIndex
CREATE UNIQUE INDEX "uq_voting_kontraktor_pengajuan_putaran" ON "voting_kontraktor"("pengajuan_harga_id", "kontraktor_cabang_id", "putaran_vote");

-- CreateIndex
CREATE INDEX "idx_lampiran_banding_voting_id" ON "lampiran_banding"("voting_kontraktor_id");

-- CreateIndex
CREATE INDEX "idx_approval_audit_log_pengajuan_id" ON "approval_audit_log"("pengajuan_harga_id");

-- AddForeignKey
ALTER TABLE "wilayah_cabang" ADD CONSTRAINT "fk_wilayah_cabang_cabang" FOREIGN KEY ("cabang_id") REFERENCES "cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_divisi" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_cabang" FOREIGN KEY ("cabang_id") REFERENCES "cabang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_kontraktor" FOREIGN KEY ("kontraktor_id") REFERENCES "kontraktor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cabang_coverage" ADD CONSTRAINT "fk_user_cabang_coverage_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cabang_coverage" ADD CONSTRAINT "fk_user_cabang_coverage_cabang" FOREIGN KEY ("cabang_id") REFERENCES "cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kontraktor_cabang" ADD CONSTRAINT "fk_kontraktor_cabang_kontraktor" FOREIGN KEY ("kontraktor_id") REFERENCES "kontraktor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kontraktor_cabang" ADD CONSTRAINT "fk_kontraktor_cabang_cabang" FOREIGN KEY ("cabang_id") REFERENCES "cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kontraktor_cabang" ADD CONSTRAINT "fk_kontraktor_cabang_divisi" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_toko" ADD CONSTRAINT "fk_master_toko_cabang" FOREIGN KEY ("cabang_id") REFERENCES "cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_toko" ADD CONSTRAINT "fk_master_toko_wilayah" FOREIGN KEY ("wilayah_cabang_id") REFERENCES "wilayah_cabang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_item" ADD CONSTRAINT "fk_master_item_divisi" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_koefisien" ADD CONSTRAINT "fk_master_koefisien_divisi" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_harga_cabang" ADD CONSTRAINT "fk_master_harga_cabang_item" FOREIGN KEY ("master_item_id") REFERENCES "master_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_harga_cabang" ADD CONSTRAINT "fk_master_harga_cabang_cabang" FOREIGN KEY ("cabang_id") REFERENCES "cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_harga_cabang" ADD CONSTRAINT "fk_master_harga_cabang_pengajuan" FOREIGN KEY ("pengajuan_terakhir_id") REFERENCES "pengajuan_harga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_harga_wilayah" ADD CONSTRAINT "fk_master_harga_wilayah_induk" FOREIGN KEY ("master_harga_cabang_id") REFERENCES "master_harga_cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_harga_wilayah" ADD CONSTRAINT "fk_master_harga_wilayah_wilayah" FOREIGN KEY ("wilayah_cabang_id") REFERENCES "wilayah_cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_harga_wilayah" ADD CONSTRAINT "fk_master_harga_wilayah_pengajuan" FOREIGN KEY ("pengajuan_terakhir_id") REFERENCES "pengajuan_harga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_harga" ADD CONSTRAINT "fk_pengajuan_harga_divisi" FOREIGN KEY ("divisi_id") REFERENCES "divisi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_harga" ADD CONSTRAINT "fk_pengajuan_harga_cabang" FOREIGN KEY ("cabang_id") REFERENCES "cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_harga" ADD CONSTRAINT "fk_pengajuan_harga_wilayah" FOREIGN KEY ("wilayah_cabang_id") REFERENCES "wilayah_cabang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_harga" ADD CONSTRAINT "fk_pengajuan_harga_item" FOREIGN KEY ("master_item_id") REFERENCES "master_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_harga" ADD CONSTRAINT "fk_pengajuan_harga_user" FOREIGN KEY ("pembuat_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rincian_ahsp_pengajuan" ADD CONSTRAINT "fk_rincian_ahsp_pengajuan_pengajuan" FOREIGN KEY ("pengajuan_harga_id") REFERENCES "pengajuan_harga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rincian_ahsp_pengajuan" ADD CONSTRAINT "fk_rincian_ahsp_pengajuan_koefisien" FOREIGN KEY ("master_koefisien_id") REFERENCES "master_koefisien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survei_toko_item" ADD CONSTRAINT "fk_survei_toko_item_rincian" FOREIGN KEY ("rincian_ahsp_id") REFERENCES "rincian_ahsp_pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survei_toko_item" ADD CONSTRAINT "fk_survei_toko_item_toko" FOREIGN KEY ("master_toko_id") REFERENCES "master_toko"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lampiran_survei" ADD CONSTRAINT "fk_lampiran_survei_survei" FOREIGN KEY ("survei_toko_id") REFERENCES "survei_toko_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_kontraktor" ADD CONSTRAINT "fk_voting_kontraktor_pengajuan" FOREIGN KEY ("pengajuan_harga_id") REFERENCES "pengajuan_harga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_kontraktor" ADD CONSTRAINT "fk_voting_kontraktor_kontraktor_cabang" FOREIGN KEY ("kontraktor_cabang_id") REFERENCES "kontraktor_cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lampiran_banding" ADD CONSTRAINT "fk_lampiran_banding_voting" FOREIGN KEY ("voting_kontraktor_id") REFERENCES "voting_kontraktor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_audit_log" ADD CONSTRAINT "fk_approval_audit_log_pengajuan" FOREIGN KEY ("pengajuan_harga_id") REFERENCES "pengajuan_harga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_audit_log" ADD CONSTRAINT "fk_approval_audit_log_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
