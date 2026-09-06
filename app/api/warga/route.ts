import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import { logActivity } from "@/app/lib/activity-log";

function ageFromBirthDate(value: string | null | undefined) {
  if (!value) return null;

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();

  let age = now.getFullYear() - d.getFullYear();

  const m = now.getMonth() - d.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    age--;
  }

  return age < 0 ? null : age;
}

export async function GET(req: Request) {
  const context = await getRTContext(req);

  if (context.response) {
    return context.response;
  }

  const permissionResponse = await requirePermission(
    context.session,
    "WARGA_VIEW"
  );

  if (permissionResponse) {
    return permissionResponse;
  }

  const rTUnitId = context.rTUnitId;

  const rows = await prisma.warga.findMany({
    where: {
  rTUnitId,
},
    include: {
      kk: true,
    },
    orderBy: {
      nama: "asc",
    },
  });

  return NextResponse.json(
    rows.map((w) => ({
      ...w,
      nomorKK: w.nomorKK || w.kk?.nomorKK || "",
      alamat: w.alamat || w.kk?.alamat || "",
      rt: w.rt || w.kk?.rt || "",
      rw: w.rw || w.kk?.rw || "",
      usia: w.tanggalLahir
        ? ageFromBirthDate(w.tanggalLahir.toISOString())
        : w.usia,
    }))
  );
}

export async function PUT(req: Request) {
  try {
    const context = await getRTContext(req);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "WARGA_UPDATE"
    );

    if (permissionResponse) {
      return permissionResponse;
    }

    const rTUnitId = context.rTUnitId!;

    const b = await req.json();
    const id = String(b.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "ID warga wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await prisma.warga.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Data warga tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.rTUnitId !== rTUnitId) {
      return NextResponse.json(
        { error: "Data warga bukan milik RT aktif." },
        { status: 403 }
      );
    }

    if (!b.nik || !b.nama || !b.jenisKelamin || !b.hubunganKeluarga) {
      return NextResponse.json(
        {
          error:
            "NIK, nama, jenis kelamin, dan hubungan keluarga wajib diisi.",
        },
        { status: 400 }
      );
    }

    const duplicate = await prisma.warga.findFirst({
      where: {
        nik: b.nik,
        NOT: { id },
      },
    });

    if (duplicate && duplicate.rTUnitId !== rTUnitId) {
      return NextResponse.json(
        { error: "NIK tersebut terdaftar pada RT lain." },
        { status: 409 }
      );
    }

    if (b.kkId) {
      const targetKK = await prisma.kK.findUnique({
        where: { id: String(b.kkId) },
        select: { id: true, rTUnitId: true },
      });

      if (!targetKK) {
        return NextResponse.json(
          { error: "KK tidak ditemukan." },
          { status: 404 }
        );
      }

      if (targetKK.rTUnitId !== rTUnitId) {
        return NextResponse.json(
          { error: "KK tersebut bukan milik RT Anda." },
          { status: 403 }
        );
      }
    }

    const tanggalLahir = b.tanggalLahir
      ? new Date(b.tanggalLahir)
      : null;

    const usia = tanggalLahir
      ? ageFromBirthDate(tanggalLahir.toISOString())
      : b.usia
        ? Number(b.usia)
        : null;

    const updated = await prisma.warga.update({
      where: { id },
      data: {
        nik: b.nik,
        nama: b.nama,
        nomorKK: b.nomorKK || null,
        daerahKKAsal: b.daerahKKAsal || null,
        alamat: (
  b.kkId
    ? (await prisma.kK.findUnique({
        where: { id: String(b.kkId) },
        select: { alamat: true },
      }))?.alamat
    : b.nomorKK
      ? (await prisma.kK.findFirst({
          where: {
            nomorKK: String(b.nomorKK),
            rTUnitId,
          },
          select: { alamat: true },
        }))?.alamat
      : null
) || null,
        rt: b.rt || null,
        rw: b.rw || null,
        statusTinggal: b.statusTinggal || "TETAP",
        jenisKelamin: b.jenisKelamin,
        hubunganKeluarga: b.hubunganKeluarga,
        tempatLahir: b.tempatLahir || null,
        tanggalLahir,
        usia,
        golonganDarah: b.golonganDarah || null,
        agama: b.agama || null,
        pendidikan: b.pendidikan || null,
        pekerjaan: b.pekerjaan || null,
        statusKawin: b.statusKawin || null,
        namaIbu: b.namaIbu || null,
        namaAyah: b.namaAyah || null,
        nomorPaspor: b.nomorPaspor || null,
        tanggalAkhirPaspor: b.tanggalAkhirPaspor
          ? new Date(b.tanggalAkhirPaspor)
          : null,
        hubungan: b.hubungan || null,
        kodeHubungan: b.kodeHubungan || null,
      },
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "UPDATE",
      module: "WARGA",
      targetType: "WARGA",
      targetId: updated.id,
      description: "Data warga berhasil diperbarui.",
      metadata: {
        nik: updated.nik,
        nama: updated.nama,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("WARGA_PUT_ERROR", e);

    return NextResponse.json(
      { error: "Gagal mengubah data warga." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await getRTContext(req);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "WARGA_DELETE"
    );

    if (permissionResponse) {
      return permissionResponse;
    }

    const rTUnitId = context.rTUnitId!;

    const body = await req.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "ID warga wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await prisma.warga.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Data warga tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.rTUnitId !== rTUnitId) {
      return NextResponse.json(
        { error: "Data warga bukan milik RT aktif." },
        { status: 403 }
      );
    }

    await prisma.warga.delete({
      where: { id },
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: "DELETE",
      module: "WARGA",
      targetType: "WARGA",
      targetId: existing.id,
      description: "Data warga berhasil dihapus.",
      metadata: {
        nik: existing.nik,
        nama: existing.nama,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data warga berhasil dihapus.",
    });
  } catch (e) {
    console.error("WARGA_DELETE_ERROR", e);

    return NextResponse.json(
      { error: "Gagal menghapus data warga." },
      { status: 500 }
    );
  }
}
export async function POST(req: Request) {
  try {
    const context = await getRTContext(req);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "WARGA_CREATE"
    );

    if (permissionResponse) {
      return permissionResponse;
    }

    const rTUnitId = context.rTUnitId!;

    const b = await req.json();

    if (
      !b.nik ||
      !b.nama ||
      !b.jenisKelamin ||
      !b.hubunganKeluarga
    ) {
      return NextResponse.json(
        {
          error:
            "NIK, nama, jenis kelamin, dan hubungan keluarga wajib diisi.",
        },
        { status: 400 }
      );
    }

    /*
     * Pastikan NIK tidak sedang dimiliki
     * oleh RT lain.
     */
    const existingWarga = await prisma.warga.findUnique({
      where: {
        nik: b.nik,
      },
    });

    if (
      existingWarga &&
        existingWarga.id !== b.id
    ) {
      return NextResponse.json(
        {
          error:
            existingWarga.rTUnitId === rTUnitId
              ? "NIK tersebut sudah terdaftar di RT ini."
              : "NIK tersebut sudah terdaftar pada RT lain dan tidak dapat diubah.",
        },
        { status: 409 }
      );
    }

    let kkId: string | null = b.kkId || null;


      if (kkId) {
        const targetKKById = await prisma.kK.findUnique({
          where: {
            id: kkId,
          },
        });

        if (!targetKKById) {
          return NextResponse.json(
            { error: "KK tidak ditemukan." },
            { status: 404 }
          );
        }

        if (targetKKById.rTUnitId !== rTUnitId) {
          return NextResponse.json(
            {
              error: "KK tersebut bukan milik RT Anda.",
            },
            { status: 403 }
          );
        }
      }
    if (b.nomorKK) {
      const existingKK = await prisma.kK.findUnique({
        where: {
          nomorKK: b.nomorKK,
        },
      });

      if (
        existingKK &&
        existingKK.rTUnitId &&
        existingKK.rTUnitId !== rTUnitId
      ) {
        return NextResponse.json(
          {
            error:
              "Nomor KK tersebut sudah terdaftar pada RT lain dan tidak dapat digunakan.",
          },
          { status: 409 }
        );
      }

      const kk = await prisma.kK.upsert({
        where: {
          nomorKK: b.nomorKK,
        },

        update: {
          alamat: b.alamat || undefined,
          rt: b.rt || undefined,
          rw: b.rw || undefined,
          statusTinggal: b.statusTinggal || "TETAP",

          kepalaKeluarga:
            b.hubunganKeluarga === "KEPALA_KELUARGA"
              ? b.nama
              : undefined,

          rTUnitId,
        },

        create: {
          nomorKK: b.nomorKK,
          kepalaKeluarga: b.nama,
          alamat: (
        kkId
          ? (await prisma.kK.findUnique({
              where: { id: kkId },
              select: { alamat: true },
            }))?.alamat
          : null
      ) || b.alamat || "-",
          rt: b.rt || null,
          rw: b.rw || null,
          statusTinggal: b.statusTinggal || "TETAP",
          rTUnitId,
        },
      });

      kkId = kk.id;
    }

    const tanggalLahir = b.tanggalLahir
      ? new Date(b.tanggalLahir)
      : null;

    const usia = tanggalLahir
      ? ageFromBirthDate(tanggalLahir.toISOString())
      : b.usia
        ? Number(b.usia)
        : null;

    const data = {
      nama: b.nama,
      nomorKK: b.nomorKK || null,
      daerahKKAsal: b.daerahKKAsal || null,
      alamat: (
  b.kkId
    ? (await prisma.kK.findUnique({
        where: { id: String(b.kkId) },
        select: { alamat: true },
      }))?.alamat
    : b.nomorKK
      ? (await prisma.kK.findFirst({
          where: { nomorKK: String(b.nomorKK) },
          select: { alamat: true },
        }))?.alamat
      : null
) || null,
      rt: b.rt || null,
      rw: b.rw || null,

      statusTinggal:
        b.statusTinggal || "TETAP",

      jenisKelamin: b.jenisKelamin,
      hubunganKeluarga: b.hubunganKeluarga,

      tempatLahir: b.tempatLahir || null,
      tanggalLahir,
      usia,

      golonganDarah: b.golonganDarah || null,
      agama: b.agama || null,
      pendidikan: b.pendidikan || null,
      pekerjaan: b.pekerjaan || null,
      statusKawin: b.statusKawin || null,

      namaIbu: b.namaIbu || null,
      namaAyah: b.namaAyah || null,

      nomorPaspor: b.nomorPaspor || null,

      tanggalAkhirPaspor:
        b.tanggalAkhirPaspor
          ? new Date(b.tanggalAkhirPaspor)
          : null,

      hubungan: b.hubungan || null,
      kodeHubungan: b.kodeHubungan || null,

      kkId,

      /*
       * RT ditentukan SERVER dari session untuk user RT biasa,
       * atau dari RT aktif yang divalidasi melalui header untuk Superadmin.
       */
      rTUnitId,
    };

    const warga = await prisma.warga.upsert({
      where: {
        nik: b.nik,
      },

      update: data,

      create: {
        nik: b.nik,
        ...data,
      },
    });

    await logActivity({
      actorUserId: context.session?.id,
      actorUsername: context.session?.username,
      actorRole: context.session?.role,
      action: existingWarga ? "UPDATE" : "CREATE",
      module: "WARGA",
      targetType: "WARGA",
      targetId: warga.id,
      description: existingWarga
        ? "Data warga berhasil diperbarui."
        : "Data warga berhasil dibuat.",
      metadata: {
        nik: warga.nik,
        nama: warga.nama,
      },
    });

    return NextResponse.json(
      warga,
      {
        status: existingWarga ? 200 : 201,
      }
    );
  } catch (e) {
    console.error("WARGA_API_ERROR", e);

    return NextResponse.json(
      {
        error: "Gagal menyimpan data warga.",
      },
      {
        status: 500,
      }
    );
  }
}





















