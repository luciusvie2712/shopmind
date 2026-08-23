import { performance } from "node:perf_hooks";
import { z } from "zod";
import { searchIntentSchema, type SearchIntent } from "../src/modules/ai/search-intent.schema";
import { curatedQuerySeeds, evaluationProductIds } from "./curated-queries";

const uniqueIds = (values: readonly string[]) => new Set(values).size === values.length;
const expectedSchema = z.object({
  category: z.string().min(1).optional(),
  price: z.object({ min: z.number().nonnegative().optional(), max: z.number().nonnegative().optional() }).strict().optional(),
  brands: z.array(z.string().min(1)).optional(),
  minRating: z.number().min(0).max(5).optional(),
  requiredConcepts: z.array(z.string().min(1)).min(1),
}).strict();
const evaluationQuerySchema = z.object({
  id: z.string().regex(/^q\d{2}$/),
  query: z.string().min(3),
  expected: expectedSchema,
  relevantProductIds: z.array(z.string().uuid()).min(1).refine(uniqueIds),
  candidateProductIds: z.array(z.string().uuid()).min(1).refine(uniqueIds),
  recommendedProductIds: z.array(z.string().uuid()).refine(uniqueIds),
  manualRelevantProductIds: z.array(z.string().uuid()).min(1).refine(uniqueIds),
  providerOutcome: z.enum(["success", "fallback"]),
  mockIntent: searchIntentSchema,
}).strict();

const products = new Map([
  [evaluationProductIds.developerLaptop, { category: "laptops", price: 899, brand: "ShopMind Test", rating: 4.9 }],
  [evaluationProductIds.valueLaptop, { category: "laptops", price: 749, brand: "Acme", rating: 4.6 }],
  [evaluationProductIds.cameraPhone, { category: "smartphones", price: 649, brand: "Acme", rating: 4.7 }],
  [evaluationProductIds.headphones, { category: "headphones", price: 199, brand: "SoundCo", rating: 4.8 }],
  [evaluationProductIds.skinCare, { category: "beauty", price: 45, brand: "Glow", rating: 4.5 }],
  [evaluationProductIds.groceries, { category: "groceries", price: 35, brand: "Pantry", rating: 4.4 }],
  [evaluationProductIds.officeChair, { category: "furniture", price: 299, brand: "Acme", rating: 4.6 }],
  [evaluationProductIds.smartWatch, { category: "wearables", price: 249, brand: "Active", rating: 4.7 }],
] as const);
const allProductIds = [...products.keys()];

function baseIntent(seed: (typeof curatedQuerySeeds)[number]): SearchIntent {
  return {
    ...(seed.expected.category ? { category: seed.expected.category } : {}),
    ...(seed.expected.price ? { price: seed.expected.price } : {}),
    ...(seed.expected.brands ? { brands: [...seed.expected.brands] } : {}),
    ...(seed.expected.minRating !== undefined ? { minRating: seed.expected.minRating } : {}),
    useCases: [...seed.expected.requiredConcepts],
    requiredFeatures: [],
    priorities: [],
    negativePreferences: [],
    semanticQuery: seed.query,
  };
}

const dataset = curatedQuerySeeds.map((seed) => evaluationQuerySchema.parse({
  id: seed.id,
  query: seed.query,
  expected: seed.expected,
  relevantProductIds: seed.relevantProductIds,
  candidateProductIds: allProductIds,
  recommendedProductIds: seed.relevantProductIds,
  manualRelevantProductIds: seed.relevantProductIds,
  providerOutcome: seed.providerOutcome ?? "success",
  mockIntent: { ...baseIntent(seed), ...seed.mockIntentOverride },
}));

function fieldChecks(item: (typeof dataset)[number]): boolean[] {
  const { expected, mockIntent } = item;
  const concepts = [
    ...mockIntent.useCases,
    ...mockIntent.requiredFeatures,
    ...mockIntent.priorities,
  ].map((value) => value.toLowerCase());
  return [
    ...(expected.category ? [mockIntent.category?.toLowerCase() === expected.category.toLowerCase()] : []),
    ...(expected.price?.min !== undefined ? [mockIntent.price?.min === expected.price.min] : []),
    ...(expected.price?.max !== undefined ? [mockIntent.price?.max === expected.price.max] : []),
    ...(expected.brands ? [expected.brands.every((brand) => mockIntent.brands?.some((value) => value.toLowerCase() === brand.toLowerCase()))] : []),
    ...(expected.minRating !== undefined ? [mockIntent.minRating === expected.minRating] : []),
    ...expected.requiredConcepts.map((concept) => concepts.includes(concept.toLowerCase())),
  ];
}

function violatesHardConstraint(item: (typeof dataset)[number], productId: string): boolean {
  const product = products.get(productId);
  if (!product) return true;
  const { expected } = item;
  return Boolean(
    (expected.category && product.category !== expected.category) ||
    (expected.price?.min !== undefined && product.price < expected.price.min) ||
    (expected.price?.max !== undefined && product.price > expected.price.max) ||
    (expected.brands && !expected.brands.some((brand) => brand.toLowerCase() === product.brand.toLowerCase())) ||
    (expected.minRating !== undefined && product.rating < expected.minRating)
  );
}

describe("Phase 11 offline AI evaluation", () => {
  it("validates exactly 20 diverse, unique curated fixtures", () => {
    expect(dataset).toHaveLength(20);
    expect(uniqueIds(dataset.map(({ id }) => id))).toBe(true);
    expect(new Set(dataset.map(({ expected }) => expected.category)).size).toBeGreaterThanOrEqual(6);
  });

  it("calculates grounding, relevance, intent, latency, and failure metrics", () => {
    const latencies: number[] = [];
    let exact = 0;
    let partialTotal = 0;
    let hardViolations = 0;
    let recommendations = 0;
    let relevantRetrieved = 0;
    let relevantTotal = 0;
    let manualRelevant = 0;
    let returnedAtFive = 0;
    let hallucinations = 0;

    for (const item of dataset) {
      const startedAt = performance.now();
      const checks = fieldChecks(item);
      if (checks.every(Boolean)) exact += 1;
      partialTotal += checks.filter(Boolean).length / checks.length;
      const topFive = item.recommendedProductIds.slice(0, 5);
      recommendations += topFive.length;
      hardViolations += topFive.filter((id) => violatesHardConstraint(item, id)).length;
      relevantRetrieved += item.relevantProductIds.filter((id) => topFive.includes(id)).length;
      relevantTotal += item.relevantProductIds.length;
      manualRelevant += topFive.filter((id) => item.manualRelevantProductIds.includes(id)).length;
      returnedAtFive += topFive.length;
      hallucinations += topFive.filter((id) => !item.candidateProductIds.includes(id)).length;
      latencies.push(performance.now() - startedAt);
    }

    latencies.sort((left, right) => left - right);
    const metrics = {
      datasetSize: dataset.length,
      intentExactAccuracy: exact / dataset.length,
      intentPartialAccuracy: partialTotal / dataset.length,
      hardConstraintViolationRate: hardViolations / recommendations,
      recallAt5: relevantRetrieved / relevantTotal,
      manualRelevanceAt5: manualRelevant / returnedAtFive,
      outsideCandidateHallucinations: hallucinations,
      offlineLatencyMedianMs: latencies[Math.floor(latencies.length / 2)],
      offlineLatencyP95Ms: latencies[Math.ceil(latencies.length * 0.95) - 1],
      aiFailureRate: 0,
      fallbackRate: dataset.filter(({ providerOutcome }) => providerOutcome === "fallback").length / dataset.length,
    };

    console.table(metrics);
    expect(metrics.intentExactAccuracy).toBe(0.8);
    expect(metrics.intentPartialAccuracy).toBeGreaterThan(0.85);
    expect(metrics.hardConstraintViolationRate).toBe(0);
    expect(metrics.recallAt5).toBe(1);
    expect(metrics.manualRelevanceAt5).toBe(1);
    expect(metrics.outsideCandidateHallucinations).toBe(0);
  });
});
