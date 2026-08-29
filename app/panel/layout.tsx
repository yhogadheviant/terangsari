"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  permissions,
  roleLabels,
  type Role,
} from "../lib/auth";

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

  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    const role =
      localStorage.getItem(
        "rt_role"
      ) as Role | null;

    if (
      !role ||
      !roleLabels[role]
    ) {
      router.replace("/login");
      return;
    }

    const key =
      pathPermission[pathname];

    if (
      key &&
      !permissions[role].includes(key)
    ) {
      alert(
        "Anda tidak memiliki hak akses untuk halaman ini."
      );

      router.replace("/panel");
      return;
    }

    setChecking(false);
  }, [pathname, router]);

  function logout() {
    localStorage.removeItem(
      "rt_role"
    );

    localStorage.removeItem(
      "rt_username"
    );

    router.replace("/");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        Memeriksa hak akses...
      </div>
    );
  }

  return (
    <>
      {/* NAVIGASI GLOBAL PANEL */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">

          {/* NAVIGASI */}
          <div className="flex items-center gap-2 overflow-x-auto">

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
                Beranda
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/panel")
              }
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition ${
                pathname === "/panel"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              “‹ Panel
            </button>

          </div>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
          >
            Keluar
          </button>

        </div>
      </div>

      {/* ISI HALAMAN */}
      {children}
    </>
  );
}

