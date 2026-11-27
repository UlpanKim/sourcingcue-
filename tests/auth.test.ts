import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookiesMap = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = mockCookiesMap.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
  })),
}));

import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  getAuthSecret,
  getServerSession,
  sanitizeNextPath,
  signSessionToken,
  verifySessionToken,
  type SessionUser,
} from "../src/lib/auth/session";
import {
  buildOAuthAuthorizeUrl,
  exchangeOAuthCodeForUser,
  getCallbackUrl,
} from "../src/lib/auth/oauth";
import { GET as loginGet } from "../src/app/api/auth/login/[provider]/route";
import { GET as callbackGet } from "../src/app/api/auth/callback/[provider]/route";
import { GET as meGet } from "../src/app/api/auth/me/route";
import { POST as logoutPost } from "../src/app/api/auth/logout/route";
import { POST as analyzePost } from "../src/app/api/analyze/route";
import { POST as subscribePost } from "../src/app/api/billing/subscribe/route";

const AUTH_ENV_KEYS = [
  "AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "KAKAO_CLIENT_ID",
  "KAKAO_CLIENT_SECRET",
  "NAVER_CLIENT_ID",
  "NAVER_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

let savedEnv: Record<string, string | undefined> = {};
let savedNodeEnv: string | undefined;

beforeEach(() => {
  mockCookiesMap.clear();
  savedEnv = {};
  savedNodeEnv = process.env.NODE_ENV;
  for (const key of AUTH_ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of AUTH_ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  (process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv;
  vi.unstubAllGlobals();
});

describe("session token signing, verification, and security guards", () => {
  const secret = "unit-test-hmac-secret-32-bytes-minimum-key";
  const sampleUser: SessionUser = {
    id: "kakao:987654321",
    provider: "kakao",
    name: "홍길동",
  };

  it("signs and verifies valid session tokens across all supported providers", () => {
    for (const provider of ["kakao", "naver", "google"] as const) {
      const user: SessionUser = { id: `${provider}:1001`, provider, name: "테스트셀러" };
      const token = signSessionToken(user, secret, 3600);
      expect(verifySessionToken(token, secret)).toEqual(user);
    }
  });

  it("rejects tampered payloads, forged signatures, wrong secrets, and malformed tokens", () => {
    const token = signSessionToken(sampleUser, secret, 3600);
    const [payloadPart, sigPart] = token.split(".");

    // Tampered payload with original signature
    const forgedPayload = Buffer.from(
      JSON.stringify({
        id: "kakao:admin",
        provider: "kakao",
        name: "해커",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      "utf8",
    ).toString("base64url");
    expect(verifySessionToken(`${forgedPayload}.${sigPart}`, secret)).toBeNull();

    // Tampered signature
    const flippedSig = `${sigPart.slice(0, -1)}${sigPart.endsWith("a") ? "b" : "a"}`;
    expect(verifySessionToken(`${payloadPart}.${flippedSig}`, secret)).toBeNull();

    // Wrong secret
    expect(verifySessionToken(token, "wrong-secret")).toBeNull();

    // Malformed strings
    for (const bad of ["", "no-dot", "a.b.c", ".onlysig", "onlypayload."]) {
      expect(verifySessionToken(bad, secret)).toBeNull();
    }
  });

  it("rejects expired tokens", () => {
    const alreadyExpired = signSessionToken(sampleUser, secret, -5);
    expect(verifySessionToken(alreadyExpired, secret)).toBeNull();

    const zeroTtl = signSessionToken(sampleUser, secret, 0);
    expect(verifySessionToken(zeroTtl, secret)).toBeNull();
  });

  it("fails closed in production when AUTH_SECRET is missing and uses dev fallback in non-prod", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    expect(getAuthSecret()).toBe("dev-only-insecure-secret-change-in-prod");

    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(getAuthSecret()).toBeNull();

    process.env.AUTH_SECRET = "  prod-strong-secret-value  ";
    expect(getAuthSecret()).toBe("prod-strong-secret-value");
  });

  it("blocks open-redirect vectors in sanitizeNextPath while preserving safe relative paths", () => {
    const blockedCases = [
      "//evil.com",
      "//evil.com/phish",
      "https://evil.com",
      "http://evil.com/login",
      "/\\evil.com",
      "/foo\\bar",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "/checkout\r\nSet-Cookie: hacked=1",
      "",
      "   ",
    ];

    for (const unsafe of blockedCases) {
      expect(sanitizeNextPath(unsafe)).toBe("/");
    }
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath(undefined)).toBe("/");

    expect(sanitizeNextPath("/")).toBe("/");
    expect(sanitizeNextPath("/checkout?plan=pro&cycle=monthly")).toBe(
      "/checkout?plan=pro&cycle=monthly",
    );
    expect(sanitizeNextPath("/projects/demo")).toBe("/projects/demo");
  });

  it("resolves getServerSession from sc_session cookie", async () => {
    process.env.AUTH_SECRET = secret;
    expect(await getServerSession()).toBeNull();

    const token = signSessionToken(sampleUser, secret, 3600);
    mockCookiesMap.set(SESSION_COOKIE_NAME, token);
    expect(await getServerSession()).toEqual(sampleUser);
  });
});

describe("OAuth 2.0 flow and protected API route guards", () => {
  it("redirects to provider_not_configured when OAuth env vars are missing", async () => {
    const req = new Request("http://localhost:3007/api/auth/login/kakao?next=/checkout");
    const res = await loginGet(req, { params: Promise.resolve({ provider: "kakao" }) });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3007/login?error=provider_not_configured&provider=kakao",
    );
  });

  it("builds authorize URL, stores sc_oauth_state, and completes callback to issue sc_session", async () => {
    process.env.AUTH_SECRET = "oauth-callback-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://sourcingcue.example.com/";
    process.env.KAKAO_CLIENT_ID = "kakao-test-client-id";

    expect(getCallbackUrl("kakao", "http://localhost:3007")).toBe(
      "https://sourcingcue.example.com/api/auth/callback/kakao",
    );

    const authUrl = buildOAuthAuthorizeUrl("kakao", {
      reqOrigin: "http://localhost:3007",
      state: "state123",
    });
    expect(authUrl).toContain("https://kauth.kakao.com/oauth/authorize?");

    // Step 1: Login route sets state cookie and redirects to Kakao
    const loginReq = new Request(
      "http://localhost:3007/api/auth/login/kakao?next=%2Fcheckout%3Fplan%3Dpro",
    );
    const loginRes = await loginGet(loginReq, {
      params: Promise.resolve({ provider: "kakao" }),
    });
    expect(loginRes.status).toBe(302);
    expect(loginRes.headers.get("location")).toContain("https://kauth.kakao.com/oauth/authorize");

    const stateCookie = loginRes.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;
    expect(stateCookie).toBeDefined();
    const parsedState = JSON.parse(stateCookie!) as { state: string; next: string };
    expect(parsedState.next).toBe("/checkout?plan=pro");

    // Step 2: Callback rejects mismatched state
    mockCookiesMap.set(OAUTH_STATE_COOKIE_NAME, stateCookie!);
    const badCbReq = new Request(
      "http://localhost:3007/api/auth/callback/kakao?code=authcode1&state=wrongstate",
    );
    const badCbRes = await callbackGet(badCbReq, {
      params: Promise.resolve({ provider: "kakao" }),
    });
    expect(badCbRes.status).toBe(302);
    expect(badCbRes.headers.get("location")).toBe(
      "https://sourcingcue.example.com/login?error=oauth_failed&provider=kakao",
    );

    // Step 3: Callback exchanges code and issues sc_session cookie
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "kakao-access-tok" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 445566,
            kakao_account: { profile: { nickname: "김소싱" } },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const goodCbReq = new Request(
      `http://localhost:3007/api/auth/callback/kakao?code=authcode1&state=${parsedState.state}`,
    );
    const goodCbRes = await callbackGet(goodCbReq, {
      params: Promise.resolve({ provider: "kakao" }),
    });
    expect(goodCbRes.status).toBe(302);
    expect(goodCbRes.headers.get("location")).toBe(
      "https://sourcingcue.example.com/checkout?plan=pro",
    );

    const issuedSession = goodCbRes.cookies.get(SESSION_COOKIE_NAME)?.value;
    expect(issuedSession).toBeTruthy();
    expect(verifySessionToken(issuedSession!, "oauth-callback-secret")).toEqual({
      id: "kakao:445566",
      provider: "kakao",
      name: "김소싱",
    });
  });

  it("exchanges Naver and Google OAuth codes cleanly", async () => {
    process.env.NAVER_CLIENT_ID = "naver-id";
    process.env.NAVER_CLIENT_SECRET = "naver-secret";
    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "naver-tok" }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ resultcode: "00", response: { id: "nv_1", name: "박셀러" } }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "google-tok" }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ sub: "gg_1", name: "이대표" }), { status: 200 }),
        ),
    );

    const naverUser = await exchangeOAuthCodeForUser("naver", {
      code: "c1",
      state: "s1",
      reqOrigin: "http://localhost:3007",
    });
    expect(naverUser).toEqual({ id: "naver:nv_1", provider: "naver", name: "박셀러" });

    const googleUser = await exchangeOAuthCodeForUser("google", {
      code: "c2",
      state: "s2",
      reqOrigin: "http://localhost:3007",
    });
    expect(googleUser).toEqual({ id: "google:gg_1", provider: "google", name: "이대표" });
  });

  it("handles /api/auth/me and /api/auth/logout and blocks unauthenticated /api/analyze and /api/billing/subscribe with 401", async () => {
    process.env.AUTH_SECRET = "route-guard-secret";

    // Logged out -> me returns null, protected POST routes return 401
    const meOutRes = await meGet();
    expect(meOutRes.headers.get("Cache-Control")).toBe("no-store");
    expect(await meOutRes.json()).toEqual({ user: null });

    const analyzeRes = await analyzePost(
      new Request("http://localhost:3007/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: "https://detail.1688.com/offer/849201948271.html" }),
      }),
    );
    expect(analyzeRes.status).toBe(401);
    expect(await analyzeRes.json()).toEqual({ error: "로그인이 필요합니다." });

    const subscribeRes = await subscribePost(
      new Request("http://localhost:3007/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: "pro",
          cycle: "monthly",
          buyerName: "홍길동",
          buyerPhone: "01012345678",
          idempotencyKey: "idem-test-12345",
        }),
      }),
    );
    expect(subscribeRes.status).toBe(401);
    expect(await subscribeRes.json()).toEqual({
      error: "결제를 진행하려면 먼저 로그인해 주세요.",
    });

    // Logged in -> me returns user; logout clears sc_session cookie
    const token = signSessionToken(
      { id: "google:777", provider: "google", name: "최셀러" },
      "route-guard-secret",
    );
    mockCookiesMap.set(SESSION_COOKIE_NAME, token);

    const meInRes = await meGet();
    expect(await meInRes.json()).toEqual({
      user: { id: "google:777", provider: "google", name: "최셀러" },
    });

    const logoutRes = await logoutPost();
    expect(logoutRes.status).toBe(200);
    expect(await logoutRes.json()).toEqual({ ok: true });
    expect(logoutRes.cookies.get(SESSION_COOKIE_NAME)?.maxAge).toBe(0);
  });
});
