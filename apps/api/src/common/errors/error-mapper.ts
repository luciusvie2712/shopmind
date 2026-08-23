import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiException } from './api.exception';
import { ERROR_CODES, type ErrorCode } from './error-code';

export interface MappedError {
  readonly status: number;
  readonly code: ErrorCode;
  readonly message: string;
}

export function mapExceptionToError(exception: unknown): MappedError {
  if (exception instanceof ApiException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      message: exception.message,
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = mapHttpStatus(status);
    const message =
      status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)
        ? 'An unexpected error occurred'
        : extractHttpMessage(exception);

    return { status, code, message };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
  };
}

function mapHttpStatus(status: number): ErrorCode {
  if (status === Number(HttpStatus.BAD_REQUEST)) {
    return ERROR_CODES.VALIDATION_ERROR;
  }
  if (status === Number(HttpStatus.UNAUTHORIZED)) {
    return ERROR_CODES.AUTH_REQUIRED;
  }
  if (status === Number(HttpStatus.FORBIDDEN)) {
    return ERROR_CODES.FORBIDDEN;
  }
  return ERROR_CODES.INTERNAL_ERROR;
}

function extractHttpMessage(exception: HttpException): string {
  const response: unknown = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  if (typeof response !== 'object' || response === null) {
    return exception.message;
  }

  const message = (response as Record<string, unknown>).message;
  if (Array.isArray(message)) {
    return message
      .filter((item): item is string => typeof item === 'string')
      .join('; ');
  }
  return typeof message === 'string' ? message : exception.message;
}
