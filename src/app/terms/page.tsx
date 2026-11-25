import Link from "next/link";
import { BUSINESS_INFO } from "@/lib/legal/businessInfo";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">서비스 이용약관</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          시행일자: {BUSINESS_INFO.effectiveDate} · 운영사: {BUSINESS_INFO.companyName}
        </p>

        <div className="mt-8 space-y-7 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-base font-extrabold text-slate-900">제1조 (목적)</h2>
            <p className="mt-2">
              본 약관은 {BUSINESS_INFO.companyName}(이하 &quot;회사&quot;)가 제공하는{" "}
              {BUSINESS_INFO.serviceName} 웹 서비스(이하 &quot;서비스&quot;)의 이용 조건, 절차,
              회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">제2조 (용어의 정의)</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                &quot;회원&quot;이란 본 약관에 동의하고 회사가 제공하는 무료 또는 유료 구독
                서비스를 이용하는 자를 말합니다.
              </li>
              <li>
                &quot;정기구독&quot;이란 회원이 선택한 요금제(스타터·프로·팀)에 따라 월간 또는
                연간 주기로 이용요금이 자동 결제되고, 매월 정해진 상품 생성 한도가 부여되는
                유료 서비스를 말합니다.
              </li>
              <li>
                &quot;결과물&quot;이란 회원이 입력한 1688 상품 정보를 바탕으로 서비스가 생성한
                경쟁사·판매전략 보고서, 1000×1000px 대표·추가 이미지 및 860px 모바일 상세페이지
                자산을 말합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">
              제3조 (월간·연간 정기구독 및 자동갱신)
            </h2>
            <p className="mt-2">
              유료 요금제는 결제일로부터 1개월(월간 결제) 또는 1년(연간 결제) 단위로 서비스가
              제공되며, 회원이 다음 결제일 전까지 구독 해지를 신청하지 않는 경우 등록된 결제
              수단으로 동일 조건의 이용요금이 자동 결제됩니다. 해지 신청 시에도 이미 결제된 남은
              이용 기간 동안은 정상 이용이 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">
              제4조 (서비스 제공 범위 및 AI 생성물 유의사항)
            </h2>
            <p className="mt-2">
              회사는 1688 상품 URL 기반의 시장조사 요약, 카피·이미지 정제 및 860px 상세페이지
              제작 도구를 제공합니다. 단, 최종 상품 등록 시 지식재산권, KC 안전인증, 표시광고법,
              원산지·혼용률 표기 등 관련 법령 준수 여부에 대한 최종 검수 책임은 판매자인 회원에게
              있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">제5조 (회원의 의무)</h2>
            <p className="mt-2">
              회원은 타인의 계정을 도용하거나 자동화 스크립트를 통해 회사의 서버에 과도한 부하를
              주는 행위, 법령에 위배되는 불법 상품의 상세페이지 제작을 위해 서비스를 이용하는
              행위를 하여서는 안 됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">제6조 (면책)</h2>
            <p className="mt-2">
              회사는 천재지변, 기간통신사업자의 장애, 외부 1688·쿠팡 사이트의 정책 변경 또는
              일시적 차단으로 인한 서비스 지연에 대하여 고의·중과실이 없는 한 책임을 지지 않습니다.
              단, 시스템 오류나 수집 차단으로 생성이 실패한 건은 회원의 월 생성 한도에서 차감하지
              않습니다.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-100 pt-6 text-sm font-bold">
          <Link href="/refund" className="text-blue-600 hover:underline">
            구독 해지 및 환불 규정 보기 →
          </Link>
          <Link href="/pricing" className="text-slate-600 hover:text-slate-900">
            요금제 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
