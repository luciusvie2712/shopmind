import { Injectable } from '@nestjs/common';
import { FulfillmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import {
  canTransitionFulfillment,
  isTerminalFulfillmentStatus,
} from './fulfillment-state-machine';

export const fulfillmentInclude = {
  events: { orderBy: [{ occurredAt: 'asc' as const }, { id: 'asc' as const }] },
} as const satisfies Prisma.FulfillmentInclude;
export type FulfillmentRecord = Prisma.FulfillmentGetPayload<{
  include: typeof fulfillmentInclude;
}>;

export class InvalidFulfillmentTransitionError extends Error {}

@Injectable()
export class FulfillmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(id: string): Promise<FulfillmentRecord | null> {
    return this.prisma.fulfillment.findUnique({
      where: { id },
      include: fulfillmentInclude,
    });
  }

  listActive(): Promise<FulfillmentRecord[]> {
    return this.prisma.fulfillment.findMany({
      where: {
        status: {
          in: [
            FulfillmentStatus.ORDER_RECEIVED,
            FulfillmentStatus.IN_TRANSIT,
            FulfillmentStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
      include: fulfillmentInclude,
    });
  }

  transition(
    id: string,
    target: FulfillmentStatus,
    occurredAt = new Date(),
  ): Promise<'applied' | 'noop'> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { status: FulfillmentStatus }[]
      >(Prisma.sql`
        SELECT status FROM fulfillments WHERE id = ${id}::uuid FOR UPDATE
      `);
      const current = rows[0]?.status;
      if (current === undefined) return 'noop';
      if (current === target) return 'noop';
      const existing = await tx.fulfillmentEvent.findUnique({
        where: { fulfillmentId_status: { fulfillmentId: id, status: target } },
      });
      if (existing || isTerminalFulfillmentStatus(current)) return 'noop';
      if (!canTransitionFulfillment(current, target)) {
        throw new InvalidFulfillmentTransitionError(
          `${current} cannot transition to ${target}`,
        );
      }
      await tx.fulfillment.update({
        where: { id },
        data: {
          status: target,
          completedAt: isTerminalFulfillmentStatus(target) ? occurredAt : null,
        },
      });
      await tx.fulfillmentEvent.create({
        data: { fulfillmentId: id, status: target, occurredAt },
      });
      return 'applied';
    });
  }
}
