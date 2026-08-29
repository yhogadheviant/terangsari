import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: {
        key: "app_name",
      },
    });

    return NextResponse.json({
      success: true,
      appName: setting?.value?.trim() || "Smart Warga",
    });
  } catch (error) {
    console.error("APP_SETTINGS_GET_ERROR:", error);

    return NextResponse.json({
      success: true,
      appName: "Smart Warga",
    });
  }
}