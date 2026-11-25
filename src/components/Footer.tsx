import Link from "next/link";
import { BUSINESS_INFO } from "@/lib/legal/businessInfo";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-100 pb-6 sm:flex-row sm:items-center">
          <div>
            <span className="text-base font-black text-slate-900">
              {BUSINESS_INFO.serviceName}
            </span>
            <p className="mt-1 text-xs font-medium text-slate-500">
              1688 링크 하나로 쿠팡 경쟁사 분석·대표이미지·860px 상세페이지까지
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/terms" className="font-medium text-slate-600 hover:text-slate-900">
              이용약관
            </Link>
            <Link href="/privacy" className="font-extrabold text-slate-900 hover:underline">
              개인정보처리방침
            </Link>
            <Link href="/refund" className="font-medium text-slate-600 hover:text-slate-900">
              구독 해지 및 환불 규정
            </Link>
            <Link href="/pricing" className="font-medium text-slate-600 hover:text-slate-900">
              요금제
            </Link>
          </nav>
        </div>

        <div className="mt-6 space-y-1.5 text-xs leading-relaxed text-slate-500">
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong className="font-bold text-slate-700">상호명:</strong>{" "}
              {BUSINESS_INFO.companyName}
            </span>
            <span>
              <strong className="font-bold text-slate-700">대표자명:</strong>{" "}
              {BUSINESS_INFO.ceoName}
            </span>
            <span>
              <strong className="font-bold text-slate-700">사업자등록번호:</strong>{" "}
              {BUSINESS_INFO.businessRegNo}
            </span>
            <span>
              <strong className="font-bold text-slate-700">통신판매업신고번호:</strong>{" "}
              {BUSINESS_INFO.ecommerceRegNo}
            </span>
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong className="font-bold text-slate-700">사업장 주소:</strong>{" "}
              {BUSINESS_INFO.address}
            </span>
            <span>
              <strong className="font-bold text-slate-700">고객센터:</strong>{" "}
              {BUSINESS_INFO.supportPhone} ({BUSINESS_INFO.supportEmail})
            </span>
          </p>
          <p>운영시간: {BUSINESS_INFO.supportHours}</p>
          <p className="pt-2 text-slate-400">
            © {new Date().getFullYear()} {BUSINESS_INFO.companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
