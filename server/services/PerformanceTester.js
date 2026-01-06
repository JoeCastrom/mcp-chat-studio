/**
 * Performance Load Testing for MCP Servers
 * Tests throughput, latency, and concurrency handling
 */

import { getMCPManager } from './MCPManager.js';

export class PerformanceTester {
  constructor() {
    this.mcpManager = getMCPManager();
    this.activeTests = new Map(); // testId -> test state
  }

  /**
   * Run a load test on a tool
   * @param {object} config - Test configuration
   * @returns {object} Test results
   */
  async runLoadTest(config) {
    const {
      serverName,
      toolName,
      args = {},
      concurrency = 10,
      duration = 10000, // 10 seconds
      sessionId = null,
    } = config;

    const testId = `test_${Date.now()}`;
    const results = {
      testId,
      serverName,
      toolName,
      config: { concurrency, duration },
      startTime: new Date().toISOString(),
      endTime: null,
      requests: [],
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        avgLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        throughput: 0, // requests per second
        errors: [],
      },
    };

    this.activeTests.set(testId, { status: 'running', results });

    const startTime = Date.now();
    const endTime = startTime + duration;
    const workers = [];

    console.log(
      `[LoadTest] Starting test ${testId}: ${concurrency} concurrent workers for ${duration}ms`
    );

    // Create worker promises
    for (let i = 0; i < concurrency; i++) {
      workers.push(this.worker(testId, serverName, toolName, args, endTime, results, sessionId));
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    results.endTime = new Date().toISOString();

    // Calculate summary statistics
    this.calculateSummary(results);

    this.activeTests.get(testId).status = 'completed';
    console.log(
      `[LoadTest] Test ${testId} completed: ${results.summary.total} requests, ${results.summary.successful} successful`
    );

    return results;
  }

  /**
   * Worker function that makes repeated requests
   */
  async worker(testId, serverName, toolName, args, endTime, results, sessionId) {
    while (Date.now() < endTime) {
      const requestStart = Date.now();
      const request = {
        timestamp: new Date().toISOString(),
        latency: 0,
        success: false,
        error: null,
      };

      try {
        await this.mcpManager.callTool(serverName, toolName, args, sessionId);
        request.success = true;
      } catch (error) {
        request.error = error.message;
        results.summary.errors.push(error.message);
      }

      request.latency = Date.now() - requestStart;
      results.requests.push(request);
      results.summary.total++;

      if (request.success) {
        results.summary.successful++;
      } else {
        results.summary.failed++;
      }

      // Small delay to avoid overwhelming the server immediately
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Calculate summary statistics from results
   */
  calculateSummary(results) {
    const { requests, summary } = results;

    if (requests.length === 0) {
      return;
    }

    // Calculate latencies
    const latencies = requests.map(r => r.latency).sort((a, b) => a - b);
    summary.minLatency = latencies[0];
    summary.maxLatency = latencies[latencies.length - 1];
    summary.avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    // Calculate percentiles
    summary.p50Latency = this.percentile(latencies, 0.5);
    summary.p95Latency = this.percentile(latencies, 0.95);
    summary.p99Latency = this.percentile(latencies, 0.99);

    // Calculate throughput (requests per second)
    const durationSeconds = (new Date(results.endTime) - new Date(results.startTime)) / 1000;
    summary.throughput = summary.total / durationSeconds;

    // Deduplicate errors
    summary.errors = [...new Set(summary.errors)].slice(0, 10); // Keep only unique, limit to 10
  }

  /**
   * Calculate percentile from sorted array
   */
  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Run a stress test (gradually increase load)
   */
  async runStressTest(config) {
    const {
      serverName,
      toolName,
      args = {},
      startConcurrency = 1,
      maxConcurrency = 50,
      step = 5,
      stepDuration = 5000, // 5 seconds per step
      sessionId = null,
    } = config;

    const results = {
      testType: 'stress',
      serverName,
      toolName,
      startTime: new Date().toISOString(),
      steps: [],
    };

    console.log(
      `[StressTest] Starting stress test: ${startConcurrency} to ${maxConcurrency} by ${step}`
    );

    for (let concurrency = startConcurrency; concurrency <= maxConcurrency; concurrency += step) {
      console.log(`[StressTest] Testing with concurrency: ${concurrency}`);

      const stepResult = await this.runLoadTest({
        serverName,
        toolName,
        args,
        concurrency,
        duration: stepDuration,
        sessionId,
      });

      results.steps.push({
        concurrency,
        summary: stepResult.summary,
      });

      // Stop if error rate is too high
      if (stepResult.summary.failed / stepResult.summary.total > 0.5) {
        console.log(`[StressTest] Stopping: error rate exceeded 50%`);
        break;
      }
    }

    results.endTime = new Date().toISOString();
    return results;
  }

  /**
   * Run a spike test (sudden traffic burst)
   */
  async runSpikeTest(config) {
    const {
      serverName,
      toolName,
      args = {},
      normalConcurrency = 5,
      spikeConcurrency = 50,
      normalDuration = 10000,
      spikeDuration = 5000,
      sessionId = null,
    } = config;

    const results = {
      testType: 'spike',
      serverName,
      toolName,
      startTime: new Date().toISOString(),
      phases: [],
    };

    console.log(`[SpikeTest] Starting spike test`);

    // Phase 1: Normal load
    console.log(`[SpikeTest] Phase 1: Normal load (${normalConcurrency} workers)`);
    const normalResult = await this.runLoadTest({
      serverName,
      toolName,
      args,
      concurrency: normalConcurrency,
      duration: normalDuration,
      sessionId,
    });
    results.phases.push({
      phase: 'normal',
      concurrency: normalConcurrency,
      summary: normalResult.summary,
    });

    // Phase 2: Spike
    console.log(`[SpikeTest] Phase 2: Spike (${spikeConcurrency} workers)`);
    const spikeResult = await this.runLoadTest({
      serverName,
      toolName,
      args,
      concurrency: spikeConcurrency,
      duration: spikeDuration,
      sessionId,
    });
    results.phases.push({
      phase: 'spike',
      concurrency: spikeConcurrency,
      summary: spikeResult.summary,
    });

    // Phase 3: Recovery to normal
    console.log(`[SpikeTest] Phase 3: Recovery (${normalConcurrency} workers)`);
    const recoveryResult = await this.runLoadTest({
      serverName,
      toolName,
      args,
      concurrency: normalConcurrency,
      duration: normalDuration,
      sessionId,
    });
    results.phases.push({
      phase: 'recovery',
      concurrency: normalConcurrency,
      summary: recoveryResult.summary,
    });

    results.endTime = new Date().toISOString();
    return results;
  }

  /**
   * Get status of an active test
   */
  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  /**
   * Get all active tests
   */
  getActiveTests() {
    return Array.from(this.activeTests.entries()).map(([id, data]) => ({
      testId: id,
      status: data.status,
      summary: data.results.summary,
    }));
  }

  /**
   * Cancel a running test
   */
  cancelTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.status = 'cancelled';
      // Note: Workers will continue until their duration ends
      // For immediate cancellation, we'd need more complex worker management
      return true;
    }
    return false;
  }
}

// Singleton
let instance = null;
export function getPerformanceTester() {
  if (!instance) {
    instance = new PerformanceTester();
  }
  return instance;
}

export default PerformanceTester;
