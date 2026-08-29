import { Injectable } from '@nestjs/common';
import { FulfillmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { fulfillmentInclude } from '../fulfillment/fulfillment.repository';

const demoPaymentInclude = {
  payment: true,
  fulfillment: { include: fulfillmentInclude },
} as const satisfies Prisma.OrderInclude;

export type DemoPaymentOrderRecord = Prisma.OrderGetPayload<{
  include: typeof demoPaymentInclude;
}>;
export class DemoOrderNotFoundError extends Error {}
export class DemoPaymentUnavailableError extends Error {}

@Injectable()
export class DemoPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOwned(
    orderId: string,
    userId: string,
  ): Promise<DemoPaymentOrderRecord> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: demoPaymentInclude,
    });
    if (!order) throw new DemoOrderNotFoundError();
    if (!order.payment || order.payment.provider !== 'SIMULATED')
      throw new DemoPaymentUnavailableError();
    return order;
  }

  confirm(
    orderId: string,
    userId: string,
    scenario: 'SUCCESS' | 'FAILURE',
  ): Promise<DemoPaymentOrderRecord> {
    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.order.findFirst({
        where: { id: orderId, userId },
        select: { id: true },
      });
      if (!owned) throw new DemoOrderNotFoundError();
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM payments WHERE order_id = ${orderId}::uuid FOR UPDATE`,
      );
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: demoPaymentInclude,
      });
      if (!order?.payment || order.payment.provider !== 'SIMULATED')
        throw new DemoPaymentUnavailableError();
      if (order.payment.status !== PaymentStatus.PAID) {
        const paidAt = new Date();
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.PAID, paidAt },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
        });
        const fulfillment = await tx.fulfillment.upsert({
          where: { orderId },
          create: {
            orderId,
            status: FulfillmentStatus.ORDER_RECEIVED,
            scenario,
            startedAt: paidAt,
          },
          update: {},
        });
        await tx.fulfillmentEvent.upsert({
          where: {
            fulfillmentId_status: {
              fulfillmentId: fulfillment.id,
              status: FulfillmentStatus.ORDER_RECEIVED,
            },
          },
          create: {
            fulfillmentId: fulfillment.id,
            status: FulfillmentStatus.ORDER_RECEIVED,
            occurredAt: fulfillment.startedAt,
          },
          update: {},
        });
      }
      return (await tx.order.findUnique({
        where: { id: orderId },
        include: demoPaymentInclude,
      }))!;
    });
  }
}
