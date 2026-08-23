import type {
  ComparisonAttributeValue,
  ComparisonProductContract,
  ProductDetailContract,
  ProductSummaryContract,
} from '@shopmind/contracts';
import { AI_TOOL_LIMITS } from './tool-contract';

export function productSummaryFromDetail(
  product: ProductDetailContract,
): ProductSummaryContract {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand,
    price: product.price,
    rating: product.rating,
    stock: product.stock,
    thumbnail: product.thumbnail,
    category: product.category,
  };
}

export function boundedProductDetail(product: ProductDetailContract) {
  return {
    ...productSummaryFromDetail(product),
    description: product.description.slice(
      0,
      AI_TOOL_LIMITS.detailDescriptionLength,
    ),
    attributes: boundedAttributes(product.metadata),
    images: product.images.slice(0, AI_TOOL_LIMITS.detailImages),
    reviews: product.reviews
      .slice(0, AI_TOOL_LIMITS.detailReviews)
      .map((review) => ({
        rating: review.rating,
        comment: review.comment.slice(0, AI_TOOL_LIMITS.metadataStringLength),
        reviewerName: review.reviewerName.slice(
          0,
          AI_TOOL_LIMITS.metadataStringLength,
        ),
        reviewedAt: review.reviewedAt,
      })),
    updatedAt: product.updatedAt,
  };
}

export function comparisonProduct(
  product: ProductDetailContract,
): ComparisonProductContract {
  return {
    ...productSummaryFromDetail(product),
    attributes: boundedAttributes(product.metadata),
  };
}

function boundedAttributes(
  metadata: Readonly<Record<string, unknown>>,
): Readonly<Record<string, ComparisonAttributeValue>> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter((entry): entry is [string, ComparisonAttributeValue] =>
        isAttributeValue(entry[1]),
      )
      .slice(0, AI_TOOL_LIMITS.metadataAttributes)
      .map(([key, value]) => [
        key.slice(0, 100),
        typeof value === 'string'
          ? value.slice(0, AI_TOOL_LIMITS.metadataStringLength)
          : value,
      ]),
  );
}

function isAttributeValue(value: unknown): value is ComparisonAttributeValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}
