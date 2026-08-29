const { PrismaClient } = require('@prisma/client');
const { testDatabaseUrl } = require('./test-environment.cjs');

const E2E_EMAIL_SUFFIX = '@e2e.shopmind.test';
const LAPTOP_CATEGORY_ID = '10000000-0000-4000-8000-000000000001';
const PHONE_CATEGORY_ID = '10000000-0000-4000-8000-000000000002';

function productId(index) {
  return `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function prismaClient() {
  return new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
}

async function cleanup(prisma) {
  const userWhere = { email: { endsWith: E2E_EMAIL_SUFFIX } };
  await prisma.aiRequestLog.deleteMany({ where: { user: userWhere } });
  await prisma.aiConversation.deleteMany({ where: { user: userWhere } });
  await prisma.fulfillmentEvent.deleteMany({ where: { fulfillment: { order: { user: userWhere } } } });
  await prisma.fulfillment.deleteMany({ where: { order: { user: userWhere } } });
  await prisma.payment.deleteMany({ where: { user: userWhere } });
  await prisma.orderItem.deleteMany({ where: { order: { user: userWhere } } });
  await prisma.order.deleteMany({ where: { user: userWhere } });
  await prisma.wishlistItem.deleteMany({ where: { user: userWhere } });
  await prisma.cartItem.deleteMany({ where: { cart: { user: userWhere } } });
  await prisma.cart.deleteMany({ where: { user: userWhere } });
  await prisma.refreshSession.deleteMany({ where: { user: userWhere } });
  await prisma.user.deleteMany({ where: userWhere });
  await prisma.product.deleteMany({ where: { source: 'phase11-e2e' } });
  await prisma.category.deleteMany({
    where: { id: { in: [LAPTOP_CATEGORY_ID, PHONE_CATEGORY_ID] } },
  });
}

async function prepare() {
  const prisma = prismaClient();
  try {
    await cleanup(prisma);
    await prisma.category.createMany({
      data: [
        { id: LAPTOP_CATEGORY_ID, slug: 'e2e-laptops', name: 'E2E Laptops' },
        { id: PHONE_CATEGORY_ID, slug: 'e2e-phones', name: 'E2E Phones' },
      ],
    });
    await prisma.product.createMany({
      data: [
        ...Array.from({ length: 21 }, (_, offset) => {
          const index = offset + 1;
          return {
            id: productId(index),
            source: 'phase11-e2e',
            externalId: `laptop-${index}`,
            categoryId: LAPTOP_CATEGORY_ID,
            title:
              index === 1
                ? 'Phase 11 Developer Laptop'
                : `Phase 11 Laptop ${String(index).padStart(2, '0')}`,
            description: 'Deterministic browser fixture for development',
            brand: index % 2 === 0 ? 'Acme' : 'ShopMind Test',
            price: index === 1 ? '899.00' : `${900 + index}.00`,
            rating: index === 1 ? '4.90' : '4.20',
            stock: 5,
            thumbnail: null,
            metadata: { tags: ['development', 'portable'] },
            contentHash: String(index).padStart(64, '0'),
          };
        }),
        {
          id: productId(99),
          source: 'phase11-e2e',
          externalId: 'phone-out-of-stock',
          categoryId: PHONE_CATEGORY_ID,
          title: 'Phase 11 Sold Out Phone',
          description: 'Deterministic out-of-stock browser fixture',
          brand: 'ShopMind Test',
          price: '299.00',
          rating: '4.50',
          stock: 0,
          thumbnail: null,
          metadata: { tags: ['mobile'] },
          contentHash: 'f'.repeat(64),
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupOnly() {
  const prisma = prismaClient();
  try {
    await cleanup(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  E2E_EMAIL_SUFFIX,
  LAPTOP_CATEGORY_ID,
  PHONE_CATEGORY_ID,
  cleanupOnly,
  prepare,
  productId,
};
