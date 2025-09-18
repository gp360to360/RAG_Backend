import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  imports: [ConfigModule],
})
export class ChatModule {}
