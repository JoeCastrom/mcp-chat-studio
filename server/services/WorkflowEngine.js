import { getMCPManager } from './MCPManager.js';
import { createLLMClient } from './LLMClient.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSandboxVM } from './SandboxEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKFLOWS_FILE = path.join(__dirname, '../../workflows.json');

// Zod schema for workflow validation
const NodeDataSchema = z
  .object({
    server: z.string().optional(),
    tool: z.string().optional(),
    args: z.union([z.string(), z.record(z.any())]).optional(),
    systemPrompt: z.string().optional(),
    prompt: z.string().optional(),
    code: z.string().optional(),
    condition: z.string().optional(),
    expected: z.string().optional(),
  })
  .passthrough();

const NodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['trigger', 'tool', 'llm', 'javascript', 'assert']),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: NodeDataSchema.optional().default({}),
});

const EdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

// Ensure workflows file exists
if (!fs.existsSync(WORKFLOWS_FILE)) {
  fs.writeFileSync(WORKFLOWS_FILE, '[]');
}

export class WorkflowEngine {
  constructor() {
    this.mcpManager = getMCPManager();
    // We'll create LLM client on demand or pass it in context
  }

  // CRUD Operations
  getAllWorkflows() {
    try {
      const data = fs.readFileSync(WORKFLOWS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read workflows:', error);
      return [];
    }
  }

  getWorkflow(id) {
    const workflows = this.getAllWorkflows();
    return workflows.find(w => w.id === id);
  }

  saveWorkflow(workflow) {
    // Validate workflow structure
    const validationResult = WorkflowSchema.safeParse(workflow);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid workflow structure: ${errors}`);
    }

    const workflows = this.getAllWorkflows();
    const index = workflows.findIndex(w => w.id === workflow.id);

    if (index >= 0) {
      workflows[index] = { ...workflows[index], ...workflow, updatedAt: new Date().toISOString() };
    } else {
      workflows.push({
        ...workflow,
        id: workflow.id || `wf_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2));
    return workflow.id || workflows[workflows.length - 1].id;
  }

  deleteWorkflow(id) {
    let workflows = this.getAllWorkflows();
    workflows = workflows.filter(w => w.id !== id);
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2));
  }

  // Execution Logic
  async executeWorkflow(workflowId, inputData = {}, llmConfig = {}, sessionId = null) {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    const context = {
      input: inputData,
      steps: {}, // Store outputs of each node
      logs: [],
      lastNodeId: null,
    };

    const executionLog = [];

    // Simple topological sort / dependency resolution
    // For now, we assume linear or simple branching flows that can be traversed
    // We'll find start nodes and follow edges

    // Map nodes and edges for easy access
    const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
    const adjacency = {}; // node.id -> [next_node_ids]

    workflow.edges.forEach(edge => {
      if (!adjacency[edge.from]) adjacency[edge.from] = [];
      adjacency[edge.from].push(edge.to);
    });

    // Find start nodes (nodes with no incoming edges or type 'trigger')
    const incomingEdges = new Set(workflow.edges.map(e => e.to));
    const startNodes = workflow.nodes.filter(n => !incomingEdges.has(n.id) || n.type === 'trigger');

    // Queue for BFS execution
    const queue = [...startNodes];
    const visited = new Set();
    const results = {}; // node.id -> result

    // Initialize custom LLM client if needed for this execution
    let llmClient = null;
    if (llmConfig && llmConfig.provider) {
      llmClient = createLLMClient(llmConfig);
    } else {
      // Create default LLM client with Ollama if no config provided
      llmClient = createLLMClient({
        provider: 'ollama',
        model: 'llama3.1:8b',
        base_url: 'http://localhost:11434',
      });
      console.log('[Workflow] No LLM config provided, using default Ollama llama3.1:8b');
    }

    while (queue.length > 0) {
      const node = queue.shift();

      // If we've already visited this node in this path, skip to avoid cycles
      // (This is a simplified execution model)
      if (visited.has(node.id)) continue;

      // Check if all dependencies are met (all incoming edges have results)
      const incoming = workflow.edges.filter(e => e.to === node.id);
      const ready = incoming.every(e => results[e.from] !== undefined);

      if (!ready && incoming.length > 0) {
        // Push back to end of queue to wait for dependencies
        queue.push(node);
        continue;
      }

      visited.add(node.id);

      try {
        console.log(`[Workflow] Executing node ${node.id} (${node.type})`);
        const result = await this.executeNode(node, context, llmClient, sessionId);
        results[node.id] = result;
        context.steps[node.id] = result;
        context.lastNodeId = node.id;

        executionLog.push({
          nodeId: node.id,
          type: node.type,
          status: 'success',
          output: result,
          timestamp: new Date().toISOString(),
        });

        // Add next nodes to queue
        const nextNodes = (adjacency[node.id] || []).map(id => nodeMap.get(id));
        queue.push(...nextNodes);
      } catch (error) {
        console.error(`[Workflow] Node ${node.id} failed:`, error);
        executionLog.push({
          nodeId: node.id,
          type: node.type,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        // Stop execution on error
        throw new Error(`Node ${node.label || node.id} failed: ${error.message}`);
      }
    }

    return {
      status: 'completed',
      results,
      logs: executionLog,
    };
  }

  async executeNode(node, context, llmClient, sessionId = null) {
    // Variable substitution in node data
    const data = this.substituteVariables(node.data, context);

    switch (node.type) {
      case 'trigger':
        return context.input; // Pass through initial input

      case 'tool': {
        if (!data.server || !data.tool)
          throw new Error('Tool node missing server or tool selection');
        let args = data.args;
        if (typeof args === 'string') {
          const trimmed = args.trim();
          if (trimmed.length === 0) {
            args = {};
          } else {
            try {
              args = JSON.parse(trimmed);
            } catch (error) {
              throw new Error(`Tool args must be valid JSON: ${error.message}`);
            }
          }
        }
        if (args === undefined || args === null) {
          args = {};
        }
        if (typeof args !== 'object' || Array.isArray(args)) {
          throw new Error('Tool args must be a JSON object');
        }
        let toolDef = null;
        try {
          const { tools } = await this.mcpManager.listTools(data.server, sessionId);
          toolDef = (tools || []).find(tool => tool.name === data.tool) || null;
        } catch (error) {
          toolDef = null;
        }
        const properties = toolDef?.inputSchema?.properties || null;
        const additionalProps = toolDef?.inputSchema?.additionalProperties;
        const required = toolDef?.inputSchema?.required || [];
        if (required.length > 0) {
          const missing = required.filter(key => !(key in args));
          if (missing.length > 0) {
            throw new Error(`Missing required args: ${missing.join(', ')}`);
          }
        }
        if (properties && additionalProps === false) {
          const unknown = Object.keys(args).filter(key => !(key in properties));
          if (unknown.length > 0) {
            throw new Error(`Unexpected args: ${unknown.join(', ')}`);
          }
        }
        return await this.mcpManager.callTool(data.server, data.tool, args, sessionId);
      }

      case 'llm': {
        let prompt = data.prompt;
        if (!prompt || String(prompt).trim().length === 0) {
          if (context.lastNodeId && context.steps[context.lastNodeId] !== undefined) {
            const prevOutput = context.steps[context.lastNodeId];
            if (typeof prevOutput === 'string') {
              prompt = prevOutput;
            } else {
              prompt = `Result: ${JSON.stringify(prevOutput)}`;
            }
          } else {
            throw new Error('LLM node missing prompt');
          }
        }
        // If no specific client provided, we need one (could fetch default from config)
        if (!llmClient) {
          // Fallback to reading config file to create default client
          // For now, assume one is passed or throw
          throw new Error('LLM execution requires LLM configuration');
        }

        const messages = [];
        if (data.systemPrompt) {
          messages.push({ role: 'system', content: data.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await llmClient.chat(messages, {});
        const content = response?.choices?.[0]?.message?.content;
        return content !== undefined ? content : response;
      }

      case 'javascript':
        // Execute JavaScript in sandboxed environment
        try {
          const vm = createSandboxVM({
            timeout: 5000, // 5 second timeout
            sandbox: {
              input: context.steps,
              context: context,
              console: {
                log: (...args) => console.log('[Workflow JS]', ...args),
                error: (...args) => console.error('[Workflow JS]', ...args),
              },
            },
          });

          // Wrap code to return result
          const wrappedCode = `
            (function() {
              ${data.code}
            })()
          `;

          const result = vm.run(wrappedCode);
          return result;
        } catch (e) {
          throw new Error(`Script execution failed: ${e.message}`);
        }

      case 'assert': {
        // Get the previous node's output
        const prevNodeIds = Object.keys(context.steps);
        const prevOutput =
          prevNodeIds.length > 0 ? context.steps[prevNodeIds[prevNodeIds.length - 1]] : null;
        const outputStr =
          typeof prevOutput === 'string' ? prevOutput : JSON.stringify(prevOutput || '');
        const expected = data.expected || '';
        const condition = data.condition || 'contains';

        let passed = false;
        let message = '';

        switch (condition) {
          case 'contains':
            passed = outputStr.toLowerCase().includes(expected.toLowerCase());
            message = passed
              ? `Output contains "${expected}"`
              : `Output does not contain "${expected}"`;
            break;
          case 'equals':
            passed = outputStr === expected;
            message = passed
              ? `Output equals expected value`
              : `Output "${outputStr.substring(0, 50)}..." does not equal "${expected}"`;
            break;
          case 'not_contains':
            passed = !outputStr.toLowerCase().includes(expected.toLowerCase());
            message = passed
              ? `Output does not contain "${expected}"`
              : `Output contains "${expected}" (unexpected)`;
            break;
          case 'truthy':
            passed =
              !!prevOutput &&
              prevOutput !== 'false' &&
              prevOutput !== 'null' &&
              prevOutput !== 'undefined';
            message = passed ? 'Output is truthy' : 'Output is falsy';
            break;
          case 'length_gt': {
            const length =
              typeof prevOutput === 'string'
                ? prevOutput.length
                : Array.isArray(prevOutput)
                  ? prevOutput.length
                  : 0;
            const threshold = parseInt(expected) || 0;
            passed = length > threshold;
            message = passed
              ? `Length ${length} > ${threshold}`
              : `Length ${length} <= ${threshold}`;
            break;
          }
        }

        return {
          assertion: true,
          passed,
          condition,
          expected,
          message,
          actualOutput: outputStr.substring(0, 200),
        };
      }

      default:
        return null;
    }
  }

  substituteVariables(obj, context) {
    if (typeof obj === 'string') {
      // Replace {{nodeId.property}} or {{input.property}}
      return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const parts = path.split('.');
        let current = context.steps;

        // Handle 'input' root
        if (parts[0] === 'input') {
          current = context.input;
          parts.shift();
        } else if (parts[0] === 'prev') {
          const prevId = context.lastNodeId;
          if (!prevId) return match;
          parts.shift();
          current = context.steps[prevId];
        } else {
          // Handle node ID root
          const nodeId = parts.shift();
          current = context.steps[nodeId];
        }

        for (const part of parts) {
          if (current === undefined || current === null) return match;
          current = current[part];
        }

        return current !== undefined ? current : match;
      });
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.substituteVariables(item, context));
    } else if (obj && typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        result[key] = this.substituteVariables(obj[key], context);
      }
      return result;
    }
    return obj;
  }
}

// Singleton
let instance = null;
export function getWorkflowEngine() {
  if (!instance) {
    instance = new WorkflowEngine();
  }
  return instance;
}
