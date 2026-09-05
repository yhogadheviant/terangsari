import { NextResponse } from "next/server";
import { getRTContext } from "@/app/lib/auth/rt-context";
import { requirePermission } from "@/app/lib/auth/authorization";
import * as XLSX from "xlsx";

const s = (v: unknown) => v == null ? "" : String(v).trim();

function date(v: unknown) {
  if (!v) return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0,10);
  const n = Number(v);
  if (!Number.isNaN(n) && n > 20000 && n < 70000)
    return new Date(Math.round((n - 25569) * 86400 * 1000)).toISOString().slice(0,10);
  const d = new Date(s(v));
  return Number.isNaN(d.getTime()) ? s(v) : d.toISOString().slice(0,10);
}

function ageFromBirthDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 0 ? "" : String(age);
}

function jk(v: string) {
  const x=v.toLowerCase();
  return x.includes("perempuan") || x === "p" ? "PEREMPUAN" : "LAKI_LAKI";
}
function hb(v: string) {
  const x=v.toLowerCase();
  if(x.includes("kepala"))return "KEPALA_KELUARGA";
  if(x.includes("istri"))return "ISTRI";
  if(x.includes("suami"))return "SUAMI";
  if(x.includes("anak"))return "ANAK";
  if(x.includes("mertua"))return "MERTUA";
  if(x.includes("orang tua")||x.includes("ibu")||x.includes("ayah"))return "ORANG_TUA";
  return "LAINNYA";
}
function statusTinggal(v: string) {
  const x=v.toLowerCase();
  if(x.includes("kontrak"))return "KONTRAK";
  if(x.includes("sewa"))return "SEWA";
  if(x.includes("numpang"))return "MENUMPANG";
  return "TETAP";
}
function pick(r: Record<string, unknown>, keys: string[]) {
  for(const k of keys){const v=s(r[k]);if(v)return v;}
  return "";
}

export async function POST(req: Request) {
  try {
    const context = await getRTContext(req);

    if (context.response) {
      return context.response;
    }

    const permissionResponse = await requirePermission(
      context.session,
      "WARGA_IMPORT"
    );

    if (permissionResponse) {
      return permissionResponse;
    }

    const rTUnitId = context.rTUnitId;

    if (!rTUnitId) {
      return NextResponse.json(
        { error: "RT aktif tidak ditemukan." },
        { status: 400 }
      );
    }
    const f=(await req.formData()).get("file");
    if(!(f instanceof File))return NextResponse.json({error:"File Excel tidak ditemukan."},{status:400});

    const wb=XLSX.read(Buffer.from(await f.arrayBuffer()),{type:"buffer",cellDates:true});
    const name=wb.SheetNames.find(x=>x.toLowerCase().includes("data kependudukan"))||wb.SheetNames[0];
    const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(wb.Sheets[name],{range:3,defval:""});

    let currentKK="";
    const out:any[]=[];
    const errors:string[]=[];

    rows.forEach((r,i)=>{
      const nkk=pick(r,["No KK","no_kk","NO KK"]);
      if(nkk)currentKK=nkk;
      const nik=pick(r,["NIK","nik"]);
      const nama=pick(r,["Nama Lengkap","nama_lgkp","Nama"]);
      if(!nik&&!nama)return;
      if(!currentKK)errors.push(`Baris ${i+4}: No KK belum ditemukan.`);
      if(!nik){errors.push(`Baris ${i+4}: NIK kosong.`);return;}
      if(!nama){errors.push(`Baris ${i+4}: Nama kosong.`);return;}

      const tanggalLahir=date(pick(r,["Tanggal Lahir","tgl_lhr"]));
      const usiaExcel=pick(r,["Usia","usia"]);
      const daerahKKAsal=pick(r,[
        "Kartu Keluarga Asal","Daerah KK Asal","Wilayah KK Asal",
        "KK Asal","No KK Asal","no_kk_asal",
        "Kartu Keluarga Asal / No KK Asal"
      ]);

      out.push({
        nomorKK:currentKK,
        daerahKKAsal,
        statusTinggal:statusTinggal(pick(r,["Status Tinggal","status_tinggal","Status Domisili","status_domisili"])),
        alamat:pick(r,["Alamat","alamat"]),
        rw:pick(r,["RW","no_rw"]), rt:pick(r,["RT","no_rt"]),
        nik,nama,
        hubunganKeluarga:hb(pick(r,["Status Hubungan Keluarga","stat_hbkel"])),
        jenisKelamin:jk(pick(r,["Jenis Kelamin","jenis_klmin"])),
        tempatLahir:pick(r,["Tempat Lahir","tmpt_lhr"]),
        tanggalLahir,
        usia:usiaExcel||ageFromBirthDate(tanggalLahir),
        golonganDarah:pick(r,["Golongan Darah","gol_drh"]),
        agama:pick(r,["Agama","agama"]),
        pendidikan:pick(r,["Pendidikan Terakhir","pddk_akh","Pendidikan","Sekolah"]),
        pekerjaan:pick(r,["Jenis Pekerjaan","jenis_pkrjn","Pekerjaan"]),
        statusKawin:pick(r,["Status Perkawinan","stat_kwn"]),
        namaIbu:pick(r,["Nama Ibu","nama_lgkp_ibu"]),
        namaAyah:pick(r,["Nama Ayah","nama_lgkp_ayah"]),
        nomorPaspor:pick(r,["No. Paspor","no_paspor"]),
        tanggalAkhirPaspor:date(pick(r,["Tanggal Akhir Paspor","tgl_akh_paspor"])),
        hubungan:pick(r,["Hubungan","hb"]),
        kodeHubungan:pick(r,["Kode Hubungan","Kode hb","kode_hubungan"])
      });
    });

    return NextResponse.json({sheet:name,total:out.length,errors,rows:out});
  } catch(e) {
    console.error(e);
    return NextResponse.json({error:"File Excel tidak dapat dibaca."},{status:500});
  }
}





