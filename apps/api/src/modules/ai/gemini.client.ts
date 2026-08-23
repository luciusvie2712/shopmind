import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
} from '@google/genai';
import { Injectable } from '@nestjs/common';
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
  private readonly client =
    config.gemini.apiKey === undefined
      ? undefined
      : new GoogleGenAI({ apiKey: config.gemini.apiKey });

  async embedText(text: string): Promise<unknown> {
    if (this.client === undefined) {
      throw new EmbeddingProviderUnavailableError();
    }

    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      config.ai.timeoutMs,
    );

    try {
      const response = await this.client.models.embedContent({
        model: config.gemini.embeddingModel,
        contents: text,
        config: {
          abortSignal: abortController.signal,
          outputDimensionality: config.gemini.embeddingDimension,
        },
      });
      return response.embeddings?.[0]?.values;
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new EmbeddingProviderTimeoutError();
      }
      if (
        error instanceof EmbeddingProviderTimeoutError ||
        error instanceof EmbeddingProviderUnavailableError
      ) {
        throw error;
      }
      throw new EmbeddingProviderUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateStructured(
    request: GeminiStructuredRequest,
  ): Promise<GeminiStructuredResponse> {
    if (this.client === undefined) {
      throw new AiProviderUnavailableError();
    }

    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      config.ai.timeoutMs,
    );

    try {
      const response = await this.client.models.generateContent({
        model: config.gemini.model,
        contents: JSON.stringify(request.data),
        config: {
          abortSignal: abortController.signal,
          systemInstruction: request.systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: request.responseJsonSchema,
          maxOutputTokens: request.maxOutputTokens,
        },
      });
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
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new AiProviderTimeoutError();
      }
      if (
        error instanceof AiProviderInvalidOutputError ||
        error instanceof AiProviderTimeoutError ||
        error instanceof AiProviderUnavailableError
      ) {
        throw error;
      }
      throw new AiProviderUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateAssistantTurn(
    request: GeminiAssistantRequest,
  ): Promise<GeminiAssistantResponse> {
    if (this.client === undefined) {
      throw new AiProviderUnavailableError();
    }

    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      config.ai.timeoutMs,
    );

    try {
      const response = await this.client.models.generateContent({
        model: config.gemini.model,
        contents: this.assistantContents(request.messages, request.exchanges),
        config: {
          abortSignal: abortController.signal,
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
              allowedFunctionNames: request.tools.map(({ name }) => name),
            },
          },
        },
      });
      const usage = {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
      };
      const functionCalls = response.functionCalls;
      if (functionCalls !== undefined && functionCalls.length > 0) {
        return {
          kind: 'tool_calls',
          calls: functionCalls.map((call) => ({
            ...(call.id === undefined ? {} : { id: call.id }),
            name: call.name ?? '',
            args: call.args ?? {},
          })),
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
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new AiProviderTimeoutError();
      }
      if (
        error instanceof AiProviderInvalidOutputError ||
        error instanceof AiProviderTimeoutError ||
        error instanceof AiProviderUnavailableError
      ) {
        throw error;
      }
      throw new AiProviderUnavailableError();
    } finally {
      clearTimeout(timeout);
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
