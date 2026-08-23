import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1, 'must not be empty');

const positiveInteger = z
  .string()
  .regex(/^[1-9]\d*$/, 'must be a positive integer')
  .transform(Number)
  .pipe(z.number().int().positive());

const databaseUrl = z
  .string()
  .url('must be a valid URL')
  .refine(
    (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
    'must use the postgres or postgresql protocol',
  );

const redisUrl = z
  .string()
  .url('must be a valid URL')
  .refine(
    (value) => ['redis:', 'rediss:'].includes(new URL(value).protocol),
    'must use the redis or rediss protocol',
  );

const environmentSchema = z
  .object({
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    JWT_ACCESS_SECRET: nonEmptyString,
    JWT_ACCESS_TTL: z
      .string()
      .regex(/^[1-9]\d*(?:ms|s|m|h|d)$/, 'must be a positive duration')
      .default('15m'),
    REFRESH_TOKEN_TTL_DAYS: positiveInteger.default(7),
    COOKIE_SECURE: z
      .enum(['true', 'false'], {
        error: 'must be either true or false',
      })
      .default('false')
      .transform((value) => value === 'true'),
    DUMMYJSON_BASE_URL: z
      .string()
      .url('must be a valid URL')
      .default('https://dummyjson.com'),
    GEMINI_API_KEY: nonEmptyString.optional(),
    GEMINI_MODEL: nonEmptyString.default('gemini-3.1-flash-lite'),
    GEMINI_EMBEDDING_MODEL: nonEmptyString.default('gemini-embedding-2'),
    GEMINI_EMBEDDING_DIMENSION: positiveInteger
      .refine((value) => value === 768, 'must equal 768')
      .default(768),
    AI_TIMEOUT_MS: positiveInteger.default(8000),
    AI_MAX_TOOL_STEPS: positiveInteger.default(4),
    API_PORT: positiveInteger
      .refine((value) => value <= 65_535, 'must be at most 65535')
      .default(4000),
    WEB_ORIGIN: z
      .string()
      .url('must be a valid URL')
      .default('http://localhost:3000'),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV !== 'production') {
      return;
    }

    if (environment.GEMINI_API_KEY === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'is required in production',
        path: ['GEMINI_API_KEY'],
      });
    }

    if (!environment.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        message: 'must be true in production',
        path: ['COOKIE_SECURE'],
      });
    }

    const webOrigin = new URL(environment.WEB_ORIGIN);
    if (
      webOrigin.protocol !== 'https:' ||
      ['localhost', '127.0.0.1', '::1'].includes(webOrigin.hostname)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'must be a public HTTPS origin in production',
        path: ['WEB_ORIGIN'],
      });
    }
  });

export interface AppConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly auth: {
    readonly accessSecret: string;
    readonly accessTtl: string;
    readonly refreshTokenTtlDays: number;
    readonly cookieSecure: boolean;
  };
  readonly dummyJson: {
    readonly baseUrl: string;
  };
  readonly gemini: {
    readonly apiKey: string | undefined;
    readonly model: string;
    readonly embeddingModel: string;
    readonly embeddingDimension: 768;
  };
  readonly ai: {
    readonly timeoutMs: number;
    readonly maxToolSteps: number;
  };
  readonly apiPort: number;
  readonly webOrigin: string;
}

export function parseEnvironment(environment: NodeJS.ProcessEnv): AppConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `${issue.path.join('.') || 'environment'} ${issue.message}`,
      )
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  const values = result.data;

  return {
    nodeEnv: values.NODE_ENV,
    databaseUrl: values.DATABASE_URL,
    redisUrl: values.REDIS_URL,
    auth: {
      accessSecret: values.JWT_ACCESS_SECRET,
      accessTtl: values.JWT_ACCESS_TTL,
      refreshTokenTtlDays: values.REFRESH_TOKEN_TTL_DAYS,
      cookieSecure: values.COOKIE_SECURE,
    },
    dummyJson: {
      baseUrl: values.DUMMYJSON_BASE_URL,
    },
    gemini: {
      apiKey: values.GEMINI_API_KEY,
      model: values.GEMINI_MODEL,
      embeddingModel: values.GEMINI_EMBEDDING_MODEL,
      embeddingDimension: values.GEMINI_EMBEDDING_DIMENSION,
    },
    ai: {
      timeoutMs: values.AI_TIMEOUT_MS,
      maxToolSteps: values.AI_MAX_TOOL_STEPS,
    },
    apiPort: values.API_PORT,
    webOrigin: values.WEB_ORIGIN,
  };
}
