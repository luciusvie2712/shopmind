import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiMessageRole } from '@prisma/client';
import { ASSISTANT_LIMITS } from './assistant.schema';
import { ConversationRepository } from './conversation.repository';

@Injectable()
export class ConversationService {
  constructor(private readonly repository: ConversationRepository) {}

  async resolveOwned(userId: string, conversationId?: string) {
    if (conversationId === undefined) {
      return this.repository.create(userId);
    }
    const conversation = await this.repository.find(conversationId);
    if (conversation === null || conversation.userId !== userId) {
      throw new ForbiddenException('Conversation access is forbidden');
    }
    return conversation;
  }

  addUserMessage(conversationId: string, content: string) {
    return this.repository.addMessage(
      conversationId,
      AiMessageRole.USER,
      content,
    );
  }

  addAssistantMessage(conversationId: string, content: string) {
    return this.repository.addMessage(
      conversationId,
      AiMessageRole.ASSISTANT,
      content,
    );
  }

  recentMessages(conversationId: string) {
    return this.repository.recentMessages(
      conversationId,
      ASSISTANT_LIMITS.historyMessages,
    );
  }
}
