"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home, LogOut } from "lucide-react";

export default function PanelNav() {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
    } catch (error) {
      console.error("PANEL_LOGOUT_ERROR:", error);
    } finally {
      localStorage.removeItem("rt_role");
      localStorage.removeItem("rt_username");
      localStorage.removeItem("rt11_userId");
      localStorage.removeItem("rt11_username");
      localStorage.removeItem("rt_rtUnit");

      window.location.replace("/");
    }
  }

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => router.push("/")}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
              pathname === "/"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            <Home className="h-4 w-4" strokeWidth={2.2} />
            <span>Beranda</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/panel")}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
              pathname === "/panel"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
            <span>Panel</span>
          </button>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:border-red-200 hover:bg-red-100 hover:shadow-sm active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" strokeWidth={2.2} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}

