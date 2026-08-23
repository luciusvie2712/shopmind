import { Injectable, Logger } from '@nestjs/common';
import {
  AiRequestLogRepository,
  type AiRequestLogRecord,
} from './ai-request-log.repository';

export const AI_OPERATIONS = {
  searchIntent: 'search_intent',
  groundedRecommendation: 'grounded_recommendation',
  assistantTurn: 'assistant_turn',
  compare: 'compare',
} as const;

export const AI_OPERATION_STATUS = {
  success: 'success',
  invalidOutput: 'invalid_output',
  timeout: 'timeout',
  unavailable: 'unavailable',
} as const;

@Injectable()
export class AiRequestLogService {
  private readonly logger = new Logger(AiRequestLogService.name);

  constructor(private readonly repository: AiRequestLogRepository) {}

  async record(record: AiRequestLogRecord): Promise<void> {
    try {
      await this.repository.create(record);
      this.logger.log({
        ai: {
          operation: record.operation,
          model: record.model,
          status: record.status,
        },
        latencyMs: record.latencyMs,
        ...(record.userId === undefined ? {} : { userId: record.userId }),
      });
    } catch (error) {
      this.logger.warn({
        operation: 'ai_request_log_persistence',
        status: 'failure',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
}
