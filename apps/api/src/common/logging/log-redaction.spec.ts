import { redactLogValue } from './log-redaction';
import { StructuredLogger } from './structured-logger';

describe('structured log redaction', () => {
  it('redacts secrets and headers while preserving operational fields', () => {
    const serialized = JSON.stringify(
      redactLogValue({
        level: 'info',
        requestId: 'request-1',
        route: '/api/v1/ai/search',
        latencyMs: 12.5,
        ai: { operation: 'search_intent', model: 'test', status: 'success' },
        body: { password: 'TEST_PASSWORD_SECRET' },
        headers: {
          authorization: 'Bearer TEST_ACCESS_TOKEN_SECRET',
          cookie: 'shopmind_refresh=TEST_REFRESH_TOKEN_SECRET',
        },
        geminiApiKey: 'TEST_GEMINI_KEY_SECRET',
        fullPrompt: 'PII prompt must not be logged',
        inputTokens: 12,
      }),
    );
    expect(serialized).not.toContain('TEST_PASSWORD_SECRET');
    expect(serialized).not.toContain('TEST_ACCESS_TOKEN_SECRET');
    expect(serialized).not.toContain('TEST_REFRESH_TOKEN_SECRET');
    expect(serialized).not.toContain('TEST_GEMINI_KEY_SECRET');
    expect(serialized).not.toContain('PII prompt must not be logged');
    expect(JSON.parse(serialized)).toMatchObject({
      level: 'info',
      requestId: 'request-1',
      route: '/api/v1/ai/search',
      latencyMs: 12.5,
      inputTokens: 12,
      ai: { operation: 'search_intent', model: 'test', status: 'success' },
    });
  });

  it('applies redaction in the JSON logger output', () => {
    let output = '';
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk) => {
        output += String(chunk);
        return true;
      });
    try {
      new StructuredLogger().log({
        requestId: 'request-json',
        route: '/api/v1/ai/compare',
        latencyMs: 8,
        authorization: 'Bearer TEST_ACCESS_TOKEN_SECRET',
      });
    } finally {
      write.mockRestore();
    }
    expect(output).toContain('request-json');
    expect(output).toContain('latencyMs');
    expect(output).toContain('level');
    expect(output).not.toContain('TEST_ACCESS_TOKEN_SECRET');
  });
});
