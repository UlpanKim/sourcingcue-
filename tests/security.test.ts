import { describe, expect, it } from "vitest";
import { SourcingInputSchema } from "../src/lib/pipeline/schemas";
import { escapeHtml, sanitizeHttpsImageUrl } from "../src/lib/pipeline/detailTemplate";
import {
  consumeGenerationQuota,
  createWorkspaceQuotaState,
  refundGenerationQuota,
} from "../src/lib/billing/quota";
import { checkRateLimit } from "../src/lib/security/rateLimit";

describe("07SourcingCue security hardening", () => {
  it("accepts valid 1688 HTTPS URLs and rejects SSRF / non-1688 schemes", () => {
    const valid = SourcingInputSchema.safeParse({
      sourceUrl: "https://detail.1688.com/offer/654981470061.html",
    });
    expect(valid.success).toBe(true);

    for (const badUrl of [
      "http://detail.1688.com/offer/654981470061.html",
      "file:///etc/passwd",
      "https://169.254.169.254/latest/meta-data/",
      "https://evil.com/offer/123.html",
      "https://user:pass@detail.1688.com/offer/123.html",
      `https://detail.1688.com/offer/${"a".repeat(2100)}.html`,
    ]) {
      expect(SourcingInputSchema.safeParse({ sourceUrl: badUrl }).success).toBe(false);
    }
  });

  it("sanitizes heroImageUrl to allow only HTTPS alicdn.com hosts", () => {
    const ok = "https://cbu01.alicdn.com/img/ibank/test.jpg";
    expect(sanitizeHttpsImageUrl(ok)).toBe(ok);

    for (const badImg of [
      "javascript:alert(1)",
      "file:///etc/passwd",
      "http://127.0.0.1:8080/secret.png",
      "https://evil.com/tracker.png",
    ]) {
      expect(sanitizeHttpsImageUrl(badImg)).toContain("https://cbu01.alicdn.com/");
    }
  });

  it("escapes single quotes alongside HTML meta-characters", () => {
    expect(escapeHtml(`<script>'alert("x&y")'</script>`)).toBe(
      "&lt;script&gt;&#39;alert(&quot;x&amp;y&quot;)&#39;&lt;/script&gt;",
    );
  });

  it("namespaces consume and refund idempotency keys separately", () => {
    const ws = createWorkspaceQuotaState("ws-sec", "starter");
    expect(consumeGenerationQuota(ws, "same-key")).toBe(9);
    expect(refundGenerationQuota(ws, "same-key")).toBe(10);
  });

  it("blocks requests exceeding rate limit within window", () => {
    const key = `test-ip-${Date.now()}`;
    expect(checkRateLimit(key, 2, 60_000, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000, 1001).allowed).toBe(true);
    const blocked = checkRateLimit(key, 2, 60_000, 1002);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
  });
});
