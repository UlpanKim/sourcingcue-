import "server-only";
import type { OAuthProvider, SessionUser } from "./session";

const OAUTH_TIMEOUT_MS = 10_000;

interface ProviderEndpoints {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

const PROVIDER_ENDPOINTS: Record<OAuthProvider, ProviderEndpoints> = {
  kakao: {
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    userInfoUrl: "https://kapi.kakao.com/v2/user/me",
  },
  naver: {
    authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
    tokenUrl: "https://nid.naver.com/oauth2.0/token",
    userInfoUrl: "https://openapi.naver.com/v1/nid/me",
  },
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
  },
};

interface ProviderCredentials {
  clientId: string;
  clientSecret?: string;
}

export function isValidOAuthProvider(value: string): value is OAuthProvider {
  return value === "kakao" || value === "naver" || value === "google";
}

function getProviderCredentials(provider: OAuthProvider): ProviderCredentials | null {
  if (provider === "kakao") {
    const clientId = process.env.KAKAO_CLIENT_ID?.trim();
    const clientSecret = process.env.KAKAO_CLIENT_SECRET?.trim();
    if (!clientId) return null;
    return { clientId, clientSecret: clientSecret || undefined };
  }

  if (provider === "naver") {
    const clientId = process.env.NAVER_CLIENT_ID?.trim();
    const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return null;
    return { clientId, clientSecret };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  return getProviderCredentials(provider) !== null;
}

export function getAppBaseUrl(reqOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  return reqOrigin.replace(/\/$/, "");
}

export function getCallbackUrl(provider: OAuthProvider, reqOrigin: string): string {
  return `${getAppBaseUrl(reqOrigin)}/api/auth/callback/${provider}`;
}

export function buildOAuthAuthorizeUrl(
  provider: OAuthProvider,
  opts: { reqOrigin: string; state: string },
): string | null {
  const creds = getProviderCredentials(provider);
  if (!creds) {
    return null;
  }

  const endpoints = PROVIDER_ENDPOINTS[provider];
  const callbackUrl = getCallbackUrl(provider, opts.reqOrigin);
  const url = new URL(endpoints.authorizeUrl);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", opts.state);

  if (provider === "google") {
    url.searchParams.set("scope", "openid profile");
    url.searchParams.set("prompt", "select_account");
  }

  return url.toString();
}

interface TokenEndpointResponse {
  access_token?: string;
  error?: string;
}

interface KakaoUserResponse {
  id?: number | string;
  properties?: { nickname?: string };
  kakao_account?: {
    name?: string;
    profile?: { nickname?: string };
  };
}

interface NaverUserResponse {
  resultcode?: string;
  response?: {
    id?: string;
    name?: string;
    nickname?: string;
  };
}

interface GoogleUserResponse {
  sub?: string;
  name?: string;
  given_name?: string;
}

function normalizeDisplayName(raw: string | undefined, fallback: string): string {
  const cleaned = raw?.trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, 60);
}

export async function exchangeOAuthCodeForUser(
  provider: OAuthProvider,
  opts: { code: string; state: string; reqOrigin: string },
): Promise<SessionUser> {
  const creds = getProviderCredentials(provider);
  if (!creds) {
    throw new Error("OAUTH_PROVIDER_NOT_CONFIGURED");
  }

  const endpoints = PROVIDER_ENDPOINTS[provider];
  const callbackUrl = getCallbackUrl(provider, opts.reqOrigin);

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: creds.clientId,
    redirect_uri: callbackUrl,
    code: opts.code,
  });

  if (creds.clientSecret) {
    tokenParams.set("client_secret", creds.clientSecret);
  }

  if (provider === "naver") {
    tokenParams.set("state", opts.state);
  }

  const tokenRes = await fetch(endpoints.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      Accept: "application/json",
    },
    body: tokenParams.toString(),
    signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS),
  });

  if (!tokenRes.ok) {
    throw new Error("OAUTH_TOKEN_EXCHANGE_FAILED");
  }

  const tokenJson = (await tokenRes.json()) as TokenEndpointResponse;
  const accessToken = tokenJson.access_token?.trim();
  if (!accessToken || tokenJson.error) {
    throw new Error("OAUTH_ACCESS_TOKEN_MISSING");
  }

  const userRes = await fetch(endpoints.userInfoUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS),
  });

  if (!userRes.ok) {
    throw new Error("OAUTH_USERINFO_FAILED");
  }

  if (provider === "kakao") {
    const data = (await userRes.json()) as KakaoUserResponse;
    const rawId = data.id !== undefined && data.id !== null ? String(data.id).trim() : "";
    if (!rawId) {
      throw new Error("OAUTH_KAKAO_ID_MISSING");
    }
    const name = normalizeDisplayName(
      data.kakao_account?.profile?.nickname ??
        data.properties?.nickname ??
        data.kakao_account?.name,
      "카카오 회원",
    );
    return {
      id: `kakao:${rawId}`,
      provider: "kakao",
      name,
    };
  }

  if (provider === "naver") {
    const data = (await userRes.json()) as NaverUserResponse;
    const rawId = data.response?.id?.trim() ?? "";
    if (!rawId) {
      throw new Error("OAUTH_NAVER_ID_MISSING");
    }
    const name = normalizeDisplayName(
      data.response?.name ?? data.response?.nickname,
      "네이버 회원",
    );
    return {
      id: `naver:${rawId}`,
      provider: "naver",
      name,
    };
  }

  const data = (await userRes.json()) as GoogleUserResponse;
  const rawId = data.sub?.trim() ?? "";
  if (!rawId) {
    throw new Error("OAUTH_GOOGLE_ID_MISSING");
  }
  const name = normalizeDisplayName(data.name ?? data.given_name, "Google 회원");
  return {
    id: `google:${rawId}`,
    provider: "google",
    name,
  };
}
