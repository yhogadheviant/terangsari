import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { requireRole } from "@/app/lib/auth/authorization";

function text(v: unknown) {
  return v == null ? "" : String(v).trim();
}

function amountNumber(v: unknown) {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) return jsonError("Belum login.", 401);

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const rows = await prisma.tacticalFundTransaction.findMany({
      where: {
        rTUnitId: session.rTUnitId,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const masuk = rows
      .filter((x) => x.type === "MASUK")
      .reduce((s, x) => s + x.amount, 0);

    const keluar = rows
      .filter((x) => x.type === "KELUAR")
      .reduce((s, x) => s + x.amount, 0);

    return NextResponse.json({
      rows: rows.map((x) => ({
        id: x.id,
        type: x.type,
        amount: x.amount,
        category: x.category,
        description: x.description,
        date: x.date.toISOString(),
      })),
      summary: {
        masuk,
        keluar,
        saldo: masuk - keluar,
      },
    });
  } catch (error) {
    console.error("DANA_TAKTIS_GET_ERROR", error);

    return NextResponse.json(
      {
        error: "Gagal membaca Dana Taktis.",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const denied = requireRole(session, ["KETUA", "BENDAHARA"]);

    if (denied) return denied;

    const body = await request.json();

    const type = text(body.type).toUpperCase();

    if (type !== "MASUK" && type !== "KELUAR") {
      return jsonError("Jenis transaksi tidak valid.", 400);
    }

    const amount = amountNumber(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError("Nominal harus lebih dari 0.", 400);
    }

    const category = text(body.category);

    if (!category) {
      return jsonError("Kategori wajib diisi.", 400);
    }

    const date = body.date
      ? new Date(`${text(body.date)}T00:00:00`)
      : new Date();

    if (Number.isNaN(date.getTime())) {
      return jsonError("Tanggal tidak valid.", 400);
    }

    if (type === "KELUAR") {
      const aggregate =
        await prisma.tacticalFundTransaction.aggregate({
          _sum: { amount: true },
          where: {
            rTUnitId: session!.rTUnitId!,
            type: "MASUK",
          },
        });

      const incoming = Number(
        aggregate._sum.amount ?? 0
      );

      const outgoing =
        await prisma.tacticalFundTransaction.aggregate({
          _sum: { amount: true },
          where: {
            rTUnitId: session!.rTUnitId!,
            type: "KELUAR",
          },
        });

      const spent = Number(
        outgoing._sum.amount ?? 0
      );

      const balance = incoming - spent;

      if (amount > balance) {
        return NextResponse.json(
          {
            error:
              "Saldo Dana Taktis tidak mencukupi.",
            saldo: balance,
          },
          { status: 400 }
        );
      }
    }

    const row =
      await prisma.tacticalFundTransaction.create({
        data: {
          type: type as "MASUK" | "KELUAR",
          amount,
          category,
          description:
            text(body.description) || null,
          date,
          rTUnitId: session!.rTUnitId!,
        },
      });

    return NextResponse.json({
      ok: true,
      row,
    });
  } catch (error) {
    console.error(
      "DANA_TAKTIS_POST_ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "Gagal menyimpan transaksi Dana Taktis.",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    const denied = requireRole(session, ["KETUA", "BENDAHARA"]);

    if (denied) return denied;

    const id = text(
      new URL(request.url).searchParams.get("id")
    );

    if (!id) {
      return jsonError(
        "ID transaksi tidak ada.",
        400
      );
    }

    const existing =
      await prisma.tacticalFundTransaction.findFirst({
        where: {
          id,
          rTUnitId: session!.rTUnitId!,
        },
      });

    if (!existing) {
      return jsonError(
        "Transaksi tidak ditemukan atau bukan milik RT Anda.",
        404
      );
    }

    await prisma.tacticalFundTransaction.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "DANA_TAKTIS_DELETE_ERROR",
      error
    );

    return NextResponse.json(
      {
        error: "Gagal menghapus transaksi.",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}


