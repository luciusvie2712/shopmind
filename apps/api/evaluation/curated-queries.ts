export interface CuratedQuerySeed {
  readonly id: string;
  readonly query: string;
  readonly expected: {
    readonly category?: string;
    readonly price?: { readonly min?: number; readonly max?: number };
    readonly brands?: readonly string[];
    readonly minRating?: number;
    readonly requiredConcepts: readonly string[];
  };
  readonly relevantProductIds: readonly string[];
  readonly mockIntentOverride?: Readonly<Record<string, unknown>>;
  readonly providerOutcome?: "success" | "fallback";
}

const productId = (index: number) =>
  `40000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

export const evaluationProductIds = {
  developerLaptop: productId(1),
  valueLaptop: productId(2),
  cameraPhone: productId(3),
  headphones: productId(4),
  skinCare: productId(5),
  groceries: productId(6),
  officeChair: productId(7),
  smartWatch: productId(8),
} as const;

const p = evaluationProductIds;

export const curatedQuerySeeds: readonly CuratedQuerySeed[] = [
  { id: "q01", query: "laptop under $1000 for coding and Docker", expected: { category: "laptops", price: { max: 1000 }, requiredConcepts: ["coding", "Docker"] }, relevantProductIds: [p.developerLaptop, p.valueLaptop] },
  { id: "q02", query: "portable Acme laptop between $700 and $950", expected: { category: "laptops", price: { min: 700, max: 950 }, brands: ["Acme"], requiredConcepts: ["portable"] }, relevantProductIds: [p.valueLaptop] },
  { id: "q03", query: "high rated phone for travel photography", expected: { category: "smartphones", minRating: 4.5, requiredConcepts: ["travel photography"] }, relevantProductIds: [p.cameraPhone] },
  { id: "q04", query: "noise cancelling headphones for a shared office", expected: { category: "headphones", requiredConcepts: ["noise cancelling", "shared office"] }, relevantProductIds: [p.headphones] },
  { id: "q05", query: "budget laptop for university work", expected: { category: "laptops", price: { max: 800 }, requiredConcepts: ["university"] }, relevantProductIds: [p.valueLaptop], mockIntentOverride: { category: "computers" } },
  { id: "q06", query: "skin care set below $60 for dry skin", expected: { category: "beauty", price: { max: 60 }, requiredConcepts: ["dry skin"] }, relevantProductIds: [p.skinCare] },
  { id: "q07", query: "healthy pantry groceries under $40", expected: { category: "groceries", price: { max: 40 }, requiredConcepts: ["healthy pantry"] }, relevantProductIds: [p.groceries] },
  { id: "q08", query: "ergonomic office chair for long coding sessions", expected: { category: "furniture", requiredConcepts: ["ergonomic", "coding"] }, relevantProductIds: [p.officeChair] },
  { id: "q09", query: "smart watch with fitness tracking", expected: { category: "wearables", requiredConcepts: ["fitness tracking"] }, relevantProductIds: [p.smartWatch] },
  { id: "q10", query: "ShopMind Test laptop rated at least 4.7", expected: { category: "laptops", brands: ["ShopMind Test"], minRating: 4.7, requiredConcepts: ["development"] }, relevantProductIds: [p.developerLaptop], mockIntentOverride: { minRating: 4.5 } },
  { id: "q11", query: "phone under $700 with a strong camera", expected: { category: "smartphones", price: { max: 700 }, requiredConcepts: ["camera"] }, relevantProductIds: [p.cameraPhone] },
  { id: "q12", query: "wireless headphones under $250 not gaming focused", expected: { category: "headphones", price: { max: 250 }, requiredConcepts: ["wireless"], }, relevantProductIds: [p.headphones] },
  { id: "q13", query: "premium laptop for backend engineering", expected: { category: "laptops", price: { min: 850 }, requiredConcepts: ["backend engineering"] }, relevantProductIds: [p.developerLaptop] },
  { id: "q14", query: "affordable ergonomic desk setup", expected: { category: "furniture", price: { max: 350 }, requiredConcepts: ["ergonomic"] }, relevantProductIds: [p.officeChair] },
  { id: "q15", query: "Acme portable computer for student coding", expected: { category: "laptops", brands: ["Acme"], requiredConcepts: ["student coding", "portable"] }, relevantProductIds: [p.valueLaptop], mockIntentOverride: { brands: [] } },
  { id: "q16", query: "giftable beauty products under $50", expected: { category: "beauty", price: { max: 50 }, requiredConcepts: ["giftable"] }, relevantProductIds: [p.skinCare], providerOutcome: "fallback" },
  { id: "q17", query: "high protein groceries for quick meals", expected: { category: "groceries", requiredConcepts: ["high protein", "quick meals"] }, relevantProductIds: [p.groceries] },
  { id: "q18", query: "wearable for running without a phone", expected: { category: "wearables", requiredConcepts: ["running", "without a phone"] }, relevantProductIds: [p.smartWatch] },
  { id: "q19", query: "work from home audio without bulky gaming gear", expected: { category: "headphones", requiredConcepts: ["work from home"], }, relevantProductIds: [p.headphones], providerOutcome: "fallback" },
  { id: "q20", query: "development machine below $950 with portability", expected: { category: "laptops", price: { max: 950 }, requiredConcepts: ["development", "portability"] }, relevantProductIds: [p.developerLaptop, p.valueLaptop], mockIntentOverride: { price: {} } },
] as const;
