/**
 * Chat Routes with OAuth-aware MCP tool support
 * Handles chat completions with optional MCP tool support
 * Supports OBO (On-Behalf-Of) by passing user tokens to MCP servers
 */

import { Router } from 'express';
import { getLLMClient } from '../services/LLMClient.js';
import { getMCPManager } from '../services/MCPManager.js';
import { getOAuthManager } from '../services/OAuthManager.js';

const router = Router();

/**
 * Helper to get session ID from request
 */
function getSessionId(req) {
  return req.cookies?.sessionId || req.headers['x-session-id'];
}

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a chat message
 *     description: Send messages to the LLM with optional MCP tool support
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [system, user, assistant, tool]
 *                     content:
 *                       type: string
 *               useTools:
 *                 type: boolean
 *                 default: true
 *               stream:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Chat response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 choices:
 *                   type: array
 *                 toolResults:
 *                   type: array
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { messages, useTools = true, stream = false } = req.body;
    const sessionId = getSessionId(req);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const llm = getLLMClient();
    const mcpManager = getMCPManager();

    // Get MCP tools if enabled (include user's connected servers)
    // Tools now use simplified schemas to reduce payload size
    let tools = null;
    if (useTools) {
      tools = mcpManager.getToolsForLLM(sessionId);
      console.log(
        `[Chat] Using ${tools.length} MCP tools with simplified schemas (session: ${sessionId?.slice(0, 8) || 'none'}...)`
      );
    }

    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        for await (const chunk of llm.chatStream(messages, {}, tools)) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming response
      let response;
      try {
        response = await llm.chat(messages, {}, tools);
      } catch (error) {
        if (useTools && tools?.length) {
          console.warn(
            `[Chat] LLM request failed with tools (${error.message}). Retrying without tools.`
          );
          response = await llm.chat(messages, {}, null);
          response.toolFallback = true;
          response.toolFallbackReason = error.message;
        } else {
          throw error;
        }
      }

      // Check if the model wants to call tools
      const choice = response.choices?.[0];

      if (choice?.message?.tool_calls) {
        // Process tool calls with session context
        const toolResults = await processToolCalls(choice.message.tool_calls, sessionId);

        // Send back with tool results for the client to continue the conversation
        return res.json({
          ...response,
          toolResults,
          requiresContinuation: true,
        });
      }

      res.json(response);
    }
  } catch (error) {
    console.error('[Chat] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat/continue
 * Continue a conversation after tool calls
 */
router.post('/continue', async (req, res) => {
  try {
    const { messages, useTools = true } = req.body;
    const sessionId = getSessionId(req);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const llm = getLLMClient();
    const mcpManager = getMCPManager();

    let tools = null;
    if (useTools) {
      tools = mcpManager.getToolsForLLM(sessionId);
    }

    // Keep calling until no more tool calls
    const currentMessages = [...messages];
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (iterations < maxIterations) {
      iterations++;

      const response = await llm.chat(currentMessages, {}, tools);
      const choice = response.choices?.[0];

      if (!choice?.message?.tool_calls) {
        // No more tool calls, return final response
        return res.json(response);
      }

      // Process tool calls with session context
      const toolResults = await processToolCalls(choice.message.tool_calls, sessionId);

      // Add assistant message with tool calls
      currentMessages.push(choice.message);

      // Add tool results
      for (const result of toolResults) {
        currentMessages.push({
          role: 'tool',
          tool_call_id: result.tool_call_id,
          content: JSON.stringify(result.result),
        });
      }
    }

    res.status(500).json({ error: 'Max tool call iterations reached' });
  } catch (error) {
    console.error('[Chat/Continue] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process tool calls from the LLM response
 * @param {Array} toolCalls - Tool calls from LLM
 * @param {string} sessionId - User session ID for OAuth-protected servers
 */
async function processToolCalls(toolCalls, sessionId = null) {
  const mcpManager = getMCPManager();
  const oauthManager = getOAuthManager();
  const results = [];

  // Get user's access token for OBO if authenticated
  let userToken = null;
  if (sessionId && oauthManager) {
    try {
      userToken = await oauthManager.getAccessToken(sessionId);
      if (userToken) {
        console.log(
          `[Chat] OBO: Using user token for tool calls (session: ${sessionId?.slice(0, 8)}...)`
        );
      }
    } catch (error) {
      console.log(`[Chat] No user token available: ${error.message}`);
    }
  }

  for (const toolCall of toolCalls) {
    try {
      const fullName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || '{}');

      console.log(
        `[Chat] Calling tool: ${fullName} (session: ${sessionId?.slice(0, 8) || 'none'}...)`
      );

      // Pass sessionId and userToken for OBO
      const result = await mcpManager.callToolByFullName(fullName, args, sessionId, userToken);

      results.push({
        tool_call_id: toolCall.id,
        name: fullName,
        result: result,
        success: true,
      });
    } catch (error) {
      console.error(`[Chat] Tool call failed:`, error.message);

      results.push({
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        result: { error: error.message },
        success: false,
      });
    }
  }

  return results;
}

export default router;
