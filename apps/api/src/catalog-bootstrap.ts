import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logging/structured-logger';
import { IngestionService } from './modules/ingestion/ingestion.service';

export async function bootstrapCatalogCli(
  arguments_: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const logger = new StructuredLogger();
  let application: INestApplicationContext | undefined;

  try {
    if (arguments_.some((argument) => argument !== '--if-empty')) {
      throw new Error('Unsupported catalog bootstrap argument');
    }
    const force = !arguments_.includes('--if-empty');
    logger.log({
      operation: 'catalog_bootstrap_cli',
      status: 'started',
      force,
    });
    application = await NestFactory.createApplicationContext(AppModule, {
      logger,
      abortOnError: false,
    });
    const result = await application
      .get(IngestionService)
      .bootstrapCatalog({ force });
    logger.log({ operation: 'catalog_bootstrap_cli', ...result });
  } catch (error) {
    logger.error({
      operation: 'catalog_bootstrap_cli',
      status: 'failed',
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    process.exitCode = 1;
  } finally {
    try {
      await application?.close();
    } catch (error) {
      logger.error({
        operation: 'catalog_bootstrap_cli',
        status: 'failed',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      process.exitCode = 1;
    }
  }
}

if (require.main === module) void bootstrapCatalogCli();
