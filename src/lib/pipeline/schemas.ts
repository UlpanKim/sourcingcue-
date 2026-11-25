import { z } from "zod";

const ALLOWED_1688_HOSTS = new Set(["detail.1688.com", "m.1688.com", "qr.1688.com"]);

export function isAllowed1688Url(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.port && parsed.port !== "443") return false;
    return ALLOWED_1688_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export const SourcingInputSchema = z.object({
  sourceUrl: z
    .string()
    .trim()
    .min(10, "1688 상품 주소를 입력해 주세요.")
    .max(2048, "1688 상품 주소가 너무 깁니다.")
    .url("올바른 1688 상품 주소를 입력해 주세요.")
    .refine(isAllowed1688Url, {
      message: "https://detail.1688.com 등 허용된 1688 상품 주소만 입력할 수 있습니다.",
    }),
  shippingMode: z.enum(["rocket_growth", "normal"]).default("rocket_growth"),
  brandName: z.string().trim().max(40).optional().default(""),
  productHint: z.string().trim().max(120).optional().default(""),
});

export type SourcingInput = z.infer<typeof SourcingInputSchema>;

export const StrategyReportSchema = z.object({
  productNameKo: z.string().max(200),
  categoryPath: z.string().max(200),
  marketSnapshot: z.object({
    avgPriceKrw: z.number().int().positive(),
    rocketGrowthSharePct: z.number().int().min(0).max(100),
    competitionLevel: z.enum(["낮음", "보통", "높음"]),
    summaryComment: z.string().max(500),
  }),
  pricingGuide: z.object({
    estimatedUnitCostCny: z.number().positive(),
    estimatedUnitCostKrw: z.number().int().positive(),
    launchPriceKrw: z.number().int().positive(),
    targetPriceKrw: z.number().int().positive(),
    estimatedMarginPct: z.number().min(0).max(95),
  }),
  titleCandidates: z.array(z.string().max(200)).min(3).max(5),
  searchTags: z.array(z.string().max(50)).length(20),
  keySellingPoints: z.array(z.string().max(300)).length(3),
  riskAlerts: z.array(
    z.object({
      level: z.enum(["주의", "안내"]),
      title: z.string().max(200),
      description: z.string().max(500),
    }),
  ),
});

export type StrategyReport = z.infer<typeof StrategyReportSchema>;

export const DetailPageContentSchema = z.object({
  heroBadge: z.string().max(80),
  heroHeadline: z.string().max(200),
  heroSubheadline: z.string().max(300),
  painPointTitle: z.string().max(200),
  painPointBullets: z.array(z.string().max(300)).min(2).max(4),
  benefits: z
    .array(
      z.object({
        title: z.string().max(160),
        description: z.string().max(400),
        evidenceSpec: z.string().max(200),
      }),
    )
    .length(3),
  specs: z.array(
    z.object({
      label: z.string().max(80),
      value: z.string().max(200),
    }),
  ),
  sizeGuideNote: z.string().max(300),
  faqs: z
    .array(
      z.object({
        question: z.string().max(200),
        answer: z.string().max(500),
      }),
    )
    .min(3),
  productNotice: z.object({
    itemName: z.string().max(200),
    material: z.string().max(200),
    origin: z.string().max(120),
    importer: z.string().max(200),
    careInstruction: z.string().max(300),
  }),
});

export type DetailPageContent = z.infer<typeof DetailPageContentSchema>;

export const PipelineOutputSchema = z.object({
  report: StrategyReportSchema,
  detailContent: DetailPageContentSchema,
});

export interface GeneratedBundle {
  projectId: string;
  sourceUrl: string;
  shippingMode: "rocket_growth" | "normal";
  brandName: string;
  createdAt: string;
  usedModel: string;
  isLiveGemini: boolean;
  report: StrategyReport;
  detailContent: DetailPageContent;
  detailHtml: string;
}
