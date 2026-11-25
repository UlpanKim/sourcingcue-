import { PLANS, type PlanId } from "./plans";

export type EditType = "direct_text" | "ai_rewrite" | "ai_image";

export interface WorkspaceQuotaState {
  workspaceId: string;
  planId: PlanId;
  remainingQuota: number;
  quotaResetAt: Date;
  processedIdempotencyKeys: Set<string>;
}

export interface ProjectEditState {
  projectId: string;
  aiEditCount: number;
  processedEditKeys: Set<string>;
}

export class QuotaError extends Error {
  constructor(
    public readonly code: "INSUFFICIENT_QUOTA" | "AI_EDIT_LIMIT_REACHED",
    message: string,
  ) {
    super(message);
    this.name = "QuotaError";
  }
}

export function createWorkspaceQuotaState(
  workspaceId: string,
  planId: PlanId = "free",
  now: Date = new Date(),
): WorkspaceQuotaState {
  const plan = PLANS[planId];
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return {
    workspaceId,
    planId,
    remainingQuota: plan.monthlyQuota,
    quotaResetAt: nextMonth,
    processedIdempotencyKeys: new Set<string>(),
  };
}

/**
 * Consumes 1 generation quota with idempotency protection.
 * Never allows remainingQuota to drop below 0.
 */
export function consumeGenerationQuota(
  state: WorkspaceQuotaState,
  idempotencyKey: string,
): number {
  if (!idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required");
  }
  const opKey = `consume:${idempotencyKey}`;
  if (state.processedIdempotencyKeys.has(opKey)) {
    return state.remainingQuota;
  }
  if (state.remainingQuota < 1) {
    throw new QuotaError(
      "INSUFFICIENT_QUOTA",
      "이번 달 생성 가능 횟수를 모두 사용했습니다. 요금제를 업그레이드해 주세요.",
    );
  }
  state.remainingQuota -= 1;
  state.processedIdempotencyKeys.add(opKey);
  return state.remainingQuota;
}

/**
 * Refunds 1 generation quota when scraping/rendering fails.
 * Protected by idempotencyKey so duplicate refund calls credit only once.
 */
export function refundGenerationQuota(
  state: WorkspaceQuotaState,
  idempotencyKey: string,
): number {
  if (!idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required");
  }
  const opKey = `refund:${idempotencyKey}`;
  if (state.processedIdempotencyKeys.has(opKey)) {
    return state.remainingQuota;
  }
  state.remainingQuota += 1;
  state.processedIdempotencyKeys.add(opKey);
  return state.remainingQuota;
}

/**
 * Resets monthly quota when current time reaches or passes quotaResetAt.
 * Idempotent per YYYY-MM cycle key.
 */
export function resetMonthlyQuotaIfDue(
  state: WorkspaceQuotaState,
  now: Date = new Date(),
): boolean {
  if (now.getTime() < state.quotaResetAt.getTime()) {
    return false;
  }
  const cycleKey = `reset:${state.workspaceId}:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  if (state.processedIdempotencyKeys.has(cycleKey)) {
    return false;
  }
  const plan = PLANS[state.planId];
  state.remainingQuota = plan.monthlyQuota;
  state.quotaResetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  state.processedIdempotencyKeys.add(cycleKey);
  return true;
}

/**
 * Checks and records an edit on a project.
 * - direct_text: always free & unlimited (never increments aiEditCount)
 * - ai_rewrite / ai_image: increments aiEditCount up to plan.maxAiEditsPerProject (null = unlimited)
 */
export function applyProjectEdit(
  planId: PlanId,
  project: ProjectEditState,
  editType: EditType,
  idempotencyKey: string,
): { aiEditCount: number; remainingAiEdits: number | null } {
  if (!idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required");
  }
  const maxEdits = PLANS[planId].maxAiEditsPerProject;

  if (project.processedEditKeys.has(idempotencyKey)) {
    return {
      aiEditCount: project.aiEditCount,
      remainingAiEdits: maxEdits === null ? null : Math.max(0, maxEdits - project.aiEditCount),
    };
  }

  if (editType === "direct_text") {
    project.processedEditKeys.add(idempotencyKey);
    return {
      aiEditCount: project.aiEditCount,
      remainingAiEdits: maxEdits === null ? null : Math.max(0, maxEdits - project.aiEditCount),
    };
  }

  if (maxEdits !== null && project.aiEditCount >= maxEdits) {
    throw new QuotaError(
      "AI_EDIT_LIMIT_REACHED",
      `현재 요금제의 상품당 AI 수정 한도(${maxEdits}회)를 모두 사용했습니다. 직접 텍스트 수정은 무제한 가능합니다.`,
    );
  }

  project.aiEditCount += 1;
  project.processedEditKeys.add(idempotencyKey);
  return {
    aiEditCount: project.aiEditCount,
    remainingAiEdits: maxEdits === null ? null : Math.max(0, maxEdits - project.aiEditCount),
  };
}
