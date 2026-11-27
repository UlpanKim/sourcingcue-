import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE_NAME,
  getAuthSecret,
  sanitizeNextPath,
} from "@/lib/auth/session";
import {
  buildOAuthAuthorizeUrl,
  getAppBaseUrl,
  isProviderConfigured,
  isValidOAuthProvider,
} from "@/lib/auth/oauth";

const OAUTH_STATE_TTL_SEC = 60 * 10;

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

  if (!isProviderConfigured(provider)) {
    return NextResponse.redirect(
      `${appBase}/login?error=provider_not_configured&provider=${encodeURIComponent(provider)}`,
      {
        status: 302,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  if (!getAuthSecret()) {
    return NextResponse.redirect(
      `${appBase}/login?error=oauth_failed&provider=${encodeURIComponent(provider)}`,
      {
        status: 302,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const next = sanitizeNextPath(reqUrl.searchParams.get("next"));
  const authorizeUrl = buildOAuthAuthorizeUrl(provider, {
    reqOrigin: reqUrl.origin,
    state,
  });

  if (!authorizeUrl) {
    return NextResponse.redirect(
      `${appBase}/login?error=provider_not_configured&provider=${encodeURIComponent(provider)}`,
      {
        status: 302,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const res = NextResponse.redirect(authorizeUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });

  res.cookies.set(OAUTH_STATE_COOKIE_NAME, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: OAUTH_STATE_TTL_SEC,
    path: "/",
  });

  return res;
}
