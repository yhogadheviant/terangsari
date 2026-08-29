"use client";
import AppName from "../ui/app-name";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setError("");

    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.user) {
        setError(data.message || "Username atau password salah.");
        return;
      }

      const user = data.user;

      // Identitas login
      localStorage.setItem("rt_userId", user.id);
      localStorage.setItem("rt_username", user.username);
      localStorage.setItem("rt_role", user.role);

      // Identitas warga jika akun terhubung ke data warga
      if (user.wargaId) {
        localStorage.setItem("rt_wargaId", user.wargaId);
      } else {
        localStorage.removeItem("rt_wargaId");
      }

      // Identitas RT
      if (user.rTUnitId) {
        localStorage.setItem("rt_rtUnitId", user.rTUnitId);
      } else {
        localStorage.removeItem("rt_rtUnitId");
      }

      if (user.rtUnit) {
        localStorage.setItem(
          "rt_rtUnit",
          JSON.stringify(user.rtUnit)
        );
      } else {
        localStorage.removeItem("rt_rtUnit");
      }

      const destination =
  data.redirect ||
  (user.role === "superadmin"
    ? "/panel/superadmin"
    : "/panel");

window.location.href = destination;
    } catch (err) {
      console.error("LOGIN_ERROR", err);
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-7">

        <div className="text-center mb-7">
          <div className="text-4xl mb-3">&#127968;</div>

          <h1 className="text-2xl font-black">
            <AppName />
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Login Portal Warga
          </p>
        </div>

        <label className="block text-sm font-bold mb-2">
          Username
        </label>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              login();
            }
          }}
          autoComplete="username"
          className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Masukkan username"
        />

        <label className="block text-sm font-bold mb-2">
          PIN / Password
        </label>

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              login();
            }
          }}
          type="password"
          autoComplete="current-password"
          className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-5 outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Masukkan PIN / password"
        />

        {error && (
          <div className="text-sm text-red-600 mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-xl font-bold transition"
        >
          {loading ? "Memeriksa..." : "Login"}
        </button>

        <div className="mt-5 bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
          Silakan gunakan username dan password yang diberikan
          oleh pengurus RT.
        </div>

      </div>
    </main>
  );
}



