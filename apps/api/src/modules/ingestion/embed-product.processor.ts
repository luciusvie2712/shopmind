import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Job } from 'bullmq';
import { config } from '../../common/config';
import {
  type EmbedProductJobData,
  QUEUE_NAMES,
} from '../../common/queue/queue.constants';
import {
  EMBEDDING_PROVIDER,
  type EmbeddingProvider,
  validateEmbeddingVector,
} from '../ai/embedding/embedding-provider';
import { buildEmbeddingText } from './embedding-text.builder';
import { ProductEmbeddingRepository } from './product-embedding.repository';

export type EmbeddingJobDecision = 'process' | 'stale' | 'missing';

export function decideEmbeddingJob(
  currentContentHash: string | undefined,
  jobContentHash: string,
): EmbeddingJobDecision {
  if (currentContentHash === undefined) return 'missing';
  return currentContentHash === jobContentHash ? 'process' : 'stale';
}

@Injectable()
export class EmbedProductProcessor {
  private readonly logger = new Logger(EmbedProductProcessor.name);

  constructor(
    private readonly repository: ProductEmbeddingRepository,
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  async process(job: Job<EmbedProductJobData>): Promise<EmbeddingJobDecision> {
    const startedAt = performance.now();
    try {
      const product = await this.repository.findCanonicalProduct(
        job.data.productId,
      );
      const decision = decideEmbeddingJob(
        product?.contentHash,
        job.data.contentHash,
      );
      if (decision !== 'process' || product === null) {
        this.log(job, decision, startedAt);
        return decision;
      }

      const text = buildEmbeddingText(product);
      const vector = validateEmbeddingVector(
        await this.embeddingProvider.embedText(text),
        config.gemini.embeddingDimension,
      );
      await this.repository.upsertEmbedding({
        productId: product.id,
        vector,
        model: config.gemini.embeddingModel,
        contentHash: product.contentHash,
      });
      this.log(job, 'success', startedAt);
      return decision;
    } catch (error) {
      this.log(job, 'failure', startedAt, error);
      throw error;
    }
  }

  private log(
    job: Job<EmbedProductJobData>,
    status: string,
    startedAt: number,
    error?: unknown,
  ): void {
    const fields = {
      queue: QUEUE_NAMES.embedding,
      jobName: job.name,
      jobId: job.id,
      productId: job.data.productId,
      attempt: job.attemptsMade + 1,
      status,
      latencyMs: Number((performance.now() - startedAt).toFixed(2)),
      ...(error === undefined
        ? {}
        : { errorType: error instanceof Error ? error.name : 'UnknownError' }),
    };
    if (status === 'failure') this.logger.error(fields);
    else this.logger.log(fields);
  }
}
