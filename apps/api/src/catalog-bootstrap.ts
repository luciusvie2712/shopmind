import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logging/structured-logger';
import { IngestionService } from './modules/ingestion/ingestion.service';

async function bootstrap(): Promise<void> {
  const logger = new StructuredLogger();
  const application = await NestFactory.createApplicationContext(AppModule, {
    logger,
  });

  try {
    const result = await application.get(IngestionService).bootstrapCatalog();
    logger.log({ operation: 'catalog_bootstrap_cli', ...result });
  } catch (error) {
    logger.error({
      operation: 'catalog_bootstrap_cli',
      status: 'failure',
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    process.exitCode = 1;
  } finally {
    await application.close();
  }
}

void bootstrap();
