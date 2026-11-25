export type PlanId = "free" | "starter" | "pro" | "team";

export interface PlanSpec {
  id: PlanId;
  nameKo: string;
  tagline: string;
  monthlyPriceKrw: number;
  yearlyPriceKrw: number;
  monthlyQuota: number;
  /** null means unlimited AI edits per project */
  maxAiEditsPerProject: number | null;
  maxMembers: number;
  allowWebp: boolean;
  allowLookbook: boolean;
  allowBatch: boolean;
  brandPresetsLimit: number;
  recommended?: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, PlanSpec> = {
  free: {
    id: "free",
    nameKo: "무료 체험",
    tagline: "직접 써보고 결정하세요",
    monthlyPriceKrw: 0,
    yearlyPriceKrw: 0,
    monthlyQuota: 1,
    maxAiEditsPerProject: 3,
    maxMembers: 1,
    allowWebp: false,
    allowLookbook: false,
    allowBatch: false,
    brandPresetsLimit: 0,
    features: [
      "매월 1개 상품 풀패키지 무료 (매월 1일 초기화)",
      "상세페이지당 AI 수정 3회",
      "직접 글자·가격 수정은 무제한 무료",
      "경쟁사·판매전략 보고서 + 대표/추가 6컷 + 860px 상세페이지",
    ],
  },
  starter: {
    id: "starter",
    nameKo: "스타터",
    tagline: "부업·초기 소싱 대표님 추천",
    monthlyPriceKrw: 39000,
    yearlyPriceKrw: 31000,
    monthlyQuota: 10,
    maxAiEditsPerProject: 10,
    maxMembers: 1,
    allowWebp: false,
    allowLookbook: false,
    allowBatch: false,
    brandPresetsLimit: 1,
    features: [
      "매월 10개 상품 생성",
      "상세페이지당 AI 수정 10회",
      "직접 글자·가격 수정 무제한",
      "내 브랜드명 1개 저장",
    ],
  },
  pro: {
    id: "pro",
    nameKo: "프로",
    tagline: "전업·로켓그로스 대표님 최적",
    monthlyPriceKrw: 99000,
    yearlyPriceKrw: 79000,
    monthlyQuota: 35,
    maxAiEditsPerProject: null,
    maxMembers: 1,
    allowWebp: true,
    allowLookbook: true,
    allowBatch: false,
    brandPresetsLimit: 3,
    recommended: true,
    features: [
      "매월 35개 상품 생성",
      "상세페이지 AI 수정 무제한",
      "움직이는 WebP 움짤 + AI 모델 착샷/룩북 포함",
      "브랜드 톤·로고 프리셋 3개 + 우선 처리",
    ],
  },
  team: {
    id: "team",
    nameKo: "팀",
    tagline: "법인·다계정·구매대행 팀용",
    monthlyPriceKrw: 249000,
    yearlyPriceKrw: 199000,
    monthlyQuota: 120,
    maxAiEditsPerProject: null,
    maxMembers: 5,
    allowWebp: true,
    allowLookbook: true,
    allowBatch: true,
    brandPresetsLimit: 999,
    features: [
      "매월 120개 상품 생성",
      "최대 5명 팀원 동시 접속 및 공유",
      "대량 1688 URL 일괄(배치) 생성",
      "브랜드 프리셋 무제한 + 최우선 처리",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "team"];

export function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
