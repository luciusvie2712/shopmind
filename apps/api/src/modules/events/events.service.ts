import type { CreateUserEventContract } from '@shopmind/contracts';
import { BadRequestException, Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { type CreateUserEventDto } from './dto/create-user-event.dto';
import { EventsRepository } from './events.repository';

const MAX_METADATA_BYTES = 1_024;

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async record(
    input: CreateUserEventDto,
    context: { readonly userId?: string; readonly requestId?: string },
  ): Promise<CreateUserEventContract> {
    if (
      input.productId !== undefined &&
      !(await this.eventsRepository.productExists(input.productId))
    ) {
      throw new BadRequestException('Referenced product does not exist');
    }
    const metadata = {
      ...(input.metadata ?? {}),
    } satisfies Prisma.InputJsonObject;
    if (
      Buffer.byteLength(JSON.stringify(metadata), 'utf8') > MAX_METADATA_BYTES
    ) {
      throw new BadRequestException('Event metadata is too large');
    }
    const status = await this.eventsRepository.append({
      id: input.eventId,
      type: input.type,
      ...(context.userId === undefined ? {} : { userId: context.userId }),
      ...(input.productId === undefined ? {} : { productId: input.productId }),
      ...(input.correlationId === undefined
        ? {}
        : { correlationId: input.correlationId }),
      ...(context.requestId === undefined
        ? {}
        : { requestId: context.requestId }),
      metadata,
    });
    return { eventId: input.eventId, status };
  }
}
