#!/usr/bin/env node
/**
 * MCP Chat Studio CLI Test Runner
 *
 * Run scenario tests from command line for CI/CD integration.
 *
 * Usage:
 *   npx mcp-chat-studio test scenarios.json
 *   npx mcp-chat-studio test scenarios.json --fail-on-diff
 *   npx mcp-chat-studio test scenarios.json --output junit
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    command: null,
    scenarioFile: null,
    failOnDiff: false,
    output: 'console', // console, junit, tap
    serverUrl: 'http://localhost:3082',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--fail-on-diff') {
      options.failOnDiff = true;
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i] || 'console';
    } else if (arg === '--server' || arg === '-s') {
      options.serverUrl = args[++i] || options.serverUrl;
    } else if (!options.command) {
      options.command = arg;
    } else if (!options.scenarioFile) {
      options.scenarioFile = arg;
    }
  }

  return options;
}

// Show help
function showHelp() {
  console.log(`
${colors.cyan}${colors.bright}MCP Chat Studio CLI${colors.reset}

${colors.bright}Usage:${colors.reset}
  mcp-cli test <scenarios.json>     Run scenario tests
  mcp-cli list <scenarios.json>     List scenarios without running
  mcp-cli --help                    Show this help

${colors.bright}Options:${colors.reset}
  --fail-on-diff    Exit with code 1 if any response differs from baseline
  --output, -o      Output format: console (default), junit, tap
  --server, -s      Server URL (default: http://localhost:3082)

${colors.bright}Examples:${colors.reset}
  mcp-cli test my-scenarios.json
  mcp-cli test my-scenarios.json --fail-on-diff
  mcp-cli test my-scenarios.json --output junit > results.xml
  mcp-cli test my-scenarios.json --server http://localhost:3082

${colors.bright}Scenario File Format:${colors.reset}
  Export scenarios from MCP Chat Studio UI, or create manually:
  
  [
    {
      "name": "Test Scenario 1",
      "steps": [
        {
          "server": "my-server",
          "tool": "my-tool",
          "args": { "param": "value" },
          "expectedResponse": { ... }
        }
      ]
    }
  ]
`);
}

// Load scenarios from file
function loadScenarios(filePath) {
  const fullPath = resolve(process.cwd(), filePath);

  if (!existsSync(fullPath)) {
    throw new Error(`Scenario file not found: ${fullPath}`);
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    const data = JSON.parse(content);

    // Handle both single scenario and array of scenarios
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    throw new Error(`Failed to parse scenario file: ${error.message}`);
  }
}

// Execute a single tool call
async function executeTool(serverUrl, serverName, toolName, args) {
  const response = await fetch(`${serverUrl}/api/mcp/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serverName,
      tool: toolName,
      args: args || {},
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Simple hash for response comparison
function _hashResponse(obj) {
  return JSON.stringify(obj)
    .split('')
    .reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0)
    .toString(16);
}

// Compare responses (semantic diff)
function compareResponses(expected, actual) {
  const diffs = [];

  function compare(exp, act, path = '') {
    if (exp === null && act === null) return;
    if (exp === undefined && act === undefined) return;

    const expType = Array.isArray(exp) ? 'array' : typeof exp;
    const actType = Array.isArray(act) ? 'array' : typeof act;

    if (expType !== actType) {
      diffs.push({ type: 'type_change', path, expected: expType, actual: actType });
      return;
    }

    if (expType === 'object' && exp !== null) {
      const allKeys = new Set([...Object.keys(exp || {}), ...Object.keys(act || {})]);
      for (const key of allKeys) {
        const keyPath = path ? `${path}.${key}` : key;
        if (!(key in exp)) {
          diffs.push({ type: 'added', path: keyPath, value: act[key] });
        } else if (!(key in act)) {
          diffs.push({ type: 'missing', path: keyPath, value: exp[key] });
        } else {
          compare(exp[key], act[key], keyPath);
        }
      }
    } else if (expType === 'array') {
      if (exp.length !== act.length) {
        diffs.push({ type: 'array_length', path, expected: exp.length, actual: act.length });
      }
      const minLen = Math.min(exp.length, act.length);
      for (let i = 0; i < minLen; i++) {
        compare(exp[i], act[i], `${path}[${i}]`);
      }
    } else if (exp !== act) {
      diffs.push({ type: 'changed', path, expected: exp, actual: act });
    }
  }

  compare(expected, actual);
  return diffs;
}

// Run a single scenario
async function runScenario(serverUrl, scenario, _verbose = true) {
  const results = {
    name: scenario.name,
    steps: [],
    passed: 0,
    failed: 0,
    diffed: 0,
    duration: 0,
  };

  const startTime = Date.now();

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    const stepResult = {
      index: i + 1,
      tool: step.tool,
      server: step.server,
      status: 'unknown',
      duration: 0,
      diffs: [],
    };

    const stepStart = Date.now();

    try {
      const response = await executeTool(serverUrl, step.server, step.tool, step.args);
      stepResult.duration = Date.now() - stepStart;
      stepResult.response = response;

      // Check if execution succeeded
      if (response.error) {
        stepResult.status = 'failed';
        stepResult.error = response.error;
        results.failed++;
      } else {
        // Compare with expected response if available
        if (step.expectedResponse) {
          const diffs = compareResponses(step.expectedResponse, response);
          if (diffs.length > 0) {
            stepResult.status = 'diff';
            stepResult.diffs = diffs;
            results.diffed++;
          } else {
            stepResult.status = 'passed';
            results.passed++;
          }
        } else {
          stepResult.status = 'passed';
          results.passed++;
        }
      }
    } catch (error) {
      stepResult.duration = Date.now() - stepStart;
      stepResult.status = 'failed';
      stepResult.error = error.message;
      results.failed++;
    }

    results.steps.push(stepResult);
  }

  results.duration = Date.now() - startTime;
  return results;
}

// Output formatters
function formatConsole(results, failOnDiff) {
  for (const scenario of results) {
    log(colors.cyan, `\n📋 ${scenario.name}`);
    log(colors.reset, `   ${scenario.steps.length} steps, ${scenario.duration}ms`);

    for (const step of scenario.steps) {
      let icon, color;
      switch (step.status) {
        case 'passed':
          icon = '✅';
          color = colors.green;
          break;
        case 'diff':
          icon = '🔶';
          color = colors.yellow;
          break;
        case 'failed':
          icon = '❌';
          color = colors.red;
          break;
        default:
          icon = '❓';
          color = colors.reset;
      }

      log(color, `   ${icon} ${step.index}. ${step.tool} @ ${step.server} (${step.duration}ms)`);

      if (step.status === 'failed' && step.error) {
        log(colors.red, `      Error: ${step.error}`);
      }

      if (step.status === 'diff' && step.diffs.length > 0) {
        for (const diff of step.diffs.slice(0, 3)) {
          log(colors.yellow, `      ${diff.type}: ${diff.path}`);
        }
        if (step.diffs.length > 3) {
          log(colors.yellow, `      ... and ${step.diffs.length - 3} more`);
        }
      }
    }
  }

  // Summary
  const total = { passed: 0, failed: 0, diffed: 0 };
  for (const s of results) {
    total.passed += s.passed;
    total.failed += s.failed;
    total.diffed += s.diffed;
  }

  console.log('\n' + '='.repeat(50));
  log(colors.bright, `Summary: ${results.length} scenario(s)`);
  log(colors.green, `  ✅ Passed: ${total.passed}`);
  if (total.diffed > 0) {
    log(colors.yellow, `  🔶 Diffed: ${total.diffed}`);
  }
  if (total.failed > 0) {
    log(colors.red, `  ❌ Failed: ${total.failed}`);
  }

  // Exit code
  if (total.failed > 0) return 1;
  if (failOnDiff && total.diffed > 0) return 1;
  return 0;
}

function formatJUnit(results) {
  const totalTests = results.reduce((sum, s) => sum + s.steps.length, 0);
  const failures = results.reduce((sum, s) => sum + s.failed + s.diffed, 0);
  const time = results.reduce((sum, s) => sum + s.duration, 0) / 1000;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites tests="${totalTests}" failures="${failures}" time="${time.toFixed(3)}">\n`;

  for (const scenario of results) {
    xml += `  <testsuite name="${escapeXml(scenario.name)}" tests="${scenario.steps.length}" failures="${scenario.failed + scenario.diffed}" time="${(scenario.duration / 1000).toFixed(3)}">\n`;

    for (const step of scenario.steps) {
      xml += `    <testcase name="${escapeXml(step.tool)}" classname="${escapeXml(step.server)}" time="${(step.duration / 1000).toFixed(3)}">\n`;

      if (step.status === 'failed') {
        xml += `      <failure message="${escapeXml(step.error || 'Unknown error')}">${escapeXml(JSON.stringify(step, null, 2))}</failure>\n`;
      } else if (step.status === 'diff') {
        xml += `      <failure message="Response differs from baseline">${escapeXml(JSON.stringify(step.diffs, null, 2))}</failure>\n`;
      }

      xml += `    </testcase>\n`;
    }

    xml += `  </testsuite>\n`;
  }

  xml += `</testsuites>\n`;
  return xml;
}

function formatTAP(results) {
  let output = '';
  let testNum = 0;

  for (const scenario of results) {
    for (const step of scenario.steps) {
      testNum++;
      const ok = step.status === 'passed' ? 'ok' : 'not ok';
      output += `${ok} ${testNum} - ${scenario.name}: ${step.tool} @ ${step.server}\n`;

      if (step.status !== 'passed') {
        output += `  ---\n`;
        output += `  status: ${step.status}\n`;
        if (step.error) output += `  error: ${step.error}\n`;
        if (step.diffs?.length) output += `  diffs: ${step.diffs.length}\n`;
        output += `  ...\n`;
      }
    }
  }

  return `TAP version 13\n1..${testNum}\n${output}`;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Main entry point
async function main() {
  const options = parseArgs();

  if (options.help || !options.command) {
    showHelp();
    process.exit(0);
  }

  if (options.command === 'test') {
    if (!options.scenarioFile) {
      log(colors.red, 'Error: Scenario file required');
      log(colors.reset, 'Usage: mcp-cli test <scenarios.json>');
      process.exit(1);
    }

    try {
      // Load scenarios
      log(colors.cyan, `Loading scenarios from ${options.scenarioFile}...`);
      const scenarios = loadScenarios(options.scenarioFile);
      log(colors.green, `Found ${scenarios.length} scenario(s)`);

      // Check server is running
      try {
        const health = await fetch(`${options.serverUrl}/api/health`);
        if (!health.ok) throw new Error('Server not responding');
      } catch (e) {
        log(colors.red, `Error: Cannot connect to server at ${options.serverUrl}`);
        log(colors.yellow, 'Make sure MCP Chat Studio is running: npm run dev');
        process.exit(1);
      }

      // Run all scenarios
      const results = [];
      for (const scenario of scenarios) {
        log(colors.blue, `\nRunning: ${scenario.name}...`);
        const result = await runScenario(options.serverUrl, scenario);
        results.push(result);
      }

      // Output results
      let exitCode = 0;
      switch (options.output) {
        case 'junit':
          console.log(formatJUnit(results));
          exitCode = results.some(r => r.failed > 0 || r.diffed > 0) ? 1 : 0;
          break;
        case 'tap':
          console.log(formatTAP(results));
          exitCode = results.some(r => r.failed > 0 || r.diffed > 0) ? 1 : 0;
          break;
        default:
          exitCode = formatConsole(results, options.failOnDiff);
      }

      if (options.failOnDiff && exitCode === 0) {
        exitCode = results.some(r => r.diffed > 0) ? 1 : 0;
      }

      process.exit(exitCode);
    } catch (error) {
      log(colors.red, `Error: ${error.message}`);
      process.exit(1);
    }
  } else if (options.command === 'list') {
    if (!options.scenarioFile) {
      log(colors.red, 'Error: Scenario file required');
      process.exit(1);
    }

    try {
      const scenarios = loadScenarios(options.scenarioFile);
      log(colors.cyan, `\n📋 Scenarios in ${options.scenarioFile}:\n`);
      for (const s of scenarios) {
        log(colors.bright, `  ${s.name}`);
        log(colors.reset, `    ${s.steps?.length || 0} steps`);
        if (s.steps) {
          for (const step of s.steps.slice(0, 3)) {
            log(colors.reset, `      - ${step.tool} @ ${step.server}`);
          }
          if (s.steps.length > 3) {
            log(colors.reset, `      ... and ${s.steps.length - 3} more`);
          }
        }
      }
    } catch (error) {
      log(colors.red, `Error: ${error.message}`);
      process.exit(1);
    }
  } else {
    log(colors.red, `Unknown command: ${options.command}`);
    showHelp();
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
