import { type INestApplication, type LoggerService } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { performance } from "node:perf_hooks";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/database/prisma.service";
import { configureHttpApplication } from "../src/common/http/configure-http-application";

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

function percentile(values: readonly number[], value: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * value) - 1] ?? 0;
}

describe("Phase 11 catalog performance checks", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureHttpApplication(app, silentLogger);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
    const category = await prisma.category.create({
      data: { slug: "phase11-performance", name: "Phase 11 Performance" },
    });
    const products = await Promise.all(
      Array.from({ length: 60 }, (_, index) =>
        prisma.product.create({
          data: {
            source: "phase11-performance",
            externalId: String(index + 1),
            categoryId: category.id,
            title: `Performance Laptop ${index + 1}`,
            description: "Performance fixture portable development laptop",
            brand: index % 2 === 0 ? "Acme" : "ShopMind Test",
            price: 500 + index,
            rating: 4 + (index % 10) / 10,
            stock: 10,
            contentHash: String(index + 1).padStart(64, "0"),
          },
        }),
      ),
    );
    productId = products[0].id;
  });

  afterAll(async () => {
    if (prisma) await cleanup();
    if (app) await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.product.deleteMany({ where: { source: "phase11-performance" } });
    await prisma.category.deleteMany({ where: { slug: "phase11-performance" } });
  }

  it("keeps warmed catalog routes below the 500ms p95 target", async () => {
    const routes = [
      "/api/v1/products?category=phase11-performance&sort=price_asc",
      "/api/v1/search?q=Performance&category=phase11-performance",
      `/api/v1/products/${productId}`,
    ];
    const report: Record<string, number> = {};

    for (const route of routes) {
      await request(app.getHttpServer()).get(route).expect(200);
      const samples: number[] = [];
      for (let index = 0; index < 30; index += 1) {
        const startedAt = performance.now();
        await request(app.getHttpServer()).get(route).expect(200);
        samples.push(performance.now() - startedAt);
      }
      report[route] = percentile(samples, 0.95);
    }

    console.table(report);
    expect(Math.max(...Object.values(report))).toBeLessThan(500);
  });

  it("inspects representative plans and source-required indexes", async () => {
    const plans = await Promise.all([
      prisma.$queryRaw(Prisma.sql`EXPLAIN (ANALYZE, FORMAT JSON)
        SELECT id FROM products
        WHERE category_id = (SELECT id FROM categories WHERE slug = ${"phase11-performance"})
          AND price BETWEEN ${500} AND ${560}
          AND rating >= ${4}
          AND brand = ${"Acme"}
        ORDER BY rating DESC LIMIT 20`),
      prisma.$queryRaw(Prisma.sql`EXPLAIN (ANALYZE, FORMAT JSON)
        SELECT id FROM products
        WHERE title ILIKE ${"%Performance%"}
        ORDER BY id LIMIT 20`),
      prisma.$queryRaw(Prisma.sql`EXPLAIN (ANALYZE, FORMAT JSON)
        SELECT id FROM orders
        WHERE user_id = ${"00000000-0000-4000-8000-000000000001"}::uuid
        ORDER BY created_at DESC LIMIT 20`),
    ]);
    const indexes = await prisma.$queryRaw<{ indexname: string }[]>(Prisma.sql`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname IN (
        'idx_products_category', 'idx_products_price', 'idx_products_rating',
        'idx_products_brand', 'idx_products_title_trgm', 'idx_orders_user_created'
      )
      ORDER BY indexname
    `);

    expect(plans.every((plan) => Array.isArray(plan) && plan.length > 0)).toBe(true);
    expect(indexes.map(({ indexname }) => indexname)).toEqual([
      "idx_orders_user_created",
      "idx_products_brand",
      "idx_products_category",
      "idx_products_price",
      "idx_products_rating",
      "idx_products_title_trgm",
    ]);
  });
});
