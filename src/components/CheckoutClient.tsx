"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { PLANS, formatKrw, type PlanId } from "@/lib/billing/plans";

declare global {
  interface Window {
    Bootpay?: {
      requestSubscription: (payload: Record<string, unknown>) => Promise<{
        receipt_id?: string;
        order_id?: string;
      }>;
    };
  }
}

interface SubscribeSuccess {
  subscriptionId: string;
  billingKeyRef: string;
  amountKrw: number;
  planName: string;
  mode: "live_bootpay" | "sandbox";
  nextBillingDate: string;
}

interface CheckoutClientProps {
  bootpayClientKey: string;
}

function extractBootpayErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const obj = err as { event?: string; message?: string };
    if (obj.event === "cancel") {
      return "결제창이 닫혔습니다. 다시 시도해 주세요.";
    }
    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message.trim();
    }
  }
  return "결제가 취소되었거나 오류가 발생했습니다.";
}

export function CheckoutClient({ bootpayClientKey }: CheckoutClientProps) {
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan") as PlanId | null;
  const rawCycle = searchParams.get("cycle");

  const planId: "starter" | "pro" | "team" =
    rawPlan === "starter" || rawPlan === "pro" || rawPlan === "team" ? rawPlan : "pro";
  const cycle: "monthly" | "yearly" = rawCycle === "yearly" ? "yearly" : "monthly";
  const plan = PLANS[planId];

  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [receipt, setReceipt] = useState<SubscribeSuccess | null>(null);

  const idempotencyKey = useMemo(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `sub_bp_${crypto.randomUUID()}`;
    }
    return `sub_bp_${planId}_${cycle}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }, [planId, cycle]);

  const totalPrice = cycle === "monthly" ? plan.monthlyPriceKrw : plan.yearlyPriceKrw * 12;
  const hasBootpayKey = Boolean(bootpayClientKey.trim());

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!buyerName.trim() || !buyerPhone.trim()) {
      setErrorMsg("대표님 성함(상호명)과 휴대폰 번호를 입력해 주세요.");
      return;
    }

    if (!agreed) {
      setErrorMsg("정기결제 이용약관에 동의해 주세요.");
      return;
    }

    if (hasBootpayKey && !window.Bootpay) {
      setErrorMsg("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptId: string | undefined;

      if (hasBootpayKey && window.Bootpay) {
        const sdkResp = await window.Bootpay.requestSubscription({
          client_key: bootpayClientKey,
          pg: "라이트페이",
          method: "카드자동",
          price: totalPrice,
          tax_free: 0,
          order_name: `셀러원큐 ${plan.nameKo} (${cycle === "monthly" ? "월간" : "연간"})`,
          subscription_id: idempotencyKey,
          user: {
            username: buyerName.trim(),
            phone: buyerPhone.trim(),
          },
          items: [
            {
              id: plan.id,
              name: `셀러원큐 ${plan.nameKo}`,
              qty: 1,
              price: totalPrice,
            },
          ],
          extra: {
            open_type: "iframe",
          },
          redirect_url: `${window.location.origin}/checkout?plan=${plan.id}&cycle=${cycle}`,
        });
        receiptId = sdkResp.receipt_id;
      }

      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          cycle,
          paymentMethod: "card",
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          idempotencyKey,
          receiptId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "결제 처리에 실패했습니다.");
        return;
      }
      setReceipt(data as SubscribeSuccess);
    } catch (err) {
      setErrorMsg(extractBootpayErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-600">
                {receipt.mode === "live_bootpay" ? "BOOTPAY VERIFIED" : "BOOTPAY SANDBOX"}
              </span>
              <h1 className="text-2xl font-black text-slate-900">
                부트페이 정기결제(빌링키 발급)가 완료되었습니다
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-2.5 rounded-2xl bg-slate-50 p-5 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">구독 요금제</span>
              <span className="font-extrabold text-slate-900">{receipt.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">결제 금액</span>
              <span className="font-extrabold text-blue-700">{formatKrw(receipt.amountKrw)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">등록된 결제 식별자</span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {receipt.billingKeyRef}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">다음 자동결제 예정일</span>
              <span className="font-bold text-slate-800">{receipt.nextBillingDate}</span>
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-500">
            {receipt.mode === "live_bootpay"
              ? "부트페이 서버 검증이 완료되었습니다."
              : "※ 현재는 Bootpay 앱 키 연결 전 테스트(샌드박스) 모드로 실제 금액이 청구되지 않았습니다."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              바로 상품 만들러 가기
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              요금제로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {hasBootpayKey && (
        <Script src="https://js.bootpay.co.kr/bootpay-5.3.0.min.js" strategy="afterInteractive" />
      )}

      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>요금제 선택으로 돌아가기</span>
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">구독 결제</h1>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-900">
          {hasBootpayKey
            ? "Bootpay 라이트페이 연동 (샌드박스 테스트)"
            : "Bootpay 라이트페이 (로컬 시뮬레이션)"}
        </span>
      </div>

      <form onSubmit={handleCheckout} className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Left: Payment Method & Buyer */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-extrabold text-slate-900">1. 결제 수단</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              부트페이 라이트페이를 통해 안전하게 정기 자동결제를 등록합니다.
            </p>
            <div className="mt-4">
              <div className="flex h-12 items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-50 text-sm font-extrabold text-blue-800">
                <CreditCard className="h-4 w-4" />
                <span>신용/체크카드 (정기 자동결제)</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-extrabold text-slate-900">2. 대표님 정보</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">대표님 성함 / 상호명</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="예: 홍길동 대표"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">휴대폰 번호 (알림톡용)</label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">신청 요금제 요약</h2>
            <div className="mt-4 space-y-2.5 border-b border-slate-100 pb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">선택 플랜</span>
                <span className="font-extrabold text-slate-900">
                  {plan.nameKo} ({cycle === "monthly" ? "월간" : "연간 20% 할인"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">월 상품 생성 한도</span>
                <span className="font-bold text-blue-700">매월 {plan.monthlyQuota}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">AI 수정 한도</span>
                <span className="font-bold text-slate-800">
                  {plan.maxAiEditsPerProject === null
                    ? "무제한"
                    : `상품당 ${plan.maxAiEditsPerProject}회`}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-base font-extrabold text-slate-900">결제 금액</span>
              <span className="text-2xl font-black text-blue-600">{formatKrw(totalPrice)}</span>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                매월 자동결제(정기결제) 및{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-slate-800 underline underline-offset-2 hover:text-blue-600"
                >
                  이용약관
                </Link>
                ,{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-slate-800 underline underline-offset-2 hover:text-blue-600"
                >
                  개인정보처리방침
                </Link>
                ,{" "}
                <Link
                  href="/refund"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-slate-800 underline underline-offset-2 hover:text-blue-600"
                >
                  환불 규정
                </Link>
                에 동의합니다. 마이페이지에서 언제든 1클릭으로 해지할 수 있습니다.
              </span>
            </label>

            {errorMsg && (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-base font-extrabold text-white shadow-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>부트페이 결제 처리 중...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>{formatKrw(totalPrice)} 결제하기</span>
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              <span>
                {hasBootpayKey
                  ? "Bootpay 보안 결제창으로 안전하게 처리됩니다"
                  : "테스트 모드: 실제 카드/계좌에서 출금되지 않습니다"}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
