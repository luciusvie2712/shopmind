import { Injectable, Logger } from '@nestjs/common';
import { config } from '../../common/config';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';

const DUMMYJSON_TIMEOUT_MS = 8_000;

@Injectable()
export class DummyJsonClient {
  private readonly logger = new Logger(DummyJsonClient.name);

  async fetchProducts(): Promise<unknown> {
    const url = new URL(
      `${config.dummyJson.baseUrl.replace(/\/$/, '')}/products`,
    );
    url.searchParams.set('limit', '0');
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      DUMMYJSON_TIMEOUT_MS,
    );
    const startedAt = process.hrtime.bigint();

    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: abortController.signal,
      });
      if (!response.ok) {
        throw new Error(`DummyJSON returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      this.logger.log({
        externalSource: 'dummyjson',
        operation: 'fetch_products',
        status: 'success',
        latencyMs: this.elapsedMilliseconds(startedAt),
      });
      return payload;
    } catch (error) {
      this.logger.warn({
        externalSource: 'dummyjson',
        operation: 'fetch_products',
        status: 'failure',
        latencyMs: this.elapsedMilliseconds(startedAt),
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw new ApiException(
        ERROR_CODES.EXTERNAL_DATA_ERROR,
        'External product data is unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private elapsedMilliseconds(startedAt: bigint): number {
    const nanoseconds = process.hrtime.bigint() - startedAt;
    return Math.round((Number(nanoseconds) / 1_000_000) * 100) / 100;
  }
}
