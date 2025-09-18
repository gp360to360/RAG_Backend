import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
export class CreateMessageDto {
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
