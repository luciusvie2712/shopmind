import { type INestApplication, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FulfillmentScenario,
  FulfillmentStatus,
  type Fulfillment,
} from '@prisma/client';
import { Worker } from 'bullmq';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/database/prisma.service';
import { queueConnectionOptions } from '../src/common/queue/queue.connection';
import {
  type FulfillmentTransitionJobData,
  QUEUE_NAMES,
} from '../src/common/queue/queue.constants';
import { FulfillmentProcessor } from '../src/modules/fulfillment/fulfillment.processor';
import { FulfillmentRepository } from '../src/modules/fulfillment/fulfillment.repository';
import { FulfillmentService } from '../src/modules/fulfillment/fulfillment.service';

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

describe('fulfillment BullMQ integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let service: FulfillmentService;
  let repository: FulfillmentRepository;
  let worker: Worker<FulfillmentTransitionJobData>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(silentLogger);
    await app.init();
    prisma = app.get(PrismaService);
    service = app.get(FulfillmentService);
    repository = app.get(FulfillmentRepository);
    const processor = app.get(FulfillmentProcessor);
    worker = new Worker<FulfillmentTransitionJobData>(
      QUEUE_NAMES.fulfillment,
      (job) => processor.process(job),
      { connection: queueConnectionOptions(), concurrency: 1 },
    );
    await worker.waitUntilReady();
  });

  afterAll(async () => {
    await worker?.close();
    await cleanup();
    await app?.close();
  });

  it.each([
    [FulfillmentScenario.SUCCESS, FulfillmentStatus.DELIVERED],
    [FulfillmentScenario.FAILURE, FulfillmentStatus.DELIVERY_FAILED],
  ] as const)(
    'executes, persists, and deduplicates the %s delayed-job sequence',
    async (scenario, terminalStatus) => {
      const fulfillment = await createOverdueFulfillment(scenario);

      await service.schedule(await requiredRecord(fulfillment.id));
      await waitForStatus(fulfillment.id, terminalStatus);
      await service.schedule(await requiredRecord(fulfillment.id));

      const persisted = await requiredRecord(fulfillment.id);
      expect(persisted.status).toBe(terminalStatus);
      expect(persisted.completedAt).not.toBeNull();
      expect(persisted.events.map(({ status }) => status)).toEqual([
        FulfillmentStatus.ORDER_RECEIVED,
        FulfillmentStatus.IN_TRANSIT,
        FulfillmentStatus.OUT_FOR_DELIVERY,
        terminalStatus,
      ]);
    },
  );

  it('recovers overdue active fulfillment by reconciling persisted state', async () => {
    const fulfillment = await createOverdueFulfillment(
      FulfillmentScenario.SUCCESS,
    );

    await expect(service.reconcile()).resolves.toBeGreaterThanOrEqual(1);
    await waitForStatus(fulfillment.id, FulfillmentStatus.DELIVERED);

    expect((await requiredRecord(fulfillment.id)).events).toHaveLength(4);
  });

  const realTimeSmoke =
    process.env.RUN_DEMO_FULFILLMENT_90S_SMOKE === 'true' ? it : it.skip;

  realTimeSmoke(
    'observes both terminal scenarios on the configured 20/55/90 second timeline across a worker restart',
    async () => {
      const success = await createFulfillment(
        FulfillmentScenario.SUCCESS,
        new Date(),
      );
      const failure = await createFulfillment(
        FulfillmentScenario.FAILURE,
        success.startedAt,
      );
      await service.schedule(await requiredRecord(success.id));
      await service.schedule(await requiredRecord(failure.id));

      await waitForStatus(success.id, FulfillmentStatus.IN_TRANSIT, 30_000);
      await waitForStatus(failure.id, FulfillmentStatus.IN_TRANSIT, 30_000);

      await worker.close();
      const processor = app.get(FulfillmentProcessor);
      worker = new Worker<FulfillmentTransitionJobData>(
        QUEUE_NAMES.fulfillment,
        (job) => processor.process(job),
        { connection: queueConnectionOptions(), concurrency: 1 },
      );
      await worker.waitUntilReady();
      await service.reconcile();

      await waitForStatus(
        success.id,
        FulfillmentStatus.OUT_FOR_DELIVERY,
        45_000,
      );
      await waitForStatus(
        failure.id,
        FulfillmentStatus.OUT_FOR_DELIVERY,
        45_000,
      );
      await waitForStatus(success.id, FulfillmentStatus.DELIVERED, 45_000);
      await waitForStatus(
        failure.id,
        FulfillmentStatus.DELIVERY_FAILED,
        45_000,
      );

      assertObservedTimeline(await requiredRecord(success.id), [20, 55, 90]);
      assertObservedTimeline(await requiredRecord(failure.id), [20, 55, 90]);
    },
    110_000,
  );

  async function createOverdueFulfillment(
    scenario: FulfillmentScenario,
  ): Promise<Fulfillment> {
    return createFulfillment(scenario, new Date(Date.now() - 95_000));
  }

  async function createFulfillment(
    scenario: FulfillmentScenario,
    startedAt: Date,
  ): Promise<Fulfillment> {
    const marker = `${scenario.toLowerCase()}-${crypto.randomUUID()}`;
    const user = await prisma.user.create({
      data: {
        email: `${marker}@fulfillment-worker.test`,
        passwordHash: 'integration-only',
        name: 'Fulfillment Worker Test',
      },
    });
    const order = await prisma.order.create({
      data: { userId: user.id, subtotal: '10.00', total: '10.00' },
    });
    return prisma.fulfillment.create({
      data: {
        orderId: order.id,
        scenario,
        startedAt,
        events: {
          create: {
            status: FulfillmentStatus.ORDER_RECEIVED,
            occurredAt: startedAt,
          },
        },
      },
    });
  }

  async function requiredRecord(id: string) {
    const record = await repository.find(id);
    if (record === null) throw new Error(`Missing fulfillment ${id}`);
    return record;
  }

  async function waitForStatus(
    id: string,
    expected: FulfillmentStatus,
    timeoutMs = 10_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if ((await repository.find(id))?.status === expected) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Fulfillment ${id} did not reach ${expected}`);
  }

  function assertObservedTimeline(
    fulfillment: Awaited<ReturnType<typeof requiredRecord>>,
    expectedOffsetsInSeconds: readonly number[],
  ): void {
    const actual = fulfillment.events
      .slice(1)
      .map(({ occurredAt }) =>
        Math.round(
          (occurredAt.getTime() - fulfillment.startedAt.getTime()) / 1_000,
        ),
      );
    expect(actual).toHaveLength(expectedOffsetsInSeconds.length);
    for (const [index, expected] of expectedOffsetsInSeconds.entries()) {
      expect(actual[index]).toBeGreaterThanOrEqual(expected - 3);
      expect(actual[index]).toBeLessThanOrEqual(expected + 5);
    }
  }

  async function cleanup(): Promise<void> {
    if (prisma === undefined) return;
    const userWhere = {
      order: { user: { email: { endsWith: '@fulfillment-worker.test' } } },
    };
    await prisma.fulfillmentEvent.deleteMany({
      where: { fulfillment: userWhere },
    });
    await prisma.fulfillment.deleteMany({ where: userWhere });
    await prisma.order.deleteMany({
      where: { user: { email: { endsWith: '@fulfillment-worker.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@fulfillment-worker.test' } },
    });
  }
});
