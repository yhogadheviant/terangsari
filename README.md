# Modul Data Warga + Import Excel RT 11

Modul ini mengikuti format Excel Data Kependudukan RT 11.

## Integrasi
Salin folder `app/panel/warga` dan `app/api/warga/import` ke project RT 11 Digital.
Komponen membutuhkan endpoint `POST /api/warga/import`.

Import:
Excel -> validasi -> isi No KK yang kosong mengikuti KK sebelumnya -> simpan data warga.

Kolom yang didukung:
No, No KK, Alamat, RW, RT, NIK, Nama Lengkap, Status Hubungan Keluarga,
Jenis Kelamin, Tempat Lahir, Tanggal Lahir, Usia, Golongan Darah, Agama,
Pendidikan Terakhir, Jenis Pekerjaan, Status Perkawinan, Nama Ibu, Nama Ayah,
No Paspor, Tanggal Akhir Paspor, Hubungan, Kode Hubungan.
