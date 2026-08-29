import { parseEnvironment } from './env.schema';

const productionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://shopmind:local@postgres:5432/shopmind',
  REDIS_URL: 'rediss://redis.example.com:6380',
  JWT_ACCESS_SECRET: 'test-only-secret',
  GEMINI_API_KEY: 'test-only-key',
  GEMINI_EMBEDDING_DIMENSION: '768',
  COOKIE_SECURE: 'true',
  WEB_ORIGIN: 'https://app.shopmind.example',
};

describe('production environment validation', () => {
  it('accepts a secure public production origin', () => {
    expect(parseEnvironment(productionEnvironment)).toMatchObject({
      nodeEnv: 'production',
      webOrigin: 'https://app.shopmind.example',
      auth: { cookieSecure: true },
      demo: {
        paymentEnabled: true,
        fulfillmentEnabled: true,
        receivedToTransitMs: 20_000,
        transitToOutForDeliveryMs: 35_000,
        outForDeliveryToFinalMs: 35_000,
        defaultScenario: 'SUCCESS',
      },
    });
  });

  it.each(['999', '600001', '0', '-1'])(
    'rejects unsafe fulfillment duration %s',
    (duration) => {
      expect(() =>
        parseEnvironment({
          ...productionEnvironment,
          DEMO_FULFILLMENT_RECEIVED_TO_TRANSIT_MS: duration,
        }),
      ).toThrow('DEMO_FULFILLMENT_RECEIVED_TO_TRANSIT_MS');
    },
  );

  it.each([
    ['COOKIE_SECURE', { COOKIE_SECURE: 'false' }],
    ['WEB_ORIGIN', { WEB_ORIGIN: 'http://localhost:3000' }],
  ])('rejects unsafe production %s', (variable, override) => {
    expect(() =>
      parseEnvironment({ ...productionEnvironment, ...override }),
    ).toThrow(variable);
  });
});
