import { NextResponse } from "next/server";
import { SourcingInputSchema } from "@/lib/pipeline/schemas";
import { runGeminiSourcingPipeline } from "@/lib/pipeline/geminiPipeline";
import { checkRateLimit, getClientIp, isPayloadTooLarge } from "@/lib/security/rateLimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (isPayloadTooLarge(req, 4096)) {
    return NextResponse.json({ error: "요청 크기가 허용 한도를 초과했습니다." }, { status: 413 });
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`analyze:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  try {
    const body = await req.json();
    const parsed = SourcingInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "허용된 1688 상품 주소(https://detail.1688.com 등)와 입력값을 확인해 주세요." },
        { status: 400 },
      );
    }

    const bundle = await runGeminiSourcingPipeline(parsed.data);
    return NextResponse.json(bundle, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "분석 중 일시적인 오류가 발생했습니다. 생성 횟수는 차감되지 않았습니다." },
      { status: 500 },
    );
  }
}
