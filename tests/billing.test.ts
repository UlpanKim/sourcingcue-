import { describe, expect, it } from "vitest";
import {
  QuotaError,
  applyProjectEdit,
  consumeGenerationQuota,
  createWorkspaceQuotaState,
  refundGenerationQuota,
  resetMonthlyQuotaIfDue,
  type ProjectEditState,
} from "../src/lib/billing/quota";

describe("07SourcingCue billing & quota engine", () => {
  it("consumes quota once when called twice with the same idempotencyKey and blocks below zero", () => {
    const ws = createWorkspaceQuotaState("ws-1", "free", new Date("2026-11-05T00:00:00Z"));
    expect(ws.remainingQuota).toBe(1);

    // Run twice with same idempotency key -> balance changes only once
    expect(consumeGenerationQuota(ws, "gen-req-1")).toBe(0);
    expect(consumeGenerationQuota(ws, "gen-req-1")).toBe(0);

    // Next distinct request must fail instead of going negative
    expect(() => consumeGenerationQuota(ws, "gen-req-2")).toThrowError(QuotaError);
    expect(ws.remainingQuota).toBe(0);
  });

  it("refunds quota once on failure with idempotency protection", () => {
    const ws = createWorkspaceQuotaState("ws-2", "starter", new Date("2026-11-05T00:00:00Z"));
    expect(consumeGenerationQuota(ws, "gen-fail-1")).toBe(9);

    expect(refundGenerationQuota(ws, "refund-fail-1")).toBe(10);
    expect(refundGenerationQuota(ws, "refund-fail-1")).toBe(10);
  });

  it("resets free monthly quota on the 1st of the next month", () => {
    const ws = createWorkspaceQuotaState("ws-3", "free", new Date("2026-11-15T00:00:00Z"));
    consumeGenerationQuota(ws, "nov-1");
    expect(ws.remainingQuota).toBe(0);

    // Before Dec 1 -> no reset
    expect(resetMonthlyQuotaIfDue(ws, new Date("2026-11-30T23:59:59Z"))).toBe(false);
    expect(ws.remainingQuota).toBe(0);

    // On Dec 1 -> resets to 1, idempotent if called again
    expect(resetMonthlyQuotaIfDue(ws, new Date("2026-12-01T00:00:00Z"))).toBe(true);
    expect(ws.remainingQuota).toBe(1);
    expect(resetMonthlyQuotaIfDue(ws, new Date("2026-12-01T01:00:00Z"))).toBe(false);
  });

  it("enforces Free 3 AI edits per project while keeping direct text edits unlimited", () => {
    const project: ProjectEditState = {
      projectId: "proj-1",
      aiEditCount: 0,
      processedEditKeys: new Set(),
    };

    // Direct text edits never consume AI edit quota
    for (let i = 0; i < 5; i++) {
      const res = applyProjectEdit("free", project, "direct_text", `direct-${i}`);
      expect(res.aiEditCount).toBe(0);
      expect(res.remainingAiEdits).toBe(3);
    }

    // 3 AI edits allowed on Free (idempotent on duplicate key)
    expect(applyProjectEdit("free", project, "ai_rewrite", "ai-1").remainingAiEdits).toBe(2);
    expect(applyProjectEdit("free", project, "ai_rewrite", "ai-1").remainingAiEdits).toBe(2);
    expect(applyProjectEdit("free", project, "ai_image", "ai-2").remainingAiEdits).toBe(1);
    expect(applyProjectEdit("free", project, "ai_rewrite", "ai-3").remainingAiEdits).toBe(0);

    // 4th AI edit must throw
    expect(() => applyProjectEdit("free", project, "ai_image", "ai-4")).toThrowError(QuotaError);
    // Direct text edit still works even after AI edits are exhausted
    expect(applyProjectEdit("free", project, "direct_text", "direct-after").aiEditCount).toBe(3);
  });

  it("allows unlimited AI edits on Pro plan", () => {
    const project: ProjectEditState = {
      projectId: "proj-pro",
      aiEditCount: 25,
      processedEditKeys: new Set(),
    };

    const res = applyProjectEdit("pro", project, "ai_rewrite", "pro-edit-26");
    expect(res.aiEditCount).toBe(26);
    expect(res.remainingAiEdits).toBeNull();
  });
});
