import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { requireRole } from "@/app/lib/auth/authorization";

function clean(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function parseAmount(value: unknown): number {
  const n = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function parseDate(value: unknown): Date {
  if (!value) return new Date();

  const text = clean(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }

  return date;
}

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
    const session = await getSession();

    if (!session) return jsonError("Belum login.", 401);

    if (!session.rTUnitId) {
      return jsonError("Akun belum memiliki RT.", 403);
    }

    const url = new URL(request.url);

    const periode =
      url.searchParams.get("periode") ||
      new Date().toISOString().slice(0, 7);

    const { start, end } = getPeriodRange(periode);

    const rows = await prisma.kasTransaction.findMany({
      where: {
        rTUnitId: session.rTUnitId,
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
    });

    const normalized = rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      category: row.category,
      description: row.description,
      date: row.date.toISOString(),
    }));

    const pemasukan = normalized
      .filter((row) => row.type === "PEMASUKAN")
      .reduce((sum, row) => sum + row.amount, 0);

    const pengeluaran = normalized
      .filter((row) => row.type === "PENGELUARAN")
      .reduce((sum, row) => sum + row.amount, 0);

    const saldo = pemasukan - pengeluaran;

    return NextResponse.json({
      success: true,
      periode,
      rows: normalized,
      summary: {
        pemasukan,
        pengeluaran,
        saldo,
      },
    });
  } catch (error) {
    console.error("KAS_GET_ERROR:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal membaca Kas RT.",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const denied = requireRole(session, ["KETUA", "BENDAHARA"]);

    if (denied) return denied;

    const body = await request.json();
    const type = clean(body.type).toUpperCase();

    if (type !== "PEMASUKAN" && type !== "PENGELUARAN") {
      return jsonError("Jenis transaksi tidak valid.", 400);
    }

    const amount = parseAmount(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError("Nominal harus lebih dari 0.", 400);
    }

    const category = clean(body.category);

    if (!category) {
      return jsonError("Kategori wajib diisi.", 400);
    }

    const description = clean(body.description) || null;
    const date = parseDate(body.date);

    const row = await prisma.kasTransaction.create({
      data: {
        type: type as "PEMASUKAN" | "PENGELUARAN",
        amount,
        category,
        description,
        date,
        rTUnitId: session!.rTUnitId!,
      },
    });

    return NextResponse.json({
      success: true,
      ok: true,
      row: {
        id: row.id,
        type: row.type,
        amount: row.amount,
        category: row.category,
        description: row.description,
        date: row.date.toISOString(),
      },
    });
  } catch (error) {
    console.error("KAS_POST_ERROR:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal menyimpan transaksi Kas RT.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    const denied = requireRole(session, ["KETUA", "BENDAHARA"]);

    if (denied) return denied;

    const body = await request.json();
    const id = clean(body.id);

    if (!id) {
      return jsonError("ID transaksi tidak ada.", 400);
    }

    const existing = await prisma.kasTransaction.findFirst({
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

    const type = clean(body.type).toUpperCase();

    if (type !== "PEMASUKAN" && type !== "PENGELUARAN") {
      return jsonError("Jenis transaksi tidak valid.", 400);
    }

    const amount = parseAmount(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError("Nominal harus lebih dari 0.", 400);
    }

    const category = clean(body.category);

    if (!category) {
      return jsonError("Kategori wajib diisi.", 400);
    }

    const description = clean(body.description) || null;
    const date = parseDate(body.date);

    const row = await prisma.kasTransaction.update({
      where: { id },
      data: {
        type: type as "PEMASUKAN" | "PENGELUARAN",
        amount,
        category,
        description,
        date,
      },
    });

    return NextResponse.json({
      success: true,
      ok: true,
      row: {
        id: row.id,
        type: row.type,
        amount: row.amount,
        category: row.category,
        description: row.description,
        date: row.date.toISOString(),
      },
    });
  } catch (error) {
    console.error("KAS_PATCH_ERROR:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal mengubah transaksi Kas RT.",
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    const denied = requireRole(session, ["KETUA", "BENDAHARA"]);

    if (denied) return denied;

    const url = new URL(request.url);
    const id = clean(url.searchParams.get("id"));

    if (!id) {
      return jsonError("ID transaksi tidak ada.", 400);
    }

    const existing = await prisma.kasTransaction.findFirst({
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

    await prisma.kasTransaction.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      ok: true,
    });
  } catch (error) {
    console.error("KAS_DELETE_ERROR:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal menghapus transaksi Kas RT.",
      500
    );
  }
}


