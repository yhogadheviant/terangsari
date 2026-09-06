import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { logActivity } from "@/app/lib/activity-log";
import PDFDocument from "pdfkit";

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

const rupiah = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export async function GET(request: Request) {
  try {
    const context = await getRTContext(request);
    if (context.response) return context.response;
    const permissionResponse = await requirePermission(context.session, "DANA_TAKTIS_VIEW");
    if (permissionResponse) return permissionResponse;
    const rTUnitId = context.rTUnitId!;

    const rtUnit = await prisma.rTUnit.findUnique({
      where: { id: rTUnitId },
      select: {
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
      return NextResponse.json(
        { error: "Data RT tidak ditemukan." },
        { status: 404 }
      );
    }

    const periode = new URL(request.url).searchParams.get("periode") || "ALL";
    const range = getRange(periode);
    const where: any = { rTUnitId };
    if (range) where.date = { gte: range.start, lt: range.end };

    const rows = await prisma.tacticalFundTransaction.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    let masuk = 0, keluar = 0, saldo = 0;
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const rtIdentity = [
      `RT ${rtUnit.kodeRT} / RW ${rtUnit.kodeRW}`,
      rtUnit.namaRT,
      rtUnit.perumahan,
    ]
      .filter(Boolean)
      .join(" - ");

    const rtLocation = [
      rtUnit.desa,
      rtUnit.kecamatan,
      rtUnit.kabupaten,
    ]
      .filter(Boolean)
      .join(" - ");

    doc.fontSize(15).font("Helvetica-Bold").text("LAPORAN DANA TAKTIS", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(rtIdentity, { align: "center" });

    if (rtLocation) {
      doc.fontSize(8).text(rtLocation, { align: "center" });
    }

    doc.fontSize(10).text(`Periode: ${periode === "ALL" ? "Keseluruhan" : periode}`, { align: "center" });
    doc.moveDown();

    const x = [30, 80, 170, 470, 590, 710];
    const widths = [50, 90, 300, 120, 120, 80];
    const headers = ["No", "Tanggal", "Keterangan", "Debet", "Kredit", "Saldo"];
    let y = doc.y;

    function cell(text: string, i: number, yy: number, bold = false) {
      doc.rect(x[i], yy, widths[i], 22).stroke();
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).text(text, x[i] + 4, yy + 7, { width: widths[i] - 8, lineBreak: false });
    }
    headers.forEach((h, i) => cell(h, i, y, true));
    y += 22;

    rows.forEach((r, idx) => {
      if (r.type === "MASUK") { masuk += r.amount; saldo += r.amount; }
      else { keluar += r.amount; saldo -= r.amount; }
      if (y > 535) { doc.addPage(); y = 30; headers.forEach((h, i) => cell(h, i, y, true)); y += 22; }
      const values = [
        String(idx + 1),
        r.date.toLocaleDateString("id-ID"),
        r.description || r.category || "-",
        r.type === "MASUK" ? rupiah(r.amount) : "-",
        r.type === "KELUAR" ? rupiah(r.amount) : "-",
        rupiah(saldo),
      ];
      values.forEach((v, i) => cell(v, i, y));
      y += 22;
    });

    y += 10;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(`Total Debet: Rp ${rupiah(masuk)}    Total Kredit: Rp ${rupiah(keluar)}    Saldo: Rp ${rupiah(saldo)}`, 30, y);
    doc.end();

    await new Promise<void>((resolve) => doc.on("end", () => resolve()));
    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "EXPORT_PDF",
      description: `Export PDF Dana Taktis periode ${periode}`,
      module: "DANA_TAKTIS",
      targetType: "TacticalFundTransaction",
      metadata: {
        periode,
        jumlahTransaksi: rows.length,
        totalMasuk: masuk,
        totalKeluar: keluar,
        saldo,
        fileName: `Laporan_Dana_Taktis_${periode}.pdf`,
      },
      rTUnitId,
      request,
    });
    const buffer = Buffer.concat(chunks);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Laporan_Dana_Taktis_${periode}.pdf"`,
      },
    });
  } catch (error) {
    console.error("DANA_TAKTIS_PDF_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export PDF gagal." }, { status: 500 });
  }
}
