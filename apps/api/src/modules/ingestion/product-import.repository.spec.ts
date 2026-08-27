import { type Prisma } from '@prisma/client';
import { type PrismaService } from '../../common/database/prisma.service';
import { ProductImportRepository } from './product-import.repository';
import { type NormalizedProduct } from './product-normalizer';

function product(externalId: string): NormalizedProduct {
  return {
    source: 'dummyjson',
    externalId,
    category: { slug: 'laptops', name: 'Laptops' },
    title: 'Canonical laptop',
    description: 'Description',
    brand: null,
    price: 100,
    rating: 4,
    stock: 1,
    thumbnail: null,
    metadata: {},
    contentHash: 'a'.repeat(64),
    images: ['https://example.com/image.jpg'],
    reviews: [
      {
        rating: 4,
        comment: 'Review',
        reviewerName: 'Fixture',
        reviewedAt: new Date('2026-01-01'),
      },
    ],
  };
}

describe('ProductImportRepository transaction boundaries', () => {
  function setup() {
    const transactions: Array<ReturnType<typeof transactionClient>> = [];
    function transactionClient(index: number) {
      return {
        product: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest
            .fn<
              Promise<{ id: string }>,
              [{ data: Prisma.ProductUncheckedCreateInput }]
            >()
            .mockResolvedValue({ id: `product-${index}` }),
        },
        productImage: { deleteMany: jest.fn(), createMany: jest.fn() },
        productReview: { deleteMany: jest.fn(), createMany: jest.fn() },
      };
    }
    const prisma = {
      category: {
        upsert: jest.fn().mockResolvedValue({ id: 'canonical-category' }),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(
        async (
          callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
        ) => {
          const transaction = transactionClient(transactions.length);
          transactions.push(transaction);
          return callback(transaction as unknown as Prisma.TransactionClient);
        },
      ),
    };
    return {
      prisma,
      transactions,
      repository: new ProductImportRepository(
        prisma as unknown as PrismaService,
      ),
    };
  }

  it('upserts each category once outside one bounded transaction per product', async () => {
    const { repository, prisma, transactions } = setup();
    const result = await repository.importProducts([
      product('1'),
      product('2'),
    ]);
    expect(prisma.category.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.category.upsert.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.$transaction.mock.invocationCallOrder[0],
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 5_000,
      timeout: 10_000,
    });
    for (const transaction of transactions) {
      expect(transaction.product.findUnique).toHaveBeenCalledTimes(1);
      expect(transaction.product.create.mock.calls[0][0].data.categoryId).toBe(
        'canonical-category',
      );
      expect(transaction.productImage.createMany).toHaveBeenCalledTimes(1);
      expect(transaction.productReview.createMany).toHaveBeenCalledTimes(1);
    }
    expect(prisma.product.findMany.mock.invocationCallOrder[0]).toBeGreaterThan(
      prisma.$transaction.mock.invocationCallOrder[1],
    );
    expect(result.summary).toEqual({
      received: 2,
      created: 2,
      updated: 0,
      unchanged: 0,
      sourceMissing: 0,
    });
    expect(result.embeddingJobs).toHaveLength(2);
  });

  it('does not mark missing when a product transaction fails', async () => {
    const { repository, prisma } = setup();
    prisma.$transaction.mockRejectedValueOnce(new Error('Transaction failed'));
    await expect(repository.importProducts([product('1')])).rejects.toThrow(
      'Transaction failed',
    );
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.product.updateMany).not.toHaveBeenCalled();
  });
});
