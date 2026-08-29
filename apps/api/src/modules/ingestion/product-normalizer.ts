import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { humanizeSlug, toSlug } from '../../common/text/slug';
import { type DummyJsonProduct } from './dummy-json.schema';
import {
  canonicalEmbeddingTags,
  selectEmbeddingMetadata,
} from './embedding-text.builder';

export const DUMMYJSON_SOURCE = 'dummyjson';

export interface NormalizedProductReview {
  readonly rating: number;
  readonly comment: string;
  readonly reviewerName: string;
  readonly reviewedAt: Date;
}

export interface NormalizedProduct {
  readonly source: string;
  readonly externalId: string;
  readonly category: { readonly slug: string; readonly name: string };
  readonly title: string;
  readonly description: string;
  readonly brand: string | null;
  readonly price: number;
  readonly rating: number;
  readonly stock: number;
  readonly thumbnail: string | null;
  readonly metadata: Prisma.InputJsonObject;
  readonly contentHash: string;
  readonly images: readonly string[];
  readonly reviews: readonly NormalizedProductReview[];
}

export interface CanonicalProductContent {
  readonly title: string;
  readonly brand: string | null;
  readonly category: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly price: number;
  readonly keyAttributes: Readonly<Record<string, unknown>>;
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizedMetadata(product: DummyJsonProduct): Prisma.InputJsonObject {
  return {
    tags: product.tags,
    ...(product.sku === undefined ? {} : { sku: product.sku }),
    ...(product.weight === undefined ? {} : { weight: product.weight }),
    ...(product.dimensions === undefined
      ? {}
      : {
          dimensions: {
            width: product.dimensions.width,
            height: product.dimensions.height,
            depth: product.dimensions.depth,
          },
        }),
    ...(product.warrantyInformation === undefined
      ? {}
      : { warrantyInformation: product.warrantyInformation }),
    ...(product.shippingInformation === undefined
      ? {}
      : { shippingInformation: product.shippingInformation }),
    ...(product.availabilityStatus === undefined
      ? {}
      : { availabilityStatus: product.availabilityStatus }),
    ...(product.returnPolicy === undefined
      ? {}
      : { returnPolicy: product.returnPolicy }),
    ...(product.minimumOrderQuantity === undefined
      ? {}
      : { minimumOrderQuantity: product.minimumOrderQuantity }),
  };
}

export function buildCanonicalProductContent(
  product: Omit<NormalizedProduct, 'contentHash' | 'images' | 'reviews'>,
): CanonicalProductContent {
  return {
    title: product.title,
    brand: product.brand,
    category: product.category.name,
    description: product.description,
    tags: canonicalEmbeddingTags(product.metadata),
    price: product.price,
    keyAttributes: selectEmbeddingMetadata(product.metadata),
  };
}

export function computeContentHash(content: CanonicalProductContent): string {
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

export function normalizeDummyJsonProduct(
  product: DummyJsonProduct,
): NormalizedProduct {
  const categorySlug = toSlug(product.category);
  const metadata = normalizedMetadata(product);
  const normalizedWithoutRelations = {
    source: DUMMYJSON_SOURCE,
    externalId: String(product.id),
    category: {
      slug: categorySlug,
      name: humanizeSlug(categorySlug),
    },
    title: product.title.trim(),
    description: product.description.trim(),
    brand: product.brand?.trim() ?? null,
    price: roundToTwoDecimals(product.price),
    rating: roundToTwoDecimals(product.rating),
    stock: product.stock,
    thumbnail: product.thumbnail ?? null,
    metadata,
  } as const;

  return {
    ...normalizedWithoutRelations,
    contentHash: computeContentHash(
      buildCanonicalProductContent(normalizedWithoutRelations),
    ),
    images: [...new Set(product.images)],
    reviews: product.reviews.map((review) => ({
      rating: roundToTwoDecimals(review.rating),
      comment: review.comment.trim(),
      reviewerName: review.reviewerName.trim(),
      reviewedAt: new Date(review.date),
    })),
  };
}
