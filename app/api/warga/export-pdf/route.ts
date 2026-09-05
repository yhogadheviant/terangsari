import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/app/lib/prisma";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";

function ageFromBirthDate(value: Date | string | null | undefined) {
  if (!value) return "";

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const month = now.getMonth() - d.getMonth();

  if (month < 0 || (month === 0 && now.getDate() < d.getDate())) {
    age--;
  }

  return String(Math.max(0, age));
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return "";

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toISOString().slice(0, 10);
}

function filePart(value: string | null | undefined) {
  return String(value || "RT")
    .replace(/[<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const context = await getRTContext(req);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "WARGA_EXPORT"
    );

    if (permissionResponse) {
      return permissionResponse;
    }

    const rTUnitId = context.rTUnitId;

    if (!rTUnitId) {
      return NextResponse.json(
        { error: "RT aktif tidak ditemukan." },
        { status: 400 }
      );
    }

    const [rt, rows] = await Promise.all([
      prisma.rTUnit.findUnique({
        where: { id: rTUnitId },
        select: {
          kodeRT: true,
          kodeRW: true,
          namaRT: true,
        },
      }),

      prisma.warga.findMany({
        where: { rTUnitId },
        include: { kk: true },
        orderBy: { nama: "asc" },
      }),
    ]);

    if (!rt) {
      return NextResponse.json(
        { error: "Data RT aktif tidak ditemukan." },
        { status: 404 }
      );
    }

    const rtSafe = rt!;

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: {
        top: 35,
        bottom: 35,
        left: 25,
        right: 25,
      },
      info: {
        Title: "Data Kependudukan",
        Author: "Smart RT 011 Terangsari 1",
        Subject: "Data Warga",
      },
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const pageWidth = 841.89;
    const pageHeight = 595.28;

    const columns = [
      { key: "nik", label: "NIK", width: 92 },
      { key: "nama", label: "Nama Lengkap", width: 125 },
      { key: "nomorKK", label: "No. KK", width: 92 },
      { key: "statusTinggal", label: "Status", width: 48 },
      { key: "hubunganKeluarga", label: "Hub. Keluarga", width: 70 },
      { key: "jenisKelamin", label: "JK", width: 38 },
      { key: "alamat", label: "Alamat", width: 130 },
      { key: "tempatLahir", label: "Tempat Lahir", width: 75 },
      { key: "tanggalLahir", label: "Tgl Lahir", width: 55 },
      { key: "usia", label: "Usia", width: 30 },
      { key: "agama", label: "Agama", width: 48 },
      { key: "pendidikan", label: "Pendidikan", width: 65 },
      { key: "pekerjaan", label: "Pekerjaan", width: 75 },
      { key: "statusKawin", label: "Status Kawin", width: 60 },
    ];

    const totalWidth = columns.reduce(
      (sum, column) => sum + column.width,
      0
    );

    const scale = Math.min(1, (pageWidth - 50) / totalWidth);

    const xStart = 25;
    const rowHeight = 18;
    const headerHeight = 28;

    function drawHeader() {
      doc.font("Helvetica-Bold");
      doc.fontSize(7);

      let x = xStart;

      for (const column of columns) {
        const width = column.width * scale;

        doc
          .rect(x, tableY, width, headerHeight)
          .fillAndStroke("#e2e8f0", "#94a3b8");

        doc
          .fillColor("#0f172a")
          .text(column.label, x + 3, tableY + 8, {
            width: width - 6,
            height: headerHeight - 4,
            align: "left",
            ellipsis: true,
          });

        x += width;
      }

      doc.fillColor("#0f172a");
    }

    function drawTitle() {
      doc.font("Helvetica-Bold");
      doc.fontSize(16);
      doc.text("DATA KEPENDUDUKAN", 25, 25, {
        width: pageWidth - 50,
        align: "center",
      });

      doc.font("Helvetica-Bold");
      doc.fontSize(10);
      doc.text(
        `RT ${text(rt!.kodeRT)} / RW ${text(rt!.kodeRW)}`,
        25,
        47,
        {
          width: pageWidth - 50,
          align: "center",
        }
      );

      doc.font("Helvetica");
      doc.fontSize(9);
      doc.text(text(rt!.namaRT), 25, 62, {
        width: pageWidth - 50,
        align: "center",
      });

      doc.fontSize(7);
      doc.fillColor("#475569");
      doc.text(
        `Jumlah warga: ${rows.length} orang    |    Dicetak: ${new Date().toLocaleDateString("id-ID")}`,
        25,
        80,
        {
          width: pageWidth - 50,
          align: "center",
        }
      );

      doc.fillColor("#0f172a");
    }

    let tableY = 98;

    drawTitle();
    drawHeader();

    let y = tableY + headerHeight;

    for (let i = 0; i < rows.length; i++) {
      const w = rows[i];

      if (y + rowHeight > pageHeight - 35) {
        doc.addPage();
        tableY = 35;
        drawHeader();
        y = tableY + headerHeight;
      }

      const nomorKK = w.nomorKK || w.kk?.nomorKK || "";
      const alamat = w.alamat || w.kk?.alamat || "";

      const values = [
        text(w.nik),
        text(w.nama),
        text(nomorKK),
        text(w.statusTinggal),
        text(w.hubunganKeluarga),
        text(w.jenisKelamin),
        text(alamat),
        text(w.tempatLahir),
        dateOnly(w.tanggalLahir),
        w.tanggalLahir
          ? ageFromBirthDate(w.tanggalLahir)
          : text(w.usia),
        text(w.agama),
        text(w.pendidikan),
        text(w.pekerjaan),
        text(w.statusKawin),
      ];

      let x = xStart;

      doc.font("Helvetica");
      doc.fontSize(6.5);

      for (let j = 0; j < columns.length; j++) {
        const column = columns[j];
        const width = column.width * scale;

        if (i % 2 === 0) {
          doc
            .rect(x, y, width, rowHeight)
            .fill("#f8fafc");
        }

        doc
          .rect(x, y, width, rowHeight)
          .stroke("#cbd5e1");

        doc
          .fillColor("#0f172a")
          .text(values[j], x + 2, y + 5, {
            width: width - 4,
            height: rowHeight - 4,
            ellipsis: true,
          });

        x += width;
      }

      y += rowHeight;
    }

    const range = doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#64748b")
        .text(
          `Smart RT 011 Terangsari 1  |  Halaman ${i + 1} dari ${range.count}`,
          25,
          pageHeight - 25,
          {
            width: pageWidth - 50,
            align: "center",
          }
        );
    }

    doc.end();

    const buffer = await pdfPromise;

    const rtData = rt!;
    const rtCode = filePart(rt!.kodeRT);
    const rwCode = filePart(rt!.kodeRW);

    const filename =
      `RT-${rtCode}-RW-${rwCode}-Data-Warga.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("WARGA_EXPORT_PDF_ERROR:", error);

    return NextResponse.json(
      { error: "Gagal mengekspor PDF data warga." },
      { status: 500 }
    );
  }
}







