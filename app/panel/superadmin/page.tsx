"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Plus,
  Settings,
  Users,
  ShieldCheck,
  Edit3,
  Trash2,
  Power,
  X,
} from "lucide-react";

type RT = {
  id: string;
  kodeRT: string;
  kodeRW: string;
  namaRT: string;
  perumahan: string | null;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  aktif: boolean;
  statistik: {
    users: number;
    warga: number;
    kk: number;
  };
};

type Account = {
  id: string;
  username: string;
  role: "KETUA" | "SEKRETARIS" | "BENDAHARA" | "WARGA";
  wargaId: string | null;
  rTUnitId: string | null;
  rtUnit: {
    id: string;
    kodeRT: string;
    kodeRW: string;
    namaRT: string;
    aktif: boolean;
  } | null;
};

type AccountRole =
  | "KETUA"
  | "SEKRETARIS"
  | "BENDAHARA"
  | "WARGA";
type PermissionItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  active: boolean;
  defaultAllowed: boolean;
  overrideAllowed: boolean | null;
  effectiveAllowed: boolean;
};
const emptyForm = {
  kodeRT: "",
  kodeRW: "",
  namaRT: "",
  perumahan: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
};

const emptyAccountForm = {
  username: "",
  password: "",
  role: "KETUA" as AccountRole,
  rTUnitId: "",
};

const roleLabels: Record<AccountRole, string> = {
  KETUA: "Ketua RT",
  SEKRETARIS: "Sekretaris",
  BENDAHARA: "Bendahara",
  WARGA: "Warga",
};

export default function SuperadminPage() {
  const [rows, setRows] = useState<RT[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showAccountForm, setShowAccountForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editingAccountId, setEditingAccountId] =
    useState<string | null>(null);

  const [selectedRT, setSelectedRT] =
    useState<RT | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [accountForm, setAccountForm] =
    useState(emptyAccountForm);

  const [message, setMessage] = useState("");
  const [accountMessage, setAccountMessage] =
    useState("");
const [permissionAccount, setPermissionAccount] =
  useState<Account | null>(null);

const [permissions, setPermissions] =
  useState<PermissionItem[]>([]);

const [loadingPermissions, setLoadingPermissions] =
  useState(false);

const [savingPermission, setSavingPermission] =
  useState<string | null>(null);

const [permissionMessage, setPermissionMessage] =
  useState("");
  // =====================================================
  // LOAD RT
  // =====================================================

  async function loadRT() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/superadmin/rt",
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Gagal mengambil data RT."
        );
      }

      setRows(data.data || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data RT."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // LOAD ACCOUNTS
  // =====================================================

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);

      const res = await fetch(
        "/api/superadmin/users",
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Gagal mengambil daftar akun."
        );
      }

      setAccounts(data.data || []);
    } catch (error) {
      setAccountMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar akun."
      );
    } finally {
      setLoadingAccounts(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function checkSuperadmin() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();

        if (!data?.authenticated || String(data?.user?.role || "").toLowerCase() !== "superadmin") {
          window.location.href = "/panel";
          return;
        }

        if (!cancelled) {
          loadRT();
          loadAccounts();
        }
      } catch {
        window.location.href = "/login";
      }
    }

    checkSuperadmin();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================================
  // RT FORM
  // =====================================================

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setShowForm(true);
  }

  function openEdit(row: RT) {
    setEditingId(row.id);

    setForm({
      kodeRT: row.kodeRT,
      kodeRW: row.kodeRW,
      namaRT: row.namaRT,
      perumahan: row.perumahan || "",
      desa: row.desa || "",
      kecamatan: row.kecamatan || "",
      kabupaten: row.kabupaten || "",
    });

    setMessage("");
    setShowForm(true);
  }

  async function saveRT() {
    try {
      setSaving(true);
      setMessage("");

      const method = editingId
        ? "PATCH"
        : "POST";

      const body = editingId
        ? {
            id: editingId,
            ...form,
          }
        : form;

      const res = await fetch(
        "/api/superadmin/rt",
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Gagal menyimpan RT."
        );
      }

      setMessage(
        data.message || "Berhasil."
      );

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadRT();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan RT."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleRT(row: RT) {
    const action = row.aktif
      ? "menonaktifkan"
      : "mengaktifkan";

    if (
      !window.confirm(
        `Yakin ingin ${action} RT ${row.kodeRT}/RW ${row.kodeRW}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        "/api/superadmin/rt",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: row.id,
            aktif: !row.aktif,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Gagal mengubah status RT."
        );
      }

      setMessage(
        data.message ||
          "Status RT diperbarui."
      );

      await loadRT();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengubah status RT."
      );
    }
  }

  // =====================================================
  // ACCOUNT MANAGEMENT
  // =====================================================

  function openAccounts(row: RT) {
    setSelectedRT(row);
    setAccountMessage("");
    setShowAccountForm(false);
  }

  function closeAccounts() {
    setSelectedRT(null);
    setShowAccountForm(false);
    setEditingAccountId(null);
    setAccountMessage("");
  }

  function openAddAccount() {
    if (!selectedRT) return;

    setEditingAccountId(null);

    setAccountForm({
      ...emptyAccountForm,
      rTUnitId: selectedRT.id,
    });

    setAccountMessage("");
    setShowAccountForm(true);
  }

  function openEditAccount(
    account: Account
  ) {
    setEditingAccountId(account.id);

    setAccountForm({
      username: account.username,
      password: "",
      role: account.role,
      rTUnitId:
        account.rTUnitId ||
        selectedRT?.id ||
        "",
    });

    setAccountMessage("");
    setShowAccountForm(true);
  }

  async function saveAccount() {
    if (!selectedRT) return;

    try {
      setSavingAccount(true);
      setAccountMessage("");

      const method = editingAccountId
        ? "PATCH"
        : "POST";

      const body = editingAccountId
        ? {
            id: editingAccountId,
            username:
              accountForm.username,
            role: accountForm.role,
            rTUnitId:
              selectedRT.id,
            ...(accountForm.password
              ? {
                  password:
                    accountForm.password,
                }
              : {}),
          }
        : {
            username:
              accountForm.username,
            password:
              accountForm.password,
            role: accountForm.role,
            rTUnitId: selectedRT.id,
          };

      const res = await fetch(
        "/api/superadmin/users",
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Gagal menyimpan akun."
        );
      }

      setAccountMessage(
        data.message ||
          "Akun berhasil disimpan."
      );

      setShowAccountForm(false);
      setEditingAccountId(null);

      setAccountForm({
        ...emptyAccountForm,
        rTUnitId: selectedRT.id,
      });

      await loadAccounts();
    } catch (error) {
      setAccountMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan akun."
      );
    } finally {
      setSavingAccount(false);
    }
  }

  async function deleteAccount(
    account: Account
  ) {
    if (
      !window.confirm(
        `Hapus akun "${account.username}"?`
      )
    ) {
      return;
    }

    try {
      setAccountMessage("");

      const res = await fetch(
        `/api/superadmin/users?id=${encodeURIComponent(
          account.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Gagal menghapus akun."
        );
      }

      setAccountMessage(
        data.message ||
          "Akun berhasil dihapus."
      );

      await loadAccounts();
    } catch (error) {
      setAccountMessage(
        error instanceof Error
          ? error.message
          : "Gagal menghapus akun."
      );
    }
  }
  async function loadPermissions(account: Account) {
    try {
      setPermissionAccount(account);
      setLoadingPermissions(true);
      setPermissionMessage("");

      const res = await fetch(
        `/api/superadmin/users/permissions?userId=${encodeURIComponent(
          account.id
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Gagal mengambil permission akun."
        );
      }

      setPermissions(
        Array.isArray(data.data?.permissions) ? data.data.permissions : []
      );
    } catch (error) {
      setPermissions([]);

      setPermissionMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil permission akun."
      );
    } finally {
      setLoadingPermissions(false);
    }
  }
  async function savePermission(
  permissionCode: string,
  allowed: boolean | null
) {
  if (!permissionAccount) return;

  try {
    setSavingPermission(permissionCode);
    setPermissionMessage("");

    const res = await fetch(
      "/api/superadmin/users/permissions",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: permissionAccount.id,
          permissionCode,
          allowed,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          "Gagal menyimpan permission."
      );
    }

    setPermissionMessage(
      data.message ||
        "Permission berhasil diperbarui."
    );

    await loadPermissions(permissionAccount);
  } catch (error) {
    setPermissionMessage(
      error instanceof Error
        ? error.message
        : "Gagal menyimpan permission."
    );
  } finally {
    setSavingPermission(null);
  }
}
  const selectedAccounts = selectedRT
    ? accounts.filter(
        (account) =>
          account.rTUnitId ===
          selectedRT.id
      )
    : [];

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalRT = rows.length;

  const rtAktif = rows.filter(
    (row) => row.aktif
  ).length;

  const rtNonaktif =
    totalRT - rtAktif;

  const totalWarga = rows.reduce(
    (sum, row) =>
      sum + row.statistik.warga,
    0
  );

  const totalKK = rows.reduce(
    (sum, row) =>
      sum + row.statistik.kk,
    0
  );

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              Superadmin
            </h1>

            <p
              style={{
                marginTop: "6px",
                color: "#667085",
              }}
            >
              Manajemen seluruh RT
            </p>
          </div>

          <div
  style={{
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  }}
>
  <button
  onClick={openAdd}
  style={primaryButton}
>
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
    }}
  >
    <Plus size={17} />
    Tambah RT
  </span>
</button>

  <button
  onClick={() =>
    window.location.href =
      "/panel/superadmin/pengaturan"
  }
  style={{
    ...primaryButton,
    background: "#475467",
  }}
>
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
    }}
  >
    <Settings size={17} />
    Pengaturan Aplikasi
  </span>
</button>

  <button
  onClick={() =>
    window.location.href =
      "/panel/superadmin/activity"
  }
  style={{
    ...primaryButton,
    background: "#7c3aed",
  }}
>
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
    }}
  >
    <Activity size={17} />
    Log Aktivitas
  </span>
</button>

</div>
        </div>

        {/* MESSAGE */}

        {message && (
          <Message
            text={message}
          />
        )}

        {/* STATISTICS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <Stat
            title="Total RT"
            value={totalRT}
          />

          <Stat
            title="RT Aktif"
            value={rtAktif}
          />

          <Stat
            title="RT Nonaktif"
            value={rtNonaktif}
          />

          <Stat
            title="Total KK"
            value={totalKK}
          />

          <Stat
            title="Total Warga"
            value={totalWarga}
          />
        </div>

        {/* RT FORM */}

        {showForm && (
          <div style={cardStyle}>
            <h2 style={headingStyle}>
              {editingId
                ? "Edit RT"
                : "Tambah RT Baru"}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "14px",
              }}
            >
              <Input
                label="Kode RT"
                value={form.kodeRT}
                onChange={(value) =>
                  setForm({
                    ...form,
                    kodeRT: value,
                  })
                }
                placeholder="011"
              />

              <Input
                label="Kode RW"
                value={form.kodeRW}
                onChange={(value) =>
                  setForm({
                    ...form,
                    kodeRW: value,
                  })
                }
                placeholder="005"
              />

              <Input
                label="Nama RT"
                value={form.namaRT}
                onChange={(value) =>
                  setForm({
                    ...form,
                    namaRT: value,
                  })
                }
                placeholder="RT 011"
              />

              <Input
                label="Perumahan"
                value={form.perumahan}
                onChange={(value) =>
                  setForm({
                    ...form,
                    perumahan: value,
                  })
                }
                placeholder="Terangsari 1"
              />

              <Input
                label="Desa"
                value={form.desa}
                onChange={(value) =>
                  setForm({
                    ...form,
                    desa: value,
                  })
                }
              />

              <Input
                label="Kecamatan"
                value={form.kecamatan}
                onChange={(value) =>
                  setForm({
                    ...form,
                    kecamatan: value,
                  })
                }
              />

              <Input
                label="Kabupaten"
                value={form.kabupaten}
                onChange={(value) =>
                  setForm({
                    ...form,
                    kabupaten: value,
                  })
                }
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={saveRT}
                disabled={saving}
                style={primaryButton}
              >
                {saving
                  ? "Menyimpan..."
                  : "Simpan"}
              </button>

              <button
                onClick={() =>
                  setShowForm(false)
                }
                style={secondaryButton}
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* RT TABLE */}

        <div style={cardStyle}>
          <div
            style={{
              padding: "18px 20px",
              borderBottom:
                "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
              }}
            >
              Daftar RT
            </h2>
          </div>

          {loading ? (
            <div style={paddingStyle}>
              Memuat data RT...
            </div>
          ) : rows.length === 0 ? (
            <div style={paddingStyle}>
              Belum ada data RT.
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr>
                    <Th>RT/RW</Th>
                    <Th>Wilayah</Th>
                    <Th>KK</Th>
                    <Th>Warga</Th>
                    <Th>Status</Th>
                    <Th>Aksi</Th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <Td>
                        <strong>
                          RT {row.kodeRT}/RW{" "}
                          {row.kodeRW}
                        </strong>

                        <br />

                        <small>
                          {row.namaRT}
                        </small>
                      </Td>

                      <Td>
                        {row.perumahan ||
                          "-"}

                        <br />

                        <small>
                          {[
                            row.desa,
                            row.kecamatan,
                            row.kabupaten,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </small>
                      </Td>

                      <Td>
                        {row.statistik.kk}
                      </Td>

                      <Td>
                        {row.statistik.warga}
                      </Td>

                      <Td>
                        <span
                          style={{
                            padding:
                              "5px 9px",
                            borderRadius:
                              "999px",
                            fontSize:
                              "12px",
                            background:
                              row.aktif
                                ? "#dcfce7"
                                : "#fee2e2",
                            color:
                              row.aktif
                                ? "#166534"
                                : "#991b1b",
                          }}
                        >
                          {row.aktif
                            ? "AKTIF"
                            : "NONAKTIF"}
                        </span>
                      </Td>

                      <Td>
                        <div
                          style={{
                            display:
                              "flex",
                            gap: "8px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <button
                            onClick={() =>
                              openAccounts(
                                row
                              )
                            }
                            style={
                              accountButton
                            }
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
  <Users size={16} />
  Kelola Akun
</span>
                          </button>

                          <button
                            onClick={() =>
                              openEdit(row)
                            }
                            style={
                              secondarySmallButton
                            }
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              toggleRT(row)
                            }
                            style={
                              row.aktif
                                ? dangerButton
                                : successButton
                            }
                          >
                            {row.aktif
                              ? "Nonaktifkan"
                              : "Aktifkan"}
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ACCOUNT PANEL */}

        {selectedRT && (
          <div
            style={{
              ...cardStyle,
              marginTop: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                paddingBottom: "16px",
                borderBottom:
                  "1px solid #e5e7eb",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "20px",
                  }}
                >
                  <span
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  }}
>
  <Users size={20} />
  Akun RT{" "}
</span>
                  {selectedRT.kodeRT}/RW{" "}
                  {selectedRT.kodeRW}
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color: "#667085",
                  }}
                >
                  {selectedRT.namaRT}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                }}
              >
                <button
                  onClick={
                    openAddAccount
                  }
                  style={primaryButton}
                >
                  + Tambah Akun
                </button>

                <button
                  onClick={
                    closeAccounts
                  }
                  style={secondaryButton}
                >
                  Tutup
                </button>
              </div>
            </div>

            {accountMessage && (
              <Message
                text={accountMessage}
              />
            )}

            {/* ACCOUNT FORM */}

            {showAccountForm && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "18px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border:
                    "1px solid #e2e8f0",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  {editingAccountId
                    ? "Edit Akun"
                    : "Tambah Akun"}
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(220px,1fr))",
                    gap: "14px",
                  }}
                >
                  <Input
                    label="Username"
                    value={
                      accountForm.username
                    }
                    onChange={(value) =>
                      setAccountForm({
                        ...accountForm,
                        username:
                          value
                            .toLowerCase(),
                      })
                    }
                    placeholder="ketua011"
                  />

                  <Input
                    label={
                      editingAccountId
                        ? "Password Baru (opsional)"
                        : "Password"
                    }
                    value={
                      accountForm.password
                    }
                    onChange={(value) =>
                      setAccountForm({
                        ...accountForm,
                        password: value,
                      })
                    }
                    placeholder="Minimal 6 karakter"
                    type="password"
                  />

                  <label>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        marginBottom:
                          "6px",
                      }}
                    >
                      Role
                    </div>

                    <select
                      value={
                        accountForm.role
                      }
                      onChange={(e) =>
                        setAccountForm({
                          ...accountForm,
                          role:
                            e.target
                              .value as AccountRole,
                        })
                      }
                      style={
                        inputStyle
                      }
                    >
                      {(
                        Object.keys(
                          roleLabels
                        ) as AccountRole[]
                      ).map((role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {
                            roleLabels[
                              role
                            ]
                          }
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#667085",
                  }}
                >
                  RT otomatis:
                  {" "}
                  <strong>
                    RT{" "}
                    {selectedRT.kodeRT}
                    /RW{" "}
                    {selectedRT.kodeRW}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "18px",
                  }}
                >
                  <button
                    onClick={
                      saveAccount
                    }
                    disabled={
                      savingAccount
                    }
                    style={
                      primaryButton
                    }
                  >
                    {savingAccount
                      ? "Menyimpan..."
                      : "Simpan Akun"}
                  </button>

                  <button
                    onClick={() =>
                      setShowAccountForm(
                        false
                      )
                    }
                    style={
                      secondaryButton
                    }
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* ACCOUNT TABLE */}

            <div
              style={{
                marginTop: "18px",
              }}
            >
              {loadingAccounts ? (
                <div
                  style={paddingStyle}
                >
                  Memuat akun...
                </div>
              ) : selectedAccounts.length ===
                0 ? (
                <div
                  style={{
                    ...paddingStyle,
                    background:
                      "#f8fafc",
                    borderRadius:
                      "10px",
                  }}
                >
                  Belum ada akun untuk RT
                  ini.
                </div>
              ) : (
                <div
                  style={{
                    overflowX:
                      "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <Th>Username</Th>
                        <Th>Role</Th>
                        <Th>Status RT</Th>
                        <Th>Aksi</Th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedAccounts.map(
                        (account) => (
                          <tr
                            key={
                              account.id
                            }
                          >
                            <Td>
                              <strong>
                                {
                                  account.username
                                }
                              </strong>
                            </Td>

                            <Td>
                              {roleLabels[
                                account.role
                              ]}
                            </Td>

                            <Td>
                              <span
                                style={{
                                  padding:
                                    "5px 9px",
                                  borderRadius:
                                    "999px",
                                  fontSize:
                                    "12px",
                                  background:
                                    account
                                      .rtUnit
                                      ?.aktif
                                      ? "#dcfce7"
                                      : "#fee2e2",
                                }}
                              >
                                {account
                                  .rtUnit
                                  ?.aktif
                                  ? "AKTIF"
                                  : "NONAKTIF"}
                              </span>
                            </Td>

                            <Td>
                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap:
                                    "8px",
                                  flexWrap:
                                    "wrap",
                                }}
                              >
                                <button
  onClick={() =>
    openEditAccount(account)
  }
  style={secondarySmallButton}
>
  Edit
</button>

<button
  onClick={() => loadPermissions(account)}
  style={permissionButton}
>
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
    }}
  >
    <ShieldCheck size={15} />
    Permission
  </span>
</button>
                                
                                <button
                                  onClick={() =>
                                    deleteAccount(
                                      account
                                    )
                                  }
                                  style={
                                    dangerButton
                                  }
                                >
                                  Hapus
                                </button>
                              </div>
                            </Td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
              
            {/* PERMISSION PANEL */}

            {permissionAccount && (
              <div
                style={{
                  marginTop: "24px",
                  padding: "20px",
                  background: "#faf5ff",
                  border: "1px solid #e9d5ff",
                  borderRadius: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "18px",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "19px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <ShieldCheck size={20} />
                      Permission Akun
                    </h3>

                    <div
                      style={{
                        marginTop: "5px",
                        color: "#667085",
                        fontSize: "13px",
                      }}
                    >
                      Akun:{" "}
                      <strong>
                        {permissionAccount.username}
                      </strong>
                      {" • "}
                      {roleLabels[permissionAccount.role]}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPermissionAccount(null);
                      setPermissions([]);
                      setPermissionMessage("");
                    }}
                    style={secondarySmallButton}
                  >
                    Tutup
                  </button>
                </div>

                {permissionMessage && (
                  <Message text={permissionMessage} />
                )}

                {loadingPermissions ? (
                  <div style={paddingStyle}>
                    Memuat permission...
                  </div>
                ) : permissions.length === 0 ? (
                  <div style={paddingStyle}>
                    Tidak ada permission.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        style={{
                          background: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          padding: "14px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                              }}
                            >
                              {permission.name}
                            </div>

                            <div
                              style={{
                                marginTop: "3px",
                                fontSize: "12px",
                                color: "#667085",
                              }}
                            >
                              {permission.code}
                            </div>

                            {permission.description && (
                              <div
                                style={{
                                  marginTop: "5px",
                                  fontSize: "13px",
                                  color: "#667085",
                                }}
                              >
                                {permission.description}
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              disabled={
                                savingPermission ===
                                permission.code
                              }
                              onClick={() =>
                                savePermission(
                                  permission.code,
                                  null
                                )
                              }
                              style={
                                permission.overrideAllowed ===
                                null
                                  ? permissionActiveButton
                                  : permissionOptionButton
                              }
                            >
                              Default
                            </button>

                            <button
                              disabled={
                                savingPermission ===
                                permission.code
                              }
                              onClick={() =>
                                savePermission(
                                  permission.code,
                                  true
                                )
                              }
                              style={
                                permission.overrideAllowed ===
                                true
                                  ? permissionAllowButton
                                  : permissionOptionButton
                              }
                            >
                              Izinkan
                            </button>

                            <button
                              disabled={
                                savingPermission ===
                                permission.code
                              }
                              onClick={() =>
                                savePermission(
                                  permission.code,
                                  false
                                )
                              }
                              style={
                                permission.overrideAllowed ===
                                false
                                  ? permissionDenyButton
                                  : permissionOptionButton
                              }
                            >
                              Tolak
                            </button>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: "10px",
                            fontSize: "12px",
                            color: permission.effectiveAllowed
                              ? "#166534"
                              : "#991b1b",
                            fontWeight: 600,
                          }}
                        >
                          Efektif:{" "}
                          {permission.effectiveAllowed
                            ? "DIIZINKAN"
                            : "DITOLAK"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        )}

      </div>
    </div>
  );
}

// COMPONENTS
// =====================================================

function Stat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          color: "#667085",
          fontSize: "13px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
          marginTop: "5px",
        }}
      >
        {value.toLocaleString("id-ID")}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label
      style={{
        display: "block",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={
          placeholder
        }
        style={inputStyle}
      />
    </label>
  );
}

function Message({
  text,
}: {
  text: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "10px",
        padding: "12px 16px",
        marginBottom: "18px",
        border:
          "1px solid #e5e7eb",
      }}
    >
      {text}
    </div>
  );
}

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "12px 16px",
        background: "#f9fafb",
        borderBottom:
          "1px solid #e5e7eb",
        fontSize: "13px",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td
      style={{
        padding: "13px 16px",
        borderBottom:
          "1px solid #f0f0f0",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

// =====================================================
// STYLES
// =====================================================

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  padding: "20px",
  marginBottom: "24px",
};

const headingStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "18px",
};

const paddingStyle: React.CSSProperties = {
  padding: "30px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "white",
};

const primaryButton: React.CSSProperties = {
  border: 0,
  borderRadius: "9px",
  padding: "11px 18px",
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const secondaryButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  padding: "11px 18px",
  background: "white",
  cursor: "pointer",
};

const secondarySmallButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  padding: "7px 10px",
  background: "white",
  cursor: "pointer",
};

const accountButton: React.CSSProperties = {
  border: 0,
  borderRadius: "7px",
  padding: "7px 10px",
  background: "#eff6ff",
  color: "#1d4ed8",
  cursor: "pointer",
  fontWeight: 600,
};
const permissionButton: React.CSSProperties = {
  border: 0,
  borderRadius: "7px",
  padding: "7px 10px",
  background: "#f3e8ff",
  color: "#7e22ce",
  cursor: "pointer",
  fontWeight: 600,
};
const permissionOptionButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  padding: "7px 10px",
  background: "white",
  color: "#344054",
  cursor: "pointer",
  fontWeight: 600,
};

const permissionActiveButton: React.CSSProperties = {
  border: "1px solid #7e22ce",
  borderRadius: "7px",
  padding: "7px 10px",
  background: "#f3e8ff",
  color: "#7e22ce",
  cursor: "pointer",
  fontWeight: 700,
};

const permissionAllowButton: React.CSSProperties = {
  border: "1px solid #16a34a",
  borderRadius: "7px",
  padding: "7px 10px",
  background: "#dcfce7",
  color: "#166534",
  cursor: "pointer",
  fontWeight: 700,
};

const permissionDenyButton: React.CSSProperties = {
  border: "1px solid #dc2626",
  borderRadius: "7px",
  padding: "7px 10px",
  background: "#fee2e2",
  color: "#991b1b",
  cursor: "pointer",
  fontWeight: 700,
};
const dangerButton: React.CSSProperties = {
  border: 0,
  borderRadius: "7px",
  padding: "7px 10px",
  background: "#fee2e2",
  color: "#991b1b",
  cursor: "pointer",
};

const successButton: React.CSSProperties = {
  border: 0,
  borderRadius: "7px",
  padding: "7px 10px",
  background: "#dcfce7",
  color: "#166534",
  cursor: "pointer",
};














