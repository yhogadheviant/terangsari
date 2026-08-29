-- CreateEnum
CREATE TYPE "Role" AS ENUM ('KETUA', 'SEKRETARIS', 'BENDAHARA', 'WARGA');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "HubunganKeluarga" AS ENUM ('KEPALA_KELUARGA', 'ISTRI', 'SUAMI', 'ANAK', 'ORANG_TUA', 'MERTUA', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusTinggal" AS ENUM ('TETAP', 'SEWA', 'KONTRAK', 'MENUMPANG', 'LAINNYA');

-- CreateEnum
CREATE TYPE "TacticalFundType" AS ENUM ('MASUK', 'KELUAR');

-- CreateEnum
CREATE TYPE "IuranStatus" AS ENUM ('BELUM_BAYAR', 'LUNAS');

-- CreateEnum
CREATE TYPE "KasTransactionType" AS ENUM ('PEMASUKAN', 'PENGELUARAN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "wargaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rTUnitId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KK" (
    "id" TEXT NOT NULL,
    "nomorKK" TEXT NOT NULL,
    "kepalaKeluarga" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "rt" TEXT,
    "rw" TEXT,
    "statusTinggal" "StatusTinggal" NOT NULL DEFAULT 'TETAP',
    "nomorHP" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rTUnitId" TEXT,

    CONSTRAINT "KK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warga" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nomorKK" TEXT,
    "daerahKKAsal" TEXT,
    "alamat" TEXT,
    "rt" TEXT,
    "rw" TEXT,
    "statusTinggal" "StatusTinggal" NOT NULL DEFAULT 'TETAP',
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "hubunganKeluarga" "HubunganKeluarga" NOT NULL,
    "tempatLahir" TEXT,
    "tanggalLahir" TIMESTAMP(3),
    "usia" INTEGER,
    "golonganDarah" TEXT,
    "agama" TEXT,
    "pendidikan" TEXT,
    "pekerjaan" TEXT,
    "statusKawin" TEXT,
    "namaIbu" TEXT,
    "namaAyah" TEXT,
    "nomorPaspor" TEXT,
    "tanggalAkhirPaspor" TIMESTAMP(3),
    "hubungan" TEXT,
    "kodeHubungan" TEXT,
    "kkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rTUnitId" TEXT,

    CONSTRAINT "Warga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacticalFundTransaction" (
    "id" TEXT NOT NULL,
    "type" "TacticalFundType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rTUnitId" TEXT,

    CONSTRAINT "TacticalFundTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KasTransaction" (
    "id" TEXT NOT NULL,
    "type" "KasTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rTUnitId" TEXT,

    CONSTRAINT "KasTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Iuran" (
    "id" TEXT NOT NULL,
    "kkId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "IuranStatus" NOT NULL DEFAULT 'BELUM_BAYAR',
    "method" TEXT,
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rTUnitId" TEXT,

    CONSTRAINT "Iuran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRISConfig" (
    "id" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "qrisName" TEXT NOT NULL,
    "qrisString" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rTUnitId" TEXT,

    CONSTRAINT "QRISConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengumuman" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rTUnitId" TEXT,

    CONSTRAINT "Pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kegiatan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jam" TEXT,
    "lokasi" TEXT,
    "keterangan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rTUnitId" TEXT,

    CONSTRAINT "Kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RTUnit" (
    "id" TEXT NOT NULL,
    "kodeRT" TEXT NOT NULL,
    "kodeRW" TEXT NOT NULL,
    "namaRT" TEXT NOT NULL,
    "perumahan" TEXT,
    "desa" TEXT,
    "kecamatan" TEXT,
    "kabupaten" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RTUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_wargaId_key" ON "User"("wargaId");

-- CreateIndex
CREATE UNIQUE INDEX "KK_nomorKK_key" ON "KK"("nomorKK");

-- CreateIndex
CREATE UNIQUE INDEX "Warga_nik_key" ON "Warga"("nik");

-- CreateIndex
CREATE INDEX "Warga_nama_idx" ON "Warga"("nama");

-- CreateIndex
CREATE INDEX "Warga_nomorKK_idx" ON "Warga"("nomorKK");

-- CreateIndex
CREATE INDEX "Warga_daerahKKAsal_idx" ON "Warga"("daerahKKAsal");

-- CreateIndex
CREATE INDEX "Warga_kkId_idx" ON "Warga"("kkId");

-- CreateIndex
CREATE INDEX "Warga_statusTinggal_idx" ON "Warga"("statusTinggal");

-- CreateIndex
CREATE INDEX "TacticalFundTransaction_type_idx" ON "TacticalFundTransaction"("type");

-- CreateIndex
CREATE INDEX "TacticalFundTransaction_date_idx" ON "TacticalFundTransaction"("date");

-- CreateIndex
CREATE INDEX "TacticalFundTransaction_category_idx" ON "TacticalFundTransaction"("category");

-- CreateIndex
CREATE INDEX "KasTransaction_type_idx" ON "KasTransaction"("type");

-- CreateIndex
CREATE INDEX "KasTransaction_date_idx" ON "KasTransaction"("date");

-- CreateIndex
CREATE INDEX "KasTransaction_category_idx" ON "KasTransaction"("category");

-- CreateIndex
CREATE INDEX "Iuran_periode_idx" ON "Iuran"("periode");

-- CreateIndex
CREATE INDEX "Iuran_status_idx" ON "Iuran"("status");

-- CreateIndex
CREATE INDEX "Iuran_kkId_idx" ON "Iuran"("kkId");

-- CreateIndex
CREATE UNIQUE INDEX "Iuran_kkId_periode_key" ON "Iuran"("kkId", "periode");

-- CreateIndex
CREATE INDEX "Pengumuman_aktif_idx" ON "Pengumuman"("aktif");

-- CreateIndex
CREATE INDEX "Pengumuman_tanggal_idx" ON "Pengumuman"("tanggal");

-- CreateIndex
CREATE INDEX "Kegiatan_tanggal_idx" ON "Kegiatan"("tanggal");

-- CreateIndex
CREATE INDEX "Kegiatan_aktif_idx" ON "Kegiatan"("aktif");

-- CreateIndex
CREATE INDEX "RTUnit_aktif_idx" ON "RTUnit"("aktif");

-- CreateIndex
CREATE UNIQUE INDEX "RTUnit_kodeRT_kodeRW_key" ON "RTUnit"("kodeRT", "kodeRW");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_wargaId_fkey" FOREIGN KEY ("wargaId") REFERENCES "Warga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KK" ADD CONSTRAINT "KK_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_kkId_fkey" FOREIGN KEY ("kkId") REFERENCES "KK"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacticalFundTransaction" ADD CONSTRAINT "TacticalFundTransaction_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KasTransaction" ADD CONSTRAINT "KasTransaction_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Iuran" ADD CONSTRAINT "Iuran_kkId_fkey" FOREIGN KEY ("kkId") REFERENCES "KK"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Iuran" ADD CONSTRAINT "Iuran_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRISConfig" ADD CONSTRAINT "QRISConfig_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengumuman" ADD CONSTRAINT "Pengumuman_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kegiatan" ADD CONSTRAINT "Kegiatan_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

