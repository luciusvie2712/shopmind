import type { ReviewSummaryContract } from '@shopmind/contracts';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ReviewSummaryService } from './review-summary.service';

@Controller('products')
export class ReviewSummaryController {
  constructor(private readonly summaries: ReviewSummaryService) {}
  @Get(':id/review-summary')
  get(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ReviewSummaryContract> {
    return this.summaries.get(id);
  }
}
