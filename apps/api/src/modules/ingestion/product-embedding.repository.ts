import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from '../products/catalog-state';

export interface CanonicalEmbeddingProduct {
  readonly id: string;
  readonly contentHash: string;
  readonly title: string;
  readonly brand: string | null;
  readonly category: string;
  readonly description: string;
  readonly price: number;
  readonly metadata: Prisma.JsonValue;
}

@Injectable()
export class ProductEmbeddingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCanonicalProduct(
    productId: string,
  ): Promise<CanonicalEmbeddingProduct | null> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sourceStatus: SOURCE_STATUS.active },
      select: {
        id: true,
        contentHash: true,
        title: true,
        brand: true,
        description: true,
        price: true,
        metadata: true,
        category: { select: { name: true } },
      },
    });
    return product === null
      ? null
      : {
          id: product.id,
          contentHash: product.contentHash,
          title: product.title,
          brand: product.brand,
          category: product.category.name,
          description: product.description,
          price: product.price.toNumber(),
          metadata: product.metadata,
        };
  }

  async upsertEmbedding(input: {
    readonly productId: string;
    readonly vector: readonly number[];
    readonly model: string;
    readonly contentHash: string;
  }): Promise<void> {
    const vector = `[${input.vector.join(',')}]`;
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO product_embeddings (
        product_id, embedding, model, content_hash, updated_at
      ) VALUES (
        ${input.productId}::uuid,
        ${vector}::vector,
        ${input.model},
        ${input.contentHash},
        NOW()
      )
      ON CONFLICT (product_id) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        model = EXCLUDED.model,
        content_hash = EXCLUDED.content_hash,
        updated_at = NOW()
    `);
  }
}
