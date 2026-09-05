import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getRTContext } from "@/app/lib/auth/rt-context";
import * as XLSX from "xlsx";

function getRange(periode: string) {
  if (periode === "ALL") return null;
  if (/^\d{4}$/.test(periode)) {
    const y = Number(periode);
    return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
  const m = /^(\d{4})-(\d{2})$/.exec(periode);
  if (!m) throw new Error("Format periode harus ALL, YYYY, atau YYYY-MM.");
  const y = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12) throw new Error("Bulan tidak valid.");
  return { start: new Date(y, mo - 1, 1), end: new Date(y, mo, 1) };
}

const money = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export async function GET(request: Request) {
  try {
    const context = await getRTContext(request);
    if (context.response) return context.response;
    const permissionResponse = await requirePermission(context.session, "DANA_TAKTIS_VIEW");
    if (permissionResponse) return permissionResponse;
    const rTUnitId = context.rTUnitId!;
    const periode = new URL(request.url).searchParams.get("periode") || "ALL";
    const range = getRange(periode);
    const where: any = { rTUnitId };
    if (range) where.date = { gte: range.start, lt: range.end };

    const rows = await prisma.tacticalFundTransaction.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    let saldo = 0;
    const data = rows.map((r, i) => {
      saldo += r.type === "MASUK" ? r.amount : -r.amount;
      return {
        NO: i + 1,
        TANGGAL: r.date,
        KETERANGAN: r.description || r.category || "-",
        DEBET: r.type === "MASUK" ? r.amount : "",
        KREDIT: r.type === "KELUAR" ? r.amount : "",
        SALDO: saldo,
      };
    });

    const title = `LAPORAN DANA TAKTIS RT 011 - ${periode}`;
    const sheet = XLSX.utils.json_to_sheet(data, { header: ["NO", "TANGGAL", "KETERANGAN", "DEBET", "KREDIT", "SALDO"] });
    sheet["!cols"] = [
      { wch: 7 }, { wch: 16 }, { wch: 50 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Dana Taktis");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("DANA_TAKTIS_EXPORT_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export Excel gagal." }, { status: 500 });
  }
}
