import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  ORDER = 'order',
  QUOTE = 'quote',
  PRODUCT = 'product',
  BILLING = 'billing',
  TECHNICAL = 'technical',
  OTHER = 'other',
}

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory = TicketCategory.OTHER;

  @IsString()
  @IsOptional()
  orderId?: string;
}
