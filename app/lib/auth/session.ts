import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "rt_session";

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  wargaId: string | null;
  rTUnitId: string | null;
};

type SignedSession = {
  data: SessionUser;
  signature: string;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET belum diatur di environment."
    );
  }

  return secret;
}

function sign(data: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("hex");
}

function createSignedSession(user: SessionUser): SignedSession {
  const data = JSON.stringify(user);

  return {
    data: user,
    signature: sign(data),
  };
}

function verifySignedSession(value: string): SessionUser | null {
  try {
    const parsed = JSON.parse(value) as SignedSession;

    if (!parsed?.data || !parsed.signature) {
      return null;
    }

    const data = JSON.stringify(parsed.data);
    const expected = sign(data);

    if (parsed.signature.length !== expected.length) {
      return null;
    }

    const valid = crypto.timingSafeEqual(
      Buffer.from(parsed.signature),
      Buffer.from(expected)
    );

    if (!valid) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export async function setSession(user: SessionUser) {
  const cookieStore = await cookies();

  const signed = createSignedSession(user);

  cookieStore.set(
    SESSION_COOKIE,
    JSON.stringify(signed),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }
  );
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  return verifySignedSession(value);
}

export async function clearSession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);
}

