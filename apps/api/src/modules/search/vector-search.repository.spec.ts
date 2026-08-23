import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { VectorSearchRepository } from './vector-search.repository';

describe('VectorSearchRepository SQL safety', () => {
  it('keeps runtime filter and vector values parameterized', async () => {
    const queryRaw = jest
      .fn<Promise<unknown[]>, [query: Prisma.Sql]>()
      .mockResolvedValue([]);
    const repository = new VectorSearchRepository({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);
    const maliciousCategory = "laptops' OR TRUE --";
    const maliciousFeature = "%' OR TRUE --";
    await repository.search({
      embedding: Array.from({ length: 768 }, () => 0),
      category: maliciousCategory,
      requiredFeatures: [maliciousFeature],
      limit: 10,
    });

    expect(queryRaw).toHaveBeenCalledTimes(1);
    const sql = queryRaw.mock.calls[0][0];
    const statement = sql.strings.join('');
    expect(statement).not.toContain(maliciousCategory);
    expect(statement).not.toContain(maliciousFeature);
    expect(sql.values).toEqual(
      expect.arrayContaining([
        maliciousCategory,
        expect.stringContaining('OR TRUE --'),
      ]),
    );
  });
});
