"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, CreditCard, PlusCircle } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

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
            <span className="block text-xs font-medium text-slate-500">
              1688 → 쿠팡 원큐 자동화
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              pathname === "/"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>새 상품 만들기</span>
          </Link>
          <Link
            href="/pricing"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              pathname === "/pricing"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>요금제</span>
          </Link>
          <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 sm:block">
            무료 체험 · 이번 달 1건 남음
          </div>
        </nav>
      </div>
    </header>
  );
}
