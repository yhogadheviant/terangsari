import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth/session";
import { hasRole } from "@/app/lib/auth/authorization";

export async function GET(request: NextRequest) {
  try {
    const session=await getSession();
    if(!session) return NextResponse.json({success:false,error:"Belum login."},{status:401});
    if(!hasRole(session,["SUPERADMIN"])) return NextResponse.json({success:false,error:"Akses hanya untuk SUPERADMIN."},{status:403});
    const raw=Number(request.nextUrl.searchParams.get("limit")||200);
    const limit=Math.min(Math.max(Number.isFinite(raw)?raw:200,20),500);
    const role=request.nextUrl.searchParams.get("role");
    const action=request.nextUrl.searchParams.get("action");
    const module=request.nextUrl.searchParams.get("module");
    const where:any={};
    if(role) where.actorRole=role.toUpperCase();
    if(action) where.action=action.toUpperCase();
    if(module) where.module=module.toUpperCase();

    const rows=await prisma.activityLog.findMany({
      where,orderBy:{createdAt:"desc"},take:limit,
      include:{rTUnit:{select:{kodeRT:true,kodeRW:true,namaRT:true}}},
    });
    return NextResponse.json({success:true,data:rows.map(x=>({
      id:x.id,actorUsername:x.actorUsername,actorRole:x.actorRole,action:x.action,module:x.module,
      description:x.description,metadata:x.metadata,ipAddress:x.ipAddress,userAgent:x.userAgent,
      rtUnit:x.rTUnit?`${x.rTUnit.kodeRT}/RW ${x.rTUnit.kodeRW}`:null,
      createdAt:x.createdAt.toISOString(),
    }))});
  }catch(error){
    console.error("SUPERADMIN_ACTIVITY_GET_ERROR",error);
    return NextResponse.json({success:false,error:"Gagal mengambil log aktivitas."},{status:500});
  }
}
