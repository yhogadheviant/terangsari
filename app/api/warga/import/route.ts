import { NextResponse } from "next/server";
import {
  StatusTinggal,
  JenisKelamin,
  HubunganKeluarga,
} from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { logActivity } from "@/app/lib/activity-log";

function clean(v: unknown) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function enumValue(v: unknown, allowed: string[], fallback: string) {
  const value = clean(v).toUpperCase().replace(/[\s-]+/g, "_");
  return allowed.includes(value) ? value : fallback;
}

function dateValue(v: unknown) {
  const s = clean(v);
  if (!s) return null;

  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);

  if (m) {
    const [, a, b, y] = m;
    const first = Number(a);
    const second = Number(b);
    const year = Number(y);

    if (first > 31) {
      const d = new Date(`${a}-${b}-${y}T00:00:00`);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(year, second - 1, first);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ageFromBirthDate(value: Date | null) {
  if (!value) return null;

  const now = new Date();
  let age = now.getFullYear() - value.getFullYear();
  const m = now.getMonth() - value.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < value.getDate())) {
    age--;
  }

  return age < 0 ? null : age;
}

const allowedJK = ["LAKI_LAKI", "PEREMPUAN"];

const allowedHubungan = [
  "KEPALA_KELUARGA",
  "ISTRI",
  "SUAMI",
  "ANAK",
  "ORANG_TUA",
  "MERTUA",
  "LAINNYA",
];

const allowedTinggal = [
  "TETAP",
  "SEWA",
  "KONTRAK",
  "MENUMPANG",
  "LAINNYA",
];

export async function POST(req: Request) {
  try {
    const context = await getRTContext(req);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "WARGA_IMPORT"
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
    const body = await req.json();
    const rows = body?.rows;

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Data import tidak valid." },
        { status: 400 }
      );
    }

    let saved = 0;
    let kkCreated = 0;

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const b = rows[i] || {};
        const nik = clean(b.nik);
        const nama = clean(b.nama);
        const nomorKK = clean(b.nomorKK);

        if (!nik || !nama || !nomorKK) {
          continue;
        }

        const jenisKelamin = enumValue(
          b.jenisKelamin,
          allowedJK,
          "LAKI_LAKI"
        ) as JenisKelamin;

        const hubunganKeluarga = enumValue(
          b.hubunganKeluarga,
          allowedHubungan,
          "LAINNYA"
        ) as HubunganKeluarga;

        const statusTinggal = enumValue(
          b.statusTinggal,
          allowedTinggal,
          "TETAP"
        ) as StatusTinggal;

        const tanggalLahir = dateValue(b.tanggalLahir);
        const tanggalAkhirPaspor = dateValue(
          b.tanggalAkhirPaspor
        );

        const usia = tanggalLahir
          ? ageFromBirthDate(tanggalLahir)
          : clean(b.usia)
            ? Number(clean(b.usia))
            : null;

        if (
          usia !== null &&
          (!Number.isFinite(usia) || usia < 0 || usia > 130)
        ) {
          throw new Error(
            `Baris ${i + 1}: usia tidak valid untuk NIK ${nik}.`
          );
        }

        const existingKK = await tx.kK.findUnique({
          where: { nomorKK },
          select: {
            id: true,
            rTUnitId: true,
          },
        });

        /*
         * KK yang sudah dimiliki RT lain tidak boleh
         * disentuh oleh proses import RT ini.
         */
        if (
          existingKK?.rTUnitId &&
          existingKK.rTUnitId !== rTUnitId
        ) {
          throw new Error(
            `Baris ${i + 1}: KK ${nomorKK} terdaftar pada RT lain.`
          );
        }

        const kk = await tx.kK.upsert({
          where: { nomorKK },

          update: {
            alamat: clean(b.alamat) || undefined,
            rt: clean(b.rt) || undefined,
            rw: clean(b.rw) || undefined,
            statusTinggal,

            /*
             * Pastikan KK tetap berada pada RT login.
             */
            rTUnitId: rTUnitId,

            ...(hubunganKeluarga === "KEPALA_KELUARGA"
              ? { kepalaKeluarga: nama }
              : {}),
          },

          create: {
            nomorKK,
            kepalaKeluarga: nama,
            alamat: clean(b.alamat) || "-",
            rt: clean(b.rt) || null,
            rw: clean(b.rw) || null,
            statusTinggal,
            rTUnitId: rTUnitId,
          },
        });

        if (!existingKK) {
          kkCreated++;
        }

        const data = {
          nama,
          nomorKK,
          daerahKKAsal: clean(b.daerahKKAsal) || null,
          alamat: clean(b.alamat) || null,
          rt: clean(b.rt) || null,
          rw: clean(b.rw) || null,
          statusTinggal,
          jenisKelamin,
          hubunganKeluarga,
          tempatLahir: clean(b.tempatLahir) || null,
          tanggalLahir,
          usia,
          golonganDarah: clean(b.golonganDarah) || null,
          agama: clean(b.agama) || null,
          pendidikan: clean(b.pendidikan) || null,
          pekerjaan: clean(b.pekerjaan) || null,
          statusKawin: clean(b.statusKawin) || null,
          namaIbu: clean(b.namaIbu) || null,
          namaAyah: clean(b.namaAyah) || null,
          nomorPaspor: clean(b.nomorPaspor) || null,
          tanggalAkhirPaspor,
          hubungan: clean(b.hubungan) || null,
          kodeHubungan: clean(b.kodeHubungan) || null,
          kkId: kk.id,
          rTUnitId: rTUnitId,
        };

        /*
         * NIK sudah ada pada RT lain:
         * jangan sampai import RT ini memindahkan atau
         * mengubah data warga tersebut.
         */
        const existingWarga = await tx.warga.findUnique({
          where: { nik },
          select: {
            id: true,
            rTUnitId: true,
          },
        });

        if (
          existingWarga?.rTUnitId &&
          existingWarga.rTUnitId !== rTUnitId
        ) {
          throw new Error(
            `Baris ${i + 1}: NIK ${nik} terdaftar pada RT lain.`
          );
        }

        await tx.warga.upsert({
          where: { nik },
          update: data,
          create: {
            nik,
            ...data,
          },
        });

        saved++;
      }
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "IMPORT",
      description: `Import data warga sebanyak ${saved} warga`,
      module: "WARGA",
      targetType: "Warga",
      metadata: {
        jumlahRows: rows.length,
        saved,
        kkCreated,
      },
      rTUnitId,
      request: req,
    });
    return NextResponse.json({
      ok: true,
      saved,
      kkCreated,
      message: `${saved} warga berhasil disimpan ke database.`,
    });
  } catch (e: any) {
    console.error("IMPORT_WARGA_ERROR:", e);

    const detail =
      process.env.NODE_ENV === "development"
        ? String(e?.message || e)
        : "Terjadi kesalahan saat menyimpan data.";

    return NextResponse.json(
      {
        error: "Import gagal disimpan ke database.",
        detail,
      },
      { status: 500 }
    );
  }
}




