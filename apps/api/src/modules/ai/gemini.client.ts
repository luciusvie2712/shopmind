import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
} from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { config } from '../../common/config';
import {
  AiProviderInvalidOutputError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from './provider/ai-provider';
import {
  EmbeddingProviderTimeoutError,
  EmbeddingProviderUnavailableError,
} from './embedding/embedding-provider';
import type {
  AssistantProviderMessage,
  AssistantToolCall,
  AssistantToolDeclaration,
  AssistantToolExchange,
} from './provider/ai-provider';

export interface GeminiStructuredResponse {
  readonly value: unknown;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}

export type GeminiAssistantResponse =
  | {
      readonly kind: 'tool_calls';
      readonly calls: readonly AssistantToolCall[];
      readonly inputTokens?: number;
      readonly outputTokens?: number;
    }
  | {
      readonly kind: 'final';
      readonly value: unknown;
      readonly inputTokens?: number;
      readonly outputTokens?: number;
    };

export interface GeminiStructuredRequest {
  readonly systemInstruction: string;
  readonly data: unknown;
  readonly responseJsonSchema: unknown;
  readonly maxOutputTokens: number;
}

export interface GeminiAssistantRequest {
  readonly systemInstruction: string;
  readonly messages: readonly AssistantProviderMessage[];
  readonly tools: readonly AssistantToolDeclaration[];
  readonly exchanges: readonly AssistantToolExchange[];
  readonly responseJsonSchema: unknown;
  readonly maxOutputTokens: number;
}

@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private readonly client =
    config.gemini.apiKey === undefined
      ? undefined
      : new GoogleGenAI({
          apiKey: config.gemini.apiKey,
          httpOptions: {
            // Retry transient service failures once, inside the overall deadline.
            retryOptions: {
              attempts: 2,
              initialDelay: 0.25,
              maxDelay: 0.25,
              jitter: 0,
              httpStatusCodes: [502, 503, 504],
            },
          },
        });

  async embedText(text: string): Promise<unknown> {
    const response = await this.request('embedding', (client, signal) =>
      client.models.embedContent({
        model: config.gemini.embeddingModel,
        contents: text,
        config: {
          abortSignal: signal,
          outputDimensionality: config.gemini.embeddingDimension,
        },
      }),
    );
    return response.embeddings?.[0]?.values;
  }

  async embedImage(
    data: Buffer,
    mimeType: 'image/jpeg' | 'image/png',
  ): Promise<unknown> {
    const response = await this.request('embedding', (client, signal) =>
      client.models.embedContent({
        model: config.gemini.embeddingModel,
        contents: [{ inlineData: { mimeType, data: data.toString('base64') } }],
        config: {
          abortSignal: signal,
          outputDimensionality: config.gemini.embeddingDimension,
        },
      }),
    );
    return response.embeddings?.[0]?.values;
  }

  async generateStructured(
    request: GeminiStructuredRequest,
  ): Promise<GeminiStructuredResponse> {
    const response = await this.request('structured', (client, signal) =>
      client.models.generateContent({
        model: config.gemini.model,
        contents: JSON.stringify(request.data),
        config: {
          abortSignal: signal,
          systemInstruction: request.systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: request.responseJsonSchema,
          maxOutputTokens: request.maxOutputTokens,
        },
      }),
    );
    if (response.text === undefined) {
      throw new AiProviderInvalidOutputError('Model returned no JSON');
    }

    let value: unknown;
    try {
      value = JSON.parse(response.text) as unknown;
    } catch {
      throw new AiProviderInvalidOutputError('Model returned invalid JSON');
    }

    return {
      value,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    };
  }

  async generateAssistantTurn(
    request: GeminiAssistantRequest,
  ): Promise<GeminiAssistantResponse> {
    const response = await this.request('assistant', (client, signal) =>
      client.models.generateContent({
        model: config.gemini.model,
        contents: this.assistantContents(request.messages, request.exchanges),
        config: {
          abortSignal: signal,
          systemInstruction: request.systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: request.responseJsonSchema,
          maxOutputTokens: request.maxOutputTokens,
          tools: [
            {
              functionDeclarations: request.tools.map(
                ({ name, description, parametersJsonSchema }) =>
                  ({
                    name,
                    description,
                    parametersJsonSchema,
                  }) satisfies FunctionDeclaration,
              ),
            },
          ],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.AUTO,
            },
          },
        },
      }),
    );
    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    };
    const calls = response.candidates?.[0]?.content?.parts?.flatMap(
      ({ functionCall, thoughtSignature }) =>
        functionCall === undefined
          ? []
          : [
              {
                ...(functionCall.id === undefined
                  ? {}
                  : { id: functionCall.id }),
                name: functionCall.name ?? '',
                args: functionCall.args ?? {},
                ...(thoughtSignature === undefined ? {} : { thoughtSignature }),
              },
            ],
    );
    if (calls !== undefined && calls.length > 0) {
      return {
        kind: 'tool_calls',
        calls,
        ...usage,
      };
    }
    if (response.text === undefined) {
      throw new AiProviderInvalidOutputError('Model returned no final JSON');
    }

    let value: unknown;
    try {
      value = JSON.parse(response.text) as unknown;
    } catch {
      throw new AiProviderInvalidOutputError('Model returned invalid JSON');
    }
    return { kind: 'final', value, ...usage };
  }

  private async request<T>(
    operation: 'structured' | 'assistant' | 'embedding',
    invoke: (client: GoogleGenAI, signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const embedding = operation === 'embedding';
    const timeoutError = () =>
      embedding
        ? new EmbeddingProviderTimeoutError()
        : new AiProviderTimeoutError();
    const unavailableError = () =>
      embedding
        ? new EmbeddingProviderUnavailableError()
        : new AiProviderUnavailableError();
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (this.client === undefined) throw unavailableError();
      // Bound the entire SDK call (body parsing and retry backoff included),
      // even if a transport fails to settle when its abort signal fires.
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(timeoutError());
          controller.abort();
        }, config.ai.timeoutMs);
      });
      return await Promise.race([
        invoke(this.client, controller.signal),
        deadline,
      ]);
    } catch (error) {
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof error.status === 'number' &&
        Number.isInteger(error.status) &&
        error.status >= 400 &&
        error.status <= 599
          ? error.status
          : undefined;
      const timedOut =
        controller.signal.aborted || status === 408 || status === 504;
      this.logger.warn({
        ai: {
          operation,
          model: embedding ? config.gemini.embeddingModel : config.gemini.model,
          status: timedOut ? 'timeout' : 'unavailable',
          failureReason:
            this.client === undefined
              ? 'missing_api_key'
              : timedOut
                ? 'deadline_exceeded'
                : status === 429
                  ? 'rate_limited'
                  : status === 401 || status === 403
                    ? 'access_denied'
                    : status === 404
                      ? 'model_not_found'
                      : status === 400
                        ? 'invalid_request'
                        : status !== undefined
                          ? 'provider_unavailable'
                          : 'transport_error',
          ...(status === undefined ? {} : { httpStatus: status }),
        },
        latencyMs: Date.now() - startedAt,
        timeoutMs: config.ai.timeoutMs,
      });
      // Never propagate provider messages/bodies: they may contain secrets.
      throw timedOut ? timeoutError() : unavailableError();
    } finally {
      clearTimeout(timer);
    }
  }

  private assistantContents(
    messages: readonly AssistantProviderMessage[],
    exchanges: readonly AssistantToolExchange[],
  ): Content[] {
    const contents: Content[] = messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

    for (const exchange of exchanges) {
      contents.push({
        role: 'model',
        parts: exchange.calls.map((call) => ({
          ...(call.thoughtSignature === undefined
            ? {}
            : { thoughtSignature: call.thoughtSignature }),
          functionCall: {
            ...(call.id === undefined ? {} : { id: call.id }),
            name: call.name,
            args: this.objectValue(call.args),
          },
        })),
      });
      contents.push({
        role: 'user',
        parts: exchange.results.map((result) => ({
          functionResponse: {
            ...(result.id === undefined ? {} : { id: result.id }),
            name: result.name,
            response: { output: result.output },
          },
        })),
      });
    }
    return contents;
  }

  private objectValue(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
