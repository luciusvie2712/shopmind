import { FulfillmentScenario } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class SimulatePaymentDto {
  @IsOptional()
  @IsEnum(FulfillmentScenario)
  deliveryScenario?: FulfillmentScenario;
}
