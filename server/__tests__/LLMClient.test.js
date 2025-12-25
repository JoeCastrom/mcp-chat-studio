/**
 * LLMClient Unit Tests
 * Tests provider transforms and response handling
 */

import { LLMClient } from '../services/LLMClient.js';

describe('LLMClient', () => {
  let client;

  beforeEach(() => {
    // Create client with minimal config
    client = new LLMClient({
      llm: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
      },
    });
  });

  describe('Provider Configuration', () => {
    test('should initialize with correct provider', () => {
      expect(client.provider).toBe('openai');
    });

    test('should default to ollama when no provider specified', () => {
      const defaultClient = new LLMClient({ llm: {} });
      expect(defaultClient.provider).toBe('ollama');
    });

    test('should return correct base URL for each provider', () => {
      const providers = {
        ollama: 'http://localhost:11434/v1',
        openai: 'https://api.openai.com/v1',
        anthropic: 'https://api.anthropic.com/v1',
        gemini: 'https://generativelanguage.googleapis.com/v1beta',
        groq: 'https://api.groq.com/openai/v1',
        together: 'https://api.together.xyz/v1',
        openrouter: 'https://openrouter.ai/api/v1',
      };

      for (const [provider, expectedUrl] of Object.entries(providers)) {
        client.provider = provider;
        client.config.base_url = null; // Reset custom URL
        expect(client.getBaseUrl()).toBe(expectedUrl);
      }
    });
  });

  describe('Anthropic Transform', () => {
    beforeEach(() => {
      client.provider = 'anthropic';
    });

    test('should transform OpenAI format to Anthropic format', () => {
      const payload = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hello' },
        ],
        temperature: 0.7,
      };

      const transformed = client.transformForAnthropic(payload);

      expect(transformed.system).toBe('You are helpful.');
      expect(transformed.messages).toHaveLength(1);
      expect(transformed.messages[0].role).toBe('user');
      expect(transformed.messages[0].content).toBe('Hello');
      expect(transformed.max_tokens).toBe(4096);
    });

    test('should transform Anthropic response to OpenAI format', () => {
      const anthropicResponse = {
        id: 'msg_123',
        model: 'claude-3-5-sonnet-20241022',
        content: [{ type: 'text', text: 'Hello there!' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      };

      const transformed = client.transformAnthropicResponse(anthropicResponse);

      expect(transformed.id).toBe('msg_123');
      expect(transformed.object).toBe('chat.completion');
      expect(transformed.choices[0].message.content).toBe('Hello there!');
      expect(transformed.choices[0].message.role).toBe('assistant');
      expect(transformed.usage.total_tokens).toBe(15);
    });

    test('should handle Anthropic tool_use responses', () => {
      const anthropicResponse = {
        id: 'msg_456',
        model: 'claude-3-5-sonnet-20241022',
        content: [
          { type: 'text', text: 'I will call a tool.' },
          {
            type: 'tool_use',
            id: 'toolu_123',
            name: 'get_weather',
            input: { location: 'London' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 20, output_tokens: 30 },
      };

      const transformed = client.transformAnthropicResponse(anthropicResponse);

      expect(transformed.choices[0].message.tool_calls).toBeDefined();
      expect(transformed.choices[0].message.tool_calls[0].function.name).toBe('get_weather');
      expect(JSON.parse(transformed.choices[0].message.tool_calls[0].function.arguments)).toEqual({
        location: 'London',
      });
    });
  });

  describe('Gemini Transform', () => {
    beforeEach(() => {
      client.provider = 'gemini';
    });

    test('should transform OpenAI format to Gemini format', () => {
      const payload = {
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: 'Be brief.' },
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
          { role: 'user', content: 'How are you?' },
        ],
        temperature: 0.5,
      };

      const transformed = client.transformForGemini(payload);

      expect(transformed.systemInstruction.parts[0].text).toBe('Be brief.');
      expect(transformed.contents).toHaveLength(3); // system excluded from contents
      expect(transformed.contents[0].role).toBe('user');
      expect(transformed.contents[1].role).toBe('model'); // assistant -> model
      expect(transformed.generationConfig.temperature).toBe(0.5);
    });

    test('should transform Gemini response to OpenAI format', () => {
      const geminiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Gemini response here' }],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 10,
          totalTokenCount: 25,
        },
      };

      const transformed = client.transformGeminiResponse(geminiResponse);

      expect(transformed.object).toBe('chat.completion');
      expect(transformed.choices[0].message.content).toBe('Gemini response here');
      expect(transformed.choices[0].message.role).toBe('assistant');
      expect(transformed.usage.total_tokens).toBe(25);
    });
  });

  describe('OpenRouter Headers', () => {
    test('should include attribution headers for OpenRouter', () => {
      client.provider = 'openrouter';
      process.env.OPENROUTER_API_KEY = 'test-key';

      const headers = client.getHeaders();

      expect(headers['HTTP-Referer']).toBe('https://github.com/JoeCastrom/mcp-chat-studio');
      expect(headers['X-Title']).toBe('MCP Chat Studio');
      expect(headers['Authorization']).toBe('Bearer test-key');

      delete process.env.OPENROUTER_API_KEY;
    });
  });
});
