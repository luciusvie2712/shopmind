import { Injectable } from '@nestjs/common';
import { AiMessageRole } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string) {
    return this.prisma.aiConversation.create({ data: { userId } });
  }

  find(conversationId: string) {
    return this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userId: true, createdAt: true, updatedAt: true },
    });
  }

  async addMessage(
    conversationId: string,
    role: AiMessageRole,
    content: string,
  ) {
    const [message] = await this.prisma.$transaction([
      this.prisma.aiMessage.create({
        data: { conversationId, role, content },
      }),
      this.prisma.aiConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return message;
  }

  async recentMessages(conversationId: string, limit: number) {
    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return messages.reverse();
  }
}
