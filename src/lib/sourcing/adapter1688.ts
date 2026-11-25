import "server-only";

export type Sourcing1688Provider = "tmapi" | "rapidapi" | "onebound";

export interface Sourced1688Product {
  itemId: string;
  provider: Sourcing1688Provider;
  title: string;
  priceCny: number | null;
  priceRange: string[];
  attributes: Array<{ name: string; value: string }>;
  skuSummary: string[];
  mainImages: string[];
  packageSpec?: {
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    weightG?: number;
  };
}

const ALLOWED_1688_HOSTS = new Set(["detail.1688.com", "m.1688.com", "qr.1688.com"]);
const PROVIDER_ORDER: Sourcing1688Provider[] = ["tmapi", "rapidapi", "onebound"];
const FETCH_TIMEOUT_MS = 12_000;
const MAX_IMAGES = 6;
const MAX_ATTRIBUTES = 20;
const MAX_SKUS = 20;

type Json = Record<string, unknown>;

function isObj(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, max = 300): string {
  if (typeof v === "string") return v.trim().slice(0, max);
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function toPrice(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string") {
    const m = v.match(/\d+(?:\.\d+)?/);
    if (m) {
      const n = Number(m[0]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

export function extract1688ItemId(sourceUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!ALLOWED_1688_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  const pathMatch = parsed.pathname.match(/\/offer\/(\d+)\.html/);
  if (pathMatch) return pathMatch[1];
  const queryMatch = parsed.search.match(/offerId=(\d+)/i);
  if (queryMatch) return queryMatch[1];
  return null;
}

export function sanitizeImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    let candidate = "";
    if (typeof item === "string") candidate = item;
    else if (isObj(item)) candidate = str(item.url ?? item.img ?? item.src, 2048);
    candidate = candidate.trim();
    if (!candidate) continue;
    if (candidate.startsWith("//")) candidate = `https:${candidate}`;
    if (candidate.startsWith("http://")) candidate = `https://${candidate.slice("http://".length)}`;
    try {
      const u = new URL(candidate);
      const host = u.hostname.toLowerCase();
      if (u.protocol !== "https:") continue;
      if (u.username || u.password) continue;
      if (host !== "alicdn.com" && !host.endsWith(".alicdn.com")) continue;
      const href = u.toString();
      if (!out.includes(href)) out.push(href);
    } catch {
      continue;
    }
    if (out.length >= MAX_IMAGES) break;
  }
  return out;
}

function normalizeAttributes(raw: unknown): Array<{ name: string; value: string }> {
  const out: Array<{ name: string; value: string }> = [];
  if (Array.isArray(raw)) {
    for (const p of raw) {
      if (!isObj(p)) continue;
      const name = str(p.name ?? p.attr_name ?? p.key ?? p.label, 80);
      const value = str(p.value ?? p.attr_value ?? p.val, 200);
      if (name && value) out.push({ name, value });
    }
  } else if (isObj(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      const value = str(v, 200);
      if (k && value) out.push({ name: k.slice(0, 80), value });
    }
  } else if (typeof raw === "string") {
    // OneBound style: "pid:vid:name:value;..." or "name:value;..."
    for (const seg of raw.split(";")) {
      const parts = seg.split(":").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        out.push({ name: parts[parts.length - 2].slice(0, 80), value: parts[parts.length - 1].slice(0, 200) });
      }
    }
  }
  return out.slice(0, MAX_ATTRIBUTES);
}

function normalizeSkuSummary(raw: unknown): string[] {
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const prop of raw) {
      if (typeof prop === "string") {
        const s = str(prop, 200);
        if (s) out.push(s);
        continue;
      }
      if (!isObj(prop)) continue;
      const name = str(prop.prop_name ?? prop.name ?? prop.label, 80);
      const values = Array.isArray(prop.values ?? prop.value)
        ? ((prop.values ?? prop.value) as unknown[])
            .map((v) => (isObj(v) ? str(v.name ?? v.value, 60) : str(v, 60)))
            .filter(Boolean)
        : [];
      if (name && values.length) out.push(`${name}: ${values.slice(0, 12).join(", ")}`);
      else if (name) out.push(name);
    }
  }
  return out.slice(0, MAX_SKUS);
}

function normalizePriceRange(raw: unknown): string[] {
  if (!Array.isArray(raw)) return typeof raw === "string" && raw.trim() ? [str(raw, 100)] : [];
  const out: string[] = [];
  for (const r of raw) {
    if (typeof r === "string" || typeof r === "number") {
      const s = str(r, 100);
      if (s) out.push(s);
    } else if (Array.isArray(r) && r.length >= 2) {
      out.push(`${str(r[0], 20)}개 이상: ¥${str(r[1], 20)}`);
    } else if (isObj(r)) {
      const qty = str(r.beginAmount ?? r.beginAmount ?? r.begin_num ?? r.min_qty ?? r.startQuantity ?? r.quantity, 20);
      const price = str(r.price, 20);
      if (price) out.push(qty ? `${qty}개 이상: ¥${price}` : `¥${price}`);
    }
  }
  return out.slice(0, 10);
}

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstream status ${res.status}`);
  return res.json();
}

function finalize(product: Sourced1688Product): Sourced1688Product | null {
  if (!product.title && product.mainImages.length === 0 && product.priceCny === null) return null;
  return product;
}

function extractPackageSpec(
  data: Json,
  attributes: Array<{ name: string; value: string }>,
): Sourced1688Product["packageSpec"] {
  let lengthCm: number | undefined;
  let widthCm: number | undefined;
  let heightCm: number | undefined;
  let weightG: number | undefined;

  const pkg = isObj(data.package_info)
    ? data.package_info
    : isObj(data.delivery_info)
      ? data.delivery_info
      : null;

  if (pkg) {
    const rawW = toPrice(pkg.weight ?? pkg.unit_weight ?? pkg.gross_weight);
    if (rawW) {
      // TMAPI/1688 delivery weight is often in kg if < 50, or grams if >= 50
      weightG = rawW < 50 ? Math.round(rawW * 1000) : Math.round(rawW);
    }
    lengthCm = toPrice(pkg.length) ?? undefined;
    widthCm = toPrice(pkg.width) ?? undefined;
    heightCm = toPrice(pkg.height) ?? undefined;
  }

  for (const attr of attributes) {
    const k = attr.name.toLowerCase();
    const v = attr.value;
    if (!weightG && (k.includes("중량") || k.includes("무게") || k.includes("克重") || k.includes("重量") || k.includes("weight"))) {
      const mKg = v.match(/(\d+(?:\.\d+)?)\s*kg/i);
      const mG = v.match(/(\d+(?:\.\d+)?)\s*(?:g|克)/i);
      if (mKg) weightG = Math.round(Number(mKg[1]) * 1000);
      else if (mG) weightG = Math.round(Number(mG[1]));
    }
    if ((!lengthCm || !widthCm) && (k.includes("사이즈") || k.includes("규격") || k.includes("치수") || k.includes("尺寸") || k.includes("包装"))) {
      const m3 = v.match(/(\d+(?:\.\d+)?)\s*[*×xX]\s*(\d+(?:\.\d+)?)\s*[*×xX]\s*(\d+(?:\.\d+)?)/);
      const m2 = v.match(/(\d+(?:\.\d+)?)\s*[*×xX]\s*(\d+(?:\.\d+)?)/);
      if (m3) {
        lengthCm = Number(m3[1]);
        widthCm = Number(m3[2]);
        heightCm = Number(m3[3]);
      } else if (m2) {
        lengthCm = Number(m2[1]);
        widthCm = Number(m2[2]);
        heightCm = heightCm ?? 2;
      }
    }
  }

  if (!lengthCm && !widthCm && !heightCm && !weightG) return undefined;
  return { lengthCm, widthCm, heightCm, weightG };
}

async function fetchTmapi(itemId: string, apiKey: string): Promise<Sourced1688Product | null> {
  const json = await getJson(
    `https://api.tmapi.top/1688/item_detail?item_id=${encodeURIComponent(itemId)}&language=ko`,
    { apikey: apiKey },
  );
  if (!isObj(json) || (json.code !== undefined && Number(json.code) !== 200)) return null;
  const data = isObj(json.data) ? json.data : null;
  if (!data) return null;
  const priceInfo = isObj(data.price_info) ? data.price_info : {};
  const tiered = isObj(data.tiered_price_info) ? data.tiered_price_info.prices : undefined;
  const attributes = normalizeAttributes(data.product_props);
  return finalize({
    itemId,
    provider: "tmapi",
    title: str(data.title, 200),
    priceCny: toPrice(priceInfo.price) ?? toPrice(priceInfo.price_min) ?? toPrice(data.price),
    priceRange: normalizePriceRange(tiered ?? data.price_range ?? data.price_ranges),
    attributes,
    skuSummary: normalizeSkuSummary(data.sku_props),
    mainImages: sanitizeImageUrls(data.main_imgs),
    packageSpec: extractPackageSpec(data, attributes),
  });
}

async function fetchRapidApi(
  itemId: string,
  apiKey: string,
  host: string,
  path: string,
): Promise<Sourced1688Product | null> {
  if (!/^[a-z0-9.-]+$/i.test(host)) return null;
  const safePath = path.startsWith("/") ? path : `/${path}`;
  if (!/^\/[a-z0-9/_-]*$/i.test(safePath)) return null;
  const json = await getJson(
    `https://${host}${safePath}?item_id=${encodeURIComponent(itemId)}`,
    { "x-rapidapi-key": apiKey, "x-rapidapi-host": host },
  );
  if (!isObj(json)) return null;
  const data = isObj(json.data) ? json.data : isObj(json.item) ? json.item : json;
  return finalize({
    itemId,
    provider: "rapidapi",
    title: str(data.title ?? data.subject, 200),
    priceCny: toPrice(data.price) ?? toPrice(data.price_min),
    priceRange: normalizePriceRange(data.price_range ?? data.price_ranges),
    attributes: normalizeAttributes(data.product_props ?? data.props ?? data.attributes),
    skuSummary: normalizeSkuSummary(data.sku_props ?? data.skuProps),
    mainImages: sanitizeImageUrls(data.main_imgs ?? data.images ?? data.item_imgs),
  });
}

async function fetchOneBound(
  itemId: string,
  key: string,
  secret: string,
): Promise<Sourced1688Product | null> {
  const json = await getJson(
    `https://api-gw.onebound.cn/1688/item_get/?key=${encodeURIComponent(key)}&secret=${encodeURIComponent(secret)}&num_iid=${encodeURIComponent(itemId)}`,
    {},
  );
  const item = isObj(json) && isObj(json.item) ? json.item : null;
  if (!item) return null;
  const imgs = Array.isArray(item.item_imgs) ? item.item_imgs : [];
  const withPic = item.pic_url ? [item.pic_url, ...imgs] : imgs;
  return finalize({
    itemId,
    provider: "onebound",
    title: str(item.title, 200),
    priceCny: toPrice(item.price),
    priceRange: normalizePriceRange(item.priceRange ?? item.price_range),
    attributes: normalizeAttributes(item.props),
    skuSummary: normalizeSkuSummary(item.props_list_summary ?? item.sku_props),
    mainImages: sanitizeImageUrls(withPic),
  });
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function resolveTmapiApiKey(): string {
  const test = env("TMAPI_API_TEST_KEY");
  const live = env("TMAPI_API_LIVE_KEY");
  const base = env("TMAPI_API_KEY");
  if (process.env.NODE_ENV === "production" && process.env.TMAPI_USE_TEST !== "true") {
    return live || base || test;
  }
  return test || base || live;
}

function isConfigured(p: Sourcing1688Provider): boolean {
  if (p === "tmapi") return Boolean(resolveTmapiApiKey());
  if (p === "rapidapi") return Boolean(env("RAPIDAPI_KEY") && env("RAPIDAPI_1688_HOST"));
  return Boolean(env("ONEBOUND_API_KEY") && env("ONEBOUND_API_SECRET"));
}

export function select1688Provider(): Sourcing1688Provider | null {
  const override = env("SOURCING_1688_PROVIDER").toLowerCase();
  if ((PROVIDER_ORDER as string[]).includes(override)) {
    const p = override as Sourcing1688Provider;
    return isConfigured(p) ? p : null;
  }
  return PROVIDER_ORDER.find(isConfigured) ?? null;
}

export async function fetch1688Product(sourceUrl: string): Promise<Sourced1688Product | null> {
  const itemId = extract1688ItemId(sourceUrl);
  if (!itemId) return null;
  const provider = select1688Provider();
  if (!provider) return null;
  try {
    if (provider === "tmapi") return await fetchTmapi(itemId, resolveTmapiApiKey());
    if (provider === "rapidapi") {
      return await fetchRapidApi(
        itemId,
        env("RAPIDAPI_KEY"),
        env("RAPIDAPI_1688_HOST"),
        env("RAPIDAPI_1688_PATH") || "/1688/item_detail",
      );
    }
    return await fetchOneBound(itemId, env("ONEBOUND_API_KEY"), env("ONEBOUND_API_SECRET"));
  } catch {
    if (process.env.NODE_ENV === "test") {
      console.warn(`1688 adapter (${provider}) fetch failed`);
    }
    return null;
  }
}
