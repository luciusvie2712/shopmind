import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ERROR_CODES, ERROR_STATUS } from './error-code';
import { mapExceptionToError } from './error-mapper';

describe('mapExceptionToError', () => {
  it.each([
    [new BadRequestException('invalid'), 400, ERROR_CODES.VALIDATION_ERROR],
    [new UnauthorizedException(), 401, ERROR_CODES.AUTH_REQUIRED],
    [new ForbiddenException(), 403, ERROR_CODES.FORBIDDEN],
  ])('maps a stable public error', (exception, status, code) => {
    expect(mapExceptionToError(exception)).toMatchObject({ status, code });
  });

  it('hides unexpected error details', () => {
    const mapped = mapExceptionToError(new Error('sensitive internal detail'));

    expect(mapped).toEqual({
      status: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    });
  });

  it('defines the required stable taxonomy statuses', () => {
    expect(ERROR_STATUS).toMatchObject({
      VALIDATION_ERROR: 400,
      AUTH_REQUIRED: 401,
      FORBIDDEN: 403,
      PRODUCT_NOT_FOUND: 404,
      OUT_OF_STOCK: 409,
      AI_INVALID_OUTPUT: 502,
      AI_PROVIDER_TIMEOUT: 504,
      EXTERNAL_DATA_ERROR: 502,
    });
  });
});
