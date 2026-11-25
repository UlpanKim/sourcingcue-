import Link from "next/link";
import { BUSINESS_INFO } from "@/lib/legal/businessInfo";

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
          구독 해지 및 환불 규정
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          시행일자: {BUSINESS_INFO.effectiveDate} · 운영사: {BUSINESS_INFO.companyName}
        </p>

        <div className="mt-8 space-y-7 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-base font-extrabold text-slate-900">
              1. 7일 이내 미사용 시 전액 환불
            </h2>
            <p className="mt-2">
              유료 구독 결제일로부터 <strong>7일 이내</strong>에 유료 상품 생성 한도를{" "}
              <strong>1건도 사용하지 않은 경우</strong>, 고객센터 접수 시 결제 금액 전액을
              환불해 드립니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">
              2. 상품 생성을 1건 이상 사용한 경우의 환불 기준
            </h2>
            <p className="mt-2">
              디지털 AI 콘텐츠 생성 서비스 특성상 상품 생성 한도를 1건 이상 사용한 이후에는
              당월 이용분이 개시된 것으로 보며, 다음과 같이 처리합니다.
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>월간 구독:</strong> 당월 중도 환불 대신 즉시{" "}
                <strong>다음 달 자동결제 해지</strong>가 적용되며, 남은 기간 동안 잔여 생성 한도를
                그대로 이용하실 수 있습니다. (단, 7일 이내 사용 이력이 있는 상태에서 부득이하게
                중도 환불을 원하시는 경우 이미 생성한 건수에 해당하는 단가 및 결제 수수료를 공제한
                잔액을 환불할 수 있습니다.)
              </li>
              <li>
                <strong>연간 구독 중도 해지:</strong> 이미 경과한 개월 수(해당 월 1건 이상 생성
                시 1개월 이용으로 산정)에 대해 <strong>월간 정상 요금</strong>을 기준으로 공제한
                뒤 남은 잔액을 환불해 드립니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">
              3. 언제든 1클릭 구독 해지 (자동결제 중단)
            </h2>
            <p className="mt-2">
              다음 결제일 24시간 전까지 언제든지 구독 해지를 신청하실 수 있으며, 위약금이나 별도
              해지 수수료가 없습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">
              4. 시스템 오류 및 수집 차단 시 미차감 원칙
            </h2>
            <p className="mt-2">
              1688 URL 접속 오류, 일시적 차단, 서버 렌더링 실패 등으로 정상적인 결과물이 생성되지
              않은 경우에는 <strong>월 생성 한도를 차감하지 않으며(자동 복구)</strong>, 결제
              오류로 중복 과금된 건은 확인 즉시 전액 취소 처리합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">5. 환불 신청 및 문의처</h2>
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed">
              <p>
                <strong>접수처:</strong> {BUSINESS_INFO.supportPhone} / {BUSINESS_INFO.supportEmail}
              </p>
              <p className="mt-1">
                <strong>처리 기간:</strong> 접수일로부터 영업일 기준 3일 이내 카드사 승인 취소
                요청 (카드사 반영까지 영업일 2~5일 추가 소요 가능)
              </p>
            </div>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-100 pt-6 text-sm font-bold">
          <Link href="/terms" className="text-blue-600 hover:underline">
            서비스 이용약관 보기 →
          </Link>
          <Link href="/pricing" className="text-slate-600 hover:text-slate-900">
            요금제 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
