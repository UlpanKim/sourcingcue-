import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  extract1688ItemId,
  fetch1688Product,
  sanitizeImageUrls,
} from "../src/lib/sourcing/adapter1688";

const PROVIDER_ENV_KEYS = [
  "SOURCING_1688_PROVIDER",
  "TMAPI_API_KEY",
  "RAPIDAPI_KEY",
  "RAPIDAPI_1688_HOST",
  "RAPIDAPI_1688_PATH",
  "ONEBOUND_API_KEY",
  "ONEBOUND_API_SECRET",
];

const URL_1688 = "https://detail.1688.com/offer/849201948271.html";
let saved: Record<string, string | undefined> = {};

function mockFetchJson(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  saved = {};
  for (const k of PROVIDER_ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of PROVIDER_ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("extract1688ItemId", () => {
  it("parses /offer/<id>.html and offerId= fallback", () => {
    expect(extract1688ItemId(URL_1688)).toBe("849201948271");
    expect(extract1688ItemId("https://m.1688.com/offer/123456.html?spm=a")).toBe("123456");
    expect(extract1688ItemId("https://qr.1688.com/share?offerId=987654")).toBe("987654");
  });

  it("rejects non-1688 or malformed URLs", () => {
    expect(extract1688ItemId("https://evil.com/offer/123.html")).toBeNull();
    expect(extract1688ItemId("not a url")).toBeNull();
    expect(extract1688ItemId("https://detail.1688.com/page.html")).toBeNull();
  });
});

describe("sanitizeImageUrls", () => {
  it("upgrades http alicdn, drops non-alicdn, caps at 6", () => {
    const out = sanitizeImageUrls([
      "http://cbu01.alicdn.com/a.jpg",
      "//img.alicdn.com/b.jpg",
      "https://evil.com/c.jpg",
      "javascript:alert(1)",
      ...Array.from({ length: 10 }, (_, i) => `https://cbu01.alicdn.com/x${i}.jpg`),
    ]);
    expect(out[0]).toBe("https://cbu01.alicdn.com/a.jpg");
    expect(out[1]).toBe("https://img.alicdn.com/b.jpg");
    expect(out).toHaveLength(6);
    expect(out.every((u) => u.startsWith("https://") && new URL(u).hostname.endsWith(".alicdn.com"))).toBe(true);
  });
});

describe("fetch1688Product", () => {
  it("returns null when no provider is configured (no fetch)", async () => {
    const fn = mockFetchJson({});
    expect(await fetch1688Product(URL_1688)).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it("normalizes a TMAPI response", async () => {
    process.env.TMAPI_API_KEY = "test-tmapi";
    const fn = mockFetchJson({
      code: 200,
      data: {
        title: "접이식 캠핑 의자",
        price: "35.50",
        price_range: [{ begin_num: 2, price: "35.5" }],
        product_props: [{ name: "재질", value: "옥스포드" }],
        sku_props: [{ prop_name: "색상", values: [{ name: "블랙" }, { name: "카키" }] }],
        main_imgs: ["http://cbu01.alicdn.com/img/1.jpg", "https://evil.com/2.jpg"],
      },
    });
    const p = await fetch1688Product(URL_1688);
    expect(p).not.toBeNull();
    expect(p!.provider).toBe("tmapi");
    expect(p!.itemId).toBe("849201948271");
    expect(p!.title).toBe("접이식 캠핑 의자");
    expect(p!.priceCny).toBe(35.5);
    expect(p!.priceRange).toEqual(["2개 이상: ¥35.5"]);
    expect(p!.attributes).toEqual([{ name: "재질", value: "옥스포드" }]);
    expect(p!.skuSummary).toEqual(["색상: 블랙, 카키"]);
    expect(p!.mainImages).toEqual(["https://cbu01.alicdn.com/img/1.jpg"]);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.tmapi.top/1688/item_detail?item_id=849201948271&language=ko");
    expect((init.headers as Record<string, string>).apiToken).toBe("test-tmapi");
  });

  it("normalizes a RapidAPI response with item wrapper", async () => {
    process.env.RAPIDAPI_KEY = "test-rapid";
    process.env.RAPIDAPI_1688_HOST = "1688-api.p.rapidapi.com";
    const fn = mockFetchJson({
      item: { title: "니트 바라클라바", price_min: 12, main_imgs: ["https://img.alicdn.com/k.jpg"] },
    });
    const p = await fetch1688Product(URL_1688);
    expect(p?.provider).toBe("rapidapi");
    expect(p?.title).toBe("니트 바라클라바");
    expect(p?.priceCny).toBe(12);
    expect(p?.mainImages).toEqual(["https://img.alicdn.com/k.jpg"]);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://1688-api.p.rapidapi.com/1688/item_detail?item_id=849201948271");
    expect((init.headers as Record<string, string>)["x-rapidapi-host"]).toBe("1688-api.p.rapidapi.com");
  });

  it("normalizes a OneBound response", async () => {
    process.env.ONEBOUND_API_KEY = "k";
    process.env.ONEBOUND_API_SECRET = "s";
    mockFetchJson({
      item: {
        title: "실리콘 주방 집게",
        price: "8.80",
        props: [{ name: "材质", value: "硅胶" }],
        item_imgs: [{ url: "//cbu01.alicdn.com/o1.jpg" }, { url: "https://bad.example/o2.jpg" }],
      },
    });
    const p = await fetch1688Product(URL_1688);
    expect(p?.provider).toBe("onebound");
    expect(p?.priceCny).toBe(8.8);
    expect(p?.attributes).toEqual([{ name: "材质", value: "硅胶" }]);
    expect(p?.mainImages).toEqual(["https://cbu01.alicdn.com/o1.jpg"]);
  });

  it("honors SOURCING_1688_PROVIDER override and returns null on upstream failure", async () => {
    process.env.TMAPI_API_KEY = "t";
    process.env.ONEBOUND_API_KEY = "k";
    process.env.ONEBOUND_API_SECRET = "s";
    process.env.SOURCING_1688_PROVIDER = "onebound";
    const fn = mockFetchJson({ error: "quota" }, 500);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await fetch1688Product(URL_1688)).toBeNull();
    expect(String((fn.mock.calls[0] as unknown as [string])[0])).toContain("api-gw.onebound.cn");
  });
});
