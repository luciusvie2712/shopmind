import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  type LoggerService,
} from '@nestjs/common';
import { type Response } from 'express';
import { type RequestWithId } from '../http/request-context.middleware';
import { mapExceptionToError } from './error-mapper';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const mapped = mapExceptionToError(exception);

    if (mapped.status >= 500) {
      this.logger.error({
        requestId: request.requestId,
        route: request.path,
        errorCode: mapped.code,
        errorType:
          exception instanceof Error ? exception.name : 'UnknownException',
        message: 'Unhandled request exception',
      });
    }

    response.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
        requestId: request.requestId,
      },
    });
  }
}
