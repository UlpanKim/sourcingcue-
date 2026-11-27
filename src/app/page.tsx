"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { GeneratedBundle } from "@/lib/pipeline/schemas";

const SAMPLE_URL =
  "https://detail.1688.com/offer/654981470061.html?tracelog=p4p&spm=a26352.13672862.offerlist.22.e3c51deehB4WJq&clickid=ad812ee333e54b2082526f95b31be746&sessionid=f38ed176ef2f7e343f4713cd6bcdee7c&_p_isad=1";

export default function HomePage() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [shippingMode, setShippingMode] = useState<"rocket_growth" | "normal">("rocket_growth");
  const [brandName, setBrandName] = useState("");
  const [productHint, setProductHint] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!sourceUrl.trim()) {
      setErrorMsg("소싱하신 1688 상품 주소를 붙여넣어 주세요.");
      return;
    }

    setIsLoading(true);
    setStatusStep(1);
    const timer1 = setTimeout(() => setStatusStep(2), 1200);
    const timer2 = setTimeout(() => setStatusStep(3), 2600);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: sourceUrl.trim(),
          shippingMode,
          brandName: brandName.trim(),
          productHint: productHint.trim(),
        }),
      });
      if (res.status === 401) {
        setIsLoading(false);
        router.push("/login?next=/");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "분석에 실패했습니다. 생성 횟수는 차감되지 않았습니다.");
        setIsLoading(false);
        return;
      }

      const bundle = data as GeneratedBundle;
      sessionStorage.setItem(`sourcingcue:${bundle.projectId}`, JSON.stringify(bundle));
      router.push(`/projects/${bundle.projectId}`);
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setIsLoading(false);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  }

  function fillSample() {
    setSourceUrl(SAMPLE_URL);
    setBrandName("데일리굿즈");
    setProductHint("울 캐시미어 터치 대폭 숄 머플러 200×70cm");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Status Pill */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-800">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span>매월 1개 상품 무료 생성 · 직접 수정 무제한</span>
        </div>
      </div>

      {/* Hero Title */}
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl sm:leading-tight">
          1688 링크 하나만 넣으세요.
          <br />
          <span className="text-blue-600">쿠팡 등록까지 한 번에</span> 끝납니다.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-slate-600 sm:text-lg">
          경쟁사 가격 분석, 마진 계산, 대표이미지 6컷, 860px 모바일 상세페이지까지
          <br className="hidden sm:inline" />
          복잡한 포토샵 없이 몇 분 만에 완성하세요.
        </p>
      </div>

      {/* One-Cue Input Card */}
      <form
        onSubmit={handleSubmit}
        className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 sm:p-8"
      >
        <label
          htmlFor="source-url"
          className="block text-base font-extrabold text-slate-900 sm:text-lg"
        >
          1688 상품 주소(URL) 입력
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="source-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://detail.1688.com/offer/..."
            disabled={isLoading}
            className="h-14 flex-1 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-base font-extrabold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>제작 중...</span>
              </>
            ) : (
              <>
                <span>원큐로 만들기</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        {/* Simple Options */}
        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              쿠팡 판매 방식
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShippingMode("rocket_growth")}
                className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                  shippingMode === "rocket_growth"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                로켓그로스
              </button>
              <button
                type="button"
                onClick={() => setShippingMode("normal")}
                className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                  shippingMode === "normal"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                일반배송 (위탁/사입)
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="brand-name"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              내 브랜드명 (없으면 비워두세요)
            </label>
            <input
              id="brand-name"
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="예: 데일리굿즈"
              className="h-10.5 w-full rounded-xl border border-slate-300 px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={fillSample}
            className="font-bold text-blue-600 underline underline-offset-4 hover:text-blue-800"
          >
            예시 1688 상품(캐시미어 터치 숄 머플러)으로 바로 체험하기
          </button>
          <Link
            href="/projects/demo"
            className="font-semibold text-slate-500 hover:text-slate-800"
          >
            완성된 샘플 결과 먼저 보기 →
          </Link>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMsg}
          </div>
        )}

        {isLoading && (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="space-y-2 text-sm font-bold text-blue-900">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-4 w-4 ${statusStep >= 1 ? "text-blue-600" : "text-slate-300"}`}
                />
                <span>1. 쿠팡 상위 경쟁사 가격·로켓그로스 비중 조사 중...</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-4 w-4 ${statusStep >= 2 ? "text-blue-600" : "text-slate-300"}`}
                />
                <span>2. 1688 원문 스펙 번역·중국어 제거·소구점 설계 중...</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-4 w-4 ${statusStep >= 3 ? "text-blue-600" : "text-slate-300"}`}
                />
                <span>3. 1000×1000 대표이미지 및 860px 상세페이지 조립 중...</span>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* 3 Core Outputs Summary */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <FileText className="h-7 w-7 text-blue-600" />
          <h2 className="mt-3 text-base font-extrabold text-slate-900">
            1. 경쟁사·판매전략 보고서
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            쿠팡 평균가, 권장 판매가, 마진율 계산, 검색 태그 20개까지 한눈에 확인합니다.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <ImageIcon className="h-7 w-7 text-blue-600" />
          <h2 className="mt-3 text-base font-extrabold text-slate-900">
            2. 대표·추가 이미지 6컷
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            중국어를 지우고 쿠팡 규격(1000×1000px)에 맞춘 썸네일을 바로 내려받습니다.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <LayoutTemplate className="h-7 w-7 text-blue-600" />
          <h2 className="mt-3 text-base font-extrabold text-slate-900">
            3. 860px 상세페이지 완성본
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            모바일에서 잘 읽히는 860px 분할 이미지와 상품정보고시까지 한 번에 뽑아줍니다.
          </p>
        </div>
      </div>

      {/* Trust Guarantee */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          크롤링·수집 실패 시 생성 횟수 차감 없음
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          오타·가격 직접 수정은 무제한 무료
        </span>
      </div>
    </div>
  );
}
