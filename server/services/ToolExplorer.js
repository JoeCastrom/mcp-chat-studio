/**
 * Tool Explorer
 * Visual tool explorer with usage statistics and metrics
 */

import { getMCPManager } from './MCPManager.js';

export class ToolExplorer {
  constructor() {
    this.mcpManager = getMCPManager();
    this.stats = new Map(); // toolKey -> statistics
  }

  /**
   * Record tool execution
   */
  recordExecution(serverName, toolName, duration, success, error = null) {
    const key = `${serverName}:${toolName}`;

    if (!this.stats.has(key)) {
      this.stats.set(key, {
        serverName,
        toolName,
        totalCalls: 0,
        successCount: 0,
        failureCount: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        latencies: [],
        errors: [],
        lastCalled: null,
        firstCalled: null
      });
    }

    const stat = this.stats.get(key);

    stat.totalCalls++;
    stat.lastCalled = new Date().toISOString();

    if (!stat.firstCalled) {
      stat.firstCalled = stat.lastCalled;
    }

    if (success) {
      stat.successCount++;
      stat.totalDuration += duration;
      stat.minDuration = Math.min(stat.minDuration, duration);
      stat.maxDuration = Math.max(stat.maxDuration, duration);

      // Keep last 100 latencies for percentile calculations
      stat.latencies.push(duration);
      if (stat.latencies.length > 100) {
        stat.latencies.shift();
      }
    } else {
      stat.failureCount++;

      // Keep last 10 errors
      stat.errors.push({
        message: error || 'Unknown error',
        timestamp: stat.lastCalled
      });
      if (stat.errors.length > 10) {
        stat.errors.shift();
      }
    }
  }

  /**
   * Get statistics for all tools
   */
  getAllStats() {
    const results = [];

    for (const [key, stat] of this.stats.entries()) {
      results.push(this.calculateMetrics(stat));
    }

    // Sort by total calls descending
    results.sort((a, b) => b.totalCalls - a.totalCalls);

    return results;
  }

  /**
   * Get statistics for a specific tool
   */
  getToolStats(serverName, toolName) {
    const key = `${serverName}:${toolName}`;
    const stat = this.stats.get(key);

    if (!stat) {
      return {
        serverName,
        toolName,
        totalCalls: 0,
        successCount: 0,
        failureCount: 0,
        message: 'No usage data available'
      };
    }

    return this.calculateMetrics(stat);
  }

  /**
   * Calculate metrics from raw stats
   */
  calculateMetrics(stat) {
    const successRate = stat.totalCalls > 0
      ? (stat.successCount / stat.totalCalls) * 100
      : 0;

    const avgDuration = stat.successCount > 0
      ? stat.totalDuration / stat.successCount
      : 0;

    // Calculate percentiles
    const latencies = [...stat.latencies].sort((a, b) => a - b);
    const p50 = this.percentile(latencies, 50);
    const p95 = this.percentile(latencies, 95);
    const p99 = this.percentile(latencies, 99);

    return {
      serverName: stat.serverName,
      toolName: stat.toolName,
      totalCalls: stat.totalCalls,
      successCount: stat.successCount,
      failureCount: stat.failureCount,
      successRate: Math.round(successRate * 10) / 10,
      avgDuration: Math.round(avgDuration),
      minDuration: stat.minDuration === Infinity ? 0 : stat.minDuration,
      maxDuration: stat.maxDuration,
      p50Duration: p50,
      p95Duration: p95,
      p99Duration: p99,
      recentErrors: stat.errors,
      lastCalled: stat.lastCalled,
      firstCalled: stat.firstCalled
    };
  }

  /**
   * Calculate percentile
   */
  percentile(arr, p) {
    if (arr.length === 0) return 0;

    const index = (p / 100) * (arr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return arr[lower];
    }

    return arr[lower] * (1 - weight) + arr[upper] * weight;
  }

  /**
   * Get leaderboard (most used tools)
   */
  getLeaderboard(limit = 10) {
    const stats = this.getAllStats();
    return stats.slice(0, limit);
  }

  /**
   * Get tools by server
   */
  getStatsByServer(serverName) {
    const results = [];

    for (const [key, stat] of this.stats.entries()) {
      if (stat.serverName === serverName) {
        results.push(this.calculateMetrics(stat));
      }
    }

    results.sort((a, b) => b.totalCalls - a.totalCalls);

    return results;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const stats = this.getAllStats();

    const totalTools = stats.length;
    const totalCalls = stats.reduce((sum, s) => sum + s.totalCalls, 0);
    const totalSuccess = stats.reduce((sum, s) => sum + s.successCount, 0);
    const totalFailures = stats.reduce((sum, s) => sum + s.failureCount, 0);

    const overallSuccessRate = totalCalls > 0
      ? (totalSuccess / totalCalls) * 100
      : 0;

    // Find problematic tools (success rate < 50%)
    const problematicTools = stats.filter(s => s.successRate < 50 && s.totalCalls > 5);

    // Find slow tools (p95 > 2000ms)
    const slowTools = stats.filter(s => s.p95Duration > 2000);

    return {
      totalTools,
      totalCalls,
      totalSuccess,
      totalFailures,
      overallSuccessRate: Math.round(overallSuccessRate * 10) / 10,
      problematicTools: problematicTools.map(t => ({
        server: t.serverName,
        tool: t.toolName,
        successRate: t.successRate
      })),
      slowTools: slowTools.map(t => ({
        server: t.serverName,
        tool: t.toolName,
        p95Duration: t.p95Duration
      }))
    };
  }

  /**
   * Reset statistics
   */
  resetStats(serverName = null, toolName = null) {
    if (serverName && toolName) {
      // Reset specific tool
      const key = `${serverName}:${toolName}`;
      this.stats.delete(key);
      return { message: `Stats reset for ${serverName}:${toolName}` };
    } else if (serverName) {
      // Reset all tools for a server
      let count = 0;
      for (const key of this.stats.keys()) {
        if (key.startsWith(`${serverName}:`)) {
          this.stats.delete(key);
          count++;
        }
      }
      return { message: `Stats reset for ${count} tools on ${serverName}` };
    } else {
      // Reset all stats
      const count = this.stats.size;
      this.stats.clear();
      return { message: `All stats reset (${count} tools)` };
    }
  }

  /**
   * Export statistics
   */
  exportStats(format = 'json') {
    const stats = this.getAllStats();

    if (format === 'json') {
      return JSON.stringify(stats, null, 2);
    } else if (format === 'csv') {
      const headers = [
        'Server', 'Tool', 'Total Calls', 'Success', 'Failure', 'Success Rate %',
        'Avg Duration (ms)', 'Min Duration (ms)', 'Max Duration (ms)',
        'P50 (ms)', 'P95 (ms)', 'P99 (ms)', 'Last Called'
      ];

      const rows = [headers.join(',')];

      for (const stat of stats) {
        const row = [
          stat.serverName,
          stat.toolName,
          stat.totalCalls,
          stat.successCount,
          stat.failureCount,
          stat.successRate,
          stat.avgDuration,
          stat.minDuration,
          stat.maxDuration,
          stat.p50Duration,
          stat.p95Duration,
          stat.p99Duration,
          stat.lastCalled || ''
        ];
        rows.push(row.join(','));
      }

      return rows.join('\n');
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  /**
   * Get usage trends over time
   */
  getTrends(hours = 24) {
    // This is a simplified version - in production you'd want to track hourly buckets
    const now = Date.now();
    const cutoff = now - (hours * 60 * 60 * 1000);

    const recentTools = [];

    for (const [key, stat] of this.stats.entries()) {
      if (stat.lastCalled) {
        const lastCalledTime = new Date(stat.lastCalled).getTime();
        if (lastCalledTime >= cutoff) {
          recentTools.push({
            serverName: stat.serverName,
            toolName: stat.toolName,
            totalCalls: stat.totalCalls,
            lastCalled: stat.lastCalled
          });
        }
      }
    }

    recentTools.sort((a, b) => new Date(b.lastCalled).getTime() - new Date(a.lastCalled).getTime());

    return {
      period: `${hours} hours`,
      activeTools: recentTools.length,
      tools: recentTools
    };
  }

  /**
   * Get example usage for a tool
   */
  async getToolExample(serverName, toolName) {
    try {
      const response = await fetch('/api/mcp/tools');
      const data = await response.json();

      const tool = data.tools.find(t => t.serverName === serverName && t.name === toolName);

      if (!tool) {
        return null;
      }

      // Generate example args from schema
      let exampleArgs = {};
      if (tool.inputSchema?.properties) {
        for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
          if (prop.type === 'string') {
            exampleArgs[key] = prop.default || prop.example || 'example';
          } else if (prop.type === 'number') {
            exampleArgs[key] = prop.default || prop.example || 0;
          } else if (prop.type === 'boolean') {
            exampleArgs[key] = prop.default !== undefined ? prop.default : true;
          } else if (prop.type === 'array') {
            exampleArgs[key] = prop.default || [];
          } else if (prop.type === 'object') {
            exampleArgs[key] = prop.default || {};
          }
        }
      }

      return {
        serverName,
        toolName,
        description: tool.description,
        exampleArgs,
        schema: tool.inputSchema
      };

    } catch (error) {
      return null;
    }
  }
}

// Singleton
let instance = null;
export function getToolExplorer() {
  if (!instance) {
    instance = new ToolExplorer();
  }
  return instance;
}

export default ToolExplorer;
