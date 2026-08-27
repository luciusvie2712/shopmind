import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { bootstrapCatalogCli } from './catalog-bootstrap';
import { StructuredLogger } from './common/logging/structured-logger';

jest.mock('./app.module', () => ({ AppModule: class {} }));

describe('catalog bootstrap CLI', () => {
  const summary = {
    received: 2,
    created: 2,
    updated: 0,
    unchanged: 0,
    sourceMissing: 0,
  };
  const bootstrapCatalog = jest.fn();
  const close = jest.fn();
  let log: jest.SpyInstance;
  let errorLog: jest.SpyInstance;
  let createApplication: jest.SpyInstance;
  let previousExitCode: typeof process.exitCode;

  beforeEach(() => {
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
    bootstrapCatalog
      .mockReset()
      .mockResolvedValue({ status: 'imported', summary });
    close.mockReset().mockResolvedValue(undefined);
    createApplication = jest
      .spyOn(NestFactory, 'createApplicationContext')
      .mockResolvedValue({
        get: () => ({ bootstrapCatalog }),
        close,
      } as unknown as INestApplicationContext);
    log = jest
      .spyOn(StructuredLogger.prototype, 'log')
      .mockImplementation(() => undefined);
    errorLog = jest
      .spyOn(StructuredLogger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
    jest.restoreAllMocks();
  });

  it('runs forced sync by default and logs started/imported', async () => {
    await bootstrapCatalogCli([]);
    expect(bootstrapCatalog).toHaveBeenCalledWith({ force: true });
    expect(log).toHaveBeenCalledWith({
      operation: 'catalog_bootstrap_cli',
      status: 'started',
      force: true,
    });
    expect(log).toHaveBeenCalledWith({
      operation: 'catalog_bootstrap_cli',
      status: 'imported',
      summary,
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();
  });

  it('preserves optional empty-only startup and logs skipped', async () => {
    bootstrapCatalog.mockResolvedValue({ status: 'skipped' });
    await bootstrapCatalogCli(['--if-empty']);
    expect(bootstrapCatalog).toHaveBeenCalledWith({ force: false });
    expect(log).toHaveBeenCalledWith({
      operation: 'catalog_bootstrap_cli',
      status: 'skipped',
    });
  });

  it.each(['startup', 'import', 'shutdown'])(
    'exits non-zero on %s failure without leaking error details',
    async (stage) => {
      const error = new Error('postgresql://private:secret@database/catalog');
      if (stage === 'startup') createApplication.mockRejectedValue(error);
      else if (stage === 'import') bootstrapCatalog.mockRejectedValue(error);
      else close.mockRejectedValue(error);
      await bootstrapCatalogCli([]);
      expect(process.exitCode).toBe(1);
      expect(errorLog).toHaveBeenCalledWith({
        operation: 'catalog_bootstrap_cli',
        status: 'failed',
        errorType: 'Error',
      });
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain('secret');
      expect(close).toHaveBeenCalledTimes(stage === 'startup' ? 0 : 1);
    },
  );

  it('rejects unknown flags instead of accidentally running a full sync', async () => {
    await bootstrapCatalogCli(['--if-emty']);
    expect(process.exitCode).toBe(1);
    expect(createApplication).not.toHaveBeenCalled();
  });
});
