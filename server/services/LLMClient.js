/**
 * Multi-Provider LLM Client
 * Supports: Ollama, OpenAI, Anthropic, Google Gemini, Azure OpenAI, Groq, Together AI, OpenRouter
 */

import axios from 'axios';

export class LLMClient {
  constructor(config) {
    const normalized = (config && config.llm) ? config.llm : (config || {});
    this.applyConfig(normalized);

    // Generic API keys (provider-specific take priority)
    this.apiKey =
      this.config.api_key ||
      process.env.LLM_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.AZURE_OPENAI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.TOGETHER_API_KEY ||
      process.env.OPENROUTER_API_KEY;

    // Azure-specific
    this.azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    this.azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    this.azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    this.authToken = null;
    this.authTokenExpiresAt = 0;

    console.log(`[LLMClient] Initialized with provider: ${this.provider}`);
  }

  applyConfig(config) {
    this.config = config || {};
    this.provider = this.config.provider || 'ollama';
  }

  updateConfig(config) {
    const normalized = (config && config.llm) ? config.llm : (config || {});
    this.applyConfig(normalized);
    if (this.config.api_key) {
      this.apiKey = this.config.api_key;
    }
    this.authToken = null;
    this.authTokenExpiresAt = 0;
  }

  /**
   * Validate required environment variables based on provider
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    switch (this.provider) {
      case 'openai':
        if (!this.config.api_key && !process.env.OPENAI_API_KEY && !process.env.LLM_API_KEY)
          errors.push('OPENAI_API_KEY is missing');
        break;
      case 'anthropic':
        if (!this.config.api_key && !process.env.ANTHROPIC_API_KEY && !process.env.LLM_API_KEY)
          errors.push('ANTHROPIC_API_KEY is missing');
        break;
      case 'gemini':
        if (!this.config.api_key && !process.env.GOOGLE_API_KEY && !process.env.LLM_API_KEY)
          errors.push('GOOGLE_API_KEY is missing');
        break;
      case 'azure':
        if (!this.config.api_key && !process.env.AZURE_OPENAI_API_KEY && !process.env.LLM_API_KEY)
          errors.push('AZURE_OPENAI_API_KEY is missing');
        if (!this.azureEndpoint) errors.push('AZURE_OPENAI_ENDPOINT is missing');
        if (!this.azureDeployment)
          warnings.push('AZURE_OPENAI_DEPLOYMENT not set, using model name');
        break;
      case 'groq':
        if (!this.config.api_key && !process.env.GROQ_API_KEY && !process.env.LLM_API_KEY)
          errors.push('GROQ_API_KEY is missing');
        break;
      case 'together':
        if (!this.config.api_key && !process.env.TOGETHER_API_KEY && !process.env.LLM_API_KEY)
          errors.push('TOGETHER_API_KEY is missing');
        break;
      case 'openrouter':
        if (!this.config.api_key && !process.env.OPENROUTER_API_KEY && !process.env.LLM_API_KEY)
          errors.push('OPENROUTER_API_KEY is missing');
        break;
      case 'custom': {
        const auth = this.config.auth || {};
        if (auth.type === 'client_credentials') {
          if (!auth.auth_url) errors.push('LLM auth_url is missing');
          if (!auth.client_id) errors.push('LLM auth client_id is missing');
          if (!auth.client_secret) errors.push('LLM auth client_secret is missing');
        } else if (auth.type === 'bearer') {
          if (!this.config.api_key && !process.env.LLM_API_KEY) {
            warnings.push('Custom LLM API key is not set');
          }
        }
        break;
      }
      case 'ollama':
        // Ollama doesn't require API key by default
        break;
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Get the appropriate API key for the provider
   */
  getApiKey() {
    const configKey = this.config.api_key || this.apiKey;
    switch (this.provider) {
      case 'openai':
        return configKey || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
      case 'anthropic':
        return configKey || process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY;
      case 'gemini':
        return configKey || process.env.GOOGLE_API_KEY || process.env.LLM_API_KEY;
      case 'azure':
        return configKey || process.env.AZURE_OPENAI_API_KEY || process.env.LLM_API_KEY;
      case 'groq':
        return configKey || process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
      case 'together':
        return configKey || process.env.TOGETHER_API_KEY || process.env.LLM_API_KEY;
      case 'openrouter':
        return configKey || process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY;
      default:
        return configKey || process.env.LLM_API_KEY;
    }
  }

  /**
   * Get the appropriate base URL for the provider
   */
  getBaseUrl() {
    if (this.config.base_url) return this.config.base_url;

    switch (this.provider) {
      case 'ollama': {
        // Support OLLAMA_HOST env var for Docker compatibility
        const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
        return `${ollamaHost}/v1`;
      }
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1beta';
      case 'azure': {
        const deployment = this.azureDeployment || this.config.model;
        return `${this.azureEndpoint}/openai/deployments/${deployment}`;
      }
      case 'groq':
        return 'https://api.groq.com/openai/v1';
      case 'together':
        return 'https://api.together.xyz/v1';
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      default: {
        // Default to Ollama with Docker support
        const defaultHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
        return `${defaultHost}/v1`;
      }
    }
  }

  async getAuthToken() {
    const auth = this.config.auth || {};
    if (auth.type !== 'client_credentials' || !auth.auth_url) {
      return null;
    }

    const now = Date.now();
    if (this.authToken && now < this.authTokenExpiresAt - 60 * 1000) {
      return this.authToken;
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: auth.client_id || '',
      client_secret: auth.client_secret || ''
    });
    if (auth.scope) params.append('scope', auth.scope);
    if (auth.audience) params.append('audience', auth.audience);

    const response = await axios.post(auth.auth_url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    const token = response.data?.access_token;
    if (!token) {
      throw new Error('Auth response missing access_token');
    }

    const expiresIn = Number(response.data?.expires_in || 3600);
    this.authToken = token;
    this.authTokenExpiresAt = Date.now() + expiresIn * 1000;
    return token;
  }

  /**
   * Build headers for the request based on provider
   */
  async getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    const apiKey = this.getApiKey();
    const auth = this.config.auth || {};
    const extraHeader = auth.extra_header || {};

    switch (this.provider) {
      case 'custom':
        if (auth.type === 'client_credentials') {
          const token = await this.getAuthToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } else if ((auth.type === 'bearer' || !auth.type) && apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        break;
      case 'anthropic':
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'azure':
        headers['api-key'] = apiKey;
        break;
      case 'openai':
      case 'groq':
      case 'together':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'openrouter':
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['HTTP-Referer'] = 'https://github.com/JoeCastrom/mcp-chat-studio';
        headers['X-Title'] = 'MCP Chat Studio';
        break;
      case 'ollama':
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        break;
    }

    if (extraHeader?.name && extraHeader?.value) {
      const headerName = extraHeader.name.trim();
      const headerValue = extraHeader.value;
      headers[headerName] = headerValue;
    }

    return headers;
  }

  /**
   * Get the chat completions endpoint based on provider
   */
  getChatEndpoint() {
    const baseUrl = this.getBaseUrl();

    switch (this.provider) {
      case 'azure':
        return `${baseUrl}/chat/completions?api-version=${this.azureApiVersion}`;
      case 'gemini': {
        const model = this.config.model || 'gemini-pro';
        return `${baseUrl}/models/${model}:generateContent?key=${this.getApiKey()}`;
      }
      case 'anthropic':
        return `${baseUrl}/messages`;
      default:
        return `${baseUrl}/chat/completions`;
    }
  }

  /**
   * Transform request payload for specific providers
   */
  transformRequest(payload) {
    switch (this.provider) {
      case 'anthropic':
        return this.transformForAnthropic(payload);
      case 'gemini':
        return this.transformForGemini(payload);
      default:
        return payload;
    }
  }

  /**
   * Transform payload for Anthropic Claude API
   */
  transformForAnthropic(payload) {
    const systemMessage = payload.messages.find(m => m.role === 'system');
    const otherMessages = payload.messages.filter(m => m.role !== 'system');

    const anthropicPayload = {
      model: payload.model,
      max_tokens: payload.max_tokens || 4096,
      messages: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };

    if (systemMessage) {
      anthropicPayload.system = systemMessage.content;
    }

    if (payload.temperature !== undefined) {
      anthropicPayload.temperature = payload.temperature;
    }

    // Transform tools for Anthropic format
    if (payload.tools && payload.tools.length > 0) {
      anthropicPayload.tools = payload.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));
    }

    if (payload.stream) {
      anthropicPayload.stream = true;
    }

    return anthropicPayload;
  }

  /**
   * Transform payload for Google Gemini API
   */
  transformForGemini(payload) {
    const contents = payload.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const geminiPayload = {
      contents,
      generationConfig: {
        temperature: payload.temperature || 0.7,
        maxOutputTokens: payload.max_tokens || 4096,
      },
    };

    const systemMessage = payload.messages.find(m => m.role === 'system');
    if (systemMessage) {
      geminiPayload.systemInstruction = { parts: [{ text: systemMessage.content }] };
    }

    // Transform tools for Gemini format
    if (payload.tools && payload.tools.length > 0) {
      geminiPayload.tools = [
        {
          functionDeclarations: payload.tools.map(tool => ({
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          })),
        },
      ];
    }

    return geminiPayload;
  }

  /**
   * Transform response from specific providers to OpenAI format
   */
  transformResponse(response, provider) {
    switch (provider) {
      case 'anthropic':
        return this.transformAnthropicResponse(response);
      case 'gemini':
        return this.transformGeminiResponse(response);
      default:
        return response;
    }
  }

  /**
   * Transform Anthropic response to OpenAI format
   */
  transformAnthropicResponse(response) {
    const textContent = response.content?.find(c => c.type === 'text');
    const toolUse = response.content?.find(c => c.type === 'tool_use');

    const choice = {
      index: 0,
      message: {
        role: 'assistant',
        content: textContent?.text || null,
      },
      finish_reason: response.stop_reason === 'end_turn' ? 'stop' : response.stop_reason,
    };

    if (toolUse) {
      choice.message.tool_calls = [
        {
          id: toolUse.id,
          type: 'function',
          function: {
            name: toolUse.name,
            arguments: JSON.stringify(toolUse.input),
          },
        },
      ];
    }

    return {
      id: response.id,
      object: 'chat.completion',
      model: response.model,
      choices: [choice],
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    };
  }

  /**
   * Transform Gemini response to OpenAI format
   */
  transformGeminiResponse(response) {
    const candidate = response.candidates?.[0];
    const content = candidate?.content;
    const textPart = content?.parts?.find(p => p.text);
    const functionCall = content?.parts?.find(p => p.functionCall);

    const choice = {
      index: 0,
      message: {
        role: 'assistant',
        content: textPart?.text || null,
      },
      finish_reason: candidate?.finishReason === 'STOP' ? 'stop' : 'stop',
    };

    if (functionCall) {
      choice.message.tool_calls = [
        {
          id: `call_${Date.now()}`,
          type: 'function',
          function: {
            name: functionCall.functionCall.name,
            arguments: JSON.stringify(functionCall.functionCall.args),
          },
        },
      ];
    }

    return {
      id: `gemini_${Date.now()}`,
      object: 'chat.completion',
      model: 'gemini',
      choices: [choice],
      usage: {
        prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
        completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: response.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  /**
   * Send a chat completion request
   */
  async chat(messages, options = {}, tools = null) {
    let payload = {
      model: options.model || this.config.model,
      messages,
      temperature: options.temperature ?? this.config.temperature ?? 0.7,
      stream: options.stream ?? false,
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = options.tool_choice || 'auto';
    }

    // Transform for specific providers
    payload = this.transformRequest(payload);

    const maxRetries = 3;
    const endpoint = this.getChatEndpoint();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const toolCount = payload.tools?.length || 0;
        console.log(
          `[LLMClient] Request (${this.provider}): model=${payload.model || this.config.model}, tools=${toolCount}`
        );

        const axiosConfig = {
          headers: await this.getHeaders(),
          timeout: 60000,
        };

        const response = await axios.post(endpoint, payload, axiosConfig);

        // Transform response to OpenAI format
        return this.transformResponse(response.data, this.provider);
      } catch (error) {
        console.error(`[LLMClient] Request failed:`, {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        const status = error.response?.status;

        // Rate limit or server error - exponential backoff
        if ([429, 500, 502, 503, 504].includes(status) && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(
            `[LLMClient] API Error ${status}. Retrying in ${(waitTime / 1000).toFixed(1)}s...`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        throw error;
      }
    }
  }

  /**
   * Stream a chat completion (returns async generator)
   */
  async *chatStream(messages, options = {}, tools = null) {
    let payload = {
      model: options.model || this.config.model,
      messages,
      temperature: options.temperature ?? this.config.temperature ?? 0.7,
      stream: true,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = options.tool_choice || 'auto';
    }

    // Transform for specific providers
    payload = this.transformRequest(payload);

    const endpoint = this.getChatEndpoint();
    const axiosConfig = {
      headers: await this.getHeaders(),
      responseType: 'stream',
      timeout: 120000,
    };

    try {
      const response = await axios.post(endpoint, payload, axiosConfig);

      let buffer = '';

      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          // Handle Anthropic SSE format
          if (this.provider === 'anthropic') {
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);
              try {
                const parsed = JSON.parse(data);
                // Transform Anthropic stream event to OpenAI format
                if (parsed.type === 'content_block_delta') {
                  yield {
                    choices: [
                      {
                        delta: { content: parsed.delta?.text || '' },
                        index: 0,
                      },
                    ],
                  };
                }
              } catch (error) {
                // Ignore parsing errors for individual chunks
              }
            }
          }
          // Handle standard OpenAI SSE format
          else if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (error) {
              // Ignore parsing errors for individual chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('[LLMClient] Stream request failed:', error.message);
      throw error;
    }
  }
}

// Factory function
let instance = null;

export function createLLMClient(config) {
  instance = new LLMClient(config);
  return instance;
}

export function getLLMClient() {
  return instance;
}

export default LLMClient;
