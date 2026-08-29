"use client";

import { useEffect, useState } from "react";

export default function AppName({
  fallback = "Smart Warga",
  className = "",
}: {
  fallback?: string;
  className?: string;
}) {
  const [appName, setAppName] =
    useState(fallback);

  useEffect(() => {
    let mounted = true;

    fetch("/api/app-settings", {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (
          mounted &&
          data?.success &&
          data?.appName
        ) {
          setAppName(data.appName);
        }
      })
      .catch(() => {
        // Gunakan fallback jika API gagal.
      });

    return () => {
      mounted = false;
    };
  }, [fallback]);

  return (
    <span className={className}>
      {appName}
    </span>
  );
}