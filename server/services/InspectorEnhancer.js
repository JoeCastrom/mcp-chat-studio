/**
 * Inspector Enhancer Service
 * Advanced features for MCP Inspector: timeline, bulk testing, diff
 */

import { getMCPManager } from './MCPManager.js';

export class InspectorEnhancer {
  constructor() {
    this.mcpManager = getMCPManager();
    this.timelines = new Map(); // sessionId -> timeline events
    this.bulkResults = new Map(); // testId -> results
  }

  /**
   * Start tracking timeline for a session
   */
  startTimeline(sessionId) {
    if (!this.timelines.has(sessionId)) {
      this.timelines.set(sessionId, []);
    }

    return {
      sessionId,
      started: new Date().toISOString(),
    };
  }

  /**
   * Log a timeline event
   */
  logEvent(sessionId, event) {
    if (!this.timelines.has(sessionId)) {
      this.startTimeline(sessionId);
    }

    const timeline = this.timelines.get(sessionId);

    const entry = {
      timestamp: new Date().toISOString(),
      type: event.type, // 'request', 'response', 'error', 'notification'
      direction: event.direction, // 'outgoing', 'incoming'
      serverName: event.serverName,
      method: event.method,
      data: event.data,
      duration: event.duration, // milliseconds
    };

    timeline.push(entry);

    // Keep only last 1000 events per session
    if (timeline.length > 1000) {
      timeline.shift();
    }

    return entry;
  }

  /**
   * Get timeline for a session
   */
  getTimeline(sessionId, options = {}) {
    const { serverName, method, type, limit = 100, offset = 0 } = options;

    let timeline = this.timelines.get(sessionId) || [];

    // Filter by criteria
    if (serverName) {
      timeline = timeline.filter(e => e.serverName === serverName);
    }
    if (method) {
      timeline = timeline.filter(e => e.method === method);
    }
    if (type) {
      timeline = timeline.filter(e => e.type === type);
    }

    // Pagination
    const total = timeline.length;
    const events = timeline.slice(offset, offset + limit);

    return {
      sessionId,
      total,
      offset,
      limit,
      events,
    };
  }

  /**
   * Clear timeline
   */
  clearTimeline(sessionId) {
    this.timelines.delete(sessionId);
    return { success: true };
  }

  /**
   * Run bulk test - execute tool with multiple inputs
   */
  async runBulkTest(config) {
    const {
      serverName,
      toolName,
      inputs = [], // Array of argument objects
      parallel = false,
      continueOnError = true,
    } = config;

    const testId = `bulk_${Date.now()}`;
    const results = {
      testId,
      serverName,
      toolName,
      total: inputs.length,
      completed: 0,
      successful: 0,
      failed: 0,
      results: [],
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
    };

    this.bulkResults.set(testId, results);

    const startTime = Date.now();

    try {
      if (parallel) {
        // Run all tests in parallel
        const promises = inputs.map((args, index) =>
          this.executeSingleTest(serverName, toolName, args, index)
        );

        const settled = await Promise.allSettled(promises);

        settled.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.results.push(result.value);
            results.successful++;
          } else {
            results.results.push({
              index,
              input: inputs[index],
              status: 'error',
              error: result.reason?.message || 'Unknown error',
              duration: 0,
            });
            results.failed++;
          }
          results.completed++;
        });
      } else {
        // Run tests sequentially
        for (let i = 0; i < inputs.length; i++) {
          try {
            const result = await this.executeSingleTest(serverName, toolName, inputs[i], i);
            results.results.push(result);
            results.successful++;
            results.completed++;
          } catch (error) {
            results.results.push({
              index: i,
              input: inputs[i],
              status: 'error',
              error: error.message,
              duration: 0,
            });
            results.failed++;
            results.completed++;

            if (!continueOnError) {
              break;
            }
          }
        }
      }

      results.endTime = new Date().toISOString();
      results.duration = Date.now() - startTime;

      // Calculate statistics
      const durations = results.results.filter(r => r.status === 'success').map(r => r.duration);

      if (durations.length > 0) {
        durations.sort((a, b) => a - b);
        results.stats = {
          avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
          minDuration: durations[0],
          maxDuration: durations[durations.length - 1],
          p50Duration: durations[Math.floor(durations.length * 0.5)],
          p95Duration: durations[Math.floor(durations.length * 0.95)],
        };
      }

      return results;
    } catch (error) {
      results.endTime = new Date().toISOString();
      results.duration = Date.now() - startTime;
      results.error = error.message;
      return results;
    }
  }

  /**
   * Execute single test case
   */
  async executeSingleTest(serverName, toolName, args, index) {
    const startTime = Date.now();

    try {
      const result = await this.mcpManager.callTool(serverName, toolName, args);
      const duration = Date.now() - startTime;

      return {
        index,
        input: args,
        status: 'success',
        output: result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        index,
        input: args,
        status: 'error',
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Get bulk test results
   */
  getBulkTestResults(testId) {
    const results = this.bulkResults.get(testId);

    if (!results) {
      throw new Error(`Bulk test ${testId} not found`);
    }

    return results;
  }

  /**
   * Compare two tool call results (diff)
   */
  async diffResults(config) {
    const { serverName, toolName, args1, args2, label1 = 'Result A', label2 = 'Result B' } = config;

    // Execute both calls
    const [result1, result2] = await Promise.all([
      this.mcpManager.callTool(serverName, toolName, args1),
      this.mcpManager.callTool(serverName, toolName, args2),
    ]);

    // Extract text content
    const text1 = this.extractText(result1);
    const text2 = this.extractText(result2);

    // Calculate differences
    const diff = this.calculateDiff(text1, text2);

    return {
      label1,
      label2,
      args1,
      args2,
      result1,
      result2,
      text1,
      text2,
      diff,
      identical: text1 === text2,
      similarity: this.calculateSimilarity(text1, text2),
    };
  }

  /**
   * Compare two existing results (no execution)
   */
  diffExistingResults(result1, result2, label1 = 'Result A', label2 = 'Result B') {
    const text1 = this.extractText(result1);
    const text2 = this.extractText(result2);

    const diff = this.calculateDiff(text1, text2);

    return {
      label1,
      label2,
      result1,
      result2,
      text1,
      text2,
      diff,
      identical: text1 === text2,
      similarity: this.calculateSimilarity(text1, text2),
    };
  }

  /**
   * Extract text from MCP result
   */
  extractText(result) {
    if (!result) return '';

    if (typeof result === 'string') return result;

    if (result.content && Array.isArray(result.content)) {
      return result.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }

    return JSON.stringify(result, null, 2);
  }

  /**
   * Calculate line-by-line diff
   */
  calculateDiff(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    const diff = [];
    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      const line1 = lines1[i] !== undefined ? lines1[i] : null;
      const line2 = lines2[i] !== undefined ? lines2[i] : null;

      if (line1 === null) {
        diff.push({ type: 'added', line: line2, lineNum: i + 1 });
      } else if (line2 === null) {
        diff.push({ type: 'removed', line: line1, lineNum: i + 1 });
      } else if (line1 !== line2) {
        diff.push({ type: 'changed', line1, line2, lineNum: i + 1 });
      } else {
        diff.push({ type: 'unchanged', line: line1, lineNum: i + 1 });
      }
    }

    return diff;
  }

  /**
   * Calculate similarity score (0-1)
   */
  calculateSimilarity(text1, text2) {
    if (text1 === text2) return 1.0;
    if (!text1 || !text2) return 0.0;

    // Simple Levenshtein-based similarity
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Export timeline to JSON
   */
  exportTimeline(sessionId, format = 'json') {
    const timeline = this.timelines.get(sessionId) || [];

    if (format === 'json') {
      return JSON.stringify(timeline, null, 2);
    } else if (format === 'csv') {
      return this.timelineToCSV(timeline);
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  /**
   * Convert timeline to CSV
   */
  timelineToCSV(timeline) {
    const headers = ['timestamp', 'type', 'direction', 'serverName', 'method', 'duration'];
    const rows = [headers.join(',')];

    timeline.forEach(event => {
      const row = [
        event.timestamp,
        event.type,
        event.direction,
        event.serverName,
        event.method,
        event.duration || 0,
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.timelines.keys()).map(sessionId => ({
      sessionId,
      eventCount: this.timelines.get(sessionId).length,
      lastEvent: this.timelines.get(sessionId).slice(-1)[0]?.timestamp,
    }));
  }

  /**
   * Cleanup old sessions (older than 1 hour)
   */
  cleanup(maxAge = 3600000) {
    const now = Date.now();

    for (const [sessionId, timeline] of this.timelines.entries()) {
      if (timeline.length === 0) continue;

      const lastEvent = timeline[timeline.length - 1];
      const age = now - new Date(lastEvent.timestamp).getTime();

      if (age > maxAge) {
        this.timelines.delete(sessionId);
        console.log(`[InspectorEnhancer] Cleaned up old timeline: ${sessionId}`);
      }
    }

    // Cleanup old bulk test results
    for (const [testId, results] of this.bulkResults.entries()) {
      const age = now - new Date(results.startTime).getTime();

      if (age > maxAge) {
        this.bulkResults.delete(testId);
        console.log(`[InspectorEnhancer] Cleaned up old bulk test: ${testId}`);
      }
    }
  }
}

// Singleton
let instance = null;
export function getInspectorEnhancer() {
  if (!instance) {
    instance = new InspectorEnhancer();

    // Auto-cleanup every 10 minutes
    setInterval(() => {
      instance.cleanup();
    }, 600000);
  }
  return instance;
}

export default InspectorEnhancer;
