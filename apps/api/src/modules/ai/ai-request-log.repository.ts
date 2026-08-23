import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

export interface AiRequestLogRecord {
  readonly userId?: string;
  readonly operation: string;
  readonly model: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly latencyMs: number;
  readonly status: string;
}

@Injectable()
export class AiRequestLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(record: AiRequestLogRecord): Promise<void> {
    await this.prisma.aiRequestLog.create({
      data: {
        userId: record.userId,
        operation: record.operation,
        model: record.model,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        latencyMs: record.latencyMs,
        status: record.status,
      },
    });
  }
}
