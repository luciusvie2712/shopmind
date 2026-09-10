import { Logger } from '@nestjs/common';
import { config } from '../../common/config';
import { GeminiClient, type GeminiAssistantRequest } from './gemini.client';
import {
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from './provider/ai-provider';
import { EmbeddingProviderTimeoutError } from './embedding/embedding-provider';

jest.mock('../../common/config', () => ({
  config: {
    gemini: {
      apiKey: 'test-key-never-log',
      model: 'gemini-3.1-flash-lite',
      embeddingModel: 'gemini-embedding-2',
      embeddingDimension: 768,
    },
    ai: { timeoutMs: 8000 },
  },
}));

const structuredRequest = {
  systemInstruction: 'Return JSON',
  data: { query: 'private-query-never-log' },
  responseJsonSchema: { type: 'object' },
  maxOutputTokens: 1024,
};
const assistantRequest: GeminiAssistantRequest = {
  systemInstruction: 'Use read-only tools and return JSON',
  messages: [{ role: 'user', content: 'List categories' }],
  tools: [
    {
      name: 'get_categories',
      description: 'List categories',
      parametersJsonSchema: { type: 'object', properties: {} },
    },
  ],
  exchanges: [],
  responseJsonSchema: { type: 'object' },
  maxOutputTokens: 1024,
};

function success(text = '{"ok":true}') {
  return Response.json({
    candidates: [{ content: { role: 'model', parts: [{ text }] } }],
    usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 8 },
  });
}

describe('GeminiClient HTTP boundary', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let warn: jest.SpiedFunction<Logger['warn']>;
  let client: GeminiClient;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(success());
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    client = new GeminiClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns parsed JSON and usage without logging private input', async () => {
    await expect(client.generateStructured(structuredRequest)).resolves.toEqual(
      { value: { ok: true }, inputTokens: 12, outputTokens: 8 },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('recovers from a transient 503 with one bounded retry', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { error: { code: 503, message: 'unavailable' } },
        { status: 503 },
      ),
    );
    const result = client.generateStructured(structuredRequest);
    await jest.advanceTimersByTimeAsync(300);
    await expect(result).resolves.toMatchObject({ value: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops after two unavailable responses and logs the HTTP status', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        Response.json(
          { error: { code: 503, message: 'secret-provider-message' } },
          { status: 503 },
        ),
      ),
    );
    const result = expect(
      client.generateStructured(structuredRequest),
    ).rejects.toBeInstanceOf(AiProviderUnavailableError);
    await jest.advanceTimersByTimeAsync(300);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        ai: expect.objectContaining({
          status: 'unavailable',
          httpStatus: 503,
        }) as unknown,
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(
      /secret-provider-message|test-key-never-log|private-query-never-log/,
    );
  });

  it.each([
    [400, 'invalid_request'],
    [403, 'access_denied'],
    [404, 'model_not_found'],
    [429, 'rate_limited'],
  ])('does not retry HTTP %s', async (status, failureReason) => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: status, message: 'secret-provider-message' } },
        { status: Number(status) },
      ),
    );
    await expect(
      client.generateStructured(structuredRequest),
    ).rejects.toBeInstanceOf(AiProviderUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        ai: expect.objectContaining({
          httpStatus: status,
          failureReason,
        }) as unknown,
      }),
    );
  });

  it('enforces the total deadline and aborts even when fetch ignores cancellation', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    const result = expect(
      client.generateStructured(structuredRequest),
    ).rejects.toBeInstanceOf(AiProviderTimeoutError);
    await jest.advanceTimersByTimeAsync(config.ai.timeoutMs);
    await result;
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('includes retry time in the deadline, rather than granting another 8 seconds', async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ error: { code: 503 } }, { status: 503 }),
      )
      .mockImplementation(() => new Promise<Response>(() => undefined));
    const result = expect(
      client.generateStructured(structuredRequest),
    ).rejects.toBeInstanceOf(AiProviderTimeoutError);
    await jest.advanceTimersByTimeAsync(config.ai.timeoutMs);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['text', 'image'] as const)(
    'bounds %s embedding requests',
    async (kind) => {
      fetchMock.mockImplementation(
        () => new Promise<Response>(() => undefined),
      );
      const pending =
        kind === 'text'
          ? client.embedText('water')
          : client.embedImage(Buffer.from('image'), 'image/png');
      const result = expect(pending).rejects.toBeInstanceOf(
        EmbeddingProviderTimeoutError,
      );
      await jest.advanceTimersByTimeAsync(config.ai.timeoutMs);
      await result;
    },
  );

  it('keeps invalid JSON distinct from provider unavailability', async () => {
    fetchMock.mockResolvedValue(success('not JSON'));
    await expect(
      client.generateStructured(structuredRequest),
    ).rejects.toBeInstanceOf(AiProviderInvalidOutputError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('round-trips parallel tool signatures and IDs without exposing them to final output', async () => {
    const parts = [
      {
        functionCall: { id: 'call-1', name: 'get_categories', args: {} },
        thoughtSignature: 'opaque-signature',
      },
      { functionCall: { id: 'call-2', name: 'get_categories', args: {} } },
    ];
    fetchMock.mockResolvedValueOnce(
      Response.json({ candidates: [{ content: { role: 'model', parts } }] }),
    );
    const turn = await client.generateAssistantTurn(assistantRequest);
    if (turn.kind !== 'tool_calls') throw new Error('Expected tool calls');
    const final = await client.generateAssistantTurn({
      ...assistantRequest,
      exchanges: [
        {
          calls: turn.calls,
          results: turn.calls.map((call) => ({
            id: call.id,
            name: call.name,
            output: [],
          })),
        },
      ],
    });
    const requestBody = fetchMock.mock.calls[1]?.[1]?.body;
    if (typeof requestBody !== 'string') throw new Error('Expected JSON body');
    const body = JSON.parse(requestBody) as {
      contents: { parts: unknown[] }[];
    };
    expect(body.contents[1]?.parts).toEqual(parts);
    expect(final).toMatchObject({ kind: 'final', value: { ok: true } });
    expect(JSON.stringify(final)).not.toContain('opaque-signature');
  });

  it('also bounds assistant requests', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    const result = expect(
      client.generateAssistantTurn(assistantRequest),
    ).rejects.toBeInstanceOf(AiProviderTimeoutError);
    await jest.advanceTimersByTimeAsync(config.ai.timeoutMs);
    await result;
  });
});
