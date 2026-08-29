import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { UserEventType } from '@prisma/client';

export class UserEventMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9][a-z0-9._:-]*$/i)
  surface?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  position?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-f0-9]{64}$/)
  queryHash?: string;
}

export class CreateUserEventDto {
  @IsUUID('4')
  eventId!: string;

  @IsEnum(UserEventType)
  type!: UserEventType;

  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
  correlationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserEventMetadataDto)
  metadata?: UserEventMetadataDto;
}
