import { IsUUID } from 'class-validator';
export class CreatePaymentIntentDto {
  @IsUUID('4') idempotencyKey!: string;
}
