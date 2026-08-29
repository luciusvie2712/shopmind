import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminListQueryDto } from './admin-list-query.dto';

describe(AdminListQueryDto.name, () => {
  it('coerces valid pagination values', async () => {
    const dto = plainToInstance(AdminListQueryDto, {
      page: '2',
      pageSize: '50',
      search: 'admin@example.com',
      status: 'ADMIN',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(50);
  });

  it('rejects unbounded pagination and oversized filters', async () => {
    const dto = plainToInstance(AdminListQueryDto, {
      page: '0',
      pageSize: '500',
      search: 'x'.repeat(101),
      status: 'x'.repeat(51),
    });

    expect(await validate(dto)).toHaveLength(4);
  });
});
