import {
  Controller,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ChatService } from './chat.service';
// import { Observable } from 'rxjs';
import { CreateMessageDto } from './createmessage.dto';
// import { ServerSentEvent } from '@nestjs/websockets';
// import { map } from 'rxjs/operators';
// import { Sse } from '@nestjs/common';

// DTO (Data Transfer Object) for validating the request body of the POST /chat endpoint

@Controller('api/chat') // Defines the base route for this controller
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':sessionId')
  async getChatHistory(@Param('sessionId') sessionId: string) {
    return this.chatService.getHistory(sessionId);
  }

  @Post()
  @HttpCode(HttpStatus.OK) // Set the default status code for this endpoint to 200
  async postMessage(@Body() createMessageDto: CreateMessageDto) {
    const { sessionId, message } = createMessageDto;
    const reply = await this.chatService.sendMessage(sessionId, message);
    return { reply };
  }
  // @Sse('stream') // Decorator for SSE
  // streamMessage(
  //   @Body() createMessageDto: CreateMessageDto,
  // ): Observable<MessageEvent> {
  //   const { sessionId, message } = createMessageDto;
  //   return this.chatService.sendMessageAndStream(sessionId, message);
  // }
  @Get('sessions')
  async getAllSessions() {
    // --- ADD THIS LOGGING STATEMENT ---
    console.log(
      'Request received at the GET /api/chat/sessions controller endpoint.',
    );
    return this.chatService.getAllSessions();
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT) // Set the status code to 204 for successful deletion
  async clearChatHistory(@Param('sessionId') sessionId: string) {
    await this.chatService.clearHistory(sessionId);
  }
  @Get()
  async getWelcomeMessage() {
    return this.chatService.getWelcomeMessage();
  }
}
// interface MessageEvent {
//   data: string | object;
// }
