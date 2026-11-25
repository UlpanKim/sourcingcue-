"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { PLAN_ORDER, PLANS, formatKrw } from "@/lib/billing/plans";

export default function PricingPage() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">
          외주 1건 비용으로, 한 달 내내 만드세요
        </h1>
        <p className="mt-3 text-base font-medium text-slate-600 sm:text-lg">
          어려운 토큰·크레딧 계산 없이 <strong className="text-slate-900">상품 건수</strong>로 깔끔하게 이용합니다.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="mt-7 inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-xl px-5 py-2 text-sm font-bold transition ${
              cycle === "monthly"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            월간 결제
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-bold transition ${
              cycle === "yearly"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>연간 결제</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-800">
              20% 할인
            </span>
          </button>
        </div>
      </div>

      {/* 4 Plan Cards */}
      <div className="mt-10 grid gap-6 lg:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const price = cycle === "monthly" ? plan.monthlyPriceKrw : plan.yearlyPriceKrw;
          const isPro = Boolean(plan.recommended);

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm ${
                isPro ? "border-2 border-blue-600 shadow-lg shadow-blue-100" : "border-slate-200"
              }`}
            >
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3.5 py-1 text-xs font-extrabold text-white">
                  대표님 가장 많이 선택
                </div>
              )}

              <div>
                <h2 className="text-xl font-black text-slate-900">{plan.nameKo}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{plan.tagline}</p>
              </div>

              <div className="mt-5 border-b border-slate-100 pb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">
                    {price === 0 ? "무료" : formatKrw(price)}
                  </span>
                  {price > 0 && <span className="text-sm font-semibold text-slate-500">/월</span>}
                </div>
                <p className="mt-1.5 text-sm font-bold text-blue-700">
                  매월 상품 {plan.monthlyQuota}건 ·{" "}
                  {plan.maxAiEditsPerProject === null
                    ? "AI 수정 무제한"
                    : `AI 수정 ${plan.maxAiEditsPerProject}회`}
                </p>
              </div>

              <ul className="mt-5 flex-1 space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={
                  plan.id === "free"
                    ? "/"
                    : `/checkout?plan=${plan.id}&cycle=${cycle}`
                }
                className={`mt-6 inline-flex h-12 items-center justify-center rounded-xl text-sm font-extrabold transition ${
                  isPro
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100"
                }`}
              >
                {plan.id === "free" ? "무료로 1건 바로 만들기" : `${plan.nameKo} 시작하기`}
              </Link>
            </div>
          );
        })}
      </div>

      {/* 4050 Trust Box */}
      <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
            <div>
              <h3 className="text-base font-extrabold text-emerald-950">
                대표님 안심 보장 3원칙
              </h3>
              <p className="mt-1 text-sm font-medium text-emerald-900">
                ① 무료 체험도 워터마크 없이 쿠팡에 바로 등록 가능 · ② 오타/가격 직접 수정은 무제한 무료 · ③ 1688 접속 오류 시 생성 횟수 미차감
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
