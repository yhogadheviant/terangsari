import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { hasRole } from "@/app/lib/auth/authorization";

const BATAS_USIA_PEMILIH = 17;

function ageFromBirthDate(date: Date | null, fallback: number | null) {
  if (!date) return fallback;

  const now = new Date();

  let age =
    now.getFullYear() -
    date.getFullYear();

  const month =
    now.getMonth() -
    date.getMonth();

  if (
    month < 0 ||
    (month === 0 &&
      now.getDate() < date.getDate())
  ) {
    age--;
  }

  return age;
}

function ageGroup(age: number | null) {
  if (age === null) return "Tidak diketahui";
  if (age <= 5) return "0-5";
  if (age <= 12) return "6-12";
  if (age <= 17) return "13-17";
  if (age <= 25) return "18-25";
  if (age <= 40) return "26-40";
  if (age <= 59) return "41-59";
  return "60+";
}

function jsonError(error: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return jsonError("Belum login.", 401);
    }

    if (!hasRole(session, ["SUPERADMIN"])) {
      return jsonError(
        "Akses hanya untuk Superadmin.",
        403
      );
    }

    const url = new URL(request.url);

    const rtId =
      url.searchParams.get("rtId")?.trim() || "all";

    const kkId =
      url.searchParams.get("kkId")?.trim() || "all";

    const rtWhere =
      rtId !== "all"
        ? { id: rtId }
        : {};

    const rtUnits =
      await prisma.rTUnit.findMany({
        where: {
          aktif: true,
          ...rtWhere,
        },
        orderBy: [
          { kodeRW: "asc" },
          { kodeRT: "asc" },
        ],
        include: {
          kks: {
            where:
              kkId !== "all"
                ? { id: kkId }
                : undefined,
            orderBy: {
              nomorKK: "asc",
            },
            include: {
              warga: {
                orderBy: {
                  nama: "asc",
                },
              },
            },
          },
          warga: {
            where:
              kkId !== "all"
                ? { kkId }
                : undefined,
            orderBy: {
              nama: "asc",
            },
          },
        },
      });

    if (kkId !== "all") {
      const kkExists = rtUnits.some((unit) =>
        unit.kks.some((kk) => kk.id === kkId)
      );

      if (!kkExists) {
        return jsonError(
          "KK tidak ditemukan pada RT yang dipilih.",
          400
        );
      }
    }

    const rt = rtUnits.map((unit) => {
      const warga = unit.warga;

      const usia: Record<string, number> = {
        "0-5": 0,
        "6-12": 0,
        "13-17": 0,
        "18-25": 0,
        "26-40": 0,
        "41-59": 0,
        "60+": 0,
        "Tidak diketahui": 0,
      };

      let lakiLaki = 0;
      let perempuan = 0;
      let pemilih = 0;

      const daftarPemilih = warga
        .map((w) => {
          const age = ageFromBirthDate(
            w.tanggalLahir,
            w.usia ?? null
          );

          return {
            ...w,
            umurLaporan: age,
          };
        })
        .filter((w) => {
          if (
            w.umurLaporan !== null &&
            w.umurLaporan >= BATAS_USIA_PEMILIH
          ) {
            pemilih++;
            return true;
          }

          return false;
        });

      for (const w of warga) {
        if (w.jenisKelamin === "LAKI_LAKI") {
          lakiLaki++;
        }

        if (w.jenisKelamin === "PEREMPUAN") {
          perempuan++;
        }

        const age = ageFromBirthDate(
          w.tanggalLahir,
          w.usia ?? null
        );

        usia[ageGroup(age)]++;
      }

      return {
        id: unit.id,
        kodeRT: unit.kodeRT,
        kodeRW: unit.kodeRW,
        namaRT: unit.namaRT,
        perumahan: unit.perumahan,
        desa: unit.desa,
        kecamatan: unit.kecamatan,
        kabupaten: unit.kabupaten,

        totalKK: unit.kks.length,
        totalWarga: warga.length,

        lakiLaki,
        perempuan,

        usia,

        pemilih,

        kks: unit.kks.map((kk) => ({
          id: kk.id,
          nomorKK: kk.nomorKK,
          kepalaKeluarga: kk.kepalaKeluarga,
          alamat: kk.alamat,
          rt: kk.rt,
          rw: kk.rw,
          statusTinggal: kk.statusTinggal,
          nomorHP: kk.nomorHP,

          warga: kk.warga.map((w) => ({
            id: w.id,
            nik: w.nik,
            nama: w.nama,
            nomorKK: w.nomorKK,
            jenisKelamin: w.jenisKelamin,
            hubunganKeluarga: w.hubunganKeluarga,
            tempatLahir: w.tempatLahir,
            tanggalLahir: w.tanggalLahir,
            usia: w.usia,
            agama: w.agama,
            pendidikan: w.pendidikan,
            pekerjaan: w.pekerjaan,
            statusKawin: w.statusKawin,
            statusTinggal: w.statusTinggal,
            alamat: w.alamat,
            rt: w.rt,
            rw: w.rw,
          })),
        })),

        daftarPemilih: daftarPemilih.map((w) => ({
          id: w.id,
          nik: w.nik,
          nama: w.nama,
          nomorKK: w.nomorKK,
          jenisKelamin: w.jenisKelamin,
          umur: w.umurLaporan,
          alamat: w.alamat,
          rt: w.rt,
          rw: w.rw,
        })),
      };
    });

    const total = {
      totalRT: rt.length,

      totalKK: rt.reduce(
        (sum, x) => sum + x.totalKK,
        0
      ),

      totalWarga: rt.reduce(
        (sum, x) => sum + x.totalWarga,
        0
      ),

      lakiLaki: rt.reduce(
        (sum, x) => sum + x.lakiLaki,
        0
      ),

      perempuan: rt.reduce(
        (sum, x) => sum + x.perempuan,
        0
      ),

      pemilih: rt.reduce(
        (sum, x) => sum + x.pemilih,
        0
      ),

      usia: {
        "0-5": rt.reduce(
          (sum, x) => sum + x.usia["0-5"],
          0
        ),
        "6-12": rt.reduce(
          (sum, x) => sum + x.usia["6-12"],
          0
        ),
        "13-17": rt.reduce(
          (sum, x) => sum + x.usia["13-17"],
          0
        ),
        "18-25": rt.reduce(
          (sum, x) => sum + x.usia["18-25"],
          0
        ),
        "26-40": rt.reduce(
          (sum, x) => sum + x.usia["26-40"],
          0
        ),
        "41-59": rt.reduce(
          (sum, x) => sum + x.usia["41-59"],
          0
        ),
        "60+": rt.reduce(
          (sum, x) => sum + x.usia["60+"],
          0
        ),
        "Tidak diketahui": rt.reduce(
          (sum, x) =>
            sum + x.usia["Tidak diketahui"],
          0
        ),
      },
    };

    return NextResponse.json({
      success: true,
      filter: {
        rtId,
        kkId,
      },
      batasUsiaPemilih:
        BATAS_USIA_PEMILIH,
      total,
      rt,
    });
  } catch (error) {
    console.error(
      "SUPERADMIN_LAPORAN_ERROR:",
      error
    );

    return jsonError(
      "Gagal mengambil data laporan Superadmin.",
      500
    );
  }
}
