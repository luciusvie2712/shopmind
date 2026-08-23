import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from '../products/catalog-state';
import type { SearchCandidateProductRecord } from './hybrid-search';

export interface VectorSearchCriteria {
  readonly embedding: readonly number[];
  readonly limit: number;
  readonly category?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly brand?: string;
  readonly brands?: readonly string[];
  readonly minRating?: number;
  readonly inStockOnly?: boolean;
  readonly requiredFeatures?: readonly string[];
}

export interface SemanticCandidate {
  readonly product: SearchCandidateProductRecord;
  readonly semanticSimilarity: number;
}

interface VectorSearchRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly brand: string | null;
  readonly price: Prisma.Decimal;
  readonly rating: Prisma.Decimal;
  readonly stock: number;
  readonly thumbnail: string | null;
  readonly categoryId: string;
  readonly categorySlug: string;
  readonly categoryName: string;
  readonly semanticSimilarity: number;
}

@Injectable()
export class VectorSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(criteria: VectorSearchCriteria): Promise<SemanticCandidate[]> {
    const vector = `[${criteria.embedding.join(',')}]`;
    const conditions: Prisma.Sql[] = [
      Prisma.sql`p.source_status = ${SOURCE_STATUS.active}`,
      ...(criteria.inStockOnly === false ? [] : [Prisma.sql`p.stock > 0`]),
      ...(criteria.category === undefined
        ? []
        : [Prisma.sql`c.slug = ${criteria.category}`]),
      ...(criteria.minPrice === undefined
        ? []
        : [Prisma.sql`p.price >= ${criteria.minPrice}`]),
      ...(criteria.maxPrice === undefined
        ? []
        : [Prisma.sql`p.price <= ${criteria.maxPrice}`]),
      ...(criteria.brand === undefined
        ? []
        : [Prisma.sql`LOWER(p.brand) = LOWER(${criteria.brand})`]),
      ...(criteria.brands === undefined || criteria.brands.length === 0
        ? []
        : [
            Prisma.sql`LOWER(p.brand) IN (${Prisma.join(
              criteria.brands.map((brand) => Prisma.sql`LOWER(${brand})`),
            )})`,
          ]),
      ...(criteria.minRating === undefined
        ? []
        : [Prisma.sql`p.rating >= ${criteria.minRating}`]),
      ...(criteria.requiredFeatures ?? []).map((feature) => {
        const featureContains = `%${feature.replace(/[\\%_]/g, '\\$&')}%`;
        return Prisma.sql`(
          p.title ILIKE ${featureContains} ESCAPE '\\'
          OR p.description ILIKE ${featureContains} ESCAPE '\\'
          OR COALESCE(p.brand, '') ILIKE ${featureContains} ESCAPE '\\'
        )`;
      }),
    ];

    const rows = await this.prisma.$queryRaw<VectorSearchRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.title,
        p.description,
        p.brand,
        p.price,
        p.rating,
        p.stock,
        p.thumbnail,
        c.id AS "categoryId",
        c.slug AS "categorySlug",
        c.name AS "categoryName",
        1 - (pe.embedding <=> ${vector}::vector) AS "semanticSimilarity"
      FROM product_embeddings pe
      INNER JOIN products p ON p.id = pe.product_id
      INNER JOIN categories c ON c.id = p.category_id
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY pe.embedding <=> ${vector}::vector, p.id ASC
      LIMIT ${criteria.limit}
    `);

    return rows.map((row) => ({
      product: {
        id: row.id,
        title: row.title,
        description: row.description,
        brand: row.brand,
        price: row.price,
        rating: row.rating,
        stock: row.stock,
        thumbnail: row.thumbnail,
        category: {
          id: row.categoryId,
          slug: row.categorySlug,
          name: row.categoryName,
        },
      },
      semanticSimilarity: row.semanticSimilarity,
    }));
  }
}
