import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ASSISTANT_LIMITS } from '../assistant.schema';

export class AssistantMessageDto {
  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(ASSISTANT_LIMITS.messageLength)
  message!: string;
}
