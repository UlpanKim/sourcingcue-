import type { DetailPageContent } from "./schemas";

const DEFAULT_HERO_IMAGE_URL =
  "https://cbu01.alicdn.com/img/ibank/O1CN01sk1Anc1wltKBJTdYV_!!2201980676349-0-cib.jpg_.webp";

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function sanitizeHttpsImageUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:") return DEFAULT_HERO_IMAGE_URL;
    if (parsed.username || parsed.password) return DEFAULT_HERO_IMAGE_URL;
    const host = parsed.hostname.toLowerCase();
    if (host === "alicdn.com" || host.endsWith(".alicdn.com")) {
      return parsed.toString();
    }
    return DEFAULT_HERO_IMAGE_URL;
  } catch {
    return DEFAULT_HERO_IMAGE_URL;
  }
}

function resolveImages(heroOrImages?: string | string[] | null): string[] {
  const raw = Array.isArray(heroOrImages) ? heroOrImages : heroOrImages ? [heroOrImages] : [];
  const safe = raw
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .slice(0, 12)
    .map(sanitizeHttpsImageUrl);
  return safe.length > 0 ? safe : [DEFAULT_HERO_IMAGE_URL];
}

const H2 = "margin:0 0 6px;font-size:22px;font-weight:900;color:#0f172a;line-height:1.35;letter-spacing:-0.02em;";
const EYEBROW =
  "display:inline-block;margin-bottom:8px;font-size:12px;font-weight:800;letter-spacing:0.08em;color:#2563eb;";
const SECTION = "padding:36px 22px;box-sizing:border-box;";

function imgTag(url: string, alt: string, height = 300): string {
  return `<div style="overflow:hidden;border-radius:16px;border:1px solid #e2e8f0;background:#f8fafc;">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="display:block;width:100%;height:${height}px;object-fit:cover;" />
      </div>`;
}

function renderSizeGuideSvg(sizeValue: string): string {
  const match = sizeValue.match(/(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(cm|mm|m)?/);
  const unit = match?.[3] ?? "cm";
  const widthLabel = match ? `${match[1]}${unit}` : "가로";
  const heightLabel = match ? `${match[2]}${unit}` : "세로";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" width="100%" role="img" aria-label="사이즈 가이드" style="display:block;">
          <rect x="40" y="40" width="280" height="110" rx="8" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2" />
          <g stroke="#94a3b8" stroke-width="1.5">
            <line x1="40" y1="20" x2="320" y2="20" />
            <line x1="40" y1="14" x2="40" y2="26" />
            <line x1="320" y1="14" x2="320" y2="26" />
            <line x1="340" y1="40" x2="340" y2="150" />
            <line x1="334" y1="40" x2="346" y2="40" />
            <line x1="334" y1="150" x2="346" y2="150" />
          </g>
          <rect x="140" y="10" width="80" height="20" rx="10" fill="#ffffff" />
          <text x="180" y="25" text-anchor="middle" font-size="14" font-weight="800" fill="#1e293b">${escapeHtml(widthLabel)}</text>
          <text x="352" y="100" text-anchor="middle" font-size="13" font-weight="800" fill="#1e293b" transform="rotate(90 352 100)">${escapeHtml(heightLabel)}</text>
          <text x="180" y="100" text-anchor="middle" font-size="13" font-weight="700" fill="#4338ca">실측 사이즈</text>
          <text x="180" y="185" text-anchor="middle" font-size="12" fill="#64748b">평평하게 펼친 상태 기준 측정</text>
        </svg>`;
}

/**
 * Renders an 860px-ready (430px base x 2x Retina) Coupang mobile detail HTML document.
 * 10-section conversion layout: hook → empathy → benefits → comparison → scenarios →
 * quality → spec/size → package/care → FAQ → guarantee/notice.
 * `heroOrImages` accepts a single hero URL (legacy) or the full main-image array.
 */
export function renderDetailHtml(
  content: DetailPageContent,
  brandName: string = "셀러원큐 셀렉트",
  heroOrImages: string | string[] = DEFAULT_HERO_IMAGE_URL,
): string {
  const safeBrand = escapeHtml(brandName.trim() || "셀러원큐 셀렉트");
  const images = resolveImages(heroOrImages);
  const pick = (idx: number) => images[idx % images.length];
  const headlineAlt = content.heroHeadline;

  // 1) Hero summary strip — first 3 benefit titles
  const summaryStrip = content.benefits
    .slice(0, 3)
    .map(
      (b, idx) => `
        <div style="flex:1;min-width:0;padding:10px 6px;border-radius:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);">
          <div style="font-size:11px;font-weight:800;color:#93c5fd;margin-bottom:4px;">POINT 0${idx + 1}</div>
          <div style="font-size:12px;font-weight:700;color:#ffffff;line-height:1.4;word-break:keep-all;">${escapeHtml(b.title)}</div>
        </div>`,
    )
    .join("");

  // 2) Pain points
  const painItems = content.painPointBullets
    .map(
      (b) => `
        <li style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;padding:14px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;font-size:15px;line-height:1.55;color:#1e293b;">
          <span style="flex:none;display:inline-block;width:22px;height:22px;border-radius:999px;background:#fee2e2;color:#dc2626;font-size:13px;font-weight:900;text-align:center;line-height:22px;">!</span>
          <span>${escapeHtml(b)}</span>
        </li>`,
    )
    .join("");

  // 3) Benefits paired with images[1..3]
  const benefitBlocks = content.benefits
    .map(
      (item, idx) => `
      <div style="margin-bottom:28px;">
        <div style="font-size:30px;font-weight:900;color:#2563eb;line-height:1;margin-bottom:8px;">0${idx + 1}</div>
        <h3 style="margin:0 0 8px;font-size:20px;font-weight:900;color:#0f172a;line-height:1.35;">${escapeHtml(item.title)}</h3>
        <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.6;">${escapeHtml(item.description)}</p>
        ${imgTag(pick(idx + 1), item.title, 280)}
        <div style="margin-top:12px;padding:12px 14px;border-radius:10px;background:#eff6ff;border-left:4px solid #2563eb;color:#1e3a8a;font-size:13px;line-height:1.5;">
          <strong style="font-weight:800;">실측 근거</strong> · ${escapeHtml(item.evidenceSpec)}
        </div>
      </div>`,
    )
    .join("");

  // 4) Comparison table (fallback derived from benefits)
  const comparisonRows =
    content.comparisonRows && content.comparisonRows.length > 0
      ? content.comparisonRows
      : content.benefits.map((b) => ({
          label: b.title.slice(0, 20),
          genericProduct: "수치 근거 미표기",
          ourProduct: b.evidenceSpec,
        }));
  const comparisonHtml = comparisonRows
    .map(
      (r) => `
          <tr>
            <th style="width:26%;padding:12px 8px;background:#f8fafc;font-size:13px;font-weight:800;color:#334155;border-bottom:1px solid #e2e8f0;text-align:center;">${escapeHtml(r.label)}</th>
            <td style="width:37%;padding:12px 8px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;text-align:center;line-height:1.45;">${escapeHtml(r.genericProduct)}</td>
            <td style="width:37%;padding:12px 8px;font-size:13px;font-weight:800;color:#1d4ed8;background:#eff6ff;border-bottom:1px solid #dbeafe;text-align:center;line-height:1.45;">${escapeHtml(r.ourProduct)}</td>
          </tr>`,
    )
    .join("");

  // 5) Usage scenarios (fallback derived from pain points)
  const scenarios =
    content.usageScenarios && content.usageScenarios.length > 0
      ? content.usageScenarios
      : content.painPointBullets.slice(0, 3).map((p, idx) => ({
          tag: `추천 ${idx + 1}`,
          title: "이런 고민이 있었던 분",
          description: p,
        }));
  const scenarioHtml = scenarios
    .map(
      (s) => `
        <div style="margin-bottom:12px;padding:16px;border-radius:14px;background:#ffffff;border:1px solid #e2e8f0;">
          <span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#dcfce7;color:#15803d;font-size:12px;font-weight:800;margin-bottom:8px;">#${escapeHtml(s.tag)}</span>
          <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px;">${escapeHtml(s.title)}</div>
          <div style="font-size:14px;color:#475569;line-height:1.55;">${escapeHtml(s.description)}</div>
        </div>`,
    )
    .join("");

  // 6) Quality checkpoints — evidence specs as a checklist
  const checkpointHtml = content.benefits
    .map(
      (b) => `
        <li style="display:flex;gap:10px;align-items:flex-start;padding:12px 0;border-bottom:1px dashed #cbd5e1;font-size:14px;color:#1e293b;line-height:1.5;">
          <span style="flex:none;display:inline-block;width:22px;height:22px;border-radius:999px;background:#2563eb;color:#ffffff;font-size:13px;font-weight:900;text-align:center;line-height:22px;">✓</span>
          <span>${escapeHtml(b.evidenceSpec)}</span>
        </li>`,
    )
    .join("");

  // 7) Specs + size guide
  const specRows = content.specs
    .map(
      (s) => `
          <tr>
            <th style="width:34%;padding:12px 14px;background:#f1f5f9;text-align:left;font-size:14px;color:#334155;border-bottom:1px solid #e2e8f0;">${escapeHtml(s.label)}</th>
            <td style="padding:12px 14px;background:#ffffff;font-size:14px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${escapeHtml(s.value)}</td>
          </tr>`,
    )
    .join("");
  const sizeSpec =
    content.specs.find((s) => /사이즈|크기|size/i.test(s.label))?.value ??
    content.specs.find((s) => /\d\s*[×xX*]\s*\d/.test(s.value))?.value ??
    "";

  // 8) Package + care
  const packageItems =
    content.packageContents && content.packageContents.length > 0
      ? content.packageContents
      : [`${content.productNotice.itemName} 1개`];
  const careItems =
    content.careTips && content.careTips.length > 0 ? content.careTips : [content.productNotice.careInstruction];
  const packageHtml = packageItems
    .map(
      (p) =>
        `<li style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#1e293b;">📦 ${escapeHtml(p)}</li>`,
    )
    .join("");
  const careHtml = careItems
    .map(
      (c, idx) =>
        `<li style="margin-bottom:8px;font-size:14px;color:#334155;line-height:1.55;"><strong style="color:#0f766e;">${idx + 1}.</strong> ${escapeHtml(c)}</li>`,
    )
    .join("");

  // 9) FAQ
  const faqBlocks = content.faqs
    .map(
      (f) => `
        <div style="margin-bottom:12px;padding:16px;border-radius:12px;background:#ffffff;border:1px solid #e2e8f0;">
          <div style="font-size:15px;font-weight:800;color:#1d4ed8;margin-bottom:8px;line-height:1.45;">Q. ${escapeHtml(f.question)}</div>
          <div style="font-size:14px;color:#334155;line-height:1.6;">A. ${escapeHtml(f.answer)}</div>
        </div>`,
    )
    .join("");

  // 10) Notice table
  const noticeRows = [
    ["품명/모델명", content.productNotice.itemName],
    ["소재", content.productNotice.material],
    ["제조국", content.productNotice.origin],
    ["수입자/판매자", content.productNotice.importer],
    ["취급주의사항", content.productNotice.careInstruction],
  ]
    .map(
      ([k, v]) => `
          <tr>
            <th style="width:32%;padding:10px 12px;background:#e2e8f0;text-align:left;font-size:13px;color:#334155;border-bottom:1px solid #cbd5e1;">${escapeHtml(k)}</th>
            <td style="padding:10px 12px;background:#ffffff;font-size:13px;color:#0f172a;border-bottom:1px solid #cbd5e1;line-height:1.5;">${escapeHtml(v)}</td>
          </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=430, initial-scale=1.0" />
  <title>${escapeHtml(content.heroHeadline)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Pretendard','Noto Sans KR',sans-serif;">
  <div id="detail-canvas" style="width:100%;max-width:430px;margin:0 auto;box-sizing:border-box;background:#ffffff;color:#0f172a;word-break:keep-all;">

    <!-- 1. Hero Hook -->
    <section style="padding:40px 22px 32px;box-sizing:border-box;background:linear-gradient(180deg,#0f172a 0%,#1e293b 100%);color:#ffffff;text-align:center;">
      <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:#2563eb;font-size:12px;font-weight:700;margin-bottom:14px;">
        ${escapeHtml(content.heroBadge)} · ${safeBrand}
      </div>
      <h1 style="margin:0 0 12px;font-size:27px;font-weight:900;line-height:1.32;letter-spacing:-0.02em;">${escapeHtml(content.heroHeadline)}</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#cbd5e1;line-height:1.6;">${escapeHtml(content.heroSubheadline)}</p>
      <div style="display:flex;gap:8px;margin-bottom:20px;">${summaryStrip}
      </div>
      <div style="overflow:hidden;border-radius:16px;border:1px solid #475569;background:#ffffff;">
        <img src="${escapeHtml(pick(0))}" alt="${escapeHtml(headlineAlt)}" style="display:block;width:100%;height:340px;object-fit:cover;" />
      </div>
    </section>

    <!-- 2. Pain Point Empathy -->
    <section style="${SECTION}background:#f8fafc;">
      <span style="${EYEBROW}">CHECK</span>
      <h2 style="${H2}margin-bottom:16px;">${escapeHtml(content.painPointTitle)}</h2>
      <ul style="list-style:none;padding:0;margin:0 0 18px;">${painItems}
      </ul>
      <div style="padding:16px;border-radius:14px;background:#0f172a;color:#ffffff;text-align:center;font-size:16px;font-weight:800;line-height:1.5;">
        그래서 준비했습니다 👇<br /><span style="color:#93c5fd;">${safeBrand}가 고민을 이렇게 풀었어요</span>
      </div>
    </section>

    <!-- 3. Core Benefits -->
    <section style="${SECTION}background:#ffffff;">
      <span style="${EYEBROW}">WHY US</span>
      <h2 style="${H2}margin-bottom:22px;">선택해야 하는 3가지 이유</h2>
      ${benefitBlocks}
    </section>

    <!-- 4. Comparison -->
    <section style="${SECTION}background:#f8fafc;">
      <span style="${EYEBROW}">COMPARE</span>
      <h2 style="${H2}margin-bottom:16px;">한눈에 비교해 보세요</h2>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;background:#ffffff;table-layout:fixed;">
        <thead>
          <tr>
            <th style="padding:12px 8px;background:#e2e8f0;font-size:12px;color:#475569;">항목</th>
            <th style="padding:12px 8px;background:#e2e8f0;font-size:13px;color:#475569;">일반 저가형</th>
            <th style="padding:12px 8px;background:#2563eb;font-size:13px;color:#ffffff;font-weight:900;">우리 제품</th>
          </tr>
        </thead>
        <tbody>${comparisonHtml}
        </tbody>
      </table>
      <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">※ 일반 저가형은 동일 카테고리 보급형 상품의 통상적인 표기 기준입니다.</p>
    </section>

    <!-- 5. Usage Scenarios -->
    <section style="${SECTION}background:#ffffff;">
      <span style="${EYEBROW}">FOR YOU</span>
      <h2 style="${H2}margin-bottom:16px;">이런 분들께 추천합니다</h2>
      ${scenarioHtml}
      <div style="margin-top:16px;">${imgTag(pick(4), "활용 예시", 300)}</div>
    </section>

    <!-- 6. Detail & Quality -->
    <section style="${SECTION}background:#f8fafc;">
      <span style="${EYEBROW}">DETAIL</span>
      <h2 style="${H2}margin-bottom:16px;">디테일 &amp; 품질 체크포인트</h2>
      ${imgTag(pick(5), "디테일 컷", 300)}
      <ul style="list-style:none;padding:0;margin:14px 0 0;">${checkpointHtml}
      </ul>
    </section>

    <!-- 7. Specs & Size Guide -->
    <section style="${SECTION}background:#ffffff;">
      <span style="${EYEBROW}">SPEC</span>
      <h2 style="${H2}margin-bottom:16px;">실측 스펙 및 사이즈 안내</h2>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tbody>${specRows}
        </tbody>
      </table>
      <div style="margin-top:16px;padding:16px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
        <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:10px;">📏 사이즈 가이드${sizeSpec ? ` · ${escapeHtml(sizeSpec)}` : ""}</div>
        ${renderSizeGuideSvg(sizeSpec)}
        <p style="margin:10px 0 0;font-size:13px;color:#475569;line-height:1.5;">※ ${escapeHtml(content.sizeGuideNote)}</p>
      </div>
    </section>

    <!-- 8. Package & Care -->
    <section style="${SECTION}background:#f8fafc;">
      <span style="${EYEBROW}">IN THE BOX</span>
      <h2 style="${H2}margin-bottom:16px;">구성품 안내</h2>
      <ul style="list-style:none;padding:0 16px;margin:0 0 22px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">${packageHtml}
      </ul>
      <h3 style="margin:0 0 10px;font-size:18px;font-weight:900;color:#0f172a;">관리/세탁 팁</h3>
      <ul style="list-style:none;padding:16px;margin:0;background:#f0fdfa;border-radius:12px;border:1px solid #99f6e4;">${careHtml}
      </ul>
    </section>

    <!-- 9. FAQ -->
    <section style="${SECTION}background:#ffffff;">
      <span style="${EYEBROW}">FAQ</span>
      <h2 style="${H2}margin-bottom:16px;">자주 묻는 질문</h2>
      ${faqBlocks}
    </section>

    <!-- 10. Guarantee & Notice -->
    <section style="padding:28px 22px;box-sizing:border-box;background:#0f172a;color:#ffffff;text-align:center;">
      <div style="font-size:18px;font-weight:900;margin-bottom:8px;">${escapeHtml(content.heroBadge)} · 안심 배송 안내</div>
      <div style="font-size:13px;color:#cbd5e1;line-height:1.6;">주문 후 판매자 출고 기준에 따라 순차 발송되며,<br />교환·반품은 쿠팡 판매자 정책 및 관련 법령에 따릅니다.</div>
    </section>
    <section style="padding:24px 22px 32px;box-sizing:border-box;background:#f1f5f9;">
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#0f172a;">상품정보 제공고시</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;">
        <tbody>${noticeRows}
        </tbody>
      </table>
    </section>
  </div>
</body>
</html>`;
}
