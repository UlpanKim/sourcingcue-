import Link from "next/link";
import { BUSINESS_INFO } from "@/lib/legal/businessInfo";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">개인정보처리방침</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          시행일자: {BUSINESS_INFO.effectiveDate} · 운영사: {BUSINESS_INFO.companyName}
        </p>

        <div className="mt-8 space-y-7 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-base font-extrabold text-slate-900">
              1. 수집하는 개인정보 항목 및 이용 목적
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>회원 식별 및 서비스 제공:</strong> 성명(또는 상호명), 연락처(휴대폰 번호),
                이메일 주소 — 본인 확인, 구독 한도 관리, 고객 문의 응대 및 알림 발송
              </li>
              <li>
                <strong>유료 구독 및 정기결제 처리:</strong> 결제 승인 기록, 빌링키(암호화된 결제
                수단 식별자) — 월간·연간 구독 요금 결제 및 환불 처리
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">2. 개인정보의 보유 및 이용 기간</h2>
            <p className="mt-2">
              회원 탈퇴 시 지체 없이 파기하는 것을 원칙으로 합니다. 단, 관계 법령에 따라
              전자상거래 등에서의 소비자보호에 관한 법률에 따른 계약·청약철회 및 대금결제·재화
              공급 기록은 <strong>5년</strong>, 소비자 불만 또는 분쟁처리 기록은{" "}
              <strong>3년</strong>간 안전하게 보관 후 파기합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">
              3. 개인정보 처리 위탁 (결제 대행)
            </h2>
            <p className="mt-2">
              회사는 안전한 정기결제 및 빌링키 처리를 위해 아래와 같이 결제 업무를 위탁하고
              있으며, 신용카드 번호 등 민감한 카드 정보는 회사 서버에 직접 저장하지 않습니다.
            </p>
            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div>
                <p>
                  <strong>결제 대행:</strong> 주식회사 부트페이 (Bootpay) 및 제휴 PG사(라이트페이 등)
                </p>
                <p className="mt-0.5">
                  <strong>위탁 업무:</strong> 신용/체크카드 정기결제 승인, 빌링키 발급 및 결제
                  취소·환불 처리
                </p>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <p>
                  <strong>AI 분석 및 클라우드 인프라(국외 처리 포함):</strong> Google LLC (Gemini
                  API), Supabase Inc. (인증·데이터베이스)
                </p>
                <p className="mt-0.5">
                  <strong>위탁 업무:</strong> 입력된 상품 URL 기반 시장분석·상세페이지 문구 생성 및
                  회원/구독 데이터 암호화 저장
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">4. 이용자의 권리</h2>
            <p className="mt-2">
              회원은 언제든지 자신의 개인정보를 조회하거나 수정·삭제·처리정지를 요청할 수 있으며,
              구독 해지 및 회원 탈퇴를 통해 개인정보 이용 동의를 철회할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-extrabold text-slate-900">5. 개인정보 보호책임자 및 문의</h2>
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed">
              <p>
                <strong>상호 / 책임자:</strong> {BUSINESS_INFO.companyName} / {BUSINESS_INFO.ceoName}
              </p>
              <p>
                <strong>고객센터:</strong> {BUSINESS_INFO.supportPhone} ({BUSINESS_INFO.supportEmail})
              </p>
              <p>
                <strong>운영시간:</strong> {BUSINESS_INFO.supportHours}
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
