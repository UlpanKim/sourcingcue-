import { describe, expect, it } from "vitest";
import { calculateCoupangFulfillment } from "../src/lib/billing/coupangFulfillment";

describe("Coupang Rocket Growth & Normal fulfillment fee calculator", () => {
  it("computes 소형 tier for 50x35x1.2cm (86.2cm) and 330g (0.33kg)", () => {
    const std = calculateCoupangFulfillment(
      { lengthCm: 50, widthCm: 35, heightCm: 1.2, weightG: 330 },
      "rocket_growth",
      false,
    );
    expect(std.tier).toBe("소형");
    expect(std.sumCm).toBe(86.2);
    expect(std.weightKg).toBe(0.33);
    expect(std.inboundOutboundFeeKrw).toBe(1750);
    expect(std.shippingFeeKrw).toBe(2400);
    expect(std.totalFeeKrw).toBe(4150);

    const promo = calculateCoupangFulfillment(
      { lengthCm: 50, widthCm: 35, heightCm: 1.2, weightG: 330 },
      "rocket_growth",
      true,
    );
    expect(promo.totalFeeKrw).toBe(2200);
  });

  it("picks the higher tier between size sum and weight across all 6 tiers", () => {
    // 극소형: <=80cm, <=2kg
    expect(
      calculateCoupangFulfillment(
        { lengthCm: 25, widthCm: 20, heightCm: 10, weightG: 500 },
        "rocket_growth",
      ).tier,
    ).toBe("극소형");

    // 중형 by weight (7kg) even though size is small
    expect(
      calculateCoupangFulfillment(
        { lengthCm: 20, widthCm: 20, heightCm: 10, weightG: 7000 },
        "rocket_growth",
      ).tier,
    ).toBe("중형");

    // 대형 1: 140cm
    expect(
      calculateCoupangFulfillment(
        { lengthCm: 60, widthCm: 50, heightCm: 30, weightG: 1000 },
        "rocket_growth",
      ).tier,
    ).toBe("대형 1");

    // 대형 2: 160cm
    expect(
      calculateCoupangFulfillment(
        { lengthCm: 70, widthCm: 50, heightCm: 40, weightG: 1000 },
        "rocket_growth",
      ).tier,
    ).toBe("대형 2");

    // 특대형: >20kg
    expect(
      calculateCoupangFulfillment(
        { lengthCm: 40, widthCm: 30, heightCm: 20, weightG: 22000 },
        "rocket_growth",
      ).tier,
    ).toBe("특대형");
  });

  it("sets inboundOutboundFeeKrw to 0 for normal shipping mode", () => {
    const res = calculateCoupangFulfillment(
      { lengthCm: 30, widthCm: 20, heightCm: 10, weightG: 800 },
      "normal",
    );
    expect(res.tier).toBe("극소형");
    expect(res.inboundOutboundFeeKrw).toBe(0);
    expect(res.shippingFeeKrw).toBe(3000);
    expect(res.totalFeeKrw).toBe(3000);
  });
});
