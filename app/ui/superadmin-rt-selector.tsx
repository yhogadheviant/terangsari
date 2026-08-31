"use client";

import { useEffect, useState } from "react";

type RTUnit = {
  id: string;
  kodeRT: string;
  kodeRW: string;
  namaRT: string;
  aktif: boolean;
};

const STORAGE_KEY = "rt_superadmin_active";

export default function SuperadminRTSelector() {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [rtUnits, setRtUnits] = useState<RTUnit[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("rt_role");

    if (role !== "superadmin") {
      return;
    }

    setIsSuperadmin(true);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSelected(saved);
    }

    fetch("/api/superadmin/rt", {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Gagal mengambil daftar RT.");
        }

        const json = await res.json();
        return json;
      })
      .then((json) => {
        const rows = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.rt)
            ? json.rt
            : [];

        setRtUnits(rows);

        const saved = localStorage.getItem(STORAGE_KEY);

        if (
          saved &&
          rows.some((x: RTUnit) => x.id === saved)
        ) {
          setSelected(saved);
          return;
        }

        if (rows.length > 0) {
          setSelected(rows[0].id);
          localStorage.setItem(
            STORAGE_KEY,
            rows[0].id
          );
        }
      })
      .catch((error) => {
        console.error(
          "SUPERADMIN_RT_SELECTOR_ERROR:",
          error
        );
      });
  }, []);

  function changeRT(id: string) {
  setSelected(id);
  localStorage.setItem(STORAGE_KEY, id);

  window.dispatchEvent(
    new CustomEvent("superadmin-rt-change", {
      detail: { rTUnitId: id },
    })
  );

  window.location.reload();
}

  if (!isSuperadmin || rtUnits.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-blue-100 bg-blue-50">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
        <span className="shrink-0 text-xs font-bold text-blue-700">
          RT Aktif:
        </span>

        <select
          value={selected}
          onChange={(e) => changeRT(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 sm:max-w-md"
        >
          {rtUnits.map((rt) => (
            <option key={rt.id} value={rt.id}>
              RT {rt.kodeRT} / RW {rt.kodeRW}
              {rt.namaRT ? ` — ${rt.namaRT}` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
