import { BadRequestException } from '@nestjs/common';
import { UserEventType } from '@prisma/client';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

describe('EventsService', () => {
  const productExists = jest.fn<Promise<boolean>, [string]>();
  const append = jest.fn();
  const repository = { productExists, append } as unknown as EventsRepository;
  const service = new EventsService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('uses only the server-resolved user identity', async () => {
    productExists.mockResolvedValue(true);
    append.mockResolvedValue('recorded');
    await expect(
      service.record(
        {
          eventId: '0f5c3dd3-04f0-48f6-b9d5-d13a378b8b3d',
          type: UserEventType.PRODUCT_VIEW,
          productId: 'd27bfc23-5f1a-4cba-aa05-d5becf66d837',
          metadata: { surface: 'product_detail' },
        },
        { userId: 'server-user', requestId: 'req-1' },
      ),
    ).resolves.toEqual({
      eventId: '0f5c3dd3-04f0-48f6-b9d5-d13a378b8b3d',
      status: 'recorded',
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'server-user', requestId: 'req-1' }),
    );
  });

  it('rejects an unknown canonical product', async () => {
    productExists.mockResolvedValue(false);
    await expect(
      service.record(
        {
          eventId: '0f5c3dd3-04f0-48f6-b9d5-d13a378b8b3d',
          type: UserEventType.ADD_TO_CART,
          productId: 'd27bfc23-5f1a-4cba-aa05-d5becf66d837',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(append).not.toHaveBeenCalled();
  });

  it('returns duplicate without creating a second logical event', async () => {
    append.mockResolvedValue('duplicate');
    await expect(
      service.record(
        {
          eventId: '0f5c3dd3-04f0-48f6-b9d5-d13a378b8b3d',
          type: UserEventType.SEARCH_RESULT_CLICK,
        },
        {},
      ),
    ).resolves.toEqual({
      eventId: '0f5c3dd3-04f0-48f6-b9d5-d13a378b8b3d',
      status: 'duplicate',
    });
  });
});
