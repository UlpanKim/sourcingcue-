export type CoupangSizeTier = "극소형" | "소형" | "중형" | "대형 1" | "대형 2" | "특대형";

export interface PackageSpec {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightG: number;
}

export interface FulfillmentBreakdown {
  tier: CoupangSizeTier;
  sumCm: number;
  weightKg: number;
  inboundOutboundFeeKrw: number;
  shippingFeeKrw: number;
  totalFeeKrw: number;
  isPromo: boolean;
}

const TIER_ORDER: CoupangSizeTier[] = ["극소형", "소형", "중형", "대형 1", "대형 2", "특대형"];

const ROCKET_RATES: Record<
  CoupangSizeTier,
  {
    standard: { inboundOutbound: number; shipping: number };
    promo: { inboundOutbound: number; shipping: number };
  }
> = {
  극소형: {
    standard: { inboundOutbound: 1650, shipping: 2200 },
    promo: { inboundOutbound: 600, shipping: 1350 },
  },
  소형: {
    standard: { inboundOutbound: 1750, shipping: 2400 },
    promo: { inboundOutbound: 650, shipping: 1550 },
  },
  중형: {
    standard: { inboundOutbound: 2000, shipping: 3000 },
    promo: { inboundOutbound: 1250, shipping: 2100 },
  },
  "대형 1": {
    standard: { inboundOutbound: 2400, shipping: 4000 },
    promo: { inboundOutbound: 1375, shipping: 2200 },
  },
  "대형 2": {
    standard: { inboundOutbound: 2400, shipping: 5500 },
    promo: { inboundOutbound: 1375, shipping: 4100 },
  },
  특대형: {
    standard: { inboundOutbound: 2400, shipping: 9500 },
    promo: { inboundOutbound: 1375, shipping: 5600 },
  },
};

const NORMAL_SHIPPING_RATES: Record<CoupangSizeTier, number> = {
  극소형: 3000,
  소형: 3300,
  중형: 4000,
  "대형 1": 5000,
  "대형 2": 6500,
  특대형: 9000,
};

function tierBySumCm(sumCm: number): CoupangSizeTier {
  if (sumCm <= 80) return "극소형";
  if (sumCm <= 100) return "소형";
  if (sumCm <= 120) return "중형";
  if (sumCm <= 140) return "대형 1";
  if (sumCm <= 160) return "대형 2";
  return "특대형";
}

function tierByWeightKg(weightKg: number): CoupangSizeTier {
  if (weightKg <= 2) return "극소형";
  if (weightKg <= 5) return "소형";
  if (weightKg <= 10) return "중형";
  if (weightKg <= 15) return "대형 1";
  if (weightKg <= 20) return "대형 2";
  return "특대형";
}

export function calculateCoupangFulfillment(
  spec: PackageSpec,
  shippingMode: "rocket_growth" | "normal",
  usePromoRate: boolean = false,
): FulfillmentBreakdown {
  const safeL = Math.max(0.1, spec.lengthCm || 0);
  const safeW = Math.max(0.1, spec.widthCm || 0);
  const safeH = Math.max(0.1, spec.heightCm || 0);
  const safeWeightG = Math.max(1, spec.weightG || 0);

  const sumCm = Math.round((safeL + safeW + safeH) * 10) / 10;
  const weightKg = Math.round((safeWeightG / 1000) * 100) / 100;

  const sizeTier = tierBySumCm(sumCm);
  const weightTier = tierByWeightKg(weightKg);
  const tier =
    TIER_ORDER.indexOf(sizeTier) >= TIER_ORDER.indexOf(weightTier) ? sizeTier : weightTier;

  if (shippingMode === "normal") {
    const shippingFeeKrw = NORMAL_SHIPPING_RATES[tier];
    return {
      tier,
      sumCm,
      weightKg,
      inboundOutboundFeeKrw: 0,
      shippingFeeKrw,
      totalFeeKrw: shippingFeeKrw,
      isPromo: false,
    };
  }

  const rate = usePromoRate ? ROCKET_RATES[tier].promo : ROCKET_RATES[tier].standard;
  return {
    tier,
    sumCm,
    weightKg,
    inboundOutboundFeeKrw: rate.inboundOutbound,
    shippingFeeKrw: rate.shipping,
    totalFeeKrw: rate.inboundOutbound + rate.shipping,
    isPromo: usePromoRate,
  };
}
