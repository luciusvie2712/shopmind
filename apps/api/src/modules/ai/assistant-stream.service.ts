import type { AssistantStreamEventContract } from '@shopmind/contracts';
import { Injectable } from '@nestjs/common';
import type { AssistantMessageDto } from './dto/assistant-message.dto';
import { AssistantService } from './assistant.service';

@Injectable()
export class AssistantStreamService {
  constructor(private readonly assistant: AssistantService) {}

  async *stream(
    userId: string,
    input: AssistantMessageDto,
    requestId: string,
  ): AsyncGenerator<AssistantStreamEventContract> {
    yield { type: 'message.start', requestId };
    const turn = await this.assistant.sendMessage(userId, input, requestId);
    for (const delta of chunks(turn.message.content, 48)) {
      yield { type: 'message.delta', delta };
    }
    yield { type: 'message.done', turn };
  }
}

export function chunks(text: string, size: number): readonly string[] {
  if (size < 1) throw new Error('Stream chunk size must be positive');
  const result: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    result.push(text.slice(index, index + size));
  }
  return result;
}
