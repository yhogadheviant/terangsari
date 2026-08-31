export type Role =
  | "superadmin"
  | "ketua"
  | "sekretaris"
  | "bendahara"
  | "warga";

export const roleLabels: Record<Role, string> = {
  superadmin: "Superadmin",
  ketua: "Ketua RT",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  warga: "Warga",
};

export const permissions: Record<Role, string[]> = {
  superadmin: [
  "superadmin",
  "kk",
  "warga",
  "usia",
  "kas",
  "taktis",
  "iuran",
  "pengumuman",
  "kegiatan",
  "laporan",
  "pengaturan",
],

  ketua: [
    "kk",
    "warga",
    "usia",
    "kas",
    "taktis",
    "iuran",
    "pengumuman",
    "kegiatan",
    "laporan",
    "pengaturan",
  ],

  sekretaris: [
    "kk",
    "warga",
    "usia",
    "pengumuman",
    "kegiatan",
    "laporan",
  ],

  bendahara: [
    "kas",
    "taktis",
    "iuran",
    "laporan",
  ],

  warga: [
    "profil",
    "iuran-sendiri",
    "pengumuman",
    "kegiatan",
  ],
};

