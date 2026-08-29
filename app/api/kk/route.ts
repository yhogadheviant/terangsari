import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    if (!session.rTUnitId) {
      return NextResponse.json(
        { error: "Akun belum memiliki RT." },
        { status: 403 }
      );
    }

    const rows = await prisma.kK.findMany({
      where: { rTUnitId: session.rTUnitId },
      include: {
        warga: {
          orderBy: { nama: "asc" },
          select: {
            id: true,
            nik: true,
            nama: true,
            jenisKelamin: true,
            hubunganKeluarga: true,
            statusTinggal: true,
            usia: true,
            tanggalLahir: true,
            daerahKKAsal: true,
          },
        },
      },
      orderBy: { nomorKK: "asc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("KK_GET_ERROR", error);
    return NextResponse.json(
      { error: "Gagal mengambil data KK." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    if (!session.rTUnitId) {
      return NextResponse.json(
        { error: "Akun belum memiliki RT." },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.nomorKK || !body.kepalaKeluarga || !body.alamat) {
      return NextResponse.json(
        {
          error:
            "Nomor KK, kepala keluarga, dan alamat wajib diisi.",
        },
        { status: 400 }
      );
    }

    const nomorKK = String(body.nomorKK).trim();

    const data = {
      nomorKK,
      kepalaKeluarga: String(body.kepalaKeluarga).trim(),
      alamat: String(body.alamat).trim(),
      rt: body.rt ? String(body.rt).trim() : null,
      rw: body.rw ? String(body.rw).trim() : null,
      statusTinggal: body.statusTinggal || "TETAP",
      nomorHP: body.nomorHP ? String(body.nomorHP).trim() : null,
      rTUnitId: session.rTUnitId,
    };

    if (body.id) {
      const id = String(body.id);

      const targetKK = await prisma.kK.findUnique({
        where: { id },
      });

      if (!targetKK) {
        return NextResponse.json(
          { error: "Data KK tidak ditemukan." },
          { status: 404 }
        );
      }

      if (targetKK.rTUnitId !== session.rTUnitId) {
        return NextResponse.json(
          { error: "KK tersebut bukan milik RT Anda." },
          { status: 403 }
        );
      }

      const duplicate = await prisma.kK.findFirst({
        where: {
          nomorKK,
          rTUnitId: session.rTUnitId,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Nomor KK sudah terdaftar." },
          { status: 409 }
        );
      }

      const kk = await prisma.kK.update({
        where: { id },
        data,
      });

      return NextResponse.json(kk);
    }

    const duplicate = await prisma.kK.findFirst({
      where: {
        nomorKK,
        rTUnitId: session.rTUnitId,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Nomor KK sudah terdaftar." },
        { status: 409 }
      );
    }

    const kk = await prisma.kK.create({ data });

    return NextResponse.json(kk, { status: 201 });
  } catch (error: any) {
    console.error("KK_POST_ERROR", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Nomor KK sudah terdaftar." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Gagal menyimpan data KK." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Belum login." }, { status: 401 });
    }

    if (!session.rTUnitId) {
      return NextResponse.json(
        { error: "Akun belum memiliki RT." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID KK tidak ditemukan." },
        { status: 400 }
      );
    }

    const kk = await prisma.kK.findUnique({
      where: { id },
      include: {
        warga: {
          select: { id: true },
        },
      },
    });

    if (!kk) {
      return NextResponse.json(
        { error: "Data KK tidak ditemukan." },
        { status: 404 }
      );
    }

    if (kk.rTUnitId !== session.rTUnitId) {
      return NextResponse.json(
        { error: "KK tersebut bukan milik RT Anda." },
        { status: 403 }
      );
    }

    if (kk.warga.length > 0) {
      return NextResponse.json(
        {
          error: `KK masih memiliki ${kk.warga.length} anggota keluarga. Hapus/ubah relasi anggota terlebih dahulu.`,
        },
        { status: 409 }
      );
    }

    await prisma.kK.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("KK_DELETE_ERROR", error);

    return NextResponse.json(
      {
        error:
          "KK tidak dapat dihapus. Periksa anggota yang masih terkait.",
      },
      { status: 500 }
    );
  }
}


