"use client";

import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileBarChart,
  FileText,
  Home,
  LogOut,
  Menu,
  Megaphone,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SuperadminRTSelector from "./superadmin-rt-selector";

type MenuItem = {
  key: string;
  label: string;
  href: string;
  permission?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

type MenuGroup = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    key: "kependudukan",
    label: "Kependudukan",
    icon: Users,
    items: [
      {
        key: "warga",
        label: "Data Warga",
        href: "/panel/warga",
        permission: "WARGA_VIEW",
        icon: Users,
      },
      {
        key: "kk",
        label: "Data KK",
        href: "/panel/kk",
        permission: "KK_VIEW",
        icon: FileText,
      },
      {
        key: "usia",
        label: "Kelompok Usia",
        href: "/panel/kelompok-usia",
        permission: "WARGA_VIEW",
        icon: BarChart3,
      },
    ],
  },
  {
    key: "keuangan",
    label: "Keuangan",
    icon: Wallet,
    items: [
      {
        key: "iuran",
        label: "Iuran Warga",
        href: "/panel/iuran",
        permission: "IURAN_VIEW",
        icon: CircleDollarSign,
      },
      {
        key: "kas",
        label: "Kas RT",
        href: "/panel/kas",
        permission: "KAS_VIEW",
        icon: Wallet,
      },
      {
        key: "taktis",
        label: "Dana Taktis",
        href: "/panel/dana-taktis",
        permission: "DANA_TAKTIS_VIEW",
        icon: Wallet,
      },
    ],
  },
  {
    key: "komunikasi",
    label: "Komunikasi",
    icon: Megaphone,
    items: [
      {
        key: "pengumuman",
        label: "Pengumuman",
        href: "/panel/pengumuman",
        permission: "PENGUMUMAN_VIEW",
        icon: Megaphone,
      },
      {
        key: "kegiatan",
        label: "Kegiatan",
        href: "/panel/kegiatan",
        permission: "KEGIATAN_VIEW",
        icon: ClipboardList,
      },
    ],
  },
  {
    key: "laporan",
    label: "Laporan",
    icon: FileBarChart,
    items: [
      {
        key: "laporan",
        label: "Pusat Laporan",
        href: "/panel/laporan",
        permission: "LAPORAN_VIEW",
        icon: FileBarChart,
      },
    ],
  },
  {
    key: "pengaturan",
    label: "Pengaturan",
    icon: Settings,
    items: [
      {
        key: "pengaturan",
        label: "Pengaturan Sistem",
        href: "/panel/pengaturan",
        permission: "PENGATURAN_VIEW",
        icon: Settings,
      },
    ],
  },
];

const bottomItems: MenuItem[] = [
  {
    key: "home",
    label: "Home",
    href: "/panel",
    icon: Home,
  },
  {
    key: "warga",
    label: "Warga",
    href: "/panel/warga",
    permission: "WARGA_VIEW",
    icon: Users,
  },
  {
    key: "iuran",
    label: "Iuran",
    href: "/panel/iuran",
    permission: "IURAN_VIEW",
    icon: CircleDollarSign,
  },
  {
    key: "laporan",
    label: "Laporan",
    href: "/panel/laporan",
    permission: "LAPORAN_VIEW",
    icon: FileBarChart,
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/panel") {
    return pathname === "/panel";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PanelNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [allowed, setAllowed] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [appName, setAppName] = useState("Smart Warga");
  const [appLogo, setAppLogo] = useState("");

  const allPermissionCodes = useMemo(
    () =>
      Array.from(
        new Set(
          menuGroups.flatMap((group) =>
            group.items
              .map((item) => item.permission)
              .filter(Boolean) as string[]
          )
        )
      ),
    []
  );

  useEffect(() => {
    let mounted = true;

    fetch("/api/app-settings", {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data?.success) {
          setAppName(
            data.appName?.trim() || "Smart Warga"
          );
          setAppLogo(
            data.appLogo?.trim() || ""
          );
        }
      })
      .catch(() => {
        // Gunakan fallback jika API gagal.
      });

    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    setUsername(
      localStorage.getItem("rt_username") ||
        localStorage.getItem("rt11_username") ||
        "Pengguna"
    );

    setRole(localStorage.getItem("rt_role") || "");

    let cancelled = false;

    async function loadPermissions() {
      try {
        const results = await Promise.all(
          allPermissionCodes.map(async (code) => {
            try {
              const response = await fetch(
                `/api/auth/permission?code=${encodeURIComponent(code)}`,
                {
                  cache: "no-store",
                }
              );

              if (!response.ok) {
                return null;
              }

              const data = await response.json();

              return data?.allowed ? code : null;
            } catch {
              return null;
            }
          })
        );

        if (!cancelled) {
          setAllowed(results.filter(Boolean) as string[]);
        }
      } finally {
        if (!cancelled) {
          setLoadingPermissions(false);
        }
      }
    }

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [allPermissionCodes]);

  useEffect(() => {
    const activeGroup = menuGroups.find((group) =>
      group.items.some((item) => isActivePath(pathname, item.href))
    );

    if (activeGroup) {
      setOpenGroups((current) => ({
        ...current,
        [activeGroup.key]: true,
      }));
    }
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function canSee(item: MenuItem) {
    if (!item.permission) {
      return true;
    }

    return allowed.includes(item.permission);
  }

  function visibleItems(group: MenuGroup) {
    return group.items.filter(canSee);
  }

  function toggleGroup(key: string) {
    setOpenGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function navigate(href: string) {
    router.push(href);
    setMobileOpen(false);
  }

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

  const roleLabel =
    role === "SUPERADMIN"
      ? "Super Administrator"
      : role === "KETUA"
        ? "Ketua RT"
        : role === "SEKRETARIS"
          ? "Sekretaris"
          : role === "BENDAHARA"
            ? "Bendahara"
            : role === "WARGA"
              ? "Warga"
              : role || "Pengguna";

  return (
    <>
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-100 px-5 py-5">
            <button
              type="button"
              onClick={() => navigate("/panel")}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                {appLogo ? (
                  <img
                    src={appLogo}
                    alt="Logo portal"
                    className="h-7 w-7 object-contain"
                  />
                ) : (
                  <Shield className="h-6 w-6" strokeWidth={2.2} />

                )}
              </div>

              <div className="min-w-0">
                <div className="truncate text-base font-black tracking-tight text-slate-900">
                  {appName}
                </div>
                <div className="truncate text-xs font-medium text-slate-500">
                  Portal Warga Digital
                </div>
              </div>
            </button>
          </div>

          <div className="border-b border-slate-100 px-4 py-3">
            <div className="rounded-2xl bg-slate-50 px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Wilayah Aktif
              </div>
              <div className="mt-1 truncate text-sm font-black text-slate-800">
                RT 011 / RW 005
              </div>
              <div className="truncate text-xs text-slate-500">
                Terangsari 1
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <button
              type="button"
              onClick={() => navigate("/panel")}
              className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                pathname === "/panel"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Home className="h-5 w-5" strokeWidth={2} />
              <span>Dashboard</span>
            </button>

            {menuGroups.map((group) => {
              const items = visibleItems(group);

              if (!loadingPermissions && items.length === 0) {
                return null;
              }

              const GroupIcon = group.icon;
              const open = openGroups[group.key] ?? false;
              const hasActive = items.some((item) =>
                isActivePath(pathname, item.href)
              );

              return (
                <div key={group.key} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                      hasActive
                        ? "text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <GroupIcon className="h-5 w-5" strokeWidth={2} />

                    <span className="flex-1 text-left">{group.label}</span>

                    {open ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {open && (
                    <div className="ml-4 border-l border-slate-200 pl-3">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const active = isActivePath(pathname, item.href);

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => navigate(item.href)}
                            className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                              active
                                ? "bg-blue-600 font-bold text-white shadow-sm shadow-blue-600/20"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-3">
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700">
                {(username || "P").slice(0, 1).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-800">
                  {username || "Pengguna"}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {roleLabel}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" strokeWidth={2} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ================= MOBILE HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/panel")}
            className="min-w-0 text-center"
          >
            <div className="truncate text-sm font-black tracking-tight text-slate-900">
              {appName}
            </div>
            <div className="truncate text-[10px] font-medium text-slate-500">
              RT 011 / RW 005
            </div>
          </button>

          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
            aria-label="Notifikasi"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ================= MOBILE DRAWER ================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />
          <aside className="relative flex h-full w-[min(86vw,340px)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  {appLogo ? (
                    <img
                      src={appLogo}
                      alt="Logo portal"
                      className="h-6 w-6 object-contain"
                    />
                  ) : (
                    <Shield className="h-5 w-5" />

                  )}
                </div>

                <div>
                  <div className="text-sm font-black text-slate-900">
                    {appName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Portal Warga Digital
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                aria-label="Tutup menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-100 px-4 py-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Wilayah Aktif
                </div>
                <div className="mt-1 text-sm font-black text-slate-800">
                  RT 011 / RW 005
                </div>
                <div className="text-xs text-slate-500">
                  Terangsari 1
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <button
                type="button"
                onClick={() => navigate("/panel")}
                className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${
                  pathname === "/panel"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Home className="h-5 w-5" />
                Dashboard
              </button>

              {menuGroups.map((group) => {
                const items = visibleItems(group);

                if (!loadingPermissions && items.length === 0) {
                  return null;
                }

                const GroupIcon = group.icon;
                const open = openGroups[group.key] ?? false;

                return (
                  <div key={group.key} className="mb-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <GroupIcon className="h-5 w-5" />
                      <span className="flex-1 text-left">
                        {group.label}
                      </span>

                      {open ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {open && (
                      <div className="ml-4 border-l border-slate-200 pl-3">
                        {items.map((item) => {
                          const Icon = item.icon;
                          const active = isActivePath(pathname, item.href);

                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => navigate(item.href)}
                              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                                active
                                  ? "bg-blue-600 font-bold text-white"
                                  : "text-slate-500 hover:bg-slate-50"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 p-3">
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700">
                  {(username || "P").slice(0, 1).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-800">
                    {username || "Pengguna"}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {roleLabel}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                Keluar
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {bottomItems.map((item) => {
            if (!canSee(item)) {
              return null;
            }

            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.href)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold transition ${
                  active
                    ? "text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    active ? "stroke-[2.5]" : "stroke-2"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold text-slate-400"
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* Selector SUPERADMIN tetap dipertahankan */}
      <SuperadminRTSelector />

    </>
  );
}



