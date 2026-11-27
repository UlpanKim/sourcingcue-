import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export type OAuthProvider = "kakao" | "naver" | "google";

export interface SessionUser {
  id: string;
  provider: OAuthProvider;
  name: string;
}

interface SessionPayload extends SessionUser {
  exp: number;
}

export const SESSION_COOKIE_NAME = "sc_session";
export const OAUTH_STATE_COOKIE_NAME = "sc_oauth_state";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-change-in-prod";

function isValidProvider(value: unknown): value is OAuthProvider {
  return value === "kakao" || value === "naver" || value === "google";
}

export function getAuthSecret(): string | null {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }
  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_SECRET;
  }
  return null;
}

export function signSessionToken(
  user: SessionUser,
  secret: string,
  ttlSec: number = SESSION_TTL_SEC,
): string {
  if (!secret || secret.trim().length === 0) {
    throw new Error("AUTH_SECRET_REQUIRED");
  }

  const payload: SessionPayload = {
    id: user.id,
    provider: user.provider,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string | null | undefined,
  secret: string | null | undefined,
): SessionUser | null {
  if (!token || !secret || typeof token !== "string" || typeof secret !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) {
    return null;
  }

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  const actualBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");

  if (
    actualBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const rawJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed = JSON.parse(rawJson) as Partial<SessionPayload>;

    if (
      typeof parsed.id !== "string" ||
      parsed.id.trim().length === 0 ||
      !isValidProvider(parsed.provider) ||
      typeof parsed.name !== "string" ||
      parsed.name.trim().length === 0 ||
      typeof parsed.exp !== "number" ||
      !Number.isFinite(parsed.exp)
    ) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (parsed.exp <= nowSec) {
      return null;
    }

    return {
      id: parsed.id,
      provider: parsed.provider,
      name: parsed.name,
    };
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionUser | null> {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) {
    return null;
  }

  return verifySessionToken(rawToken, secret);
}

export function sanitizeNextPath(raw?: string | null): string {
  if (!raw || typeof raw !== "string") {
    return "/";
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) {
    return "/";
  }

  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return "/";
  }

  if (/[\u0000-\u001f\u007f\\]/.test(trimmed) || trimmed.length > 1024) {
    return "/";
  }

  return trimmed;
}
