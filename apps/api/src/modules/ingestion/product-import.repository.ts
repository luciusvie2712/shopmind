import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { type EmbedProductJobData } from '../../common/queue/queue.constants';
import { DUMMYJSON_SOURCE, type NormalizedProduct } from './product-normalizer';
import { SOURCE_STATUS } from '../products/catalog-state';

export interface ProductImportSummary {
  readonly received: number;
  readonly created: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly sourceMissing: number;
}

export interface ProductImportResult {
  readonly summary: ProductImportSummary;
  readonly affectedProductIds: readonly string[];
  readonly embeddingJobs: readonly EmbedProductJobData[];
}

@Injectable()
export class ProductImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hasProducts(): Promise<boolean> {
    const product = await this.prisma.product.findFirst({
      select: { id: true },
    });
    return product !== null;
  }

  async importProducts(
    products: readonly NormalizedProduct[],
  ): Promise<ProductImportResult> {
    const categories = new Map(
      products.map(({ category }) => [category.slug, category]),
    );
    const categoryIds = new Map<string, string>();
    for (const category of categories.values()) {
      const persisted = await this.prisma.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: { name: category.name },
        select: { id: true },
      });
      categoryIds.set(category.slug, persisted.id);
    }

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    const affectedProductIds = new Set<string>();
    const embeddingJobs: EmbedProductJobData[] = [];

    for (const product of products) {
      const categoryId = categoryIds.get(product.category.slug);
      if (categoryId === undefined) {
        throw new Error('Canonical category was not persisted');
      }
      const result = await this.importProduct(product, categoryId);
      if (result.change === 'created') created += 1;
      else if (result.change === 'updated') updated += 1;
      else unchanged += 1;
      affectedProductIds.add(result.productId);
      if (result.needsEmbedding) {
        embeddingJobs.push({
          productId: result.productId,
          contentHash: product.contentHash,
        });
      }
    }

    // Never mark source absence after an incomplete import. Earlier product
    // commits remain recoverable through a full idempotent sync.
    const externalIds = products.map((product) => product.externalId);
    const missingProducts = await this.prisma.product.findMany({
      where: {
        source: DUMMYJSON_SOURCE,
        sourceStatus: SOURCE_STATUS.active,
        ...(externalIds.length > 0
          ? { externalId: { notIn: externalIds } }
          : {}),
      },
      select: { id: true },
    });
    if (missingProducts.length > 0) {
      await this.prisma.product.updateMany({
        where: { id: { in: missingProducts.map(({ id }) => id) } },
        data: { sourceStatus: SOURCE_STATUS.missing },
      });
      missingProducts.forEach(({ id }) => affectedProductIds.add(id));
    }

    return {
      summary: {
        received: products.length,
        created,
        updated,
        unchanged,
        sourceMissing: missingProducts.length,
      },
      affectedProductIds: [...affectedProductIds],
      embeddingJobs,
    };
  }

  private importProduct(product: NormalizedProduct, categoryId: string) {
    return this.prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.product.findUnique({
          where: {
            source_externalId: {
              source: product.source,
              externalId: product.externalId,
            },
          },
          select: {
            id: true,
            contentHash: true,
            embedding: { select: { contentHash: true } },
          },
        });
        const productData = this.toProductData(product, categoryId);
        const persisted =
          existing === null
            ? await transaction.product.create({ data: productData })
            : await transaction.product.update({
                where: { id: existing.id },
                data: productData,
              });

        await transaction.productImage.deleteMany({
          where: { productId: persisted.id },
        });
        if (product.images.length > 0) {
          await transaction.productImage.createMany({
            data: product.images.map((url, sortOrder) => ({
              productId: persisted.id,
              url,
              sortOrder,
            })),
          });
        }

        await transaction.productReview.deleteMany({
          where: { productId: persisted.id },
        });
        if (product.reviews.length > 0) {
          await transaction.productReview.createMany({
            data: product.reviews.map((review) => ({
              productId: persisted.id,
              rating: review.rating,
              comment: review.comment,
              reviewerName: review.reviewerName,
              reviewedAt: review.reviewedAt,
            })),
          });
        }

        return {
          productId: persisted.id,
          change:
            existing === null
              ? 'created'
              : existing.contentHash === product.contentHash
                ? 'unchanged'
                : 'updated',
          needsEmbedding:
            existing === null ||
            existing.contentHash !== product.contentHash ||
            existing.embedding?.contentHash !== product.contentHash,
        };
      },
      // Guardrails for one product's DB writes, never a catalog-wide timeout.
      { maxWait: 5_000, timeout: 10_000 },
    );
  }

  private toProductData(
    product: NormalizedProduct,
    categoryId: string,
  ): Prisma.ProductUncheckedCreateInput {
    return {
      source: product.source,
      externalId: product.externalId,
      categoryId,
      title: product.title,
      description: product.description,
      brand: product.brand,
      price: product.price,
      rating: product.rating,
      stock: product.stock,
      thumbnail: product.thumbnail,
      metadata: product.metadata,
      contentHash: product.contentHash,
      sourceStatus: SOURCE_STATUS.active,
    };
  }
}
