import { type INestApplication, type LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Product } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/database/prisma.service';
import { configureHttpApplication } from '../src/common/http/configure-http-application';
import { FulfillmentStatus } from '@prisma/client';
import { FulfillmentService } from '../src/modules/fulfillment/fulfillment.service';

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

describe('Phase 5 shopping integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let product: Product;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureHttpApplication(app, silentLogger);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanup();
    const category = await prisma.category.create({
      data: { slug: 'phase5-products', name: 'Phase 5 Products' },
    });
    product = await prisma.product.create({
      data: {
        source: 'phase5-test',
        externalId: 'product-1',
        categoryId: category.id,
        title: 'Transactional Product',
        description: 'Phase 5 fixture',
        brand: 'ShopMind',
        price: '19.99',
        rating: '4.70',
        stock: 5,
        thumbnail: null,
        contentHash: 'a'.repeat(64),
      },
    });
  });

  afterAll(async () => {
    if (prisma !== undefined) await cleanup();
    if (app !== undefined) await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.fulfillmentEvent.deleteMany({ where: { fulfillment: { order: { user: { email: { endsWith: '@phase5.test' } } } } } });
    await prisma.fulfillment.deleteMany({ where: { order: { user: { email: { endsWith: '@phase5.test' } } } } });
    await prisma.payment.deleteMany({ where: { user: { email: { endsWith: '@phase5.test' } } } });
    await prisma.orderItem.deleteMany({
      where: { order: { user: { email: { endsWith: '@phase5.test' } } } },
    });
    await prisma.order.deleteMany({
      where: { user: { email: { endsWith: '@phase5.test' } } },
    });
    await prisma.wishlistItem.deleteMany({
      where: { user: { email: { endsWith: '@phase5.test' } } },
    });
    await prisma.cartItem.deleteMany({
      where: { cart: { user: { email: { endsWith: '@phase5.test' } } } },
    });
    await prisma.cart.deleteMany({
      where: { user: { email: { endsWith: '@phase5.test' } } },
    });
    await prisma.refreshSession.deleteMany({
      where: { user: { email: { endsWith: '@phase5.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@phase5.test' } },
    });
    await prisma.product.deleteMany({ where: { source: 'phase5-test' } });
    await prisma.category.deleteMany({ where: { slug: 'phase5-products' } });
  }

  async function token(email: string): Promise<string> {
    const password = 'phase-five-password';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Phase Five User', email, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return String(login.body.accessToken);
  }

  function authorized(accessToken: string) {
    return { Authorization: `Bearer ${accessToken}` };
  }

  it('persists one authoritative cart per user and isolates ownership', async () => {
    const firstToken = await token('cart-a@phase5.test');
    const secondToken = await token('cart-b@phase5.test');
    const first = await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set(authorized(firstToken))
      .send({ productId: product.id, quantity: 1 })
      .expect(201);
    expect(first.body).toMatchObject({ subtotal: 19.99, total: 19.99 });
    const repeated = await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set(authorized(firstToken))
      .send({ productId: product.id, quantity: 2 })
      .expect(201);
    expect(repeated.body.items[0]).toMatchObject({
      quantity: 3,
      unitPrice: 19.99,
      lineTotal: 59.97,
    });
    expect(await prisma.cart.count()).toBe(1);
    expect(await prisma.cartItem.count()).toBe(1);

    const other = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set(authorized(secondToken))
      .expect(200);
    expect(other.body.items).toEqual([]);
    await request(app.getHttpServer())
      .delete(`/api/v1/cart/items/${product.id}`)
      .set(authorized(secondToken))
      .expect(200);
    expect(await prisma.cartItem.count()).toBe(1);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/cart/items/${product.id}`)
      .set(authorized(firstToken))
      .send({ quantity: 2 })
      .expect(200);
    expect(updated.body).toMatchObject({ subtotal: 39.98, total: 39.98 });
    await request(app.getHttpServer())
      .patch(`/api/v1/cart/items/${product.id}`)
      .set(authorized(firstToken))
      .send({ quantity: 0, price: 1 })
      .expect(400);
    const removed = await request(app.getHttpServer())
      .delete(`/api/v1/cart/items/${product.id}`)
      .set(authorized(firstToken))
      .expect(200);
    expect(removed.body).toMatchObject({ items: [], subtotal: 0, total: 0 });
  });

  it('adds wishlist items idempotently and isolates users', async () => {
    const firstToken = await token('wishlist-a@phase5.test');
    const secondToken = await token('wishlist-b@phase5.test');
    await request(app.getHttpServer())
      .put(`/api/v1/wishlist/${product.id}`)
      .set(authorized(firstToken))
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/wishlist/${product.id}`)
      .set(authorized(firstToken))
      .expect(200);
    expect(await prisma.wishlistItem.count()).toBe(1);
    const other = await request(app.getHttpServer())
      .get('/api/v1/wishlist')
      .set(authorized(secondToken))
      .expect(200);
    expect(other.body.items).toEqual([]);
    await request(app.getHttpServer())
      .delete(`/api/v1/wishlist/${product.id}`)
      .set(authorized(secondToken))
      .expect(200);
    expect(await prisma.wishlistItem.count()).toBe(1);
    await request(app.getHttpServer())
      .delete(`/api/v1/wishlist/${product.id}`)
      .set(authorized(firstToken))
      .expect(200);
    expect(await prisma.wishlistItem.count()).toBe(0);
  });

  it('checks out atomically with snapshots, clears cart, and preserves stock', async () => {
    const accessToken = await token('checkout@phase5.test');
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set(authorized(accessToken))
      .send({ productId: product.id, quantity: 2 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set(authorized(accessToken))
      .expect(201);
    expect(checkout.body).toMatchObject({
      status: 'CREATED',
      paymentStatus: 'PENDING',
      subtotal: 39.98,
      total: 39.98,
      items: [
        {
          productThumbnail: product.thumbnail,
          productTitleSnapshot: product.title,
          unitPriceSnapshot: 19.99,
          quantity: 2,
          lineTotal: 39.98,
        },
      ],
    });
    expect(await prisma.cartItem.count()).toBe(0);
    expect(await prisma.payment.count()).toBe(1);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
        .stock,
    ).toBe(5);
    const history = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set(authorized(accessToken))
      .expect(200);
    expect(history.body.items[0].items[0]).toMatchObject({
      productThumbnail: product.thumbnail,
      productTitleSnapshot: product.title,
      unitPriceSnapshot: 19.99,
    });
    const otherToken = await token('orders-other@phase5.test');
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/orders')
          .set(authorized(otherToken))
          .expect(200)
      ).body.items,
    ).toEqual([]);
  });

  it('rolls back out-of-stock checkout and keeps the cart intact', async () => {
    const accessToken = await token('rollback@phase5.test');
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set(authorized(accessToken))
      .send({ productId: product.id, quantity: 5 })
      .expect(201);
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: 1 },
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set(authorized(accessToken))
      .expect(409);
    expect(response.body.error).toMatchObject({
      code: 'OUT_OF_STOCK',
      requestId: expect.any(String),
    });
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.cartItem.count()).toBe(1);
  });

  it('confirms owned demo payment idempotently and persists a failure timeline', async () => {
    const accessToken = await token('demo-payment@phase5.test');
    await request(app.getHttpServer()).post('/api/v1/cart/items').set(authorized(accessToken)).send({ productId: product.id, quantity: 1 }).expect(201);
    const checkout = await request(app.getHttpServer()).post('/api/v1/orders/checkout').set(authorized(accessToken)).expect(201);
    const orderId = String(checkout.body.id);
    const detail = await request(app.getHttpServer()).get(`/api/v1/orders/${orderId}`).set(authorized(accessToken)).expect(200);
    expect(detail.body.payment).toMatchObject({ provider: 'SIMULATED', status: 'PENDING', amount: 19.99, currency: 'USD' });
    expect(detail.body.payment.qrPayload).toContain('NO_REAL_TRANSACTION=true');

    const otherToken = await token('demo-payment-other@phase5.test');
    await request(app.getHttpServer()).get(`/api/v1/orders/${orderId}`).set(authorized(otherToken)).expect(404);
    await request(app.getHttpServer()).post(`/api/v1/orders/${orderId}/payment/simulate-success`).set(authorized(otherToken)).send({ deliveryScenario: 'SUCCESS' }).expect(404);

    const first = await request(app.getHttpServer()).post(`/api/v1/orders/${orderId}/payment/simulate-success`).set(authorized(accessToken)).send({ deliveryScenario: 'FAILURE' }).expect(201);
    const second = await request(app.getHttpServer()).post(`/api/v1/orders/${orderId}/payment/simulate-success`).set(authorized(accessToken)).send({ deliveryScenario: 'SUCCESS' }).expect(201);
    expect(first.body).toMatchObject({ payment: { status: 'PAID', amount: 19.99 }, fulfillment: { status: 'ORDER_RECEIVED', scenario: 'FAILURE' } });
    expect(second.body.fulfillment.id).toBe(first.body.fulfillment.id);
    expect(second.body.fulfillment.scenario).toBe('FAILURE');
    expect(await prisma.payment.count({ where: { orderId } })).toBe(1);
    expect(await prisma.fulfillment.count({ where: { orderId } })).toBe(1);

    const service = app.get(FulfillmentService);
    const fulfillmentId = String(first.body.fulfillment.id);
    await service.transition(fulfillmentId, FulfillmentStatus.IN_TRANSIT);
    await service.transition(fulfillmentId, FulfillmentStatus.IN_TRANSIT);
    await service.transition(fulfillmentId, FulfillmentStatus.OUT_FOR_DELIVERY);
    await service.transition(fulfillmentId, FulfillmentStatus.DELIVERY_FAILED);
    expect(await prisma.fulfillmentEvent.count({ where: { fulfillmentId } })).toBe(4);
    const finalDetail = await request(app.getHttpServer()).get(`/api/v1/orders/${orderId}`).set(authorized(accessToken)).expect(200);
    expect(finalDetail.body.fulfillment.timeline.map((event: { status: string }) => event.status)).toEqual(['ORDER_RECEIVED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED']);
  });

  it('serializes concurrent checkout attempts through the cart-item row lock', async () => {
    const accessToken = await token('concurrent@phase5.test');
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set(authorized(accessToken))
      .send({ productId: product.id, quantity: 1 })
      .expect(201);
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set(authorized(accessToken)),
      request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set(authorized(accessToken)),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 400]);
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.cartItem.count()).toBe(0);
  });

  it('requires authentication for all shopping endpoints', async () => {
    await request(app.getHttpServer()).get('/api/v1/cart').expect(401);
    await request(app.getHttpServer()).get('/api/v1/wishlist').expect(401);
    await request(app.getHttpServer()).get('/api/v1/orders').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .expect(401);
  });
});
