import { Module } from '@nestjs/common';
import { QueueModule } from '../../common/queue/queue.module';
import { AiModule } from '../ai/ai.module';
import { ReviewSummaryController } from './review-summary.controller';
import { ReviewSummaryProcessor } from './review-summary.processor';
import { ReviewSummaryRepository } from './review-summary.repository';
import { ReviewSummaryService } from './review-summary.service';

@Module({
  imports: [AiModule, QueueModule],
  controllers: [ReviewSummaryController],
  providers: [
    ReviewSummaryProcessor,
    ReviewSummaryRepository,
    ReviewSummaryService,
  ],
  exports: [ReviewSummaryProcessor],
})
export class ReviewSummariesModule {}
