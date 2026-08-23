import { type Prisma } from '@prisma/client';

export interface EmbeddingProductContent {
  readonly title: string;
  readonly brand: string | null;
  readonly category: string;
  readonly description: string;
  readonly price: number;
  readonly metadata: Prisma.JsonValue;
}

const EMBEDDING_METADATA_KEYS = [
  'availabilityStatus',
  'dimensions',
  'minimumOrderQuantity',
  'returnPolicy',
  'shippingInformation',
  'warrantyInformation',
  'weight',
] as const;

export function buildEmbeddingText(product: EmbeddingProductContent): string {
  const tags = canonicalEmbeddingTags(product.metadata);
  const keyAttributes = selectEmbeddingMetadata(product.metadata);

  return [
    `Title: ${product.title.trim()}`,
    `Brand: ${product.brand?.trim() || 'Unbranded'}`,
    `Category: ${product.category.trim()}`,
    `Description: ${product.description.trim()}`,
    `Tags: ${tags.join(', ') || 'None'}`,
    `Price band: ${priceBand(product.price)}`,
    `Key attributes: ${JSON.stringify(keyAttributes)}`,
  ].join('\n');
}

export function canonicalEmbeddingTags(metadata: unknown): string[] {
  const tags = asRecord(metadata).tags;
  return Array.isArray(tags)
    ? [...new Set(tags.filter(isString).map((tag) => tag.trim()))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))
    : [];
}

export function selectEmbeddingMetadata(
  metadata: unknown,
): Readonly<Record<string, unknown>> {
  const record = asRecord(metadata);
  return Object.fromEntries(
    EMBEDDING_METADATA_KEYS.flatMap((key) => {
      const value = record[key];
      return value === undefined ? [] : [[key, sortJson(value)]];
    }),
  );
}

export function priceBand(price: number): string {
  if (price < 50) return 'budget';
  if (price < 200) return 'value';
  if (price < 500) return 'mid-range';
  return 'premium';
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, unknown] => entry[1] !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJson(item)]),
  );
}
