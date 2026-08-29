import { IngestionService } from './ingestion.service';

describe('IngestionService catalog bootstrap', () => {
  function setup(hasProducts: boolean) {
    const productImportRepository = {
      hasProducts: jest.fn().mockResolvedValue(hasProducts),
      importProducts: jest.fn().mockResolvedValue({
        summary: {
          received: 0,
          created: 0,
          updated: 0,
          unchanged: 0,
          sourceMissing: 0,
        },
        affectedProductIds: [],
        embeddingJobs: [],
      }),
    };
    const service = new IngestionService(
      {
        fetchPage: jest.fn().mockResolvedValue({
          products: [],
          complete: true,
        }),
      },
      productImportRepository as never,
      { invalidateCatalog: jest.fn() } as never,
      { enqueueEmbedProduct: jest.fn() } as never,
    );
    return { productImportRepository, service };
  }

  it('skips external ingestion when canonical products already exist', async () => {
    const { productImportRepository, service } = setup(true);

    await expect(service.bootstrapCatalog()).resolves.toEqual({
      status: 'skipped',
    });
    expect(productImportRepository.importProducts).not.toHaveBeenCalled();
  });

  it('imports through the normal ingestion pipeline when catalog is empty', async () => {
    const { productImportRepository, service } = setup(false);

    await expect(service.bootstrapCatalog()).resolves.toEqual({
      status: 'imported',
      summary: {
        received: 0,
        created: 0,
        updated: 0,
        unchanged: 0,
        sourceMissing: 0,
      },
    });
    expect(productImportRepository.importProducts).toHaveBeenCalledWith([]);
  });

  it('forces a full sync even when a partial catalog already exists', async () => {
    const { productImportRepository, service } = setup(true);

    await expect(
      service.bootstrapCatalog({ force: true }),
    ).resolves.toMatchObject({
      status: 'imported',
    });
    expect(productImportRepository.hasProducts).not.toHaveBeenCalled();
    expect(productImportRepository.importProducts).toHaveBeenCalledWith([]);
  });
});
