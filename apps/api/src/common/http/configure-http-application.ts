import {
  type INestApplication,
  type LoggerService,
  ValidationPipe,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from '../errors/global-exception.filter';
import { config } from '../config';
import { createRequestContextMiddleware } from './request-context.middleware';

export function configureHttpApplication(
  app: INestApplication,
  logger: LoggerService,
): void {
  app.use(cookieParser());
  app.use(createRequestContextMiddleware(logger));
  app.enableCors({ origin: config.webOrigin, credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
}
