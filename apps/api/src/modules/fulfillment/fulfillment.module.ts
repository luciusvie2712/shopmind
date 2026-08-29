import { Module } from '@nestjs/common';
import { QueueModule } from '../../common/queue/queue.module';
import { FulfillmentProcessor } from './fulfillment.processor';
import { FulfillmentRepository } from './fulfillment.repository';
import { FulfillmentService } from './fulfillment.service';

@Module({
  imports: [QueueModule],
  providers: [FulfillmentRepository, FulfillmentService, FulfillmentProcessor],
  exports: [FulfillmentService, FulfillmentProcessor],
})
export class FulfillmentModule {}
