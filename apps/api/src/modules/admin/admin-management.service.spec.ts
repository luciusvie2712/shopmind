import { PaymentStatus, ReviewSummaryStatus, Role } from '@prisma/client';
import type { QueueService } from '../../common/queue/queue.service';
import type { AdminManagementRepository } from './admin-management.repository';
import { AdminManagementService } from './admin-management.service';
import { AdminListQueryDto } from './dto/admin-list-query.dto';

describe(AdminManagementService.name, () => {
  const repository = {
    users: jest.fn(),
    orders: jest.fn(),
    payments: jest.fn(),
    products: jest.fn(),
    aiLogs: jest.fn(),
    ingestionStatus: jest.fn(),
  };
  const queues = { getOperationalSnapshot: jest.fn() };
  const service = new AdminManagementService(
    repository as unknown as AdminManagementRepository,
    queues as unknown as QueueService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('maps users without exposing persistence secrets and returns pagination', async () => {
    repository.users.mockResolvedValue({
      items: [
        {
          id: '85e7fc87-81dc-46a5-9d8b-3e426d9ea85a',
          email: 'admin@shopmind.test',
          name: 'Admin',
          role: Role.ADMIN,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          _count: { orders: 3, events: 12 },
        },
      ],
      total: 21,
      users: 21,
      admins: 1,
    });
    const query = Object.assign(new AdminListQueryDto(), {
      page: 2,
      pageSize: 20,
    });

    const result = await service.users(query);

    expect(result).toEqual({
      page: 2,
      pageSize: 20,
      total: 21,
      totalPages: 2,
      items: [
        {
          id: '85e7fc87-81dc-46a5-9d8b-3e426d9ea85a',
          email: 'admin@shopmind.test',
          name: 'Admin',
          role: 'ADMIN',
          createdAt: '2026-08-01T00:00:00.000Z',
          orderCount: 3,
          eventCount: 12,
        },
      ],
      summary: { users: 21, admins: 1 },
    });
    expect(result.items[0]).not.toHaveProperty('passwordHash');
  });

  it('maps payment totals from canonical decimal values', async () => {
    repository.payments.mockResolvedValue({
      items: [
        {
          id: '7d94b435-bdb7-4468-b45b-83cfb70d27af',
          orderId: '76eb2782-376c-4c3a-bbe1-5137db068091',
          status: PaymentStatus.SUCCEEDED,
          amount: { toString: () => '49.99' },
          currency: 'USD',
          provider: 'stripe',
          createdAt: new Date('2026-08-02T00:00:00.000Z'),
          updatedAt: new Date('2026-08-02T00:01:00.000Z'),
          user: { name: 'Buyer', email: 'buyer@shopmind.test' },
        },
      ],
      total: 1,
      payments: 1,
      succeeded: 1,
      failed: 0,
      succeededValue: { _sum: { amount: { toString: () => '49.99' } } },
    });

    const result = await service.payments(new AdminListQueryDto());

    expect(result.items[0]?.amount).toBe(49.99);
    expect(result.summary.succeededValue).toBe(49.99);
    expect(result.items[0]).not.toHaveProperty('providerPaymentId');
  });

  it('maps canonical product thumbnails for the admin catalog', async () => {
    repository.products.mockResolvedValue({
      items: [
        {
          id: '20000000-0000-4000-8000-000000000001',
          title: 'Visual product',
          source: 'dummyjson',
          externalId: '101',
          sourceStatus: 'ACTIVE',
          brand: 'ShopMind',
          thumbnail: 'https://cdn.dummyjson.com/product.png',
          price: { toString: () => '99.00' },
          rating: { toString: () => '4.80' },
          stock: 10,
          updatedAt: new Date('2026-08-29T00:00:00.000Z'),
          category: { name: 'Test products' },
          embedding: { productId: '20000000-0000-4000-8000-000000000001' },
          reviewSummary: { status: ReviewSummaryStatus.READY },
        },
      ],
      total: 1,
      products: 1,
      active: 1,
      outOfStock: 0,
      embedded: 1,
    });

    const result = await service.products(new AdminListQueryDto());

    expect(result.items[0]).toMatchObject({
      thumbnail: 'https://cdn.dummyjson.com/product.png',
      hasEmbedding: true,
      reviewSummaryStatus: 'READY',
    });
  });

  it('keeps catalog status available when Redis queue metrics fail', async () => {
    repository.ingestionStatus.mockResolvedValue({
      products: 10,
      active: 8,
      embedded: 7,
      latest: { _max: { updatedAt: new Date('2026-08-03T00:00:00.000Z') } },
      sources: [{ source: 'dummyjson', _count: { _all: 10 } }],
      reviewSummaries: [
        { status: ReviewSummaryStatus.READY, _count: { _all: 4 } },
      ],
    });
    queues.getOperationalSnapshot.mockRejectedValue(new Error('Redis down'));

    const result = await service.ingestionStatus();

    expect(result.catalog.sourceMissing).toBe(2);
    expect(result.catalog.lastProductUpdatedAt).toBe(
      '2026-08-03T00:00:00.000Z',
    );
    expect(result.jobs).toEqual({ available: false });
  });
});
