import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { SOURCE_STATUS } from '../products/catalog-state';
import { ProductSort } from '../products/dto/list-products-query.dto';
import type { ProductListResult } from '../products/product.repository';
import { toPagination } from '../products/product-query';
import type { ProductSearchCriteria } from './search-query';
import type {
  HybridSearchFilters,
  KeywordCandidate,
  SearchCandidateProductRecord,
} from './hybrid-search';

interface SearchProductRow {
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
}

interface KeywordCandidateRow extends SearchProductRow {
  readonly keywordRelevance: number;
}

interface KeywordCandidateCriteria extends HybridSearchFilters {
  readonly query: string;
  readonly limit: number;
}

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(criteria: ProductSearchCriteria): Promise<ProductListResult> {
    const conditions = this.conditions(criteria);
    const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const { skip, take } = toPagination(criteria);
    const orderBy = this.orderBy(criteria.sort);

    const [rows, counts] = await this.prisma.$transaction([
      this.prisma.$queryRaw<SearchProductRow[]>(Prisma.sql`
        SELECT
          p.id, p.title, p.description, p.brand, p.price, p.rating, p.stock, p.thumbnail,
          c.id AS "categoryId", c.slug AS "categorySlug", c.name AS "categoryName"
        FROM products p
        INNER JOIN categories c ON c.id = p.category_id
        ${where}
        ORDER BY ${orderBy}
        LIMIT ${take} OFFSET ${skip}
      `),
      this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM products p
        INNER JOIN categories c ON c.id = p.category_id
        ${where}
      `),
    ]);

    return {
      products: rows.map((row) => this.toRecord(row)),
      total: Number(counts[0]?.count ?? 0),
    };
  }

  async searchCandidates(
    criteria: KeywordCandidateCriteria,
  ): Promise<KeywordCandidate[]> {
    const conditions = this.conditions(criteria);
    const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const escaped = criteria.query.replace(/[\\%_]/g, '\\$&');
    const contains = `%${escaped}%`;
    const rows = await this.prisma.$queryRaw<KeywordCandidateRow[]>(Prisma.sql`
      SELECT
        p.id, p.title, p.description, p.brand, p.price, p.rating, p.stock, p.thumbnail,
        c.id AS "categoryId", c.slug AS "categorySlug", c.name AS "categoryName",
        GREATEST(
          similarity(LOWER(p.title), LOWER(${criteria.query})),
          similarity(LOWER(p.description), LOWER(${criteria.query})),
          similarity(LOWER(COALESCE(p.brand, '')), LOWER(${criteria.query})),
          CASE WHEN p.title ILIKE ${contains} ESCAPE '\\' THEN 1 ELSE 0 END,
          CASE WHEN p.description ILIKE ${contains} ESCAPE '\\' THEN 1 ELSE 0 END,
          CASE WHEN COALESCE(p.brand, '') ILIKE ${contains} ESCAPE '\\' THEN 1 ELSE 0 END
        )::double precision AS "keywordRelevance"
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY "keywordRelevance" DESC, p.id ASC
      LIMIT ${criteria.limit}
    `);

    return rows.map((row) => ({
      product: this.toRecord(row),
      keywordRelevance: row.keywordRelevance,
    }));
  }

  private conditions(
    criteria: HybridSearchFilters & { readonly query: string },
  ): Prisma.Sql[] {
    const escaped = criteria.query.replace(/[\\%_]/g, '\\$&');
    const contains = `%${escaped}%`;
    return [
      Prisma.sql`p.source_status = ${SOURCE_STATUS.active}`,
      Prisma.sql`(
        p.title ILIKE ${contains} ESCAPE '\\'
        OR p.description ILIKE ${contains} ESCAPE '\\'
        OR COALESCE(p.brand, '') ILIKE ${contains} ESCAPE '\\'
        OR p.title % ${criteria.query}
      )`,
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
      ...(criteria.inStockOnly === true ? [Prisma.sql`p.stock > 0`] : []),
      ...(criteria.requiredFeatures ?? []).map((feature) => {
        const featureContains = `%${feature.replace(/[\\%_]/g, '\\$&')}%`;
        return Prisma.sql`(
          p.title ILIKE ${featureContains} ESCAPE '\\'
          OR p.description ILIKE ${featureContains} ESCAPE '\\'
          OR COALESCE(p.brand, '') ILIKE ${featureContains} ESCAPE '\\'
        )`;
      }),
    ];
  }

  private orderBy(sort: ProductSort): Prisma.Sql {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        return Prisma.sql`p.price ASC, p.id ASC`;
      case ProductSort.PRICE_DESC:
        return Prisma.sql`p.price DESC, p.id ASC`;
      case ProductSort.RATING_ASC:
        return Prisma.sql`p.rating ASC, p.id ASC`;
      case ProductSort.RATING_DESC:
        return Prisma.sql`p.rating DESC, p.id ASC`;
    }
  }

  private toRecord(row: SearchProductRow): SearchCandidateProductRecord {
    return {
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
    };
  }
}
