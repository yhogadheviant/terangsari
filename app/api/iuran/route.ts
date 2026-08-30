import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";

const DEFAULT_AMOUNT = 40000;

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/* =========================================================
   GET
   Daftar KK + status iuran + QRIS
========================================================= */

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return jsonError("Belum login.", 401);
    }

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }
    const url = new URL(request.url);

    const periode =
      url.searchParams.get("periode") ||
      new Date().toISOString().slice(0, 7);

    const [kks, iuran, qris] = await Promise.all([
      prisma.kK.findMany({
        where: {
          rTUnitId: session.rTUnitId,
        },
        orderBy: {
          kepalaKeluarga: "asc",
        },
        select: {
          id: true,
          nomorKK: true,
          kepalaKeluarga: true,
          alamat: true,
          warga: {
            select: {
              id: true,
            },
          },
        },
      }),

      prisma.iuran.findMany({
        where: {
          periode,
          kk: {
            rTUnitId: session.rTUnitId,
          },
        },
        include: {
          kk: {
            select: {
              id: true,
              nomorKK: true,
              kepalaKeluarga: true,
              alamat: true,
              warga: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
        orderBy: {
          kk: {
            kepalaKeluarga: "asc",
          },
        },
      }),

      prisma.qRISConfig.findFirst({
        where: {
          rTUnitId: session.rTUnitId,
          active: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);

    const iuranMap = new Map(
      iuran.map((item) => [item.kkId, item])
    );

    const rows = kks.map((kk) => {
      const item = iuranMap.get(kk.id);

      return {
        id: item?.id || `pending-${kk.id}`,
        kkId: kk.id,
        nomorKK: kk.nomorKK,
        kepalaKeluarga: kk.kepalaKeluarga,
        alamat: kk.alamat,
        periode,
        amount: item?.amount ?? DEFAULT_AMOUNT,
        status: item?.status ?? "BELUM_BAYAR",
        method: item?.method ?? null,
        jumlahAnggota: kk.warga.length,
        paidAt: item?.paidAt ?? null,
        note: item?.note ?? null,
      };
    });

    return NextResponse.json({
      periode,
      kks: kks.map((kk) => ({
        id: kk.id,
        nomorKK: kk.nomorKK,
        kepalaKeluarga: kk.kepalaKeluarga,
        alamat: kk.alamat,
      })),
      iuran: rows,
      qris:
        qris || {
          id: "default",
          merchantName: "",
          qrisName: "",
          qrisString: "",
          imageUrl: "",
          active: true,
        },
    });
  } catch (error) {
    console.error("GET_IURAN_ERROR:", error);

    return jsonError(
      "Gagal mengambil data iuran."
    );
  }
}

/* =========================================================
   POST
   Catat pembayaran / Simpan Lunas
========================================================= */

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return jsonError("Belum login.", 401);
    }

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const body = await request.json();
        // =====================================================
    // GENERATE TAGIHAN IURAN SEMUA KK
    // =====================================================

    if (body.action === "generate") {
      const periode = String(body.periode || "").trim();

      const amount = Number(
        body.amount || DEFAULT_AMOUNT
      );

      if (!/^\d{4}-\d{2}$/.test(periode)) {
        return jsonError(
          "Format periode harus YYYY-MM.",
          400
        );
      }

      if (!amount || amount <= 0) {
        return jsonError(
          "Nominal iuran tidak valid.",
          400
        );
      }

      // Ambil seluruh KK
      const kks = await prisma.kK.findMany({
        where: {
          rTUnitId: session.rTUnitId,
        },
        select: {
          id: true,
        },
      });

      if (kks.length === 0) {
        return jsonError(
          "Belum ada data KK.",
          400
        );
      }

      // Ambil tagihan yang sudah ada
      const existing = await prisma.iuran.findMany({
        where: {
          periode,
          kk: {
            rTUnitId: session.rTUnitId,
          },
        },
        select: {
          kkId: true,
        },
      });

      const existingSet = new Set(
        existing.map((item) => item.kkId)
      );

      // Hanya buat tagihan yang belum ada
      const dataBaru = kks
        .filter((kk) => !existingSet.has(kk.id))
        .map((kk) => ({
          kkId: kk.id,
          periode,
          amount,
          status: "BELUM_BAYAR" as const,
        }));

      if (dataBaru.length > 0) {
        await prisma.iuran.createMany({
          data: dataBaru,
          skipDuplicates: true,
        });
      }

      const totalSudahAda = existing.length;
      const totalDitambahkan = dataBaru.length;

      return NextResponse.json({
        success: true,
        message:
          totalDitambahkan > 0
            ? `Berhasil membuat ${totalDitambahkan} tagihan iuran.`
            : "Semua KK sudah memiliki tagihan untuk periode tersebut.",

        periode,

        nominal: amount,

        totalKK: kks.length,

        sudahAda: totalSudahAda,

        ditambahkan: totalDitambahkan,

        totalTagihan: kks.length,
      });
    }
    const kkId = String(body.kkId || "").trim();
    const periode = String(body.periode || "").trim();

    const amount = Number(body.amount || DEFAULT_AMOUNT);

    const method = String(
      body.method || "CASH"
    ).trim();

    const note =
      body.note == null
        ? null
        : String(body.note).trim();

    if (!kkId) {
      return jsonError(
        "Kepala Keluarga wajib dipilih.",
        400
      );
    }

    if (!periode) {
      return jsonError(
        "Periode wajib diisi.",
        400
      );
    }

    if (!amount || amount <= 0) {
      return jsonError(
        "Nominal pembayaran tidak valid.",
        400
      );
    }

    const kk = await prisma.kK.findFirst({
      where: {
        id: kkId,
        rTUnitId: session.rTUnitId,
      },
    });

    if (!kk) {
      return jsonError(
        "Data Kepala Keluarga tidak ditemukan.",
        404
      );
    }

    const existing = await prisma.iuran.findUnique({
      where: {
        kkId_periode: {
          kkId,
          periode,
        },
      },
    });

    if (existing) {
      if (existing.status === "LUNAS") {
        return jsonError(
          "Iuran KK ini sudah LUNAS untuk periode tersebut.",
          400
        );
      }

      const updated = await prisma.iuran.update({
        where: {
          id: existing.id,
        },
        data: {
          amount,
          status: "LUNAS",
          method,
          note,
          paidAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Pembayaran berhasil dicatat.",
        data: updated,
      });
    }

    const created = await prisma.iuran.create({
      data: {
        kkId,
        periode,
        amount,
        status: "LUNAS",
        rTUnitId: session.rTUnitId,
        method,
        note,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil dicatat.",
      data: created,
    });
  } catch (error) {
    console.error("POST_IURAN_ERROR:", error);

    return jsonError(
      "Gagal menyimpan pembayaran."
    );
  }
}

/* =========================================================
   PATCH
   Batalkan Lunas
========================================================= */

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return jsonError("Belum login.", 401);
    }

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const rawBody = await request.text();

let body: any = {};

try {
  body = rawBody
    ? JSON.parse(rawBody)
    : {};
} catch (error) {
  console.error(
    "POST_IURAN_INVALID_JSON:",
    rawBody
  );

  return jsonError(
    "Data JSON dari permintaan tidak valid.",
    400
  );
}

    const id = String(body.id || "").trim();

    if (!id) {
      return jsonError(
        "ID iuran wajib diisi.",
        400
      );
    }

    const existing = await prisma.iuran.findFirst({
      where: {
        id,
        kk: {
          rTUnitId: session.rTUnitId,
        },
      },
    });

    if (!existing) {
      return jsonError(
        "Data iuran tidak ditemukan.",
        404
      );
    }

    const updated = await prisma.iuran.update({
      where: {
        id,
      },
      data: {
        status: "BELUM_BAYAR",
        paidAt: null,
        method: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil dibatalkan.",
      data: updated,
    });
  } catch (error) {
    console.error(
      "PATCH_IURAN_ERROR:",
      error
    );

    return jsonError(
      "Gagal membatalkan pembayaran."
    );
  }
}

/* =========================================================
   PUT
   Simpan konfigurasi QRIS
========================================================= */

export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return jsonError("Belum login.", 401);
    }

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const body = await request.json();

    const merchantName = String(
      body.merchantName || ""
    ).trim();

    const qrisName = String(
      body.qrisName || ""
    ).trim();

    const qrisString = String(
      body.qrisString || ""
    ).trim();

    const imageUrl = String(
      body.imageUrl || ""
    ).trim();

    const active =
      body.active !== false;

    const existingQris = await prisma.qRISConfig.findFirst({
      where: {
        rTUnitId: session.rTUnitId,
      },
    });

    const qris = existingQris
      ? await prisma.qRISConfig.update({
          where: {
            id: existingQris.id,
          },
          data: {
            merchantName,
            qrisName,
            qrisString,
            imageUrl,
            active,
          },
        })
      : await prisma.qRISConfig.create({
          data: {
            id: `qris-${session.rTUnitId}`,
            merchantName,
            qrisName,
            qrisString,
            imageUrl,
            active,
            rTUnitId: session.rTUnitId,
          },
        });

    return NextResponse.json({
      success: true,
      message: "QRIS berhasil disimpan.",
      data: qris,
    });
  } catch (error) {
    console.error(
      "PUT_QRIS_ERROR:",
      error
    );

    return jsonError(
      "Gagal menyimpan QRIS."
    );
  }
}


