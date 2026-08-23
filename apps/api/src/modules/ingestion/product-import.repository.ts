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

  importProducts(
    products: readonly NormalizedProduct[],
  ): Promise<ProductImportResult> {
    return this.prisma.$transaction(async (transaction) => {
      let created = 0;
      let updated = 0;
      let unchanged = 0;
      const affectedProductIds = new Set<string>();
      const embeddingJobs: EmbedProductJobData[] = [];

      for (const product of products) {
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
        const category = await transaction.category.upsert({
          where: { slug: product.category.slug },
          create: product.category,
          update: { name: product.category.name },
          select: { id: true },
        });
        const productData = this.toProductData(product, category.id);
        const persisted =
          existing === null
            ? await transaction.product.create({ data: productData })
            : await transaction.product.update({
                where: { id: existing.id },
                data: productData,
              });

        if (existing === null) {
          created += 1;
        } else if (existing.contentHash === product.contentHash) {
          unchanged += 1;
        } else {
          updated += 1;
        }

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

        affectedProductIds.add(persisted.id);
        if (
          existing === null ||
          existing.contentHash !== product.contentHash ||
          existing.embedding?.contentHash !== product.contentHash
        ) {
          embeddingJobs.push({
            productId: persisted.id,
            contentHash: product.contentHash,
          });
        }
      }

      const externalIds = products.map((product) => product.externalId);
      const missingProducts = await transaction.product.findMany({
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
        await transaction.product.updateMany({
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
    });
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
