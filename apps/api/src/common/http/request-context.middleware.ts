import { type LoggerService } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type NextFunction, type Request, type Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type RequestWithId = Request & {
  requestId: string;
  user?: { readonly id: string };
};

function isValidRequestId(value: string | undefined): value is string {
  return value !== undefined && REQUEST_ID_PATTERN.test(value);
}

export function createRequestContextMiddleware(logger: LoggerService) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const suppliedRequestId = request.get(REQUEST_ID_HEADER);
    const requestId = isValidRequestId(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();
    const startedAt = process.hrtime.bigint();
    const requestWithId = request as RequestWithId;

    requestWithId.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.once('finish', () => {
      const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
      const latencyMs = Number(elapsedNanoseconds) / 1_000_000;

      logger.log({
        requestId,
        ...(requestWithId.user === undefined
          ? {}
          : { userId: requestWithId.user.id }),
        route: request.path,
        method: request.method,
        statusCode: response.statusCode,
        latencyMs: Math.round(latencyMs * 100) / 100,
      });
    });

    next();
  };
}
