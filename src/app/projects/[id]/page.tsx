"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Edit3,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Lock,
  Sparkles,
  Wand2,
} from "lucide-react";
import { buildFallbackPipelineOutput } from "@/lib/pipeline/fallback";
import { renderDetailHtml } from "@/lib/pipeline/detailTemplate";
import {
  DetailPageContentSchema,
  StrategyReportSchema,
  type GeneratedBundle,
} from "@/lib/pipeline/schemas";
import { formatKrw } from "@/lib/billing/plans";

function createDemoBundle(): GeneratedBundle {
  const sourceUrl =
    "https://detail.1688.com/offer/654981470061.html";
  const fallback = buildFallbackPipelineOutput({
    sourceUrl,
    shippingMode: "rocket_growth",
    brandName: "데일리굿즈",
    productHint: "울 캐시미어 터치 대폭 숄 머플러 200×70cm",
  });
  return {
    projectId: "demo",
    sourceUrl,
    shippingMode: "rocket_growth",
    brandName: "데일리굿즈",
    createdAt: new Date().toISOString(),
    usedModel: "gemini-3.5-flash (sample)",
    isLiveGemini: false,
    report: fallback.report,
    detailContent: fallback.detailContent,
    detailHtml: renderDetailHtml(fallback.detailContent, "데일리굿즈"),
  };
}

const IMAGE_SLOTS = [
  {
    id: "main",
    title: "대표이미지 (1000×1000)",
    badge: "화이트/아이보리 메인컷",
    imgUrl: "https://cbu01.alicdn.com/img/ibank/O1CN01sk1Anc1wltKBJTdYV_!!2201980676349-0-cib.jpg_.webp",
  },
  {
    id: "sub1",
    title: "추가 1 · 200×70cm 대폭 숄",
    badge: "실내 숄/목도리 겸용",
    imgUrl: "https://cbu01.alicdn.com/img/ibank/O1CN01OeoXef1wltK783q4B_!!2201980676349-0-cib.jpg_.webp",
  },
  {
    id: "sub2",
    title: "추가 2 · 63컬러 라인업",
    badge: "인기 솔리드 컬러 구성",
    imgUrl: "https://cbu01.alicdn.com/img/ibank/O1CN01udqGtg1wltKFEFFk0_!!2201980676349-0-cib.jpg_.webp",
  },
  {
    id: "sub3",
    title: "추가 3 · 트윌(능직) 편직",
    badge: "330g 고중량 원단 디테일",
    imgUrl: "https://cbu01.alicdn.com/img/ibank/O1CN01k5ZySo1wltKCmWyb8_!!2201980676349-0-cib.jpg_.webp",
  },
  {
    id: "sub4",
    title: "추가 4 · 자연스러운 태슬 마감",
    badge: "남녀공용 데일리 코디",
    imgUrl: "https://cbu01.alicdn.com/img/ibank/O1CN01W30BKU1wltK785zEn_!!2201980676349-0-cib.jpg_.webp",
  },
  {
    id: "sub5",
    title: "추가 5 · 선물/패키지 포장",
    badge: "로켓그로스 바코드 여백",
    imgUrl: "https://cbu01.alicdn.com/img/ibank/O1CN01Wq0VpU1wltK9Ddosc_!!2201980676349-0-cib.jpg_.webp",
  },
];

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id || "demo";

  const [bundle, setBundle] = useState<GeneratedBundle>(() => createDemoBundle());
  const [activeTab, setActiveTab] = useState<"report" | "images" | "detail">("report");
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedCategory, setCopiedCategory] = useState(false);

  // Free plan quota simulation: 3 AI edits per project, direct text edits unlimited
  const [remainingAiEdits, setRemainingAiEdits] = useState<number>(3);
  const [editNotice, setEditNotice] = useState<string>("");

  // Margin simulator state
  const [unitCostKrw, setUnitCostKrw] = useState<number>(4800);
  const [sellingPriceKrw, setSellingPriceKrw] = useState<number>(19900);

  // Direct text edit (unlimited & free — browser-side template re-binding, no AI API call)
  const [headlineDraft, setHeadlineDraft] = useState<string>(bundle.detailContent.heroHeadline);
  const [subheadlineDraft, setSubheadlineDraft] = useState<string>(
    bundle.detailContent.heroSubheadline,
  );

  useEffect(() => {
    const saved = sessionStorage.getItem(`sourcingcue:${projectId}`);
    if (saved) {
      try {
        const raw = JSON.parse(saved) as Partial<GeneratedBundle>;
        const reportRes = StrategyReportSchema.safeParse(raw.report);
        const detailRes = DetailPageContentSchema.safeParse(raw.detailContent);
        if (!reportRes.success || !detailRes.success) {
          return;
        }
        const safeBrand = typeof raw.brandName === "string" ? raw.brandName.slice(0, 40) : "";
        const safeProjectId =
          typeof raw.projectId === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(raw.projectId)
            ? raw.projectId
            : "demo";
        const hydrated: GeneratedBundle = {
          projectId: safeProjectId,
          sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : "",
          shippingMode: raw.shippingMode === "normal" ? "normal" : "rocket_growth",
          brandName: safeBrand,
          createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
          usedModel: typeof raw.usedModel === "string" ? raw.usedModel : "gemini-3.5-flash",
          isLiveGemini: Boolean(raw.isLiveGemini),
          report: reportRes.data,
          detailContent: detailRes.data,
          // Always recompute HTML deterministically from validated schema data
          detailHtml: renderDetailHtml(detailRes.data, safeBrand || "셀러원큐 셀렉트"),
        };
        setBundle(hydrated);
        setUnitCostKrw(hydrated.report.pricingGuide.estimatedUnitCostKrw);
        setSellingPriceKrw(hydrated.report.pricingGuide.targetPriceKrw);
        setHeadlineDraft(hydrated.detailContent.heroHeadline);
        setSubheadlineDraft(hydrated.detailContent.heroSubheadline);
      } catch {
        // Keep demo bundle
      }
    }
  }, [projectId]);

  function handleCopyTags() {
    navigator.clipboard.writeText(bundle.report.searchTags.join(", "));
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  }

  function handleCopyCategory() {
    navigator.clipboard.writeText(bundle.report.categoryPath);
    setCopiedCategory(true);
    setTimeout(() => setCopiedCategory(false), 2000);
  }

  function handleAiEdit(actionLabel: string) {
    if (remainingAiEdits <= 0) {
      setEditNotice("무료 플랜의 상품당 AI 수정 3회를 모두 사용했습니다. 직접 글자 수정은 계속 무제한 가능합니다.");
      return;
    }
    setRemainingAiEdits((prev) => prev - 1);
    setEditNotice(`'${actionLabel}' AI 수정이 반영되었습니다. (남은 AI 수정: ${remainingAiEdits - 1}회)`);
  }

  function handleDirectTextSave() {
    const updatedContent = {
      ...bundle.detailContent,
      heroHeadline: headlineDraft,
      heroSubheadline: subheadlineDraft,
    };
    setBundle({
      ...bundle,
      detailContent: updatedContent,
      detailHtml: renderDetailHtml(updatedContent, bundle.brandName || "셀러원큐 셀렉트"),
    });
    setEditNotice("직접 텍스트 수정이 반영되었습니다. (AI API 호출 없음 · 무제한 무료)");
  }

  function handleDownloadHtml() {
    const safeId = /^[a-zA-Z0-9_-]{1,40}$/.test(bundle.projectId) ? bundle.projectId : "detail";
    const safeHtml = renderDetailHtml(bundle.detailContent, bundle.brandName || "셀러원큐 셀렉트");
    const blob = new Blob([safeHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeId}_detail_860px.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Margin calculation (Coupang ~10.8% fee + ~3,000 KRW fulfillment/shipping)
  const coupangFee = Math.round(sellingPriceKrw * 0.108);
  const fulfillmentCost = 3000;
  const netProfit = sellingPriceKrw - unitCostKrw - coupangFee - fulfillmentCost;
  const marginPct = sellingPriceKrw > 0 ? Math.round((netProfit / sellingPriceKrw) * 1000) / 10 : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Action Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-extrabold text-blue-800">
              {bundle.shippingMode === "rocket_growth" ? "로켓그로스 맞춤" : "일반배송 맞춤"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-600">
              {bundle.isLiveGemini ? `AI 실분석 (${bundle.usedModel})` : "샘플 미리보기 모드"}
            </span>
          </div>
          <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
            {bundle.report.productNameKo}
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{bundle.sourceUrl}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-extrabold text-amber-900">
            남은 AI 수정: {remainingAiEdits} / 3회
          </div>
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>상세페이지 HTML 받기</span>
          </button>
        </div>
      </div>

      {editNotice && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">
          {editNotice}
        </div>
      )}

      {/* 3 Main Tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${
            activeTab === "report"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>1. 경쟁사·판매전략 보고서</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("images")}
          className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${
            activeTab === "images"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>2. 대표·추가 이미지 (6컷)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("detail")}
          className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${
            activeTab === "detail"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <LayoutTemplate className="h-4 w-4" />
          <span>3. 860px 상세페이지</span>
        </button>
      </div>

      {/* TAB 1: Strategy Report */}
      {activeTab === "report" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Recommended Category */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold text-blue-700">
                    쿠팡 WING 등록 추천 카테고리
                  </span>
                  <p className="mt-1 text-base font-black text-slate-900 sm:text-lg">
                    {bundle.report.categoryPath}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCategory}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-blue-700"
                >
                  {copiedCategory ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedCategory ? "복사 완료!" : "카테고리 복사"}</span>
                </button>
              </div>
            </div>

            {/* Market Snapshot */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-extrabold text-slate-900">쿠팡 시장 분석 요약</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-xs font-bold text-slate-500">상위 상품 평균가</span>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {formatKrw(bundle.report.marketSnapshot.avgPriceKrw)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-xs font-bold text-slate-500">로켓그로스 비중</span>
                  <p className="mt-1 text-2xl font-black text-blue-600">
                    {bundle.report.marketSnapshot.rocketGrowthSharePct}%
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <span className="text-xs font-bold text-slate-500">진입 난이도</span>
                  <p className="mt-1 text-2xl font-black text-emerald-700">
                    {bundle.report.marketSnapshot.competitionLevel}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">
                {bundle.report.marketSnapshot.summaryComment}
              </p>
            </div>

            {/* Recommended Titles & Key Selling Points */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-extrabold text-slate-900">추천 쿠팡 상품명 (금지어 필터 완료)</h2>
              <ul className="mt-3 space-y-2">
                {bundle.report.titleCandidates.map((title) => (
                  <li
                    key={title}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800"
                  >
                    {title}
                  </li>
                ))}
              </ul>

              <h3 className="mt-6 text-base font-extrabold text-slate-900">핵심 소구점 3가지</h3>
              <ul className="mt-2 space-y-2">
                {bundle.report.keySellingPoints.map((pt, i) => (
                  <li key={pt} className="text-sm font-medium text-slate-700">
                    <strong className="text-blue-600">0{i + 1}.</strong> {pt}
                  </li>
                ))}
              </ul>
            </div>

            {/* 20 Search Tags */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900">
                  쿠팡 검색 태그 20개 (WING 바로 복사용)
                </h2>
                <button
                  type="button"
                  onClick={handleCopyTags}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                >
                  {copiedTags ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedTags ? "복사 완료!" : "20개 전체 복사"}</span>
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {bundle.report.searchTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Margin Calculator + Risk Alerts */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-extrabold text-slate-900">내 마진 계산기</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                숫자를 바꾸면 예상 순이익이 즉시 계산됩니다.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    1688 사입 원가 (원)
                  </label>
                  <input
                    type="number"
                    value={unitCostKrw}
                    onChange={(e) => setUnitCostKrw(Number(e.target.value) || 0)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    쿠팡 판매가 (원)
                  </label>
                  <input
                    type="number"
                    value={sellingPriceKrw}
                    onChange={(e) => setSellingPriceKrw(Number(e.target.value) || 0)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>쿠팡 수수료 (약 10.8%)</span>
                  <span>-{formatKrw(coupangFee)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>예상 입출고/배송비</span>
                  <span>-{formatKrw(fulfillmentCost)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900">
                  <span>개당 순이익</span>
                  <span className={netProfit >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {formatKrw(netProfit)} ({marginPct}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-base font-extrabold">사입 전 리스크 체크</h2>
              </div>
              <div className="mt-3 space-y-3">
                {bundle.report.riskAlerts.map((alert) => (
                  <div key={alert.title} className="rounded-xl bg-white/80 p-3 text-xs">
                    <span className="font-extrabold text-amber-900">[{alert.level}] {alert.title}</span>
                    <p className="mt-1 leading-relaxed text-slate-700">{alert.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 1000x1000 Images */}
      {activeTab === "images" && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-700">
              어려운 프롬프트 대신 아래 버튼만 누르면 AI가 이미지를 다듬어 줍니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {["글자 더 크게", "중국어 더 지우기", "배경 하얗게"].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleAiEdit(btn)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-extrabold text-blue-800 hover:bg-blue-100"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>{btn}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {IMAGE_SLOTS.map((slot) => (
              <div
                key={slot.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={slot.imgUrl}
                    alt={slot.title}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white">
                    1000 × 1000 px
                  </span>
                  <span className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-extrabold text-slate-900 shadow-sm">
                    {slot.badge}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm font-extrabold text-slate-900">{slot.title}</span>
                  <button
                    type="button"
                    onClick={() => handleAiEdit(`${slot.title} 재생성`)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    AI 다시 만들기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: 860px Detail Page */}
      {activeTab === "detail" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Left Controls */}
          <div className="space-y-5 lg:col-span-5">
            <div className="rounded-2xl border border-emerald-200 bg-white p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <Edit3 className="h-5 w-5" />
                <h2 className="text-base font-extrabold">직접 글자 수정 (무제한 무료)</h2>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                HTML을 몰라도 일반 글자만 고치면 AI API 호출 없이 0원으로 즉시 반영됩니다.
              </p>
              <label className="mt-3 block text-xs font-bold text-slate-700">상단 메인 제목</label>
              <textarea
                rows={2}
                value={headlineDraft}
                onChange={(e) => setHeadlineDraft(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <label className="mt-3 block text-xs font-bold text-slate-700">상단 서브 문구</label>
              <textarea
                rows={2}
                value={subheadlineDraft}
                onChange={(e) => setSubheadlineDraft(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleDirectTextSave}
                className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"
              >
                직접 수정 반영하기 (AI 차감 없음)
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-blue-700">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-base font-extrabold">
                  AI 섹션 재작성 (남은 횟수: {remainingAiEdits}회)
                </h2>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {["더 친근한 말투로", "혜택 강조 버전", "FAQ 2개 더 추가", "실측표 강조"].map(
                  (label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleAiEdit(label)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-800"
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-800">
                  <Lock className="h-4 w-4 text-slate-500" />
                  움직이는 WebP 움짤 생성
                </span>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-extrabold text-white"
                >
                  Pro 전용
                </Link>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                프로 요금제에서는 2-WAY 변신/컬러 전환 움직이는 WebP 움짤을 자동으로 만들어 드립니다.
              </p>
            </div>
          </div>

          {/* Right: Live 430px/860px Preview */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-300 bg-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>쿠팡 모바일 상세페이지 미리보기 (가로 860px 기준)</span>
                <span>430px × 2 Retina</span>
              </div>
              <div className="mx-auto max-w-[430px] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md">
                <iframe
                  title="860px 상세페이지 미리보기"
                  sandbox=""
                  referrerPolicy="no-referrer"
                  srcDoc={bundle.detailHtml}
                  className="h-[680px] w-full border-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
