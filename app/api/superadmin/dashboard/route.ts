import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { hasRole } from "@/app/lib/auth/authorization";

function ageFromBirthDate(date: Date | null) {
  if (!date) return null;

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

const BATAS_USIA_PEMILIH = 17;

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Belum login." },
        { status: 401 }
      );
    }

    if (!hasRole(session, ["SUPERADMIN"])) {
      return NextResponse.json(
        {
          error: "Akses hanya untuk Superadmin.",
        },
        { status: 403 }
      );
    }

    const rtUnits = await prisma.rTUnit.findMany({
      where: {
        aktif: true,
      },
      orderBy: [
        {
          kodeRW: "asc",
        },
        {
          kodeRT: "asc",
        },
      ],
      include: {
        kks: true,
        warga: true,
      },
    });

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

      const statusTinggal: Record<string, number> = {};
      const agama: Record<string, number> = {};
      const pekerjaan: Record<string, number> = {};
      const desaAsalKK: Record<string, number> = {};
      const pemilihDesaAsalKK: Record<string, number> = {};

      let lakiLaki = 0;
      let perempuan = 0;
      let pemilihPotensial = 0;

      for (const w of warga) {
        if (w.jenisKelamin === "LAKI_LAKI") {
          lakiLaki++;
        }

        if (w.jenisKelamin === "PEREMPUAN") {
          perempuan++;
        }

        const age = w.tanggalLahir
          ? ageFromBirthDate(w.tanggalLahir)
          : w.usia ?? null;

        const group = ageGroup(age);
        usia[group]++;

        if (
          age !== null &&
          age >= BATAS_USIA_PEMILIH
        ) {
          pemilihPotensial++;
        }

        const tinggal =
          w.statusTinggal || "TIDAK DIKETAHUI";

        statusTinggal[tinggal] =
          (statusTinggal[tinggal] || 0) + 1;

        const agamaValue =
          w.agama?.trim() || "Tidak diketahui";

        agama[agamaValue] =
          (agama[agamaValue] || 0) + 1;

        const pekerjaanValue =
          w.pekerjaan?.trim() || "Tidak diketahui";

        pekerjaan[pekerjaanValue] =
          (pekerjaan[pekerjaanValue] || 0) + 1;

        const desa =
          w.daerahKKAsal?.trim() ||
          "Tidak diketahui";

        if (
          age !== null &&
          age >= BATAS_USIA_PEMILIH
        ) {
          pemilihDesaAsalKK[desa] =
            (pemilihDesaAsalKK[desa] || 0) + 1;
        }

      }

      // Rekap KK unik berdasarkan desa asal KK.
      // Setiap KK dihitung satu kali, tidak berdasarkan jumlah anggota keluarga.
      for (const kk of unit.kks) {
        const desa =
          warga.find((w) => w.kkId === kk.id)?.daerahKKAsal?.trim() ||
          "Tidak diketahui";

        desaAsalKK[desa] =
          (desaAsalKK[desa] || 0) + 1;
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

        jenisKelamin: {
          lakiLaki,
          perempuan,
        },

        usia,
        statusTinggal,
        agama,
        pekerjaan,
        desaAsalKK,
        pemilihDesaAsalKK,
        pemilihPotensial,

        // =================================================
        // DETAIL KK
        // =================================================

        kks: unit.kks.map((kk) => ({
          id: kk.id,
          nomorKK: kk.nomorKK,
          kepalaKeluarga: kk.kepalaKeluarga,
          alamat: kk.alamat,

          warga: warga
            .filter((w) => w.kkId === kk.id)
            .map((w) => {
              const age = w.tanggalLahir
                ? ageFromBirthDate(w.tanggalLahir)
                : w.usia ?? null;

              return {
                id: w.id,
                nik: w.nik,
                nama: w.nama,
                nomorKK: kk.nomorKK,
                jenisKelamin: w.jenisKelamin,
                hubunganKeluarga: w.hubunganKeluarga,
                tempatLahir: w.tempatLahir,
                tanggalLahir: w.tanggalLahir,
                usia: age,
                agama: w.agama,
                pendidikan: w.pendidikan,
                pekerjaan: w.pekerjaan,
                statusKawin: w.statusKawin,
                statusTinggal: w.statusTinggal,
                alamat: w.alamat,
              };
            }),
        })),

        // =================================================
        // DAFTAR PEMILIH POTENSIAL
        // =================================================

        daftarPemilih: warga
          .map((w) => {
            const age = w.tanggalLahir
              ? ageFromBirthDate(w.tanggalLahir)
              : w.usia ?? null;

            return {
              id: w.id,
              nik: w.nik,
              nama: w.nama,
              nomorKK:
                unit.kks.find(
                  (kk) => kk.id === w.kkId
                )?.nomorKK ?? "",
              jenisKelamin: w.jenisKelamin,
              umur: age,
              alamat: w.alamat,
            };
          })
          .filter(
            (w) =>
              w.umur !== null &&
              w.umur >= BATAS_USIA_PEMILIH
          ),
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

      pemilihPotensial: rt.reduce(
        (sum, x) =>
          sum + x.pemilihPotensial,
        0
      ),

      lakiLaki: rt.reduce(
        (sum, x) =>
          sum + x.jenisKelamin.lakiLaki,
        0
      ),

      perempuan: rt.reduce(
        (sum, x) =>
          sum + x.jenisKelamin.perempuan,
        0
      ),
    };

    return NextResponse.json({
      success: true,
      batasUsiaPemilih:
        BATAS_USIA_PEMILIH,
      total,
      rt,
    });
  } catch (error) {
    console.error(
      "SUPERADMIN_DASHBOARD_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Gagal mengambil data Dashboard Multi-RT.",
      },
      { status: 500 }
    );
  }
}








