/**
 * Workflow Debugger
 * Step-through debugging for workflows with breakpoints and variable inspection
 */

import { getMCPManager } from './MCPManager.js';
import { createLLMClient } from './LLMClient.js';
import { createSandboxVM } from './SandboxEngine.js';

export class WorkflowDebugger {
  constructor(workflowEngine) {
    this.engine = workflowEngine;
    this.mcpManager = getMCPManager();
    this.activeSessions = new Map(); // sessionId -> debug state
  }

  /**
   * Start a debug session
   */
  async startDebugSession(workflowId, inputData, config = {}) {
    const {
      breakpoints = [], // Array of node IDs
      stepMode = false, // Pause at every node
      llmConfig = {},
    } = config;

    const sessionId = `debug_${Date.now()}`;
    const workflow = this.engine.getWorkflow(workflowId);

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const debugState = {
      sessionId,
      workflowId,
      workflow,
      inputData,
      breakpoints: new Set(breakpoints),
      stepMode,
      currentNode: null,
      context: {
        input: inputData,
        steps: {},
        logs: [],
      },
      executionLog: [],
      status: 'ready',
      pausePromise: null,
      pauseResolve: null,
      llmConfig,
    };

    this.activeSessions.set(sessionId, debugState);

    console.log(`[Debugger] Started session ${sessionId} for workflow ${workflowId}`);
    console.log(`[Debugger] Breakpoints: ${Array.from(breakpoints).join(', ') || 'none'}`);
    console.log(`[Debugger] Step mode: ${stepMode}`);

    return {
      sessionId,
      status: 'ready',
      workflow: {
        id: workflow.id,
        name: workflow.name,
        nodeCount: workflow.nodes.length,
      },
    };
  }

  /**
   * Execute workflow with debugging
   */
  async executeWithDebug(sessionId) {
    const state = this.activeSessions.get(sessionId);
    if (!state) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    state.status = 'running';

    try {
      // Prepare execution
      const { workflow, context } = state;
      const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
      const adjacency = {};

      workflow.edges.forEach(edge => {
        if (!adjacency[edge.from]) adjacency[edge.from] = [];
        adjacency[edge.from].push(edge.to);
      });

      // Find start nodes
      const incomingEdges = new Set(workflow.edges.map(e => e.to));
      const startNodes = workflow.nodes.filter(
        n => !incomingEdges.has(n.id) || n.type === 'trigger'
      );

      const queue = [...startNodes];
      const visited = new Set();
      const results = {};

      // Initialize LLM client
      let llmClient = null;
      if (state.llmConfig && state.llmConfig.provider) {
        llmClient = createLLMClient(state.llmConfig);
      } else {
        llmClient = createLLMClient({
          llm: {
            provider: 'ollama',
            model: 'llama3.1:8b',
            base_url: 'http://localhost:11434',
          },
        });
      }

      // Execute nodes with debug support
      while (queue.length > 0) {
        const node = queue.shift();

        if (visited.has(node.id)) continue;

        // Check dependencies
        const incoming = workflow.edges.filter(e => e.to === node.id);
        const ready = incoming.every(e => results[e.from] !== undefined);

        if (!ready && incoming.length > 0) {
          queue.push(node);
          continue;
        }

        // Check for breakpoint or step mode
        if (state.breakpoints.has(node.id) || state.stepMode) {
          state.currentNode = node;
          state.status = 'paused';

          console.log(`[Debugger] Paused at node ${node.id} (${node.type})`);

          // Create pause promise
          await new Promise(resolve => {
            state.pauseResolve = resolve;
            state.pausePromise = new Promise(r => {
              state.pauseResolve = r;
            });
          });

          // Check if aborted
          if (state.status === 'aborted') {
            throw new Error('Execution aborted by user');
          }

          state.status = 'running';
        }

        visited.add(node.id);
        state.currentNode = node;

        // Execute node
        try {
          const result = await this.executeNode(node, context, llmClient, state);
          results[node.id] = result;
          context.steps[node.id] = result;

          state.executionLog.push({
            nodeId: node.id,
            type: node.type,
            status: 'success',
            output: result,
            timestamp: new Date().toISOString(),
          });

          console.log(`[Debugger] Executed node ${node.id}: success`);
        } catch (error) {
          state.executionLog.push({
            nodeId: node.id,
            type: node.type,
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString(),
          });

          console.error(`[Debugger] Node ${node.id} failed:`, error.message);

          // Optionally stop on error
          if (state.stopOnError !== false) {
            throw error;
          }
        }

        // Add next nodes
        const nextNodes = (adjacency[node.id] || []).map(id => nodeMap.get(id));
        queue.push(...nextNodes);
      }

      state.status = 'completed';
      state.currentNode = null;

      return {
        sessionId,
        status: 'completed',
        results: context.steps,
        executionLog: state.executionLog,
      };
    } catch (error) {
      state.status = 'error';
      state.error = error.message;

      return {
        sessionId,
        status: 'error',
        error: error.message,
        executionLog: state.executionLog,
      };
    }
  }

  /**
   * Execute a single node (similar to WorkflowEngine but with logging)
   */
  async executeNode(node, context, llmClient, debugState) {
    const data = node.data || {};

    debugState.context.logs.push({
      nodeId: node.id,
      message: `Executing ${node.type} node`,
      timestamp: new Date().toISOString(),
    });

    switch (node.type) {
      case 'trigger':
        return context.input;

      case 'tool': {
        const serverName = data.server;
        const toolName = data.tool;
        let args = data.args || {};

        // Parse args if string
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch (e) {
            args = {};
          }
        }

        // Variable substitution
        const argsStr = JSON.stringify(args);
        const substituted = this.substituteVariables(argsStr, context.steps);
        args = JSON.parse(substituted);

        const result = await this.mcpManager.callTool(serverName, toolName, args);
        return this.extractToolOutput(result);
      }

      case 'llm': {
        if (!llmClient) {
          throw new Error('LLM client not configured');
        }

        let prompt = data.prompt || '';
        prompt = this.substituteVariables(prompt, context.steps);

        const response = await llmClient.chat({
          messages: [{ role: 'user', content: prompt }],
          system: data.systemPrompt,
        });

        return response.content;
      }

      case 'javascript': {
        const vm = createSandboxVM({
          timeout: 5000,
          sandbox: {
            input: context.steps,
            context: context,
            console: {
              log: (...args) => {
                debugState.context.logs.push({
                  nodeId: node.id,
                  message: args.join(' '),
                  type: 'log',
                  timestamp: new Date().toISOString(),
                });
              },
            },
          },
        });

        const wrappedCode = `(function() { ${data.code} })()`;
        return vm.run(wrappedCode);
      }

      case 'assert': {
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
            passed = outputStr.includes(expected);
            message = passed ? `✓ Contains "${expected}"` : `✗ Does not contain "${expected}"`;
            break;
          case 'equals':
            passed = outputStr === expected;
            message = passed ? `✓ Equals "${expected}"` : `✗ Does not equal "${expected}"`;
            break;
          case 'exists':
            passed = prevOutput !== null && prevOutput !== undefined;
            message = passed ? '✓ Output exists' : '✗ Output does not exist';
            break;
        }

        if (!passed) {
          throw new Error(`Assertion failed: ${message}`);
        }

        return { passed, message, output: prevOutput };
      }

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Variable substitution helper
   */
  substituteVariables(text, steps) {
    for (const [nodeId, result] of Object.entries(steps)) {
      const value =
        typeof result === 'object' && result.output !== undefined ? result.output : result;
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      text = text.replace(new RegExp(`\\{\\{${nodeId}\\.output\\}\\}`, 'g'), valueStr);
    }
    return text;
  }

  /**
   * Extract text output from tool result
   */
  extractToolOutput(result) {
    if (!result || !result.content) return '';

    let output = '';
    for (const item of result.content) {
      if (item.type === 'text') {
        output += item.text;
      }
    }

    return output || JSON.stringify(result);
  }

  /**
   * Continue execution (resume from pause)
   */
  resume(sessionId) {
    const state = this.activeSessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (state.status !== 'paused') {
      throw new Error(`Session ${sessionId} is not paused`);
    }

    console.log(`[Debugger] Resuming session ${sessionId}`);

    if (state.pauseResolve) {
      state.pauseResolve();
      state.pauseResolve = null;
    }

    return { status: 'resumed' };
  }

  /**
   * Step to next node
   */
  step(sessionId) {
    // Same as resume when in step mode
    return this.resume(sessionId);
  }

  /**
   * Abort execution
   */
  abort(sessionId) {
    const state = this.activeSessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log(`[Debugger] Aborting session ${sessionId}`);

    state.status = 'aborted';

    if (state.pauseResolve) {
      state.pauseResolve();
      state.pauseResolve = null;
    }

    return { status: 'aborted' };
  }

  /**
   * Get current debug state
   */
  getState(sessionId) {
    const state = this.activeSessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      sessionId: state.sessionId,
      workflowId: state.workflowId,
      status: state.status,
      currentNode: state.currentNode
        ? {
            id: state.currentNode.id,
            type: state.currentNode.type,
            data: state.currentNode.data,
          }
        : null,
      variables: state.context.steps,
      logs: state.context.logs,
      executionLog: state.executionLog,
      breakpoints: Array.from(state.breakpoints),
      stepMode: state.stepMode,
    };
  }

  /**
   * Inspect variables at current state
   */
  inspectVariables(sessionId) {
    const state = this.activeSessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      input: state.context.input,
      steps: state.context.steps,
      currentNode: state.currentNode?.id,
    };
  }

  /**
   * Add breakpoint
   */
  addBreakpoint(sessionId, nodeId) {
    const state = this.activeSessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    state.breakpoints.add(nodeId);
    console.log(`[Debugger] Added breakpoint at ${nodeId}`);

    return {
      breakpoints: Array.from(state.breakpoints),
    };
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(sessionId, nodeId) {
    const state = this.activeSessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    state.breakpoints.delete(nodeId);
    console.log(`[Debugger] Removed breakpoint at ${nodeId}`);

    return {
      breakpoints: Array.from(state.breakpoints),
    };
  }

  /**
   * End debug session
   */
  endSession(sessionId) {
    const state = this.activeSessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Abort if running
    if (state.status === 'running' || state.status === 'paused') {
      this.abort(sessionId);
    }

    this.activeSessions.delete(sessionId);
    console.log(`[Debugger] Ended session ${sessionId}`);

    return { status: 'ended' };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.entries()).map(([id, state]) => ({
      sessionId: id,
      workflowId: state.workflowId,
      status: state.status,
      currentNode: state.currentNode?.id,
    }));
  }
}

// Singleton
let instance = null;
export function getWorkflowDebugger(engine) {
  if (!instance && engine) {
    instance = new WorkflowDebugger(engine);
  }
  return instance;
}

export default WorkflowDebugger;
