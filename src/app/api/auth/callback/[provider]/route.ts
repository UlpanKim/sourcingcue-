import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SEC,
  getAuthSecret,
  sanitizeNextPath,
  signSessionToken,
} from "@/lib/auth/session";
import {
  exchangeOAuthCodeForUser,
  getAppBaseUrl,
  isValidOAuthProvider,
} from "@/lib/auth/oauth";

interface StoredOAuthState {
  state?: unknown;
  next?: unknown;
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function redirectOAuthFailed(appBase: string, provider: string): NextResponse {
  const res = NextResponse.redirect(
    `${appBase}/login?error=oauth_failed&provider=${encodeURIComponent(provider)}`,
    {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    },
  );

  res.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  return res;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const reqUrl = new URL(req.url);
  const appBase = getAppBaseUrl(reqUrl.origin);

  if (!isValidOAuthProvider(provider)) {
    return NextResponse.redirect(`${appBase}/login?error=oauth_failed`, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    if (reqUrl.searchParams.get("error")) {
      return redirectOAuthFailed(appBase, provider);
    }

    const code = reqUrl.searchParams.get("code")?.trim();
    const state = reqUrl.searchParams.get("state")?.trim();
    if (!code || !state) {
      return redirectOAuthFailed(appBase, provider);
    }

    const cookieStore = await cookies();
    const rawStateCookie = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;
    if (!rawStateCookie) {
      return redirectOAuthFailed(appBase, provider);
    }

    let parsedState: StoredOAuthState;
    try {
      parsedState = JSON.parse(rawStateCookie) as StoredOAuthState;
    } catch {
      return redirectOAuthFailed(appBase, provider);
    }

    if (
      typeof parsedState.state !== "string" ||
      !parsedState.state ||
      !constantTimeEquals(parsedState.state, state)
    ) {
      return redirectOAuthFailed(appBase, provider);
    }

    const next = sanitizeNextPath(
      typeof parsedState.next === "string" ? parsedState.next : null,
    );

    const secret = getAuthSecret();
    if (!secret) {
      return redirectOAuthFailed(appBase, provider);
    }

    const user = await exchangeOAuthCodeForUser(provider, {
      code,
      state,
      reqOrigin: reqUrl.origin,
    });

    const sessionToken = signSessionToken(user, secret, SESSION_TTL_SEC);
    const res = NextResponse.redirect(`${appBase}${next}`, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });

    res.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });

    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_SEC,
      path: "/",
    });

    return res;
  } catch {
    return redirectOAuthFailed(appBase, provider);
  }
}
