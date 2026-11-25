import { NextResponse } from "next/server";
import { z } from "zod";
import { PLANS } from "@/lib/billing/plans";
import { checkRateLimit, getClientIp, isPayloadTooLarge } from "@/lib/security/rateLimit";

const SubscribeRequestSchema = z.object({
  planId: z.enum(["starter", "pro", "team"]),
  cycle: z.enum(["monthly", "yearly"]),
  paymentMethod: z.enum(["card"]).default("card"),
  buyerName: z.string().trim().min(1).max(60),
  buyerPhone: z.string().trim().min(8).max(20),
  idempotencyKey: z.string().trim().min(8).max(128),
  receiptId: z.string().trim().min(1).max(128).optional(),
});

interface SubscriptionResult {
  subscriptionId: string;
  billingKeyRef: string;
  amountKrw: number;
  planName: string;
  pgProvider: "bootpay_instant";
  mode: "live_bootpay" | "sandbox";
  nextBillingDate: string;
  createdAt: string;
}

const MAX_CACHE = 2000;
const processedSubscriptions = new Map<string, SubscriptionResult>();
const processedReceiptIds = new Set<string>();

function maskBillingKey(rawKey: string): string {
  if (rawKey.length <= 8) return "bk_****";
  return `bk_****${rawKey.slice(-4)}`;
}

function isSandboxAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_BILLING_SANDBOX === "true";
}

interface BootpayVerifyResponse {
  billing_key?: string;
  receipt_id?: string;
  status?: number;
  price?: number;
  currency?: string;
  sandbox?: boolean;
}

function validateBootpayPayload(
  data: BootpayVerifyResponse,
  expectedAmountKrw: number,
  allowSandbox: boolean,
): string | null {
  // Bootpay status: 1 = completed payment, 2 = pending/authorized, 42 = active billing key
  // Cancelled (20) or failed (<= 0) must be rejected.
  if (typeof data.status === "number" && data.status !== 1 && data.status !== 2 && data.status !== 42) {
    throw new Error("BOOTPAY_INVALID_STATUS");
  }
  if (typeof data.price === "number" && data.price > 0 && data.price !== expectedAmountKrw) {
    throw new Error("BOOTPAY_AMOUNT_MISMATCH");
  }
  if (data.currency && data.currency.toUpperCase() !== "KRW") {
    throw new Error("BOOTPAY_CURRENCY_MISMATCH");
  }
  if (!allowSandbox && data.sandbox === true) {
    throw new Error("BOOTPAY_SANDBOX_REJECTED");
  }
  return data.billing_key ?? data.receipt_id ?? null;
}

async function verifyBootpayBillingKey(
  receiptId: string,
  expectedAmountKrw: number,
  allowSandbox: boolean,
): Promise<string | null> {
  const clientKey = process.env.BOOTPAY_CLIENT_KEY?.trim();
  const secretKey = process.env.BOOTPAY_SECRET_KEY?.trim();

  if (clientKey && secretKey) {
    const basicToken = Buffer.from(`${clientKey}:${secretKey}`).toString("base64");
    const headers = { Authorization: `Basic ${basicToken}` };

    const keyRes = await fetch(
      `https://api.bootpay.co.kr/v2/subscribe/billing_key/${encodeURIComponent(receiptId)}`,
      { headers, signal: AbortSignal.timeout(10_000) },
    );
    if (keyRes.ok) {
      const keyJson = (await keyRes.json()) as BootpayVerifyResponse;
      const verified = validateBootpayPayload(keyJson, expectedAmountKrw, allowSandbox);
      if (verified) return verified;
    }

    const receiptRes = await fetch(
      `https://api.bootpay.co.kr/v2/receipt/${encodeURIComponent(receiptId)}`,
      { headers, signal: AbortSignal.timeout(10_000) },
    );
    if (receiptRes.ok) {
      const receiptJson = (await receiptRes.json()) as BootpayVerifyResponse;
      return validateBootpayPayload(receiptJson, expectedAmountKrw, allowSandbox);
    }

    throw new Error("BOOTPAY_BASIC_VERIFY_FAILED");
  }

  const appId = process.env.BOOTPAY_REST_APP_ID?.trim();
  const privateKey = process.env.BOOTPAY_PRIVATE_KEY?.trim();
  if (!appId || !privateKey) return null;

  const tokenRes = await fetch("https://api.bootpay.co.kr/v2/request/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ application_id: appId, private_key: privateKey }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenRes.ok) {
    throw new Error("BOOTPAY_AUTH_FAILED");
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error("BOOTPAY_TOKEN_MISSING");
  }

  const keyRes = await fetch(
    `https://api.bootpay.co.kr/v2/subscribe/billing_key/${encodeURIComponent(receiptId)}`,
    {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!keyRes.ok) {
    throw new Error("BOOTPAY_BILLING_KEY_LOOKUP_FAILED");
  }
  const keyJson = (await keyRes.json()) as BootpayVerifyResponse;
  return validateBootpayPayload(keyJson, expectedAmountKrw, allowSandbox);
}

export async function POST(req: Request) {
  if (isPayloadTooLarge(req, 4096)) {
    return NextResponse.json({ error: "요청 크기가 허용 한도를 초과했습니다." }, { status: 413 });
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`subscribe:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "결제 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  try {
    const body = await req.json();
    const parsed = SubscribeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력하신 결제 정보를 다시 확인해 주세요." },
        { status: 400 },
      );
    }

    const { planId, cycle, idempotencyKey, receiptId } = parsed.data;
    const allowSandbox = isSandboxAllowed();

    if (!allowSandbox && !receiptId) {
      return NextResponse.json(
        { error: "결제 영수증 확인이 필요합니다. 결제창을 통해 다시 진행해 주세요." },
        { status: 400 },
      );
    }

    const existing = processedSubscriptions.get(idempotencyKey);
    if (existing) {
      return NextResponse.json({ ...existing, idempotentReplay: true }, { status: 200 });
    }

    if (receiptId && processedReceiptIds.has(receiptId)) {
      return NextResponse.json(
        { error: "이미 처리된 결제 영수증입니다." },
        { status: 409 },
      );
    }

    const plan = PLANS[planId];
    const amountKrw = cycle === "monthly" ? plan.monthlyPriceKrw : plan.yearlyPriceKrw * 12;

    const nextDate = new Date();
    if (cycle === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    let billingKeyRef = `tbk_bootpay_${Math.random().toString(36).slice(2, 10)}`;
    let mode: "live_bootpay" | "sandbox" = "sandbox";

    if (receiptId) {
      const verifiedKey = await verifyBootpayBillingKey(receiptId, amountKrw, allowSandbox);
      if (!verifiedKey) {
        if (!allowSandbox) {
          return NextResponse.json(
            { error: "부트페이 결제 검증에 실패했습니다." },
            { status: 502 },
          );
        }
      } else {
        billingKeyRef = maskBillingKey(verifiedKey);
        mode = "live_bootpay";
      }
    }

    if (receiptId) {
      if (processedReceiptIds.size >= MAX_CACHE) processedReceiptIds.clear();
      processedReceiptIds.add(receiptId);
    }

    const result: SubscriptionResult = {
      subscriptionId: `sub_bp_${Date.now().toString(36)}`,
      billingKeyRef,
      amountKrw,
      planName: plan.nameKo,
      pgProvider: "bootpay_instant",
      mode,
      nextBillingDate: nextDate.toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };

    if (processedSubscriptions.size >= MAX_CACHE) {
      const firstKey = processedSubscriptions.keys().next().value;
      if (firstKey) processedSubscriptions.delete(firstKey);
    }
    processedSubscriptions.set(idempotencyKey, result);

    return NextResponse.json({ ...result, idempotentReplay: false }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "부트페이 정기결제 검증 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
