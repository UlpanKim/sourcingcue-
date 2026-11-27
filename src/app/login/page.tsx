"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

function normalizeNextPath(raw: string | null): string {
  if (!raw) return "/";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return "/";
  }
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed) || trimmed.length > 1024) {
    return "/";
  }
  return trimmed;
}

function getProviderLabel(provider: string | null): string {
  if (provider === "kakao") return "카카오";
  if (provider === "naver") return "네이버";
  if (provider === "google") return "Google";
  return "";
}

function getErrorMessage(error: string | null, provider: string | null): string | null {
  if (!error) return null;
  const label = getProviderLabel(provider);
  const prefix = label ? `${label} ` : "";

  if (error === "provider_not_configured") {
    return `${prefix}간편로그인 연동 설정이 아직 준비되지 않았습니다. 다른 로그인 버튼을 선택하시거나 관리자에게 문의해 주세요.`;
  }

  if (error === "oauth_failed") {
    return `${prefix}로그인 인증이 취소되었거나 일시적인 오류가 발생했습니다. 아래 버튼을 다시 눌러 시도해 주세요.`;
  }

  return "로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

function LoginContent() {
  const searchParams = useSearchParams();
  const nextPath = normalizeNextPath(searchParams.get("next"));
  const errorCode = searchParams.get("error");
  const errorProvider = searchParams.get("provider");
  const errorBanner = getErrorMessage(errorCode, errorProvider);

  const encodedNext = encodeURIComponent(nextPath);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 sm:p-9">
        {/* Top Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-extrabold text-blue-800 sm:text-sm">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>매월 상품 1건 무료 생성 · 비밀번호 입력 없음</span>
          </div>
        </div>

        {/* Heading */}
        <div className="mt-5 text-center">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            대표님, 평소 쓰시는 계정으로
            <br />
            <span className="text-blue-600">3초 만에 바로 시작</span>하세요
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            복잡한 회원가입 절차 없이 버튼 한 번이면
            <br className="hidden sm:inline" /> 무료 월간 계정이 자동으로 만들어지거나 로그인됩니다.
          </p>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-left"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-extrabold text-red-900">로그인 안내</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-red-800">
                {errorBanner}
              </p>
            </div>
          </div>
        )}

        {/* 3 Large Social Login Buttons */}
        <div className="mt-7 space-y-3.5">
          <a
            href={`/api/auth/login/kakao?next=${encodedNext}`}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-5 text-base font-extrabold text-[#191919] shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 sm:text-lg"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 fill-[#191919]"
            >
              <path d="M12 3C6.477 3 2 6.463 2 10.735c0 2.77 1.884 5.202 4.718 6.564-.154.557-.99 3.588-1.025 3.822 0 0-.02.168.089.233.109.064.237.015.237.015.313-.043 3.628-2.376 4.202-2.779.575.082 1.17.125 1.779.125 5.523 0 10-3.463 10-7.98C22 6.463 17.523 3 12 3Z" />
            </svg>
            <span>카카오로 3초 만에 시작하기</span>
          </a>

          <a
            href={`/api/auth/login/naver?next=${encodedNext}`}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#03C75A] px-5 text-base font-extrabold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:text-lg"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 fill-white"
            >
              <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845Z" />
            </svg>
            <span>네이버로 시작하기</span>
          </a>

          <a
            href={`/api/auth/login/google?next=${encodedNext}`}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-300 bg-white px-5 text-base font-extrabold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:text-lg"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
              <path
                fill="#4285F4"
                d="M23.49 12.275c0-.85-.075-1.675-.215-2.475H12v4.69h6.45c-.28 1.5-1.125 2.775-2.395 3.625v3.01h3.875c2.265-2.085 3.56-5.16 3.56-8.85Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.875-3.01c-1.075.72-2.45 1.15-4.065 1.15-3.125 0-5.77-2.11-6.715-4.945H1.28v3.105C3.255 21.31 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.285 14.285A7.22 7.22 0 0 1 4.91 12c0-.795.135-1.565.375-2.285V6.61H1.28A11.995 11.995 0 0 0 0 12c0 1.935.465 3.765 1.28 5.39l4.005-3.105Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.605 4.585 1.795l3.435-3.435C17.95 1.19 15.235 0 12 0 7.31 0 3.255 2.69 1.28 6.61l4.005 3.105C6.23 6.88 8.875 4.77 12 4.77Z"
              />
            </svg>
            <span>Google 계정으로 시작하기</span>
          </a>
        </div>

        {/* Free Account Benefits Summary */}
        <div className="mt-7 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <ul className="space-y-2 text-sm font-semibold text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>처음 오셨다면 별도 가입 없이 무료 월간 계정이 즉시 생성됩니다</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>카드 등록 없이 매월 1건 무료 생성 · 직접 수정 무제한</span>
            </li>
          </ul>
        </div>

        {/* Terms & Privacy Notice */}
        <p className="mt-6 text-center text-xs font-medium leading-relaxed text-slate-500">
          시작하기 버튼을 누르면 무료 월간 계정이 생성(또는 기존 계정 로그인)되며, 셀러원큐의{" "}
          <Link
            href="/terms"
            className="font-bold text-slate-700 underline underline-offset-2 hover:text-blue-600"
          >
            이용약관
          </Link>{" "}
          및{" "}
          <Link
            href="/privacy"
            className="font-bold text-slate-700 underline underline-offset-2 hover:text-blue-600"
          >
            개인정보처리방침
          </Link>
          에 동의하는 것으로 간주됩니다.
        </p>
      </div>

      {/* Reassurance Footer */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 sm:text-sm">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>안전한 공식 간편로그인 인증만 사용하며 비밀번호를 저장하지 않습니다</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm font-bold text-slate-600">
          로그인 화면을 불러오는 중...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
