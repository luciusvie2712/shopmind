import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from './common/config';
import { createRequestContextMiddleware } from './common/http/request-context.middleware';

async function bootstrap(): Promise<void> {
  const logger = new ConsoleLogger({ json: true });
  const app = await NestFactory.create(AppModule, { logger });

  app.use(createRequestContextMiddleware(logger));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ShopMind API')
    .setDescription('ShopMind REST API')
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    useGlobalPrefix: false,
  });

  await app.listen(config.apiPort);
}

void bootstrap();
