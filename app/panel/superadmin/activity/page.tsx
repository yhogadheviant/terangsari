"use client";

import { useEffect, useMemo, useState } from "react";

type Activity = {
  id: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  module: string;
  description: string;
  rtUnit: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

function parseUserAgent(ua: string | null) {
  if (!ua) {
    return {
      browser: "Tidak diketahui",
      os: "Tidak diketahui",
      device: "Tidak diketahui",
    };
  }

  let browser = "Browser lain";

  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  let os = "OS lain";

  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let device = "Desktop";

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    device = /iPad/i.test(ua) ? "Tablet" : "Mobile";
  }

  return { browser, os, device };
}
export default function SuperadminActivityPage() {
  const [logs, setLogs] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const [search, setSearch] = useState("");

  async function loadLogs() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/superadmin/activity?limit=500",
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil log aktivitas.");
      }

      setLogs(data.data || []);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengambil log aktivitas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchRole =
        role === "ALL" || log.actorRole === role;

      const matchAction =
        action === "ALL" || log.action === action;

      const matchSearch =
        !q ||
        log.actorUsername.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        (log.rtUnit || "").toLowerCase().includes(q) ||
        (log.ipAddress || "").toLowerCase().includes(q) ||
        (log.userAgent || "").toLowerCase().includes(q);

      return matchRole && matchAction && matchSearch;
    });
  }, [logs, role, action, search]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        padding: "28px",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#667085",
                marginBottom: "5px",
              }}
            >
              Superadmin
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 800,
                color: "#101828",
              }}
            >
              Log Aktivitas & Login
            </h1>

            <p
              style={{
                margin: "7px 0 0",
                color: "#667085",
              }}
            >
              Monitoring seluruh aktivitas pengguna aplikasi.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => (window.location.href = "/panel/superadmin")}
              style={{
                border: "1px solid #d0d5dd",
                borderRadius: "8px",
                padding: "10px 14px",
                background: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ← Superadmin
            </button>

            <button
              onClick={loadLogs}
              style={{
                border: 0,
                borderRadius: "8px",
                padding: "10px 14px",
                background: "#111827",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ↻ Muat Ulang
            </button>
          </div>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e4e7ec",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(220px, 1fr) 180px 180px",
              gap: "10px",
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari username, aktivitas, modul, RT..."
              style={{
                padding: "10px 12px",
                border: "1px solid #d0d5dd",
                borderRadius: "8px",
                outline: "none",
              }}
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                padding: "10px 12px",
                border: "1px solid #d0d5dd",
                borderRadius: "8px",
                background: "white",
              }}
            >
              <option value="ALL">Semua Role</option>
              <option value="SUPERADMIN">SUPERADMIN</option>
              <option value="KETUA">KETUA</option>
              <option value="SEKRETARIS">SEKRETARIS</option>
              <option value="BENDAHARA">BENDAHARA</option>
              <option value="WARGA">WARGA</option>
            </select>

            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              style={{
                padding: "10px 12px",
                border: "1px solid #d0d5dd",
                borderRadius: "8px",
                background: "white",
              }}
            >
              <option value="ALL">Semua Aktivitas</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e4e7ec",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid #e4e7ec",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              Aktivitas Terbaru
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#667085",
              }}
            >
              {filteredLogs.length} aktivitas
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1100px",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    "Waktu",
                    "Pengguna",
                    "Role",
                    "Aktivitas",
                    "Modul",
                    "RT",
                    "IP",
                    "Browser / Device",
                  ].map((title) => (
                    <th
                      key={title}
                      style={{
                        textAlign: "left",
                        padding: "11px 14px",
                        borderBottom: "1px solid #e4e7ec",
                        fontSize: "12px",
                        color: "#475467",
                      }}
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#667085",
                      }}
                    >
                      Memuat log aktivitas...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#667085",
                      }}
                    >
                      Belum ada aktivitas yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: "1px solid #f0f2f5",
                          whiteSpace: "nowrap",
                          fontSize: "12px",
                        }}
                      >
                        {new Date(log.createdAt).toLocaleString(
                          "id-ID"
                        )}
                      </td>

                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: "1px solid #f0f2f5",
                          fontWeight: 700,
                        }}
                      >
                        {log.actorUsername}
                      </td>

                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: "1px solid #f0f2f5",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.actorRole}
                      </td>

                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: "1px solid #f0f2f5",
                          minWidth: "350px",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {log.description}
                        </div>

                        <div
                          style={{
                            marginTop: "3px",
                            fontSize: "11px",
                            color: "#98a2b3",
                          }}
                        >
                          {log.action}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: "1px solid #f0f2f5",
                        }}
                      >
                        {log.module}
                      </td>

                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: "1px solid #f0f2f5",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.rtUnit || "-"}
                      </td>

                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: "1px solid #f0f2f5",
                          whiteSpace: "nowrap",
                          fontSize: "12px",
                          fontFamily: "monospace",
                        }}
                      >
                        {log.ipAddress || "-"}
                      </td>

                      <td
                        style={{
                          padding: "11px 14px",
                          borderBottom: "1px solid #f0f2f5",
                          minWidth: "210px",
                        }}
                      >
                        {(() => {
                          const ua = parseUserAgent(log.userAgent);

                          return (
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                }}
                              >
                                {ua.browser}
                              </div>

                              <div
                                style={{
                                  marginTop: "3px",
                                  fontSize: "11px",
                                  color: "#667085",
                                }}
                              >
                                {ua.os} · {ua.device}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}


