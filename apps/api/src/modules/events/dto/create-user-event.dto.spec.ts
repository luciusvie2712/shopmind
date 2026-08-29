import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserEventDto } from './create-user-event.dto';

describe('CreateUserEventDto', () => {
  it('accepts a bounded allowlisted event', async () => {
    const dto = plainToInstance(CreateUserEventDto, {
      eventId: '0f5c3dd3-04f0-48f6-b9d5-d13a378b8b3d',
      type: 'PRODUCT_VIEW',
      productId: 'd27bfc23-5f1a-4cba-aa05-d5becf66d837',
      metadata: { surface: 'product_detail', position: 0 },
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    { type: 'UNKNOWN' },
    { eventId: 'not-a-uuid' },
    { metadata: { queryHash: 'raw customer query' } },
    { metadata: { surface: 'x'.repeat(65) } },
  ])('rejects invalid input %#', async (override) => {
    const dto = plainToInstance(CreateUserEventDto, {
      eventId: '0f5c3dd3-04f0-48f6-b9d5-d13a378b8b3d',
      type: 'PRODUCT_VIEW',
      ...override,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
