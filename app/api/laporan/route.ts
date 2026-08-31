import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { getRTContext } from "@/app/lib/auth/rt-context";

function getPeriodRange(periode: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(periode);

  if (!match) {
    throw new Error("Format periode harus YYYY-MM.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    throw new Error("Bulan tidak valid.");
  }

  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

export async function GET(request: Request) {
  try {
    const context = await getRTContext(request);

    if (context.response) return context.response;

    const rTUnitId = context.rTUnitId!;
    const session = context.session;

    const rtUnit = await prisma.rTUnit.findUnique({
      where: {
        id: rTUnitId,
      },
      select: {
        id: true,
        kodeRT: true,
        kodeRW: true,
        namaRT: true,
        perumahan: true,
        desa: true,
        kecamatan: true,
        kabupaten: true,
      },
    });

    if (!rtUnit) {
      return jsonError("Data RT tidak ditemukan.", 404);
    }

    const url = new URL(request.url);

    const periode =
      url.searchParams.get("periode") ||
      new Date().toISOString().slice(0, 7);

    const { start, end } = getPeriodRange(periode);

    // =====================================================
    // KK & WARGA
    // =====================================================

    const [
      totalKK,
      totalWarga,
      lakiLaki,
      perempuan,
      balita,
      anak5_9,
      anak10_14,
      remaja15_19,
      dewasa20_59,
      lansia,
      tetap,
      sewa,
      kontrak,
      menumpang,
      tinggalLainnya,
    ] = await Promise.all([
      prisma.kK.count({
        where: {
          rTUnitId: rTUnitId,
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          jenisKelamin: "LAKI_LAKI",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          jenisKelamin: "PEREMPUAN",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 0,
            lte: 4,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 5,
            lte: 9,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 10,
            lte: 14,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 15,
            lte: 19,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 20,
            lte: 59,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          usia: {
            gte: 60,
          },
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "TETAP",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "SEWA",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "KONTRAK",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "MENUMPANG",
        },
      }),

      prisma.warga.count({
        where: {
          rTUnitId: rTUnitId,
          statusTinggal: "LAINNYA",
        },
      }),
    ]);

    const anak = balita + anak5_9 + anak10_14 + remaja15_19;
    const dewasa = dewasa20_59;

    // =====================================================
    // IURAN
    // =====================================================

    const iuran = await prisma.iuran.findMany({
      where: {
        rTUnitId: rTUnitId,
        periode,
      },

      select: {
        id: true,
        kkId: true,
        amount: true,
        status: true,
        method: true,
        paidAt: true,
        note: true,

        kk: {
          select: {
            nomorKK: true,
            kepalaKeluarga: true,
          },
        },
      },

      orderBy: {
        kk: {
          kepalaKeluarga: "asc",
        },
      },
    });

    const lunas = iuran.filter(
      (row) => row.status === "LUNAS"
    );

    const penerimaan = lunas.reduce(
      (sum, row) => sum + row.amount,
      0
    );

    const tagihan = iuran.reduce(
      (sum, row) => sum + row.amount,
      0
    );

    const cash = lunas
      .filter((row) => row.method === "CASH")
      .reduce((sum, row) => sum + row.amount, 0);

    const transfer = lunas
      .filter((row) => row.method === "TRANSFER")
      .reduce((sum, row) => sum + row.amount, 0);

    const qris = lunas
      .filter((row) => row.method === "QRIS")
      .reduce((sum, row) => sum + row.amount, 0);

    const iuranLainnya = lunas
      .filter(
        (row) =>
          row.method &&
          !["CASH", "TRANSFER", "QRIS"].includes(
            row.method
          )
      )
      .reduce((sum, row) => sum + row.amount, 0);

    // =====================================================
    // DANA TAKTIS
    // =====================================================

    const danaTaktis =
      await prisma.tacticalFundTransaction.findMany({
        where: {
          rTUnitId: rTUnitId,
          date: {
            gte: start,
            lt: end,
          },
        },

        orderBy: {
          date: "asc",
        },
      });

    const danaMasuk = danaTaktis
      .filter((row) => row.type === "MASUK")
      .reduce((sum, row) => sum + row.amount, 0);

    const danaKeluar = danaTaktis
      .filter((row) => row.type === "KELUAR")
      .reduce((sum, row) => sum + row.amount, 0);

    const saldoTaktis = danaMasuk - danaKeluar;

    // =====================================================
    // KAS RT
    // =====================================================

    const kas = await prisma.kasTransaction.findMany({
      where: {
        rTUnitId: rTUnitId,
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [
        {
          date: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    const kasPemasukan = kas
      .filter((row) => row.type === "PEMASUKAN")
      .reduce((sum, row) => sum + row.amount, 0);

    const kasPengeluaran = kas
      .filter((row) => row.type === "PENGELUARAN")
      .reduce((sum, row) => sum + row.amount, 0);

    const kasSaldo = kasPemasukan - kasPengeluaran;

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      periode,
      warga: {
        totalKK,
        totalWarga,

        jenisKelamin: {
          lakiLaki,
          perempuan,
        },

        kelompokUsia: {
          balita,
          anak5_9,
          anak10_14,
          remaja15_19,
          dewasa20_59,
          lansia,
          anak,
          dewasa,
        },

        statusTinggal: {
          tetap,
          sewa,
          kontrak,
          menumpang,
          lainnya: tinggalLainnya,
        },
      },

      iuran: {
        totalKKWajib: totalKK,
        totalDataIuran: iuran.length,

        lunas: lunas.length,

        belumBayar: Math.max(
          totalKK - lunas.length,
          0
        ),

        tagihan,
        penerimaan,

        metode: {
          cash,
          transfer,
          qris,
          lainnya: iuranLainnya,
        },

        daftar: iuran.map((row) => ({
          id: row.id,
          kkId: row.kkId,
          nomorKK: row.kk.nomorKK,
          kepalaKeluarga: row.kk.kepalaKeluarga,
          amount: row.amount,
          status: row.status,
          method: row.method,
          paidAt: row.paidAt,
          note: row.note,
        })),
      },

      kas: {
        tersedia: true,
        transaksi: kas.length,
        pemasukan: kasPemasukan,
        pengeluaran: kasPengeluaran,
        saldo: kasSaldo,

        daftar: kas.map((row) => ({
          id: row.id,
          type: row.type,
          amount: row.amount,
          category: row.category,
          description: row.description,
          date: row.date.toISOString(),
        })),
      },

      danaTaktis: {
        transaksi: danaTaktis.length,
        masuk: danaMasuk,
        keluar: danaKeluar,
        saldo: saldoTaktis,

        daftar: danaTaktis.map((row) => ({
          id: row.id,
          type: row.type,
          amount: row.amount,
          category: row.category,
          description: row.description,
          date: row.date.toISOString(),
        })),
      },

      keuangan: {
        iuran: penerimaan,
        kas: kasSaldo,
        danaTaktis: saldoTaktis,
      },
    });
  } catch (error) {
    console.error("LAPORAN_API_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil laporan.",
      },
      {
        status: 500,
      }
    );
  }
}











