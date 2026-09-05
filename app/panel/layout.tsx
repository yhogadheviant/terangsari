"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  roleLabels,
  type Role,
} from "../lib/auth";
import PanelNav from "../ui/panel-nav";

const pathPermission: Record<string, string> = {
  "/panel/kk": "KK_VIEW",
  "/panel/warga": "WARGA_VIEW",
  "/panel/kelompok-usia": "WARGA_VIEW",
  "/panel/kas": "KAS_VIEW",
  "/panel/dana-taktis": "DANA_TAKTIS_VIEW",
  "/panel/iuran": "IURAN_VIEW",
  "/panel/pengumuman": "PENGUMUMAN_VIEW",
  "/panel/kegiatan": "KEGIATAN_VIEW",
  "/panel/laporan": "LAPORAN_VIEW",
  "/panel/pengaturan": "PENGATURAN_VIEW",
};

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const role = localStorage.getItem("rt_role") as Role | null;

      if (!role || !roleLabels[role]) {
        router.replace("/login");
        return;
      }

      const permissionCode = pathPermission[pathname];

      console.log("PANEL ACCESS:", {
        pathname,
        role,
        permissionCode,
        activeRT: localStorage.getItem("rt_superadmin_active"),
      });

      // Dashboard utama tidak membutuhkan permission khusus.
      if (!permissionCode) {
        if (!cancelled) {
          setChecking(false);
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/permission?code=${encodeURIComponent(permissionCode)}`,
          {
            cache: "no-store",
          }
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        console.log("PERMISSION CHECK:", {
          code: permissionCode,
          allowed: data?.allowed,
          status: response.status,
        });

        if (!response.ok || !data?.allowed) {
          alert("Anda tidak memiliki hak akses untuk halaman ini.");
          router.replace("/panel");
          return;
        }

        if (!cancelled) {
          setChecking(false);
        }
      } catch (error) {
        console.error("PANEL ACCESS ERROR:", error);

        if (!cancelled) {
          alert("Gagal memeriksa hak akses.");
          router.replace("/panel");
        }
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-500">
          Memeriksa hak akses...
        </div>
      </div>
    );
  }

  return (
    <>
      <PanelNav />
      <main className="pb-24 lg:pb-0">{children}</main>
    </>
  );
}



