import type { PaymentContract } from '@shopmind/contracts';
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { config } from '../../common/config';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../auth/services/access-token.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentRateLimitGuard } from './payment-rate-limit.guard';
import { PaymentsService } from './payments.service';
import { verifyStripeSignature } from './stripe-webhook-verifier';

type RawRequest = Request & { readonly rawBody?: Buffer };
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post('intents')
  @UseGuards(AccessTokenGuard, PaymentRateLimitGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreatePaymentIntentDto,
  ): Promise<PaymentContract> {
    return this.payments.create(user.id, input.idempotencyKey);
  }
  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() request: RawRequest,
  ): Promise<{ readonly received: true; readonly status: string }> {
    const signature = request.get('stripe-signature');
    if (
      request.rawBody === undefined ||
      signature === undefined ||
      config.stripe.webhookSecret === undefined
    )
      throw new HttpException(
        'Invalid webhook signature',
        HttpStatus.BAD_REQUEST,
      );
    try {
      verifyStripeSignature(
        request.rawBody,
        signature,
        config.stripe.webhookSecret,
      );
    } catch {
      throw new HttpException(
        'Invalid webhook signature',
        HttpStatus.BAD_REQUEST,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(request.rawBody.toString('utf8')) as unknown;
    } catch {
      throw new HttpException(
        'Invalid webhook payload',
        HttpStatus.BAD_REQUEST,
      );
    }
    const status = await this.payments.handleWebhook(payload);
    return { received: true, status };
  }
}
