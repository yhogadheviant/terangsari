"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  permissions,
  roleLabels,
  type Role,
} from "../lib/auth";
import PanelNav from "../ui/panel-nav";

const pathPermission: Record<string, string> = {
  "/panel/kk": "kk",
  "/panel/warga": "warga",
  "/panel/kelompok-usia": "usia",
  "/panel/kas": "kas",
  "/panel/dana-taktis": "taktis",
  "/panel/iuran": "iuran",
  "/panel/pengumuman": "pengumuman",
  "/panel/kegiatan": "kegiatan",
  "/panel/laporan": "laporan",
  "/panel/pengaturan": "pengaturan",
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
    const role = localStorage.getItem("rt_role") as Role | null;

    if (!role || !roleLabels[role]) {
      router.replace("/login");
      return;
    }

    const key = pathPermission[pathname];

    console.log("PANEL ACCESS:", {
      pathname,
      role,
      key,
      allowed: role ? permissions[role] : null,
      activeRT: localStorage.getItem("rt_superadmin_active"),
    });

    if (key && !permissions[role].includes(key)) {
      alert("Anda tidak memiliki hak akses untuk halaman ini.");
      router.replace("/panel");
      return;
    }

    setChecking(false);
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
      {children}
    </>
  );
}



