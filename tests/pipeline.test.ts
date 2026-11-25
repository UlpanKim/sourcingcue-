import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import fs from "node:fs";
import path from "node:path";
import { buildFallbackPipelineOutput } from "../src/lib/pipeline/fallback";
import { runGeminiSourcingPipeline } from "../src/lib/pipeline/geminiPipeline";
import { renderDetailHtml } from "../src/lib/pipeline/detailTemplate";

function loadEnvLocalIfPresent() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    process.env[key] = val;
  }
}

describe("07SourcingCue Gemini & HTML pipeline", () => {
  it("validates fallback pipeline output and renders 430px/860px detail HTML", () => {
    const out = buildFallbackPipelineOutput({
      sourceUrl: "https://detail.1688.com/offer/849201948271.html",
      shippingMode: "rocket_growth",
      brandName: "테스트브랜드",
      productHint: "방한 니트 바라클라바",
    });

    expect(out.report.searchTags).toHaveLength(20);
    expect(out.report.keySellingPoints).toHaveLength(3);
    expect(out.detailContent.benefits).toHaveLength(3);

    const html = renderDetailHtml(out.detailContent, "테스트브랜드");
    expect(html).toContain('width:430px');
    expect(html).toContain("테스트브랜드");
    expect(html).toContain("상품정보 제공고시");
  });

  it("calls live Gemini API when GEMINI_API_KEY is configured and returns structured bundle", async () => {
    loadEnvLocalIfPresent();
    const bundle = await runGeminiSourcingPipeline({
      sourceUrl: "https://detail.1688.com/offer/849201948271.html",
      shippingMode: "rocket_growth",
      brandName: "데일리굿즈",
      productHint: "초경량 접이식 캠핑 의자 2개입",
    });

    expect(bundle.report.searchTags).toHaveLength(20);
    expect(bundle.report.titleCandidates.length).toBeGreaterThanOrEqual(3);
    expect(bundle.detailHtml).toContain("상품정보 제공고시");
    expect(bundle.isLiveGemini).toBe(true);
  }, 60000);
});
