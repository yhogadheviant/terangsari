"use client";

import { useEffect, useState } from "react";

export default function PortalFooter() {
  const [copyright, setCopyright] = useState(
    `© ${new Date().getFullYear()} Smart RT 011 Terangsari 1. All rights reserved.`
  );

  useEffect(() => {
    let mounted = true;

    fetch("/api/app-settings", {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data?.success && data?.copyright) {
          setCopyright(data.copyright);
        }
      })
      .catch(() => {
        // Gunakan fallback.
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <footer className="print:hidden border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-400">
      {copyright}
    </footer>
  );
}