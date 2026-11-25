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

/**
 * Renders an 860px-ready (430px base x 2x Retina) Coupang mobile detail HTML document.
 * Follows conversion rules: clear 3-screen value prop, spec evidence, expanded FAQs, and notice table.
 */
export function renderDetailHtml(
  content: DetailPageContent,
  brandName: string = "셀러원큐 셀렉트",
  heroImageUrl: string = DEFAULT_HERO_IMAGE_URL,
): string {
  const safeBrand = escapeHtml(brandName.trim() || "셀러원큐 셀렉트");
  const safeHeroImageUrl = sanitizeHttpsImageUrl(heroImageUrl);

  const painItems = content.painPointBullets
    .map(
      (b) =>
        `<li style="margin-bottom:10px;padding:12px 14px;background:#fff;border-radius:10px;border:1px solid #e2e8f0;font-size:15px;line-height:1.5;color:#1e293b;">• ${escapeHtml(b)}</li>`,
    )
    .join("\n");

  const benefitCards = content.benefits
    .map(
      (item, idx) => `
      <div style="margin-bottom:16px;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
        <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:#2563eb;color:#fff;font-size:12px;font-weight:700;margin-bottom:8px;">
          POINT 0${idx + 1}
        </div>
        <h3 style="margin:0 0 6px;font-size:19px;font-weight:800;color:#0f172a;line-height:1.35;">${escapeHtml(item.title)}</h3>
        <p style="margin:0 0 10px;font-size:15px;color:#334155;line-height:1.55;">${escapeHtml(item.description)}</p>
        <div style="padding:8px 12px;border-radius:8px;background:#eff6ff;color:#1d4ed8;font-size:13px;font-weight:700;">
          실측 근거: ${escapeHtml(item.evidenceSpec)}
        </div>
      </div>`,
    )
    .join("\n");

  const specRows = content.specs
    .map(
      (s) => `
      <tr>
        <th style="width:34%;padding:12px 14px;background:#f1f5f9;text-align:left;font-size:14px;color:#334155;border-bottom:1px solid #e2e8f0;">${escapeHtml(s.label)}</th>
        <td style="padding:12px 14px;background:#fff;font-size:14px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${escapeHtml(s.value)}</td>
      </tr>`,
    )
    .join("\n");

  const faqBlocks = content.faqs
    .map(
      (f) => `
      <div style="margin-bottom:12px;padding:16px;border-radius:12px;background:#fff;border:1px solid #e2e8f0;">
        <div style="font-size:15px;font-weight:800;color:#1d4ed8;margin-bottom:6px;">Q. ${escapeHtml(f.question)}</div>
        <div style="font-size:14px;color:#334155;line-height:1.55;">A. ${escapeHtml(f.answer)}</div>
      </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=430, initial-scale=1.0" />
  <title>${escapeHtml(content.heroHeadline)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Pretendard','Noto Sans KR',sans-serif;">
  <div id="detail-canvas" style="width:100%;max-width:430px;margin:0 auto;box-sizing:border-box;background:#ffffff;color:#0f172a;">
    <!-- Screen 1: Hero -->
    <section style="padding:36px 24px 32px;background:linear-gradient(180deg,#0f172a 0%,#1e293b 100%);color:#ffffff;text-align:center;">
      <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:#2563eb;font-size:12px;font-weight:700;margin-bottom:14px;">
        ${escapeHtml(content.heroBadge)} · ${safeBrand}
      </div>
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:900;line-height:1.3;letter-spacing:-0.02em;">
        ${escapeHtml(content.heroHeadline)}
      </h1>
      <p style="margin:0 0 22px;font-size:15px;color:#cbd5e1;line-height:1.55;">
        ${escapeHtml(content.heroSubheadline)}
      </p>
      <div style="overflow:hidden;border-radius:16px;border:1px solid #475569;background:#fff;">
        <img src="${escapeHtml(safeHeroImageUrl)}" alt="${escapeHtml(content.heroHeadline)}" style="display:block;width:100%;height:320px;object-fit:cover;" />
      </div>
    </section>

    <!-- Screen 2: Pain Points -->
    <section style="padding:28px 24px;background:#f8fafc;">
      <h2 style="margin:0 0 14px;font-size:20px;font-weight:800;color:#0f172a;">
        ${escapeHtml(content.painPointTitle)}
      </h2>
      <ul style="list-style:none;padding:0;margin:0;">
        ${painItems}
      </ul>
    </section>

    <!-- Screen 3: Core Benefits -->
    <section style="padding:28px 24px;background:#ffffff;">
      <h2 style="margin:0 0 16px;font-size:21px;font-weight:900;color:#0f172a;">
        선택해야 하는 3가지 이유
      </h2>
      ${benefitCards}
    </section>

    <!-- Screen 4: Specs & Size -->
    <section style="padding:28px 24px;background:#f8fafc;">
      <h2 style="margin:0 0 14px;font-size:19px;font-weight:800;color:#0f172a;">
        실측 스펙 및 사이즈 안내
      </h2>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tbody>
          ${specRows}
        </tbody>
      </table>
      <p style="margin:12px 0 0;font-size:13px;color:#475569;line-height:1.5;">
        ※ ${escapeHtml(content.sizeGuideNote)}
      </p>
    </section>

    <!-- Screen 5: Expanded FAQ -->
    <section style="padding:28px 24px;background:#ffffff;">
      <h2 style="margin:0 0 14px;font-size:19px;font-weight:800;color:#0f172a;">
        자주 묻는 질문 (FAQ)
      </h2>
      ${faqBlocks}
    </section>

    <!-- Screen 6: Product Notice -->
    <section style="padding:24px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#0f172a;">
        상품정보 제공고시
      </h2>
      <div style="font-size:13px;color:#334155;line-height:1.7;">
        <div><strong>품명/모델명:</strong> ${escapeHtml(content.productNotice.itemName)}</div>
        <div><strong>소재:</strong> ${escapeHtml(content.productNotice.material)}</div>
        <div><strong>제조국:</strong> ${escapeHtml(content.productNotice.origin)}</div>
        <div><strong>수입자/판매자:</strong> ${escapeHtml(content.productNotice.importer)}</div>
        <div><strong>취급주의사항:</strong> ${escapeHtml(content.productNotice.careInstruction)}</div>
      </div>
    </section>
  </div>
</body>
</html>`;
}
