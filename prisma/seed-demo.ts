import { PrismaClient, Role, JenisKelamin, HubunganKeluarga, StatusTinggal, IuranStatus, KasTransactionType, TacticalFundType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEED RT DEMO ===");

  const kodeRT = "DEMO";
  const kodeRW = "DEMO";

  // Jangan pernah menghapus data.
  // Cari RT DEMO yang sudah ada.
  let rt = await prisma.rTUnit.findFirst({
    where: {
      kodeRT,
      kodeRW,
    },
  });

  if (!rt) {
    rt = await prisma.rTUnit.create({
      data: {
        kodeRT,
        kodeRW,
        namaRT: "RT DEMO TERANGSARI",
        perumahan: "Perumahan Demo Terangsari",
        desa: "Desa Demo",
        kecamatan: "Kecamatan Demo",
        kabupaten: "Kabupaten Demo",
        aktif: true,
      },
    });

    console.log("RT DEMO dibuat:", rt.id);
  } else {
    console.log("RT DEMO sudah ada:", rt.id);
  }

  const alamat = "Jl. Melati Demo Blok D-01";

  const wargaData = [
    {
      nik: "9900000000000001",
      nama: "Bima Pratama",
      jenisKelamin: JenisKelamin.LAKI_LAKI,
      hubunganKeluarga: HubunganKeluarga.KEPALA_KELUARGA,
      tempatLahir: "Karawang",
      tanggalLahir: new Date("1985-02-14"),
      pekerjaan: "Karyawan Swasta",
      statusKawin: "KAWIN",
      statusTinggal: StatusTinggal.TETAP,
    },
    {
      nik: "9900000000000002",
      nama: "Citra Maharani",
      jenisKelamin: JenisKelamin.PEREMPUAN,
      hubunganKeluarga: HubunganKeluarga.ISTRI,
      tempatLahir: "Bekasi",
      tanggalLahir: new Date("1987-07-22"),
      pekerjaan: "Wiraswasta",
      statusKawin: "KAWIN",
      statusTinggal: StatusTinggal.TETAP,
    },
    {
      nik: "9900000000000003",
      nama: "Daffa Pratama",
      jenisKelamin: JenisKelamin.LAKI_LAKI,
      hubunganKeluarga: HubunganKeluarga.ANAK,
      tempatLahir: "Karawang",
      tanggalLahir: new Date("2012-04-11"),
      pendidikan: "SMP",
      statusKawin: "BELUM KAWIN",
      statusTinggal: StatusTinggal.TETAP,
    },
    {
      nik: "9900000000000004",
      nama: "Elisa Pratama",
      jenisKelamin: JenisKelamin.PEREMPUAN,
      hubunganKeluarga: HubunganKeluarga.ANAK,
      tempatLahir: "Karawang",
      tanggalLahir: new Date("2016-09-03"),
      pendidikan: "SD",
      statusKawin: "BELUM KAWIN",
      statusTinggal: StatusTinggal.TETAP,
    },
    {
      nik: "9900000000000005",
      nama: "Fajar Nugroho",
      jenisKelamin: JenisKelamin.LAKI_LAKI,
      hubunganKeluarga: HubunganKeluarga.KEPALA_KELUARGA,
      tempatLahir: "Subang",
      tanggalLahir: new Date("1982-11-19"),
      pekerjaan: "Pedagang",
      statusKawin: "KAWIN",
      statusTinggal: StatusTinggal.KONTRAK,
    },
    {
      nik: "9900000000000006",
      nama: "Gita Lestari",
      jenisKelamin: JenisKelamin.PEREMPUAN,
      hubunganKeluarga: HubunganKeluarga.ISTRI,
      tempatLahir: "Subang",
      tanggalLahir: new Date("1986-05-27"),
      pekerjaan: "Ibu Rumah Tangga",
      statusKawin: "KAWIN",
      statusTinggal: StatusTinggal.KONTRAK,
    },
    {
      nik: "9900000000000007",
      nama: "Hendra Nugroho",
      jenisKelamin: JenisKelamin.LAKI_LAKI,
      hubunganKeluarga: HubunganKeluarga.ANAK,
      tempatLahir: "Karawang",
      tanggalLahir: new Date("2010-01-18"),
      pendidikan: "SMP",
      statusKawin: "BELUM KAWIN",
      statusTinggal: StatusTinggal.KONTRAK,
    },
    {
      nik: "9900000000000008",
      nama: "Indah Permata",
      jenisKelamin: JenisKelamin.PEREMPUAN,
      hubunganKeluarga: HubunganKeluarga.KEPALA_KELUARGA,
      tempatLahir: "Purwakarta",
      tanggalLahir: new Date("1990-03-09"),
      pekerjaan: "Guru",
      statusKawin: "KAWIN",
      statusTinggal: StatusTinggal.TETAP,
    },
    {
      nik: "9900000000000009",
      nama: "Joko Permata",
      jenisKelamin: JenisKelamin.LAKI_LAKI,
      hubunganKeluarga: HubunganKeluarga.SUAMI,
      tempatLahir: "Purwakarta",
      tanggalLahir: new Date("1988-08-16"),
      pekerjaan: "Teknisi",
      statusKawin: "KAWIN",
      statusTinggal: StatusTinggal.TETAP,
    },
    {
      nik: "9900000000000010",
      nama: "Kirana Permata",
      jenisKelamin: JenisKelamin.PEREMPUAN,
      hubunganKeluarga: HubunganKeluarga.ANAK,
      tempatLahir: "Karawang",
      tanggalLahir: new Date("2018-12-02"),
      pendidikan: "TK",
      statusKawin: "BELUM KAWIN",
      statusTinggal: StatusTinggal.TETAP,
    },
  ];

  const kkData = [
    {
      nomorKK: "KK-DEMO-0001",
      kepalaKeluarga: "Bima Pratama",
      warga: ["9900000000000001", "9900000000000002", "9900000000000003", "9900000000000004"],
      statusTinggal: StatusTinggal.TETAP,
    },
    {
      nomorKK: "KK-DEMO-0002",
      kepalaKeluarga: "Fajar Nugroho",
      warga: ["9900000000000005", "9900000000000006", "9900000000000007"],
      statusTinggal: StatusTinggal.KONTRAK,
    },
    {
      nomorKK: "KK-DEMO-0003",
      kepalaKeluarga: "Indah Permata",
      warga: ["9900000000000008", "9900000000000009", "9900000000000010"],
      statusTinggal: StatusTinggal.TETAP,
    },
  ];

  const kkMap = new Map<string, string>();

  for (const item of kkData) {
    let kk = await prisma.kK.findUnique({
      where: { nomorKK: item.nomorKK },
    });

    if (!kk) {
      kk = await prisma.kK.create({
        data: {
          nomorKK: item.nomorKK,
          kepalaKeluarga: item.kepalaKeluarga,
          alamat,
          rt: "DEMO",
          rw: "DEMO",
          statusTinggal: item.statusTinggal,
          nomorHP: "0800000000",
          rTUnitId: rt.id,
        },
      });
      console.log("KK dibuat:", item.nomorKK);
    }

    kkMap.set(item.nomorKK, kk.id);

    for (const nik of item.warga) {
      const warga = wargaData.find((x) => x.nik === nik);
      if (!warga) continue;

      const existing = await prisma.warga.findUnique({
        where: { nik },
      });

      if (!existing) {
        await prisma.warga.create({
          data: {
            nik: warga.nik,
            nama: warga.nama,
            nomorKK: item.nomorKK,
            alamat,
            rt: "DEMO",
            rw: "DEMO",
            statusTinggal: warga.statusTinggal,
            jenisKelamin: warga.jenisKelamin,
            hubunganKeluarga: warga.hubunganKeluarga,
            tempatLahir: warga.tempatLahir,
            tanggalLahir: warga.tanggalLahir,
            pekerjaan: warga.pekerjaan,
            pendidikan: warga.pendidikan,
            statusKawin: warga.statusKawin,
            kkId: kk.id,
            rTUnitId: rt.id,
          },
        });

        console.log("Warga dibuat:", warga.nama);
      }
    }
  }

  const periods = ["2026-07", "2026-08", "2026-09"];

  console.log("=== DATA TAMBAHAN RT DEMO ===");

  const extraKKData = [
    {
      nomorKK: "KK-DEMO-0004",
      kepalaKeluarga: "Lukman Hakim",
      statusTinggal: StatusTinggal.TETAP,
      warga: [
        ["9900000000000011", "Lukman Hakim", JenisKelamin.LAKI_LAKI, HubunganKeluarga.KEPALA_KELUARGA, "1980-01-12"],
        ["9900000000000012", "Maya Safitri", JenisKelamin.PEREMPUAN, HubunganKeluarga.ISTRI, "1983-06-25"],
        ["9900000000000013", "Naufal Hakim", JenisKelamin.LAKI_LAKI, HubunganKeluarga.ANAK, "2011-10-08"],
      ],
    },
    {
      nomorKK: "KK-DEMO-0005",
      kepalaKeluarga: "Oscar Wijaya",
      statusTinggal: StatusTinggal.KONTRAK,
      warga: [
        ["9900000000000014", "Oscar Wijaya", JenisKelamin.LAKI_LAKI, HubunganKeluarga.KEPALA_KELUARGA, "1984-04-17"],
        ["9900000000000015", "Putri Anjani", JenisKelamin.PEREMPUAN, HubunganKeluarga.ISTRI, "1987-09-21"],
        ["9900000000000016", "Qiana Wijaya", JenisKelamin.PEREMPUAN, HubunganKeluarga.ANAK, "2015-02-13"],
      ],
    },
    {
      nomorKK: "KK-DEMO-0006",
      kepalaKeluarga: "Raka Firmansyah",
      statusTinggal: StatusTinggal.TETAP,
      warga: [
        ["9900000000000017", "Raka Firmansyah", JenisKelamin.LAKI_LAKI, HubunganKeluarga.KEPALA_KELUARGA, "1978-12-03"],
        ["9900000000000018", "Salsa Amelia", JenisKelamin.PEREMPUAN, HubunganKeluarga.ISTRI, "1981-03-15"],
        ["9900000000000019", "Tio Firmansyah", JenisKelamin.LAKI_LAKI, HubunganKeluarga.ANAK, "2007-07-29"],
      ],
    },
    {
      nomorKK: "KK-DEMO-0007",
      kepalaKeluarga: "Umar Fauzan",
      statusTinggal: StatusTinggal.KONTRAK,
      warga: [
        ["9900000000000020", "Umar Fauzan", JenisKelamin.LAKI_LAKI, HubunganKeluarga.KEPALA_KELUARGA, "1989-05-06"],
        ["9900000000000021", "Vina Maharani", JenisKelamin.PEREMPUAN, HubunganKeluarga.ISTRI, "1991-11-18"],
        ["9900000000000022", "Wahyu Fauzan", JenisKelamin.LAKI_LAKI, HubunganKeluarga.ANAK, "2020-08-24"],
      ],
    },
    {
      nomorKK: "KK-DEMO-0008",
      kepalaKeluarga: "Yusuf Ramadhan",
      statusTinggal: StatusTinggal.TETAP,
      warga: [
        ["9900000000000023", "Yusuf Ramadhan", JenisKelamin.LAKI_LAKI, HubunganKeluarga.KEPALA_KELUARGA, "1975-09-14"],
        ["9900000000000024", "Zahra Nirmala", JenisKelamin.PEREMPUAN, HubunganKeluarga.ISTRI, "1979-01-30"],
        ["9900000000000025", "Alya Ramadhan", JenisKelamin.PEREMPUAN, HubunganKeluarga.ANAK, "2005-06-12"],
      ],
    },
    {
      nomorKK: "KK-DEMO-0009",
      kepalaKeluarga: "Bagas Kurniawan",
      statusTinggal: StatusTinggal.KONTRAK,
      warga: [
        ["9900000000000026", "Bagas Kurniawan", JenisKelamin.LAKI_LAKI, HubunganKeluarga.KEPALA_KELUARGA, "1992-02-19"],
        ["9900000000000027", "Celine Oktavia", JenisKelamin.PEREMPUAN, HubunganKeluarga.ISTRI, "1994-08-07"],
        ["9900000000000028", "Dito Kurniawan", JenisKelamin.LAKI_LAKI, HubunganKeluarga.ANAK, "2021-04-16"],
      ],
    },
    {
      nomorKK: "KK-DEMO-0010",
      kepalaKeluarga: "Eko Saputra",
      statusTinggal: StatusTinggal.TETAP,
      warga: [
        ["9900000000000029", "Eko Saputra", JenisKelamin.LAKI_LAKI, HubunganKeluarga.KEPALA_KELUARGA, "1972-07-23"],
        ["9900000000000030", "Farah Kusuma", JenisKelamin.PEREMPUAN, HubunganKeluarga.ISTRI, "1976-12-11"],
        ["9900000000000031", "Gilang Saputra", JenisKelamin.LAKI_LAKI, HubunganKeluarga.ANAK, "2003-03-05"],
      ],
    },
  ];

  for (const item of extraKKData) {
    let kk = await prisma.kK.findUnique({
      where: { nomorKK: item.nomorKK },
    });

    if (!kk) {
      kk = await prisma.kK.create({
        data: {
          nomorKK: item.nomorKK,
          kepalaKeluarga: item.kepalaKeluarga,
          alamat,
          rt: "DEMO",
          rw: "DEMO",
          statusTinggal: item.statusTinggal,
          nomorHP: "0800000000",
          rTUnitId: rt.id,
        },
      });

      console.log("KK dibuat:", item.nomorKK);
    }

    for (const data of item.warga) {
      const [nik, nama, jenisKelamin, hubunganKeluarga, tanggalLahir] = data as [string, string, JenisKelamin, HubunganKeluarga, string];

      const existing = await prisma.warga.findUnique({
        where: { nik },
      });

      if (!existing) {
        await prisma.warga.create({
          data: {
            nik,
            nama,
            nomorKK: item.nomorKK,
            alamat,
            rt: "DEMO",
            rw: "DEMO",
            statusTinggal: item.statusTinggal,
            jenisKelamin,
            hubunganKeluarga,
            tempatLahir: "Kota Demo",
            tanggalLahir: new Date(tanggalLahir),
            pekerjaan:
              hubunganKeluarga === HubunganKeluarga.ANAK
                ? "Pelajar"
                : "Karyawan Swasta",
            pendidikan:
              hubunganKeluarga === HubunganKeluarga.ANAK
                ? "Sekolah"
                : "SMA",
            statusKawin:
              hubunganKeluarga === HubunganKeluarga.ANAK
                ? "BELUM KAWIN"
                : "KAWIN",
            kkId: kk.id,
            rTUnitId: rt.id,
          },
        });

        console.log("Warga dibuat:", nama);
      }
    }
  }

  for (const nomorKK of extraKKData.map((item) => item.nomorKK)) {
    const kk = await prisma.kK.findUnique({
      where: { nomorKK },
    });

    if (!kk) continue;

    for (const periode of periods) {
      const existing = await prisma.iuran.findUnique({
        where: {
          kkId_periode: {
            kkId: kk.id,
            periode,
          },
        },
      });

      if (!existing) {
        const lunas = periode !== "2026-09";

        await prisma.iuran.create({
          data: {
            kkId: kk.id,
            periode,
            amount: 40000,
            status: lunas ? IuranStatus.LUNAS : IuranStatus.BELUM_BAYAR,
            method: lunas ? "TRANSFER" : null,
            paidAt: lunas ? new Date(`${periode}-10T19:00:00`) : null,
            note: "DATA DEMO",
            rTUnitId: rt.id,
          },
        });
      }
    }
  }

  const demoUser = await prisma.user.findUnique({
    where: { username: "demo.ketua" },
  });

  if (demoUser) {
    const activityCount = await prisma.activityLog.count({
      where: { rTUnitId: rt.id },
    });

    if (activityCount === 0) {
      await prisma.activityLog.createMany({
        data: [
          {
            actorUserId: demoUser.id,
            actorUsername: demoUser.username,
            actorRole: demoUser.role,
            action: "LOGIN",
            module: "AUTH",
            targetType: "User",
            targetId: demoUser.id,
            description: "Login user Ketua RT DEMO.",
            rTUnitId: rt.id,
          },
          {
            actorUserId: demoUser.id,
            actorUsername: demoUser.username,
            actorRole: demoUser.role,
            action: "CREATE",
            module: "WARGA",
            targetType: "Warga",
            description: "Menambahkan data warga DEMO.",
            rTUnitId: rt.id,
          },
          {
            actorUserId: demoUser.id,
            actorUsername: demoUser.username,
            actorRole: demoUser.role,
            action: "CREATE",
            module: "IURAN",
            targetType: "Iuran",
            description: "Membuat data iuran DEMO.",
            rTUnitId: rt.id,
          },
          {
            actorUserId: demoUser.id,
            actorUsername: demoUser.username,
            actorRole: demoUser.role,
            action: "CREATE",
            module: "KAS",
            targetType: "KasTransaction",
            description: "Mencatat transaksi kas DEMO.",
            rTUnitId: rt.id,
          },
          {
            actorUserId: demoUser.id,
            actorUsername: demoUser.username,
            actorRole: demoUser.role,
            action: "CREATE",
            module: "DANA_TAKTIS",
            targetType: "TacticalFundTransaction",
            description: "Mencatat transaksi dana taktis DEMO.",
            rTUnitId: rt.id,
          },
          {
            actorUserId: demoUser.id,
            actorUsername: demoUser.username,
            actorRole: demoUser.role,
            action: "EXPORT_PDF",
            module: "LAPORAN",
            targetType: "Laporan",
            description: "Simulasi export laporan PDF DEMO.",
            rTUnitId: rt.id,
          },
        ],
      });

      console.log("Activity Log DEMO dibuat.");
    }
  }
  const passwordHash = await bcrypt.hash("Demo12345!", 10);

  const users = [
    {
      username: "demo.ketua",
      role: Role.KETUA,
    },
    {
      username: "demo.sekretaris",
      role: Role.SEKRETARIS,
    },
    {
      username: "demo.bendahara",
      role: Role.BENDAHARA,
    },
  ];

  for (const item of users) {
    const existing = await prisma.user.findUnique({
      where: { username: item.username },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          username: item.username,
          passwordHash,
          role: item.role,
          rTUnitId: rt.id,
        },
      });

      console.log("User dibuat:", item.username);
    }
  }


  for (const nomorKK of Array.from(kkMap.keys())) {
    const kkId = kkMap.get(nomorKK)!;

    for (const periode of periods) {
      const existing = await prisma.iuran.findUnique({
        where: {
          kkId_periode: {
            kkId,
            periode,
          },
        },
      });

      if (!existing) {
        const lunas = periode !== "2026-09";

        await prisma.iuran.create({
          data: {
            kkId,
            periode,
            amount: 40000,
            status: lunas ? IuranStatus.LUNAS : IuranStatus.BELUM_BAYAR,
            method: lunas ? "TRANSFER" : null,
            paidAt: lunas ? new Date(`${periode}-10T19:00:00`) : null,
            note: "DATA DEMO",
            rTUnitId: rt.id,
          },
        });
      }
    }
  }

  const kasCount = await prisma.kasTransaction.count({
    where: { rTUnitId: rt.id },
  });

  if (kasCount === 0) {
    await prisma.kasTransaction.createMany({
      data: [
        {
          type: KasTransactionType.PEMASUKAN,
          amount: 500000,
          category: "Iuran Warga",
          description: "Pemasukan iuran - DEMO",
          rTUnitId: rt.id,
        },
        {
          type: KasTransactionType.PEMASUKAN,
          amount: 250000,
          category: "Donasi",
          description: "Donasi kegiatan warga - DEMO",
          rTUnitId: rt.id,
        },
        {
          type: KasTransactionType.PENGELUARAN,
          amount: 150000,
          category: "Kebersihan",
          description: "Pembelian perlengkapan kebersihan - DEMO",
          rTUnitId: rt.id,
        },
        {
          type: KasTransactionType.PENGELUARAN,
          amount: 100000,
          category: "Kegiatan",
          description: "Konsumsi kegiatan warga - DEMO",
          rTUnitId: rt.id,
        },
      ],
    });
  }

  const tacticalCount = await prisma.tacticalFundTransaction.count({
    where: { rTUnitId: rt.id },
  });

  if (tacticalCount === 0) {
    await prisma.tacticalFundTransaction.createMany({
      data: [
        {
          type: TacticalFundType.MASUK,
          amount: 300000,
          category: "Transfer Kas",
          description: "Dana taktis awal - DEMO",
          rTUnitId: rt.id,
        },
        {
          type: TacticalFundType.MASUK,
          amount: 100000,
          category: "Donasi",
          description: "Donasi dana taktis - DEMO",
          rTUnitId: rt.id,
        },
        {
          type: TacticalFundType.KELUAR,
          amount: 75000,
          category: "Sosial",
          description: "Bantuan sosial simulasi - DEMO",
          rTUnitId: rt.id,
        },
      ],
    });
  }

  const pengumumanCount = await prisma.pengumuman.count({
    where: { rTUnitId: rt.id },
  });

  if (pengumumanCount === 0) {
    await prisma.pengumuman.createMany({
      data: [
        {
          judul: "Kerja Bakti Lingkungan",
          isi: "Kerja bakti lingkungan RT DEMO dilaksanakan hari Minggu pagi. Data ini hanya simulasi.",
          aktif: true,
          rTUnitId: rt.id,
        },
        {
          judul: "Pembayaran Iuran Bulanan",
          isi: "Mohon warga melakukan pembayaran iuran sebelum tanggal 10 setiap bulan. DATA DEMO.",
          aktif: true,
          rTUnitId: rt.id,
        },
      ],
    });
  }

  const kegiatanCount = await prisma.kegiatan.count({
    where: { rTUnitId: rt.id },
  });

  if (kegiatanCount === 0) {
    await prisma.kegiatan.createMany({
      data: [
        {
          nama: "Kerja Bakti Lingkungan",
          tanggal: new Date("2026-09-13"),
          jam: "07:00",
          lokasi: "Lapangan RT DEMO",
          keterangan: "Kegiatan simulasi.",
          aktif: true,
          rTUnitId: rt.id,
        },
        {
          nama: "Rapat Warga",
          tanggal: new Date("2026-09-20"),
          jam: "20:00",
          lokasi: "Balai Warga DEMO",
          keterangan: "Rapat simulasi warga.",
          aktif: true,
          rTUnitId: rt.id,
        },
      ],
    });
  }

  const qris = await prisma.qRISConfig.findFirst({
    where: { rTUnitId: rt.id },
  });

  if (!qris) {
    await prisma.qRISConfig.create({
      data: {
        id: `qris-${rt.id}`,
        merchantName: "RT DEMO TERANGSARI",
        qrisName: "QRIS DEMO",
        qrisString: "DEMO-QRIS-NOT-FOR-PAYMENT",
        imageUrl: "",
        active: true,
        rTUnitId: rt.id,
      },
    });
  }

  console.log("");
  console.log("=== SEED DEMO SELESAI ===");
  console.log("RT       :", rt.namaRT);
  console.log("Kode     :", `${rt.kodeRT}/${rt.kodeRW}`);
  console.log("Warga    :", await prisma.warga.count({ where: { rTUnitId: rt.id } }));
  console.log("KK       :", await prisma.kK.count({ where: { rTUnitId: rt.id } }));
  console.log("Iuran    :", await prisma.iuran.count({ where: { rTUnitId: rt.id } }));
  console.log("Kas      :", await prisma.kasTransaction.count({ where: { rTUnitId: rt.id } }));
  console.log("Taktis   :", await prisma.tacticalFundTransaction.count({ where: { rTUnitId: rt.id } }));
  console.log("Kegiatan :", await prisma.kegiatan.count({ where: { rTUnitId: rt.id } }));
  console.log("Pengumuman:", await prisma.pengumuman.count({ where: { rTUnitId: rt.id } }));
  console.log("");
  console.log("USER DEMO:");
  console.log("demo.ketua / Demo12345!");
  console.log("demo.sekretaris / Demo12345!");
  console.log("demo.bendahara / Demo12345!");
}

main()
  .catch((error) => {
    console.error("SEED DEMO GAGAL");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
