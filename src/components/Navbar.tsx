"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, CreditCard, PlusCircle, LogIn, LogOut } from "lucide-react";

type AuthProvider = "kakao" | "naver" | "google";

interface ClientSessionUser {
  id: string;
  provider: AuthProvider;
  name: string;
}

function ProviderBadge({ provider }: { provider: AuthProvider }) {
  if (provider === "kakao") {
    return (
      <span className="rounded-md bg-[#FEE500] px-2 py-0.5 text-[11px] font-extrabold text-[#191919]">
        카카오
      </span>
    );
  }
  if (provider === "naver") {
    return (
      <span className="rounded-md bg-[#03C75A] px-2 py-0.5 text-[11px] font-extrabold text-white">
        네이버
      </span>
    );
  }
  return (
    <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
      Google
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setUser(null);
          return;
        }
        const data = (await res.json()) as { user?: ClientSessionUser | null };
        if (!cancelled) {
          setUser(data.user ?? null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-lg font-extrabold tracking-tight text-slate-900">
              셀러원큐
            </span>
            <span className="hidden text-xs font-medium text-slate-500 sm:block">
              1688 → 쿠팡 원큐 자동화
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition sm:px-3 ${
              pathname === "/"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">새 상품 만들기</span>
          </Link>
          <Link
            href="/pricing"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition sm:px-3 ${
              pathname === "/pricing"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>요금제</span>
          </Link>

          {!isLoaded ? (
            <div
              aria-hidden="true"
              className="h-9 w-28 animate-pulse rounded-xl bg-slate-100 sm:w-36"
            />
          ) : user ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:px-3">
              <ProviderBadge provider={user.provider} />
              <span className="max-w-[96px] truncate text-xs font-extrabold text-slate-800 sm:max-w-[140px] sm:text-sm">
                {user.name}님
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700 sm:px-4 sm:text-sm"
            >
              <LogIn className="h-4 w-4" />
              <span>로그인 / 무료 시작</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
