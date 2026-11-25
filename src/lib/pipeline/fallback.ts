import { PipelineOutputSchema, type SourcingInput } from "./schemas";

export function buildFallbackPipelineOutput(input: SourcingInput) {
  const brand = input.brandName.trim() || "데일리굿즈";
  const hint = input.productHint.trim() || "울 캐시미어 터치 대폭 숄 머플러 200×70cm";

  return PipelineOutputSchema.parse({
    report: {
      productNameKo: `${brand} ${hint}`,
      categoryPath: "패션잡화 > 목도리/스카프 > 캐시미어/울 머플러",
      marketSnapshot: {
        avgPriceKrw: 21500,
        rocketGrowthSharePct: 72,
        competitionLevel: "보통",
        summaryComment:
          "겨울 시즌 200×70cm 대폭 숄 겸용 머플러 수요가 높으며, 중량(330g)과 구김 없는 트윌 직조·실물 컬러 비교표를 제시한 상품의 구매전환율이 높습니다.",
      },
      pricingGuide: {
        estimatedUnitCostCny: 24.16,
        estimatedUnitCostKrw: 4800,
        launchPriceKrw: 16900,
        targetPriceKrw: 19900,
        estimatedMarginPct: 37.8,
      },
      titleCandidates: [
        `${brand} 울 캐시미어 터치 대폭 숄 머플러 200×70cm 겨울 남녀공용 목도리`,
        `${brand} 330g 고중량 솔리드 태슬 롱 머플러 63컬러 데일리 숄`,
        `${brand} 오피스 출퇴근 럭셔리 트윌 직조 빅사이즈 겨울 목도리 선물포장`,
      ],
      searchTags: [
        "캐시미어목도리",
        "울머플러",
        "겨울목도리",
        "대폭머플러",
        "여성숄머플러",
        "남녀공용목도리",
        "솔리드머플러",
        "태슬목도리",
        "빅사이즈머플러",
        "오피스룩목도리",
        "하객룩숄",
        "겨울패션잡화",
        "부드러운목도리",
        "고중량머플러",
        "롱머플러",
        "화이트머플러",
        "카멜목도리",
        "커플목도리",
        "연말선물추천",
        "출퇴근방한",
      ],
      keySellingPoints: [
        "200×70cm 넉넉한 대폭 사이즈로 일반 목도리부터 실내 숄·무릎담요까지 3-WAY 활용",
        "330g 고중량 트윌(능직) 편직으로 가볍게 두르기만 해도 흐트러짐 없는 고급스러운 드레이프",
        "블랙·아이보리·카멜 등 63종 솔리드 컬러 구성으로 남녀 커플템·선물 수요 동시 공략",
      ],
      riskAlerts: [
        {
          level: "안내",
          title: "섬유 혼용률 및 세탁 라벨 표기 필수",
          description:
            "원문상 '仿羊绒(캐시미어 터치 혼방)' 표기가 포함되어 있으므로, 실제 통관·라벨에는 '캐시미어 100%'로 오인되지 않도록 정확한 혼용률(울/아크릴/폴리에스터 등)을 기재하세요.",
        },
        {
          level: "주의",
          title: "과장광고 금지어 점검",
          description:
            "상세페이지 및 상품명에 '100% 캐시미어', '명품 동일', '1위' 등 증빙 없는 표현을 제외하고 실측 크기(200×70cm)와 중량(330g) 근거를 배치했습니다.",
        },
      ],
    },
    detailContent: {
      heroBadge: input.shippingMode === "rocket_growth" ? "로켓그로스 추천" : "국내배송 특가",
      heroHeadline: "목을 감싸는 순간 느껴지는 포근함, 200×70cm 대폭 캐시미어 터치 머플러",
      heroSubheadline: "출근길 찬바람 막는 목도리부터 사무실·카페 실내 숄까지 하나로 해결하세요",
      painPointTitle: "겨울 목도리 고를 때 이런 고민 하셨죠?",
      painPointBullets: [
        "폭이 좁고 짧은 목도리는 한 번 두르면 볼륨감이 살아나지 않아 허전할 때",
        "거친 울 소재는 목에 닿을 때마다 따갑고 금방 보풀이 일어날 때",
        "실내에 들어가면 벗어두기 애매하고, 숄처럼 걸치기에는 크기가 작을 때",
      ],
      benefits: [
        {
          title: "200×70cm 대폭 롱 사이즈의 여유로움",
          description:
            "목에 두 번 감아도 넉넉한 200cm 길이와 70cm 폭으로, 추운 밖에서는 목도리로 실내에서는 어깨를 덮는 숄로 활용합니다.",
          evidenceSpec: "실측 크기 200 × 70cm (양끝 태슬 마감 포함)",
        },
        {
          title: "330g 고중량 트윌(능직) 편직의 탄탄함",
          description:
            "얇고 힘없이 처지는 저가형 제품과 달리 330g 도톰한 중량감과 사선 트윌 직조로 고급스러운 실루엣을 유지합니다.",
          evidenceSpec: "1장 실측 중량 약 330g (포장 규격 50×35×1.2cm)",
        },
        {
          title: "코트·패딩 어디에나 어울리는 솔리드 컬러",
          description:
            "미니멀한 무지 디자인과 자연스러운 태슬 디테일로 정장 오피스룩부터 캐주얼 데일리룩까지 두루 매치됩니다.",
          evidenceSpec: "품번 A109109 · 63컬러 라인업 중 인기 베스트 선별",
        },
      ],
      specs: [
        { label: "품번 / 원산지", value: "A109109 / 중국 항저우" },
        { label: "소재", value: "울·캐시미어 터치 혼방 니트 (트윌 직조)" },
        { label: "사이즈", value: "200 × 70 cm (태슬 포함 대폭)" },
        { label: "중량", value: "약 330g" },
      ],
      sizeGuideNote: "원단 신축성 및 측정 위치에 따라 ±2~3cm 오차가 발생할 수 있습니다.",
      faqs: [
        {
          question: "피부가 예민한데 목에 닿았을 때 따갑지 않나요?",
          answer: "부드러운 캐시미어 터치 가공과 촘촘한 트윌 직조를 적용해 맨살에 닿아도 자극이 적습니다.",
        },
        {
          question: "남성도 함께 착용할 수 있는 크기인가요?",
          answer: "네, 200×70cm 남녀 공용 빅사이즈로 성인 남성 코트 위에도 넉넉하고 멋스럽게 연출됩니다.",
        },
        {
          question: "세탁 및 관리는 어떻게 하나요?",
          answer: "드라이클리닝을 권장하며, 가정 세탁 시 30℃ 이하 미지근한 물에 중성세제로 단독 손세탁 후 그늘에 뉘어 건조해 주세요.",
        },
      ],
      productNotice: {
        itemName: `${brand} 대폭 숄 머플러 (A109109)`,
        material: "울·폴리에스터·아크릴 혼방 (상세 라벨 표기 참조)",
        origin: "중국 (항저우)",
        importer: `${brand} (쿠팡 판매자 정보 참조)`,
        careInstruction: "드라이클리닝 권장, 건조기 및 표백제 사용 금지",
      },
    },
  });
}
