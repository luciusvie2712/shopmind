import type { ProductSummaryContract } from '@shopmind/contracts';
import type {
  ProductDetailRecord,
  ProductSummaryRecord,
} from './product.repository';

export function toProductSummaryContract(
  product: ProductSummaryRecord,
): ProductSummaryContract {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand,
    price: Number(product.price),
    rating: Number(product.rating),
    stock: product.stock,
    thumbnail: product.thumbnail,
    category: product.category,
  };
}

export function toProductDetailContract(product: ProductDetailRecord) {
  return {
    ...toProductSummaryContract(product),
    description: product.description,
    metadata: product.metadata as Record<string, unknown>,
    images: product.images.map(({ url, sortOrder }) => ({ url, sortOrder })),
    reviews: product.reviews.map((review) => ({
      rating: Number(review.rating),
      comment: review.comment,
      reviewerName: review.reviewerName,
      reviewedAt: review.reviewedAt.toISOString(),
    })),
    updatedAt: product.updatedAt.toISOString(),
  };
}
