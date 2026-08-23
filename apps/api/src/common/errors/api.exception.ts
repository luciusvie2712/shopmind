import { HttpException } from '@nestjs/common';
import { ERROR_STATUS, type ErrorCode } from './error-code';

export class ApiException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status = ERROR_STATUS[code],
  ) {
    super(message, status);
  }
}
