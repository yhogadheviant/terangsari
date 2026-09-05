const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const permissions = [
  // DATA WARGA
  ["WARGA_VIEW", "Lihat Data Warga", "Melihat data warga", "DATA WARGA"],
  ["WARGA_CREATE", "Tambah Warga", "Menambah data warga", "DATA WARGA"],
  ["WARGA_UPDATE", "Edit Warga", "Mengubah data warga", "DATA WARGA"],
  ["WARGA_DELETE", "Hapus Warga", "Menghapus data warga", "DATA WARGA"],
  ["WARGA_IMPORT", "Import Warga", "Import data warga dari Excel", "DATA WARGA"],
  ["WARGA_EXPORT", "Export Warga", "Export data warga", "DATA WARGA"],

  // DATA KK
  ["KK_VIEW", "Lihat Data KK", "Melihat data kartu keluarga", "DATA KK"],
  ["KK_CREATE", "Tambah KK", "Menambah kartu keluarga", "DATA KK"],
  ["KK_UPDATE", "Edit KK", "Mengubah kartu keluarga", "DATA KK"],
  ["KK_DELETE", "Hapus KK", "Menghapus kartu keluarga", "DATA KK"],

  // IURAN
  ["IURAN_VIEW", "Lihat Iuran", "Melihat data iuran", "IURAN"],
  ["IURAN_CREATE", "Catat Pembayaran Iuran", "Mencatat pembayaran iuran", "IURAN"],
  ["IURAN_GENERATE", "Generate Iuran", "Membuat tagihan iuran periode", "IURAN"],
  ["IURAN_CANCEL", "Batalkan Pembayaran", "Membatalkan status lunas iuran", "IURAN"],
  ["IURAN_QRIS_MANAGE", "Kelola QRIS Iuran", "Mengatur QRIS pembayaran iuran", "IURAN"],

  // KAS
  ["KAS_VIEW", "Lihat Kas", "Melihat transaksi kas RT", "KAS"],
  ["KAS_CREATE", "Tambah Transaksi Kas", "Menambah transaksi kas", "KAS"],
  ["KAS_UPDATE", "Edit Transaksi Kas", "Mengubah transaksi kas", "KAS"],
  ["KAS_DELETE", "Hapus Transaksi Kas", "Menghapus transaksi kas", "KAS"],

  // DANA TAKTIS
  ["DANA_TAKTIS_VIEW", "Lihat Dana Taktis", "Melihat dana taktis", "DANA TAKTIS"],
  ["DANA_TAKTIS_CREATE", "Tambah Dana Taktis", "Menambah transaksi dana taktis", "DANA TAKTIS"],
  ["DANA_TAKTIS_DELETE", "Hapus Dana Taktis", "Menghapus transaksi dana taktis", "DANA TAKTIS"],
  ["TRANSFER_KAS_TAKTIS", "Transfer Kas ke Dana Taktis", "Memindahkan dana dari kas RT ke dana taktis", "DANA TAKTIS"],

  // KEGIATAN
  ["KEGIATAN_VIEW", "Lihat Kegiatan", "Melihat agenda kegiatan", "KEGIATAN"],
  ["KEGIATAN_CREATE", "Tambah Kegiatan", "Menambah kegiatan", "KEGIATAN"],
  ["KEGIATAN_UPDATE", "Edit Kegiatan", "Mengubah kegiatan", "KEGIATAN"],
  ["KEGIATAN_DELETE", "Hapus Kegiatan", "Menghapus kegiatan", "KEGIATAN"],

  // PENGUMUMAN
  ["PENGUMUMAN_VIEW", "Lihat Pengumuman", "Melihat pengumuman warga", "PENGUMUMAN"],
  ["PENGUMUMAN_CREATE", "Tambah Pengumuman", "Membuat pengumuman", "PENGUMUMAN"],
  ["PENGUMUMAN_UPDATE", "Edit Pengumuman", "Mengubah pengumuman", "PENGUMUMAN"],
  ["PENGUMUMAN_DELETE", "Hapus Pengumuman", "Menghapus pengumuman", "PENGUMUMAN"],

  // LAPORAN
  ["LAPORAN_VIEW", "Lihat Laporan", "Melihat laporan RT", "LAPORAN"],
  ["LAPORAN_EXPORT", "Export Laporan", "Mengexport laporan", "LAPORAN"],

  // PENGATURAN
  ["PENGATURAN_VIEW", "Lihat Pengaturan", "Melihat pengaturan RT", "PENGATURAN"],
  ["PENGATURAN_UPDATE", "Ubah Pengaturan", "Mengubah pengaturan RT", "PENGATURAN"],

  // AKUN
  ["USER_VIEW", "Lihat Akun", "Melihat daftar akun", "AKUN"],
  ["USER_CREATE", "Tambah Akun", "Membuat akun pengguna", "AKUN"],
  ["USER_UPDATE", "Edit Akun", "Mengubah akun pengguna", "AKUN"],
  ["USER_DELETE", "Hapus Akun", "Menghapus akun pengguna", "AKUN"],
  ["USER_PERMISSION_MANAGE", "Kelola Hak Akses", "Mengatur hak akses setiap akun", "AKUN"],
];

async function main() {
  for (const [code, name, description, category] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: {
        name,
        description,
        category,
        active: true,
      },
      create: {
        code,
        name,
        description,
        category,
        active: true,
      },
    });
  }

  console.log(`SEED PERMISSION OK: ${permissions.length} permission`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
