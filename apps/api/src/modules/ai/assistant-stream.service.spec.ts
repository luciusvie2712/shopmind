import { AssistantService } from './assistant.service';
import { AssistantStreamService, chunks } from './assistant-stream.service';

describe('AssistantStreamService', () => {
  it('emits ordered user-visible events and one final message', async () => {
    const sendMessage = jest.fn().mockResolvedValue({
      conversationId: 'conversation',
      message: {
        id: 'message',
        role: 'ASSISTANT',
        content: 'hello',
        createdAt: new Date().toISOString(),
      },
      products: [],
      requestId: 'req-1',
    });
    const service = new AssistantStreamService({
      sendMessage,
    } as unknown as AssistantService);
    const events = [];
    for await (const event of service.stream(
      'user',
      { message: 'hi' },
      'req-1',
    ))
      events.push(event);
    expect(events.map(({ type }) => type)).toEqual([
      'message.start',
      'message.delta',
      'message.done',
    ]);
    expect(events.filter(({ type }) => type === 'message.done')).toHaveLength(
      1,
    );
  });
  it('chunks visible text without changing content', () => {
    expect(chunks('abcdefgh', 3).join('')).toBe('abcdefgh');
  });
});
