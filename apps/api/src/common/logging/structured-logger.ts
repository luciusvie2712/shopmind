import { ConsoleLogger, type LoggerService } from '@nestjs/common';
import { redactLogValue } from './log-redaction';

export class StructuredLogger implements LoggerService {
  private readonly logger = new ConsoleLogger({ json: true });

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.log(
      redactLogValue(message),
      ...optionalParams.map(redactLogValue),
    );
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.error(
      redactLogValue(message),
      ...optionalParams.map(redactLogValue),
    );
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.warn(
      redactLogValue(message),
      ...optionalParams.map(redactLogValue),
    );
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug(
      redactLogValue(message),
      ...optionalParams.map(redactLogValue),
    );
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.verbose(
      redactLogValue(message),
      ...optionalParams.map(redactLogValue),
    );
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.fatal(
      redactLogValue(message),
      ...optionalParams.map(redactLogValue),
    );
  }
}
