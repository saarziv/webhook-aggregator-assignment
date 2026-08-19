import { IsISO8601, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class IngestEventDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsISO8601()
  timestamp: string;

  @IsObject()
  payload: Record<string, unknown>;
}
