import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
// import { Observable, Subject } from 'rxjs';

@Injectable()
export class ChatService implements OnModuleInit, OnModuleDestroy {
  private readonly redisClient: RedisClientType;
  private readonly qdrantClient: QdrantClient;
  private readonly geminiModel: any;
  private readonly jinaApiKey: string;
  private readonly collectionName = 'news_articles';

  constructor(private configService: ConfigService) {
    // Initialize Redis Client
    this.redisClient = createClient({
      url: this.configService.get<string>('REDIS_URL'),
      // checkCompatibility: false,
    });

    // Initialize Qdrant Client
    this.qdrantClient = new QdrantClient({
      url: this.configService.get<string>('QDRANT_URL'),
      apiKey: this.configService.get<string>('QDRANT_API_KEY'),
    });

    // Initialize Google Gemini AI Model
    const genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY'),
    );
    this.geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Store Jina API Key
    this.jinaApiKey = this.configService.get<string>('JINA_API_KEY');
  }

  async onModuleInit() {
    // Connect to Redis when the module is initialized
    await this.redisClient.connect();
    console.log('Connected to Redis.');
  }

  async onModuleDestroy() {
    // Disconnect from Redis when the application is shutting down
    await this.redisClient.disconnect();
    console.log('Disconnected from Redis.');
  }

  private async getJinaEmbeddings(text: string): Promise<number[]> {
    const response = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.jinaApiKey}`,
      },
      body: JSON.stringify({
        input: [text],
        model: 'jina-embeddings-v2-base-en',
      }),
    });
    const data = await response.json();
    if (!data.data || data.data.length === 0) {
      throw new Error('Failed to get embeddings from Jina API');
    }
    return data.data[0].embedding;
  }

  async sendMessage(sessionId: string, message: string): Promise<string> {
    // 1. Embed the user's query using Jina
    const queryEmbedding = await this.getJinaEmbeddings(message);

    // 2. Retrieve relevant context from Qdrant
    const searchResult = await this.qdrantClient.search(this.collectionName, {
      vector: queryEmbedding,
      limit: 3, // Get top 3 most relevant chunks
      score_threshold: 0.6,
    });
    if (searchResult.length === 0) {
      // If no results meet the threshold, bypass the LLM call
      return "I couldn't find relevant information about that in the provided articles.";
    }
    const context = searchResult
      .map((result) => result.payload.text)
      .join('\n\n---\n\n');

    // 3. Construct the prompt for Gemini
    const prompt = `
      You are a helpful news chatbot. Based on the following news article excerpts, please answer the user's question.
      Provide a concise and informative answer directly from the context. If the context doesn't contain the answer, say "I couldn't find information about that in the provided articles."

      CONTEXT:
      ${context}

      USER'S QUESTION:
      ${message}
    `;

    // 4. Call Gemini API for the final answer
    const result = await this.geminiModel.generateContent(prompt);
    const botResponse = await result.response.text();

    // 5. Save conversation to Redis history (as a list)
    const conversation = {
      user: message,
      bot: botResponse,
      timestamp: new Date().toISOString(),
    };
    await this.redisClient.lPush(sessionId, JSON.stringify(conversation));
    // Optional: Set an expiration time for the session (e.g., 1 hour)
    await this.redisClient.expire(sessionId, 3600);

    return botResponse;
  }
  // sendMessageAndStream(
  //   sessionId: string,
  //   message: string,
  // ): Observable<MessageEvent> {
  //   const subject = new Subject<MessageEvent>();

  //   const run = async () => {
  //     try {
  //       // 1. RAG Retrieval (same as before)
  //       const queryEmbedding = await this.getJinaEmbeddings(message);
  //       const searchResult = await this.qdrantClient.search(
  //         this.collectionName,
  //         {
  //           vector: queryEmbedding,
  //           limit: 3,
  //         },
  //       );
  //       const context = searchResult
  //         .map((result) => result.payload.text)
  //         .join('\n\n---\n\n');

  //       // 2. Construct Prompt (same as before)
  //       const prompt = `Based on the following news context, answer the user's question. If the answer is not in the context, say you couldn't find information. CONTEXT: ${context} USER'S QUESTION: ${message}`;

  //       // 3. Call Gemini's streaming API
  //       const result = await this.geminiModel.generateContentStream(prompt);

  //       let fullResponse = '';
  //       for await (const chunk of result.stream) {
  //         const chunkText = chunk.text();
  //         fullResponse += chunkText;
  //         // Push each chunk to the client
  //         subject.next({ data: chunkText });
  //       }

  //       // 4. Once streaming is complete, save the full conversation to Redis
  //       await this.saveConversation(sessionId, message, fullResponse);

  //       // 5. Signal the end of the stream to the client
  //       subject.next({ data: '[DONE]' });
  //       subject.complete();
  //     } catch (error) {
  //       console.error('Error in streaming process:', error);
  //       subject.error(error);
  //     }
  //   };

  //   run();

  //   return subject.asObservable();
  // }
  private async saveConversation(
    sessionId: string,
    user: string,
    bot: string,
  ): Promise<void> {
    const conversation = {
      user,
      bot,
      timestamp: new Date().toISOString(),
    };
    await this.redisClient.lPush(sessionId, JSON.stringify(conversation));
    await this.redisClient.expire(sessionId, 3600);
  }

  async getHistory(sessionId: string): Promise<any[]> {
    const history = await this.redisClient.lRange(sessionId, 0, -1);
    // Reverse the history to show oldest messages first, then parse them
    return history.reverse().map((item) => JSON.parse(item));
  }

  async clearHistory(sessionId: string): Promise<void> {
    await this.redisClient.del(sessionId);
  }
  async getAllSessions(): Promise<{ sessionId: string; history: any[] }[]> {
    // Use the 'keys' command to get all keys (session IDs)
    console.log('Attempting to fetch all session keys from Redis...');
    const keys = await this.redisClient.keys('*');
    // consolve.log('All session keys:', keys);
    console.log('Keys returned from Redis client:', keys);
    if (!keys || keys.length === 0) {
      console.log('No keys found from the client, returning empty array.');
      return [];
    }

    // Iterate over each key and fetch its chat history
    const allSessions = await Promise.all(
      keys.map(async (key) => {
        const rawHistory = await this.redisClient.lRange(key, 0, -1);
        const history = rawHistory.map((item) => JSON.parse(item)).reverse();
        return { sessionId: key, history };
      }),
    );

    return allSessions;
  }
}
// interface MessageEvent {
//   data: string | object;
// }
