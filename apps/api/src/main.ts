import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from './common/config';
import { configureHttpApplication } from './common/http/configure-http-application';
import { StructuredLogger } from './common/logging/structured-logger';

async function bootstrap(): Promise<void> {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, { logger, rawBody: true });

  configureHttpApplication(app, logger);

  if (config.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ShopMind API')
      .setDescription('ShopMind REST API')
      .setVersion('1.0')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      useGlobalPrefix: false,
    });
  }

  await app.listen(config.apiPort, '0.0.0.0');
}

void bootstrap();
