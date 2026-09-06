import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const [nameSetting, logoSetting, copyrightSetting] =
      await Promise.all([
        prisma.appSetting.findUnique({
          where: {
            key: "app_name",
          },
        }),
        prisma.appSetting.findUnique({
          where: {
            key: "app_logo",
          },
        }),
        prisma.appSetting.findUnique({
          where: {
            key: "app_copyright",
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      appName: nameSetting?.value?.trim() || "Smart Warga",
      appLogo: logoSetting?.value?.trim() || "",
      copyright:
        copyrightSetting?.value?.trim() ||
        `© ${new Date().getFullYear()} Smart RT 011 Terangsari 1. All rights reserved.`,
    });
  } catch (error) {
    console.error("APP_SETTINGS_GET_ERROR:", error);

    return NextResponse.json({
      success: true,
      appName: "Smart Warga",
      appLogo: "",
    });
  }
}
