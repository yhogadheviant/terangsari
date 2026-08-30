import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";

const groups = [
  { key: "0-5", label: "05 Tahun", min: 0, max: 5 },
  { key: "6-12", label: "612 Tahun", min: 6, max: 12 },
  { key: "13-17", label: "1317 Tahun", min: 13, max: 17 },
  { key: "18-25", label: "1825 Tahun", min: 18, max: 25 },
  { key: "26-35", label: "2635 Tahun", min: 26, max: 35 },
  { key: "36-45", label: "3645 Tahun", min: 36, max: 45 },
  { key: "46-55", label: "4655 Tahun", min: 46, max: 55 },
  { key: "56-65", label: "5665 Tahun", min: 56, max: 65 },
  { key: "65+", label: "65+ Tahun", min: 66, max: 999 },
];

function ageFromDate(value: Date | null) {
  if (!value) return null;

  const now = new Date();

  let age =
    now.getFullYear() -
    value.getFullYear();

  const m =
    now.getMonth() -
    value.getMonth();

  if (
    m < 0 ||
    (m === 0 && now.getDate() < value.getDate())
  ) {
    age--;
  }

  return age < 0 ? null : age;
}

export async function GET() {
  try {
    // ==========================================
    // SESSION
    // ==========================================
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Belum login." },
        { status: 401 }
      );
    }

    if (!session.rTUnitId) {
      return NextResponse.json(
        { error: "Akun belum memiliki RT." },
        { status: 403 }
      );
    }

    // ==========================================
    // DATA WARGA  HANYA RT YANG LOGIN
    // ==========================================
    const warga = await prisma.warga.findMany({
      where: {
        rTUnitId: session.rTUnitId,
      },
      select: {
        id: true,
        nik: true,
        nama: true,
        jenisKelamin: true,
        usia: true,
        tanggalLahir: true,
        statusTinggal: true,
        pekerjaan: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    // ==========================================
    // NORMALISASI USIA
    // ==========================================
    const normalized = warga.map((w) => ({
      ...w,
      usia: w.tanggalLahir
        ? ageFromDate(w.tanggalLahir)
        : w.usia,
    }));

    // ==========================================
    // KELOMPOK USIA
    // ==========================================
    const result = groups.map((g) => {
      const members = normalized.filter(
        (w) =>
          typeof w.usia === "number" &&
          w.usia >= g.min &&
          w.usia <= g.max
      );

      return {
        ...g,
        total: members.length,

        lakiLaki: members.filter(
          (w) => w.jenisKelamin === "LAKI_LAKI"
        ).length,

        perempuan: members.filter(
          (w) => w.jenisKelamin === "PEREMPUAN"
        ).length,

        members,
      };
    });

    // ==========================================
    // USIA TIDAK DIKETAHUI
    // ==========================================
    const unknown = normalized.filter(
      (w) => typeof w.usia !== "number"
    );

    // ==========================================
    // RESPONSE
    // ==========================================
    return NextResponse.json({
      success: true,

      totalWarga: normalized.length,

      totalDenganUsia: normalized.filter(
        (w) => typeof w.usia === "number"
      ).length,

      tanpaUsia: unknown.length,

      groups: result,

      unknown,
    });
  } catch (e) {
    console.error("KELOMPOK_USIA_API_ERROR:", e);

    return NextResponse.json(
      {
        success: false,
        error: "Gagal membaca kelompok usia.",
      },
      {
        status: 500,
      }
    );
  }
}


