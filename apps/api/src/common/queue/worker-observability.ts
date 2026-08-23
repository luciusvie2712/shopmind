import type { LoggerService } from '@nestjs/common';
import type { Job, Worker } from 'bullmq';

export interface WorkerLogFields {
  readonly queue: string;
  readonly jobName: string;
  readonly jobId: string | undefined;
  readonly attempt: number;
  readonly status: 'active' | 'completed' | 'failed';
  readonly latencyMs?: number;
  readonly errorType?: string;
}

export function workerLogFields(
  queue: string,
  job: Job,
  status: WorkerLogFields['status'],
  latencyMs?: number,
  error?: Error,
): WorkerLogFields {
  return {
    queue,
    jobName: job.name,
    jobId: job.id,
    attempt: status === 'active' ? job.attemptsMade + 1 : job.attemptsMade,
    status,
    ...(latencyMs === undefined ? {} : { latencyMs }),
    ...(error === undefined ? {} : { errorType: error.name }),
  };
}

export function registerWorkerObservability(
  worker: Worker,
  logger: LoggerService,
): void {
  const startedAt = new Map<string, bigint>();
  worker.on('active', (job) => {
    if (job.id !== undefined) startedAt.set(job.id, process.hrtime.bigint());
    logger.log(workerLogFields(worker.name, job, 'active'));
  });
  worker.on('completed', (job) => {
    logger.log(
      workerLogFields(
        worker.name,
        job,
        'completed',
        elapsedMilliseconds(startedAt, job.id),
      ),
    );
  });
  worker.on('failed', (job, error) => {
    if (job === undefined) {
      logger.error({
        queue: worker.name,
        status: 'failed',
        errorType: error.name,
      });
      return;
    }
    logger.error(
      workerLogFields(
        worker.name,
        job,
        'failed',
        elapsedMilliseconds(startedAt, job.id),
        error,
      ),
    );
  });
  worker.on('error', (error) => {
    logger.error({
      queue: worker.name,
      status: 'worker_error',
      errorType: error.name,
    });
  });
}

function elapsedMilliseconds(
  startedAt: Map<string, bigint>,
  jobId: string | undefined,
): number | undefined {
  if (jobId === undefined) return undefined;
  const started = startedAt.get(jobId);
  startedAt.delete(jobId);
  if (started === undefined) return undefined;
  return (
    Math.round((Number(process.hrtime.bigint() - started) / 1_000_000) * 100) /
    100
  );
}
