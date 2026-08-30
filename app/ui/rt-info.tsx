"use client";

import { useEffect, useState } from "react";

type RtUnit = {
  kodeRT?: string;
  kodeRW?: string;
  namaRT?: string;
  perumahan?: string | null;
  desa?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
};

export default function RtInfo({
  mode = "label",
}: {
  mode?: "label" | "short" | "wilayah";
}) {
  const [rt, setRt] = useState<RtUnit | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rt_rtUnit");

      if (raw) {
        const data = JSON.parse(raw);
        setRt(data);
      }
    } catch {
      setRt(null);
    }
  }, []);

  const nomorRT =
    rt?.kodeRT ||
    rt?.namaRT?.replace(/\D/g, "") ||
    "";

  const nomorRW = rt?.kodeRW || "";

  if (mode === "short") {
    return <>RT {nomorRT || "Anda"}</>;
  }

  if (mode === "wilayah") {
    return (
      <>
        {rt?.perumahan || "Perumahan"} • RT{" "}
        {nomorRT || "Anda"} / RW {nomorRW || "-"}
      </>
    );
  }

  return (
    <>
      RT {nomorRT || "Anda"} / RW {nomorRW || "-"}
    </>
  );
}



