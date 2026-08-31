import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return new NextResponse("URL QRIS tidak ada.", {
        status: 400,
      });
    }

    let targetUrl = rawUrl;

    // Google Drive /file/d/FILE_ID/view
    const driveMatch = rawUrl.match(
      /drive\.google\.com\/file\/d\/([^/]+)/
    );

    if (driveMatch?.[1]) {
      targetUrl =
        `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    } else {
      // Google Drive ?id=FILE_ID
      const idMatch = rawUrl.match(
        /[?&]id=([^&]+)/
      );

      if (
        rawUrl.includes("drive.google.com") &&
        idMatch?.[1]
      ) {
        targetUrl =
          `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
      }
    }

    const response = await fetch(targetUrl, {
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return new NextResponse(
        "Gambar QRIS tidak dapat diambil dari sumber.",
        {
          status: 502,
        }
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      return new NextResponse(
        "File QRIS bukan gambar atau Google Drive tidak memberikan file gambar.",
        {
          status: 415,
        }
      );
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("QRIS_IMAGE_PROXY_ERROR:", error);

    return new NextResponse(
      "Gagal mengambil gambar QRIS.",
      {
        status: 500,
      }
    );
  }
}
