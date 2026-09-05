import { NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function getGoogleDriveFileId(rawUrl: string): string | null {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "drive.google.com"
  ) {
    return null;
  }

  // https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.pathname.match(
    /^\/file\/d\/([^/]+)(?:\/|$)/
  );

  if (fileMatch?.[1]) {
    return fileMatch[1];
  }

  // https://drive.google.com/uc?id=FILE_ID
  if (url.pathname === "/uc") {
    const id = url.searchParams.get("id");

    if (id) {
      return id;
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return new NextResponse("URL QRIS tidak ada.", {
        status: 400,
      });
    }

    const fileId = getGoogleDriveFileId(rawUrl);

    if (!fileId) {
      return new NextResponse(
        "Sumber QRIS tidak diizinkan. Gunakan URL file Google Drive.",
        {
          status: 400,
        }
      );
    }

    const targetUrl =
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

    const response = await fetch(targetUrl, {
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return new NextResponse(
        "Gambar QRIS tidak dapat diambil dari Google Drive.",
        {
          status: 502,
        }
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse(
        "File QRIS bukan gambar.",
        {
          status: 415,
        }
      );
    }

    const contentLength = Number(
      response.headers.get("content-length") || "0"
    );

    if (contentLength > MAX_IMAGE_BYTES) {
      return new NextResponse(
        "Ukuran gambar QRIS terlalu besar. Maksimal 5 MB.",
        {
          status: 413,
        }
      );
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return new NextResponse(
        "Ukuran gambar QRIS terlalu besar. Maksimal 5 MB.",
        {
          status: 413,
        }
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600",
        "X-Content-Type-Options": "nosniff",
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