import type {
  OrderPaymentSummary,
  SimulatePaymentResponse,
} from '@shopmind/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { config } from '../../common/config';
import { ApiException } from '../../common/errors/api.exception';
import { ERROR_CODES } from '../../common/errors/error-code';
import { toFulfillmentSummary } from '../fulfillment/fulfillment.mapper';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { toDemoPaymentSummary } from './demo-payment.mapper';
import {
  DemoOrderNotFoundError,
  DemoPaymentRepository,
  DemoPaymentUnavailableError,
} from './demo-payment.repository';

@Injectable()
export class DemoPaymentsService {
  private readonly logger = new Logger(DemoPaymentsService.name);
  constructor(
    private readonly repository: DemoPaymentRepository,
    private readonly fulfillment: FulfillmentService,
  ) {}

  async get(orderId: string, userId: string): Promise<OrderPaymentSummary> {
    this.ensureEnabled();
    try {
      const order = await this.repository.findOwned(orderId, userId);
      return toDemoPaymentSummary(order.payment!);
    } catch (error) {
      this.mapError(error);
    }
  }

  async confirm(
    orderId: string,
    userId: string,
    scenario = config.demo.defaultScenario,
  ): Promise<SimulatePaymentResponse> {
    this.ensureEnabled();
    if (!config.demo.fulfillmentEnabled)
      throw new ApiException(
        ERROR_CODES.FULFILLMENT_NOT_AVAILABLE,
        'Demo fulfillment is disabled',
      );
    try {
      const order = await this.repository.confirm(orderId, userId, scenario);
      const fulfillment = order.fulfillment!;
      try {
        await this.fulfillment.schedule(fulfillment);
      } catch {
        this.logger.warn({
          operation: 'fulfillment_schedule_deferred',
          orderId,
          fulfillmentId: fulfillment.id,
        });
      }
      this.logger.log({
        operation: 'demo_payment_confirmed',
        orderId,
        paymentId: order.payment!.id,
        fulfillmentId: fulfillment.id,
        scenario: fulfillment.scenario,
      });
      return {
        payment: toDemoPaymentSummary(order.payment!),
        fulfillment: toFulfillmentSummary(fulfillment),
      };
    } catch (error) {
      this.mapError(error);
    }
  }

  private ensureEnabled(): void {
    if (!config.demo.paymentEnabled)
      throw new ApiException(
        ERROR_CODES.PAYMENT_SIMULATION_DISABLED,
        'Demo payment simulation is disabled',
      );
  }
  private mapError(error: unknown): never {
    if (error instanceof DemoOrderNotFoundError)
      throw new ApiException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not found');
    if (error instanceof DemoPaymentUnavailableError)
      throw new ApiException(
        ERROR_CODES.PAYMENT_NOT_AVAILABLE,
        'Simulated payment is not available for this order',
      );
    throw error;
  }
}
