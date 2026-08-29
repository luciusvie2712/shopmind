import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

interface ListInput {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly status?: string;
}

@Injectable()
export class AdminManagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async users(input: ListInput) {
    const where: Prisma.UserWhereInput = {
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { email: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(input.status === 'USER' || input.status === 'ADMIN'
        ? { role: input.status }
        : {}),
    };
    const [items, total, users, admins] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: this.skip(input),
        take: input.pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { orders: true, events: true } },
        },
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
    ]);
    return { items, total, users, admins };
  }

  async orders(input: ListInput) {
    const orderSearch: Prisma.OrderWhereInput[] = input.search
      ? [
          { user: { email: { contains: input.search, mode: 'insensitive' } } },
          { user: { name: { contains: input.search, mode: 'insensitive' } } },
          ...(this.isUuid(input.search) ? [{ id: input.search }] : []),
        ]
      : [];
    const where: Prisma.OrderWhereInput = {
      ...(orderSearch.length ? { OR: orderSearch } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    const [items, total, aggregate] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: this.skip(input),
        take: input.pageSize,
        select: {
          id: true,
          status: true,
          subtotal: true,
          total: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          payment: { select: { status: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);
    return { items, total, aggregate };
  }

  async payments(input: ListInput) {
    const paymentStatus = Object.values(PaymentStatus).find(
      (status) => status === input.status,
    );
    const paymentSearch: Prisma.PaymentWhereInput[] = input.search
      ? [
          { user: { email: { contains: input.search, mode: 'insensitive' } } },
          ...(this.isUuid(input.search)
            ? [{ id: input.search }, { orderId: input.search }]
            : []),
        ]
      : [];
    const where: Prisma.PaymentWhereInput = {
      ...(paymentSearch.length ? { OR: paymentSearch } : {}),
      ...(paymentStatus ? { status: paymentStatus } : {}),
    };
    const [items, total, payments, succeeded, failed, succeededValue] =
      await Promise.all([
        this.prisma.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: this.skip(input),
          take: input.pageSize,
          select: {
            id: true,
            orderId: true,
            status: true,
            amount: true,
            currency: true,
            provider: true,
            createdAt: true,
            updatedAt: true,
            user: { select: { name: true, email: true } },
          },
        }),
        this.prisma.payment.count({ where }),
        this.prisma.payment.count(),
        this.prisma.payment.count({
          where: { status: PaymentStatus.SUCCEEDED },
        }),
        this.prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.SUCCEEDED },
          _sum: { amount: true },
        }),
      ]);
    return { items, total, payments, succeeded, failed, succeededValue };
  }

  async products(input: ListInput) {
    const where: Prisma.ProductWhereInput = {
      ...(input.search
        ? {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { brand: { contains: input.search, mode: 'insensitive' } },
              { externalId: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(input.status ? { sourceStatus: input.status } : {}),
    };
    const [items, total, products, active, outOfStock, embedded] =
      await Promise.all([
        this.prisma.product.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: this.skip(input),
          take: input.pageSize,
          select: {
            id: true,
            title: true,
            source: true,
            externalId: true,
            sourceStatus: true,
            brand: true,
            thumbnail: true,
            price: true,
            rating: true,
            stock: true,
            updatedAt: true,
            category: { select: { name: true } },
            embedding: { select: { productId: true } },
            reviewSummary: { select: { status: true } },
          },
        }),
        this.prisma.product.count({ where }),
        this.prisma.product.count(),
        this.prisma.product.count({ where: { sourceStatus: 'ACTIVE' } }),
        this.prisma.product.count({ where: { stock: 0 } }),
        this.prisma.productEmbedding.count(),
      ]);
    return { items, total, products, active, outOfStock, embedded };
  }

  async aiLogs(input: ListInput) {
    const where: Prisma.AiRequestLogWhereInput = {
      ...(input.search
        ? {
            OR: [
              { operation: { contains: input.search, mode: 'insensitive' } },
              { model: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    const successfulStatuses = ['success', 'fallback'];
    const [items, total, aggregate, failures] = await Promise.all([
      this.prisma.aiRequestLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: this.skip(input),
        take: input.pageSize,
        select: {
          id: true,
          operation: true,
          model: true,
          status: true,
          inputTokens: true,
          outputTokens: true,
          latencyMs: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.aiRequestLog.count({ where }),
      this.prisma.aiRequestLog.aggregate({
        _count: { _all: true },
        _avg: { latencyMs: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.aiRequestLog.count({
        where: { status: { notIn: successfulStatuses } },
      }),
    ]);
    return { items, total, aggregate, failures };
  }

  async ingestionStatus() {
    const [products, active, embedded, latest, sources, reviewSummaries] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { sourceStatus: 'ACTIVE' } }),
        this.prisma.productEmbedding.count(),
        this.prisma.product.aggregate({ _max: { updatedAt: true } }),
        this.prisma.product.groupBy({
          by: ['source'],
          _count: { _all: true },
          orderBy: { source: 'asc' },
        }),
        this.prisma.productReviewSummary.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
      ]);
    return { products, active, embedded, latest, sources, reviewSummaries };
  }

  private skip(input: ListInput): number {
    return (input.page - 1) * input.pageSize;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
