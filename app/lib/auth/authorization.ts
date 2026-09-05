import { NextResponse } from "next/server";
import type { SessionUser } from "./session";
import { prisma } from "@/app/lib/prisma";

export type AppRole =
  | "SUPERADMIN"
  | "KETUA"
  | "SEKRETARIS"
  | "BENDAHARA"
  | "WARGA";

/**
 * Semua permission yang tersedia di sistem.
 *
 * Jangan menambahkan permission baru di sini tanpa
 * menambahkan juga record-nya ke tabel Permission.
 */
export type PermissionCode =
  // DATA WARGA
  | "WARGA_VIEW"
  | "WARGA_CREATE"
  | "WARGA_UPDATE"
  | "WARGA_DELETE"
  | "WARGA_IMPORT"
  | "WARGA_EXPORT"

  // DATA KK
  | "KK_VIEW"
  | "KK_CREATE"
  | "KK_UPDATE"
  | "KK_DELETE"

  // IURAN
  | "IURAN_VIEW"
  | "IURAN_CREATE"
  | "IURAN_GENERATE"
  | "IURAN_CANCEL"
  | "IURAN_QRIS_MANAGE"

  // KAS
  | "KAS_VIEW"
  | "KAS_CREATE"
  | "KAS_UPDATE"
  | "KAS_DELETE"

  // DANA TAKTIS
  | "DANA_TAKTIS_VIEW"
  | "DANA_TAKTIS_CREATE"
  | "DANA_TAKTIS_DELETE"
  | "TRANSFER_KAS_TAKTIS"

  // KEGIATAN
  | "KEGIATAN_VIEW"
  | "KEGIATAN_CREATE"
  | "KEGIATAN_UPDATE"
  | "KEGIATAN_DELETE"

  // PENGUMUMAN
  | "PENGUMUMAN_VIEW"
  | "PENGUMUMAN_CREATE"
  | "PENGUMUMAN_UPDATE"
  | "PENGUMUMAN_DELETE"

  // LAPORAN
  | "LAPORAN_VIEW"
  | "LAPORAN_EXPORT"

  // PENGATURAN
  | "PENGATURAN_VIEW"
  | "PENGATURAN_UPDATE"

  // AKUN
  | "USER_VIEW"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_PERMISSION_MANAGE";

function normalizeRole(
  role: string | null | undefined
): AppRole | null {
  const value = String(role ?? "")
    .trim()
    .toUpperCase();

  if (
    value === "SUPERADMIN" ||
    value === "KETUA" ||
    value === "SEKRETARIS" ||
    value === "BENDAHARA" ||
    value === "WARGA"
  ) {
    return value;
  }

  return null;
}

export function hasRole(
  session: SessionUser,
  roles: AppRole[]
) {
  const role = normalizeRole(session.role);

  return role !== null && roles.includes(role);
}

export function requireRole(
  session: SessionUser | null,
  roles: AppRole[]
) {
  if (!session) {
    return NextResponse.json(
      { error: "Belum login." },
      { status: 401 }
    );
  }

  /*
   * SUPERADMIN tidak wajib memiliki RT.
   * SUPERADMIN memang digunakan untuk mengelola banyak RT.
   */
  if (
    !hasRole(session, ["SUPERADMIN"]) &&
    !session.rTUnitId
  ) {
    return NextResponse.json(
      { error: "Akun belum memiliki RT." },
      { status: 403 }
    );
  }

  if (!hasRole(session, roles)) {
    return NextResponse.json(
      {
        error:
          "Anda tidak memiliki hak akses untuk tindakan ini.",
      },
      { status: 403 }
    );
  }

  return null;
}

export function requireRtSession(
  session: SessionUser | null
) {
  if (!session) {
    return NextResponse.json(
      { error: "Belum login." },
      { status: 401 }
    );
  }

  /*
   * SUPERADMIN boleh masuk tanpa RT
   * karena dapat mengelola seluruh RT.
   */
  if (
    !hasRole(session, ["SUPERADMIN"]) &&
    !session.rTUnitId
  ) {
    return NextResponse.json(
      { error: "Akun belum memiliki RT." },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Default permission berdasarkan role.
 *
 * Prinsip:
 * - SUPERADMIN: bypass semua permission.
 * - KETUA: seluruh operasional RT.
 * - SEKRETARIS: administrasi warga, KK, kegiatan,
 *   pengumuman dan laporan.
 * - BENDAHARA: seluruh operasional keuangan.
 * - WARGA: hanya akses informasi.
 *
 * UserPermission dapat meng-override default role.
 */
const ROLE_PERMISSIONS: Record<
  Exclude<AppRole, "SUPERADMIN">,
  PermissionCode[]
> = {
  KETUA: [
    "WARGA_VIEW",
    "WARGA_CREATE",
    "WARGA_UPDATE",
    "WARGA_DELETE",
    "WARGA_IMPORT",
    "WARGA_EXPORT",

    "KK_VIEW",
    "KK_CREATE",
    "KK_UPDATE",
    "KK_DELETE",

    "IURAN_VIEW",
    "IURAN_CREATE",
    "IURAN_GENERATE",
    "IURAN_CANCEL",
    "IURAN_QRIS_MANAGE",

    "KAS_VIEW",
    "KAS_CREATE",
    "KAS_UPDATE",
    "KAS_DELETE",

    "DANA_TAKTIS_VIEW",
    "DANA_TAKTIS_CREATE",
    "DANA_TAKTIS_DELETE",
    "TRANSFER_KAS_TAKTIS",

    "KEGIATAN_VIEW",
    "KEGIATAN_CREATE",
    "KEGIATAN_UPDATE",
    "KEGIATAN_DELETE",

    "PENGUMUMAN_VIEW",
    "PENGUMUMAN_CREATE",
    "PENGUMUMAN_UPDATE",
    "PENGUMUMAN_DELETE",

    "LAPORAN_VIEW",
    "LAPORAN_EXPORT",

    "PENGATURAN_VIEW",
    "PENGATURAN_UPDATE",

    "USER_VIEW",
  ],

  SEKRETARIS: [
    "WARGA_VIEW",
    "WARGA_CREATE",
    "WARGA_UPDATE",
    "WARGA_DELETE",
    "WARGA_IMPORT",
    "WARGA_EXPORT",

    "KK_VIEW",
    "KK_CREATE",
    "KK_UPDATE",
    "KK_DELETE",

    "KEGIATAN_VIEW",
    "KEGIATAN_CREATE",
    "KEGIATAN_UPDATE",
    "KEGIATAN_DELETE",

    "PENGUMUMAN_VIEW",
    "PENGUMUMAN_CREATE",
    "PENGUMUMAN_UPDATE",
    "PENGUMUMAN_DELETE",

    "LAPORAN_VIEW",
    "LAPORAN_EXPORT",

    "PENGATURAN_VIEW",
  ],

  BENDAHARA: [
    "IURAN_VIEW",
    "IURAN_CREATE",
    "IURAN_GENERATE",
    "IURAN_CANCEL",
    "IURAN_QRIS_MANAGE",

    "KAS_VIEW",
    "KAS_CREATE",
    "KAS_UPDATE",
    "KAS_DELETE",

    "DANA_TAKTIS_VIEW",
    "DANA_TAKTIS_CREATE",
    "DANA_TAKTIS_DELETE",
    "TRANSFER_KAS_TAKTIS",

    "LAPORAN_VIEW",
    "LAPORAN_EXPORT",

    "PENGATURAN_VIEW",
  ],

  WARGA: [
    "WARGA_VIEW",
    "KK_VIEW",
    "IURAN_VIEW",
    "KAS_VIEW",
    "KEGIATAN_VIEW",
    "PENGUMUMAN_VIEW",
    "LAPORAN_VIEW",
  ],
};

/**
 * Mengambil permission efektif milik user.
 *
 * Aturan:
 * 1. SUPERADMIN = semua permission.
 * 2. Jika ada UserPermission untuk user tersebut,
 *    nilai allowed menjadi override.
 * 3. Jika tidak ada override, gunakan default role.
 */
export function getRoleDefaultPermissions(
  role: AppRole
): PermissionCode[] {
  if (role === "SUPERADMIN") {
    return [];
  }

  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Mengecek permission berdasarkan default role saja.
 * Tidak memperhitungkan UserPermission override.
 */
export function hasRoleDefaultPermission(
  role: AppRole,
  permission: PermissionCode
): boolean {
  if (role === "SUPERADMIN") {
    return true;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}

export async function hasPermission(
  session: SessionUser,
  permission: PermissionCode
): Promise<boolean> {
  const role = normalizeRole(session.role);

  if (!role) {
    return false;
  }

  /*
   * SUPERADMIN adalah administrator tertinggi.
   * Tidak dibatasi oleh permission biasa.
   */
  if (role === "SUPERADMIN") {
    return true;
  }

  /*
   * Cari permission yang secara khusus di-override
   * untuk akun ini.
   */
  const override = await prisma.userPermission.findFirst({
    where: {
      userId: session.id,
      permission: {
        code: permission,
        active: true,
      },
    },
    select: {
      allowed: true,
    },
  });

  if (override) {
    return override.allowed;
  }

  /*
   * Tidak ada override -> gunakan default role.
   */
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Memastikan session memiliki permission tertentu.
 *
 * Digunakan di API/server-side.
 */
export async function requirePermission(
  session: SessionUser | null,
  permission: PermissionCode
) {
  if (!session) {
    return NextResponse.json(
      { error: "Belum login." },
      { status: 401 }
    );
  }

  /*
   * Semua akun non-SUPERADMIN yang memakai permission
   * harus tetap memiliki RT.
   */
  if (
    !hasRole(session, ["SUPERADMIN"]) &&
    !session.rTUnitId
  ) {
    return NextResponse.json(
      { error: "Akun belum memiliki RT." },
      { status: 403 }
    );
  }

  const allowed = await hasPermission(
    session,
    permission
  );

  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Anda tidak memiliki hak akses untuk tindakan ini.",
        permission,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Mengambil seluruh permission efektif seorang user.
 *
 * Berguna untuk:
 * - frontend
 * - dashboard
 * - menu dinamis
 * - panel Superadmin
 */
export async function getEffectivePermissions(
  session: SessionUser
): Promise<PermissionCode[]> {
  const role = normalizeRole(session.role);

  if (!role) {
    return [];
  }

  /*
   * SUPERADMIN mendapatkan semua permission aktif
   * yang tercatat di database.
   */
  if (role === "SUPERADMIN") {
    const permissions = await prisma.permission.findMany({
      where: {
        active: true,
      },
      select: {
        code: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    return permissions
      .map((item) => item.code)
      .filter(
        (code): code is PermissionCode =>
          isPermissionCode(code)
      );
  }

  const defaults = new Set<PermissionCode>(
    ROLE_PERMISSIONS[role]
  );

  const overrides =
    await prisma.userPermission.findMany({
      where: {
        userId: session.id,
        permission: {
          active: true,
        },
      },
      select: {
        allowed: true,
        permission: {
          select: {
            code: true,
          },
        },
      },
    });

  for (const override of overrides) {
    if (!isPermissionCode(override.permission.code)) {
      continue;
    }

    if (override.allowed) {
      defaults.add(
        override.permission.code
      );
    } else {
      defaults.delete(
        override.permission.code
      );
    }
  }

  return Array.from(defaults).sort();
}

/**
 * Type guard untuk memastikan code dari database
 * benar-benar merupakan permission yang dikenal aplikasi.
 */
export function isPermissionCode(
  code: string
): code is PermissionCode {
  const permissions: PermissionCode[] = [
    "WARGA_VIEW",
    "WARGA_CREATE",
    "WARGA_UPDATE",
    "WARGA_DELETE",
    "WARGA_IMPORT",
    "WARGA_EXPORT",

    "KK_VIEW",
    "KK_CREATE",
    "KK_UPDATE",
    "KK_DELETE",

    "IURAN_VIEW",
    "IURAN_CREATE",
    "IURAN_GENERATE",
    "IURAN_CANCEL",
    "IURAN_QRIS_MANAGE",

    "KAS_VIEW",
    "KAS_CREATE",
    "KAS_UPDATE",
    "KAS_DELETE",

    "DANA_TAKTIS_VIEW",
    "DANA_TAKTIS_CREATE",
    "DANA_TAKTIS_DELETE",
    "TRANSFER_KAS_TAKTIS",

    "KEGIATAN_VIEW",
    "KEGIATAN_CREATE",
    "KEGIATAN_UPDATE",
    "KEGIATAN_DELETE",

    "PENGUMUMAN_VIEW",
    "PENGUMUMAN_CREATE",
    "PENGUMUMAN_UPDATE",
    "PENGUMUMAN_DELETE",

    "LAPORAN_VIEW",
    "LAPORAN_EXPORT",

    "PENGATURAN_VIEW",
    "PENGATURAN_UPDATE",

    "USER_VIEW",
    "USER_CREATE",
    "USER_UPDATE",
    "USER_DELETE",
    "USER_PERMISSION_MANAGE",
  ];

  return permissions.includes(
    code as PermissionCode
  );
}
