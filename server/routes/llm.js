/**
 * LLM Configuration Routes
 * API for getting and setting LLM provider settings
 */

import express from 'express';
import { getLLMClient } from '../services/LLMClient.js';
import { loadPersistedLLMConfig, savePersistedLLMConfig } from '../services/LLMConfigStore.js';
import { logAudit } from '../services/AuditLogger.js';

const router = express.Router();
const VALID_PROVIDERS = [
  'ollama',
  'openai',
  'anthropic',
  'gemini',
  'azure',
  'groq',
  'together',
  'openrouter',
  'custom',
];

function getAllowedProviders() {
  const raw = process.env.LLM_ALLOWED_PROVIDERS || process.env.LLM_PROVIDER_ALLOWLIST;
  if (!raw) return null;
  const normalized = String(raw).trim().toLowerCase();
  if (!normalized || normalized === '*' || normalized === 'all') {
    return null;
  }
  const list = normalized
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => VALID_PROVIDERS.includes(item));
  return list.length > 0 ? list : null;
}

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
      hasApiKey: !!(llmClient.config.api_key || llmClient.apiKey),
      auth_type: llmClient.config.auth?.type || 'none',
      auth_url: llmClient.config.auth?.auth_url || '',
      auth_client_id: llmClient.config.auth?.client_id || '',
      auth_scope: llmClient.config.auth?.scope || '',
      auth_audience: llmClient.config.auth?.audience || '',
      hasAuthSecret: !!llmClient.config.auth?.client_secret,
      auth_extra_header_name: llmClient.config.auth?.extra_header?.name || '',
      hasAuthExtraHeader: !!llmClient.config.auth?.extra_header?.value,
      allowedProviders: getAllowedProviders(),
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
    const {
      provider,
      model,
      temperature,
      base_url,
      api_key,
      clear_api_key,
      auth_type,
      auth_url,
      auth_client_id,
      auth_client_secret,
      auth_scope,
      auth_audience,
      clear_auth_secret,
      auth_extra_header_name,
      auth_extra_header_value,
      clear_auth_extra_header,
    } = req.body;
    const llmClient = getLLMClient();
    const persisted = await loadPersistedLLMConfig();
    const existing = persisted || llmClient.config || {};

    // Supported providers
    const validProviders = VALID_PROVIDERS;
    const allowedProviders = getAllowedProviders();
    if (provider && allowedProviders && !allowedProviders.includes(provider)) {
      return res.status(403).json({ error: `Provider "${provider}" is disabled by server policy` });
    }

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
      llmClient.config.api_key = api_key;
      console.log(`[LLM/Config] API key updated`);
    } else if (clear_api_key) {
      delete llmClient.config.api_key;
      llmClient.apiKey = null;
    }

    const nextAuth = { ...(existing.auth || {}), ...(llmClient.config.auth || {}) };
    if (auth_type) nextAuth.type = auth_type;
    if (auth_url !== undefined) nextAuth.auth_url = auth_url;
    if (auth_client_id !== undefined) nextAuth.client_id = auth_client_id;
    if (auth_scope !== undefined) nextAuth.scope = auth_scope;
    if (auth_audience !== undefined) nextAuth.audience = auth_audience;
    if (auth_client_secret) {
      nextAuth.client_secret = auth_client_secret;
    } else if (clear_auth_secret) {
      delete nextAuth.client_secret;
    }
    if (auth_extra_header_name !== undefined || auth_extra_header_value !== undefined) {
      const currentExtra = nextAuth.extra_header || {};
      const nextExtra = {
        name:
          auth_extra_header_name !== undefined ? auth_extra_header_name : currentExtra.name || '',
        value:
          auth_extra_header_value !== undefined
            ? auth_extra_header_value
            : currentExtra.value || '',
      };
      if (nextExtra.name || nextExtra.value) {
        nextAuth.extra_header = nextExtra;
      } else {
        delete nextAuth.extra_header;
      }
    }
    if (clear_auth_extra_header) {
      delete nextAuth.extra_header;
    }

    llmClient.config.auth = nextAuth;
    llmClient.updateConfig({
      ...existing,
      ...llmClient.config,
      provider: llmClient.provider,
      auth: nextAuth,
    });

    await savePersistedLLMConfig({
      ...existing,
      ...llmClient.config,
      provider: llmClient.provider,
      auth: nextAuth,
    });
    logAudit('llm.config_update', {
      provider: llmClient.provider,
      model: llmClient.config.model,
      base_url: llmClient.config.base_url || llmClient.getBaseUrl(),
      hasApiKey: !!llmClient.config.api_key,
      auth_type: nextAuth?.type || 'none',
    });

    res.json({
      success: true,
      message: 'LLM configuration updated',
      config: {
        provider: llmClient.provider,
        model: llmClient.config.model,
        temperature: llmClient.config.temperature,
        base_url: llmClient.config.base_url || llmClient.getBaseUrl(),
      },
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
        const override = typeof req.query.base_url === 'string' ? req.query.base_url.trim() : '';
        const baseUrl = override || llmClient.config.base_url || 'http://localhost:11434';
        const response = await fetch(`${baseUrl}/api/tags`);
        const data = await response.json();
        const models = data.models?.map(m => m.name) || [];
        return res.json({ models });
      } catch (error) {
        return res.json({ models: [], error: 'Could not fetch Ollama models: ' + error.message });
      }
    }

    // Common models for each provider
    const providerModels = {
      openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
      anthropic: [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
      ],
      gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
      azure: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
      groq: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
      together: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
      openrouter: [
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o',
        'google/gemini-pro-1.5',
        'meta-llama/llama-3.3-70b-instruct',
      ],
      custom: [],
    };

    const models = providerModels[llmClient.provider] || [];
    res.json({ models });
  } catch (error) {
    console.error('[LLM/Models] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
