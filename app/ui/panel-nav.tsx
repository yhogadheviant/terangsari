"use client";

import { usePathname, useRouter } from "next/navigation";

export default function PanelNav() {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    localStorage.removeItem("rt_role");
    localStorage.removeItem("rt_username");
    router.replace("/");
  }

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => router.push("/")}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition ${
              pathname === "/"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
              Beranda
          </button>

          <button
            type="button"
            onClick={() => router.push("/panel")}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition ${
              pathname === "/panel"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            “‹ Panel
          </button>
        </div>

        <button
          type="button"
          onClick={logout}
          className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}

