/**
 * LLM Configuration Routes
 * API for getting and setting LLM provider settings
 */

import express from 'express';
import { getLLMClient } from '../services/LLMClient.js';

const router = express.Router();

/**
 * GET /api/llm/config
 * Get current LLM configuration
 */
router.get('/config', (req, res) => {
  try {
    const llmClient = getLLMClient();
    
    res.json({
      provider: llmClient.provider,
      model: llmClient.config.model,
      temperature: llmClient.config.temperature,
      // Only return explicit base_url if set, not the computed default
      base_url: llmClient.config.base_url || '',
      // Don't expose API keys
      hasApiKey: !!llmClient.apiKey
    });
  } catch (error) {
    console.error('[LLM/Config] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/llm/config
 * Update LLM configuration (runtime only, doesn't persist to file)
 */
router.post('/config', async (req, res) => {
  try {
    const { provider, model, temperature, base_url, api_key } = req.body;
    const llmClient = getLLMClient();
    
    // Supported providers
    const validProviders = ['ollama', 'openai', 'anthropic', 'gemini', 'azure', 'groq', 'together'];
    
    // Update provider
    if (provider && validProviders.includes(provider)) {
      const oldProvider = llmClient.provider;
      llmClient.provider = provider;
      console.log(`[LLM/Config] Provider changed to: ${provider}`);
      
      // Clear base_url when switching providers so getBaseUrl() uses correct default
      if (oldProvider !== provider && !base_url) {
        llmClient.config.base_url = null;
        console.log(`[LLM/Config] Base URL reset to default for ${provider}`);
      }
    }
    
    // Update model
    if (model) {
      llmClient.config.model = model;
      console.log(`[LLM/Config] Model changed to: ${model}`);
    }
    
    // Update temperature
    if (temperature !== undefined) {
      llmClient.config.temperature = parseFloat(temperature);
    }
    
    // Update base_url (only if explicitly provided)
    if (base_url) {
      llmClient.config.base_url = base_url;
      console.log(`[LLM/Config] Base URL changed to: ${base_url}`);
    }
    
    // Update API key
    if (api_key) {
      llmClient.apiKey = api_key;
      console.log(`[LLM/Config] API key updated`);
    }
    
    res.json({
      success: true,
      message: 'LLM configuration updated',
      config: {
        provider: llmClient.provider,
        model: llmClient.config.model,
        temperature: llmClient.config.temperature,
        base_url: llmClient.config.base_url || llmClient.getBaseUrl()
      }
    });
  } catch (error) {
    console.error('[LLM/Config] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/llm/models
 * Get available models for the current provider (if supported)
 */
router.get('/models', async (req, res) => {
  try {
    const llmClient = getLLMClient();
    
    // For Ollama, we can query available models
    if (llmClient.provider === 'ollama') {
      try {
        const baseUrl = llmClient.config.base_url || 'http://localhost:11434';
        const response = await fetch(`${baseUrl}/api/tags`);
        const data = await response.json();
        const models = data.models?.map(m => m.name) || [];
        return res.json({ models });
      } catch (e) {
        return res.json({ models: [], error: 'Could not fetch Ollama models' });
      }
    }
    
    // Common models for each provider
    const providerModels = {
      'openai': ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
      'anthropic': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
      'gemini': ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
      'azure': ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
      'groq': ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
      'together': ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1']
    };
    
    const models = providerModels[llmClient.provider] || [];
    res.json({ models });
  } catch (error) {
    console.error('[LLM/Models] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
