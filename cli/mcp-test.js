#!/usr/bin/env node

/**
 * MCP Test CLI Runner
 * Command-line runner for MCP test collections (like newman for Postman)
 */

import { program } from 'commander';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import axios from 'axios';

program.name('mcp-test').description('CLI runner for MCP test collections').version('1.4.0');

/**
 * Run command
 */
program
  .command('run <collection>')
  .description('Run a collection')
  .option('-s, --server <url>', 'MCP Chat Studio server URL', 'http://localhost:3082')
  .option('-e, --environment <file>', 'Environment variables file')
  .option('--data <file>', 'Iteration data file (JSON array)')
  .option('-d, --delay <ms>', 'Delay between requests (ms)', '0')
  .option('--bail', 'Stop on first error')
  .option('-r, --reporters <list>', 'Reporters (cli,json,junit)', 'cli')
  .option('-n, --iteration-count <n>', 'Number of iterations', '1')
  .option('--timeout <ms>', 'Request timeout (ms)', '30000')
  .option('--export <file>', 'Export results to file')
  .option('--session <id>', 'Session ID for OAuth-protected MCP servers')
  .option('--cookie <cookie>', 'Cookie header value for authenticated requests')
  .option('--token <token>', 'Bearer token for authenticated requests')
  .action(async (collectionPath, options) => {
    try {
      console.log(chalk.blue.bold('\n🚀 MCP Test Runner\n'));
      const serverUrl = normalizeServerUrl(options.server);
      const timeout = parseInt(options.timeout, 10) || 30000;
      const authHeaders = buildAuthHeaders(options);

      // Load or resolve collection
      const resolvedPath = resolve(collectionPath);
      const isFile = existsSync(resolvedPath);
      let collectionId = collectionPath;

      if (isFile) {
        const collection = loadJSON(resolvedPath);
        console.log(chalk.cyan(`📦 Collection: ${collection.name}`));
        console.log(chalk.gray(`   Scenarios: ${collection.scenarios?.length || 0}\n`));

        const imported = await importCollection(serverUrl, collection, timeout, authHeaders);
        collectionId = imported.id;
      } else {
        console.log(chalk.cyan(`📦 Collection ID: ${collectionId}`));
      }

      // Load environment
      let environment = {};
      if (options.environment) {
        environment = loadJSON(options.environment);
        console.log(chalk.cyan(`🌍 Environment: ${options.environment}\n`));
      }

      // Load iteration data
      let iterationData = [];
      if (options.data) {
        const data = loadJSON(options.data);
        if (!Array.isArray(data)) {
          throw new Error('Iteration data must be a JSON array');
        }
        iterationData = data;
        console.log(
          chalk.cyan(`🔁 Iteration data: ${options.data} (${iterationData.length} rows)\n`)
        );
      }

      // Run collection via API
      const results = await runCollectionViaApi(
        serverUrl,
        collectionId,
        {
          environment,
          delay: parseInt(options.delay, 10),
          stopOnError: !!options.bail,
          iterations: parseInt(options.iterationCount, 10),
          iterationData,
        },
        timeout,
        authHeaders
      );

      // Report results
      const reporters = options.reporters.split(',');
      for (const reporter of reporters) {
        await reportResults(results, reporter.trim(), options.export);
      }

      // Exit with appropriate code
      process.exit(results.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * List command
 */
program
  .command('list')
  .description('List all collections')
  .action(() => {
    console.log(chalk.blue.bold('\n📚 Available Collections\n'));
    // In a real implementation, this would list from the collections directory
    console.log(chalk.gray('  No collections found. Create one with the API.\n'));
  });

/**
 * Validate command
 */
program
  .command('validate <collection>')
  .description('Validate a collection file')
  .action(collectionPath => {
    try {
      const collection = loadJSON(collectionPath);

      console.log(chalk.blue.bold('\n✅ Validation Results\n'));

      // Validate structure
      const errors = validateCollection(collection);

      if (errors.length === 0) {
        console.log(chalk.green('✓ Collection is valid'));
        console.log(chalk.cyan(`  Name: ${collection.name}`));
        console.log(chalk.cyan(`  Scenarios: ${collection.scenarios?.length || 0}`));
      } else {
        console.log(chalk.red('✗ Collection has errors:'));
        errors.forEach(err => console.log(chalk.red(`  - ${err}`)));
        process.exit(1);
      }

      console.log();
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Schema tools
 */
const schemaCmd = program.command('schema').description('Schema snapshot and diff tools');

schemaCmd
  .command('snapshot')
  .description('Capture tool schemas from a running MCP Chat Studio server')
  .option('-s, --server <url>', 'MCP Chat Studio server URL', 'http://localhost:3082')
  .option('--timeout <ms>', 'Request timeout (ms)', '30000')
  .option('-o, --out <file>', 'Output file')
  .option('--session <id>', 'Session ID for OAuth-protected MCP servers')
  .option('--cookie <cookie>', 'Cookie header value for authenticated requests')
  .option('--token <token>', 'Bearer token for authenticated requests')
  .action(async options => {
    try {
      const serverUrl = normalizeServerUrl(options.server);
      const timeout = parseInt(options.timeout, 10) || 30000;
      const tools = await fetchToolsSnapshot(serverUrl, timeout, buildAuthHeaders(options));

      const snapshot = {
        capturedAt: new Date().toISOString(),
        serverUrl,
        toolCount: tools.length,
        tools,
      };

      const json = JSON.stringify(snapshot, null, 2);
      if (options.out) {
        writeFileSync(options.out, json);
        console.log(chalk.green(`\n✓ Snapshot saved to ${options.out}\n`));
      } else {
        console.log(json);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

schemaCmd
  .command('diff <baseline> <current>')
  .description('Diff two schema snapshots')
  .option('-f, --format <format>', 'Output format (cli,json,junit)', 'cli')
  .option('-o, --out <file>', 'Output file')
  .option('--gate', 'Exit with non-zero if changes are detected')
  .action((baselinePath, currentPath, options) => {
    try {
      const baseline = loadJSON(baselinePath);
      const current = loadJSON(currentPath);
      const diff = diffSnapshots(baseline, current);

      if (options.format === 'json') {
        const json = JSON.stringify(diff, null, 2);
        if (options.out) {
          writeFileSync(options.out, json);
          console.log(chalk.green(`\n✓ Diff exported to ${options.out}\n`));
        } else {
          console.log(json);
        }
      } else if (options.format === 'junit') {
        const xml = renderSchemaJUnit(diff);
        if (options.out) {
          writeFileSync(options.out, xml);
          console.log(chalk.green(`\n✓ JUnit diff exported to ${options.out}\n`));
        } else {
          console.log(xml);
        }
      } else {
        reportSchemaDiffCLI(diff);
      }

      if (options.gate && diff.summary.totalChanges > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Load JSON file
 */
function loadJSON(filePath) {
  const absolutePath = resolve(filePath);
  const content = readFileSync(absolutePath, 'utf8');
  return JSON.parse(content);
}

function normalizeServerUrl(url) {
  return String(url || '').replace(/\/$/, '');
}

function buildAuthHeaders(options = {}) {
  const headers = {};
  if (options.session) {
    headers['x-session-id'] = options.session;
  }
  if (options.cookie) {
    headers['Cookie'] = options.cookie;
  }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  return headers;
}

async function importCollection(serverUrl, collection, timeout, authHeaders = {}) {
  const res = await axios.post(`${serverUrl}/api/collections/import`, collection, {
    timeout,
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  });
  return res.data;
}

async function runCollectionViaApi(serverUrl, collectionId, payload, timeout, authHeaders = {}) {
  const res = await axios.post(`${serverUrl}/api/collections/${collectionId}/run`, payload, {
    timeout,
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  });
  return res.data;
}

async function fetchToolsSnapshot(serverUrl, timeout, authHeaders = {}) {
  const res = await axios.get(`${serverUrl}/api/mcp/tools`, {
    timeout,
    headers: { ...authHeaders },
  });
  const tools = (res.data?.tools || [])
    .filter(tool => !tool.notConnected)
    .map(tool => ({
      serverName: tool.serverName,
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || { type: 'object', properties: {} },
    }))
    .sort((a, b) => {
      if (a.serverName === b.serverName) {
        return a.name.localeCompare(b.name);
      }
      return a.serverName.localeCompare(b.serverName);
    });

  return tools;
}

function stableStringify(value) {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function diffSnapshots(baselineSnapshot, currentSnapshot) {
  const baselineTools = Array.isArray(baselineSnapshot)
    ? baselineSnapshot
    : baselineSnapshot.tools || [];
  const currentTools = Array.isArray(currentSnapshot)
    ? currentSnapshot
    : currentSnapshot.tools || [];

  const baselineMap = new Map();
  baselineTools.forEach(tool => {
    const key = `${tool.serverName}__${tool.name}`;
    baselineMap.set(key, tool);
  });

  const added = [];
  const removed = [];
  const changed = [];

  currentTools.forEach(tool => {
    const key = `${tool.serverName}__${tool.name}`;
    const previous = baselineMap.get(key);
    if (!previous) {
      added.push(tool);
      return;
    }

    const previousSignature = stableStringify({
      description: previous.description || '',
      inputSchema: previous.inputSchema || {},
    });
    const currentSignature = stableStringify({
      description: tool.description || '',
      inputSchema: tool.inputSchema || {},
    });

    if (previousSignature !== currentSignature) {
      changed.push({
        key,
        serverName: tool.serverName,
        name: tool.name,
        before: previous,
        after: tool,
      });
    }
    baselineMap.delete(key);
  });

  for (const tool of baselineMap.values()) {
    removed.push(tool);
  }

  const summary = {
    added: added.length,
    removed: removed.length,
    changed: changed.length,
    totalChanges: added.length + removed.length + changed.length,
  };

  return { summary, added, removed, changed };
}

function reportSchemaDiffCLI(diff) {
  console.log(chalk.blue.bold('\n🧬 Schema Diff\n'));
  console.log(chalk.green(`  Added:   ${diff.summary.added}`));
  console.log(chalk.red(`  Removed: ${diff.summary.removed}`));
  console.log(chalk.yellow(`  Changed: ${diff.summary.changed}\n`));

  if (diff.added.length > 0) {
    console.log(chalk.green('Added tools:'));
    diff.added.forEach(tool => {
      console.log(chalk.green(`  + ${tool.serverName}__${tool.name}`));
    });
    console.log();
  }

  if (diff.removed.length > 0) {
    console.log(chalk.red('Removed tools:'));
    diff.removed.forEach(tool => {
      console.log(chalk.red(`  - ${tool.serverName}__${tool.name}`));
    });
    console.log();
  }

  if (diff.changed.length > 0) {
    console.log(chalk.yellow('Changed tools:'));
    diff.changed.forEach(change => {
      console.log(chalk.yellow(`  ~ ${change.key}`));
    });
    console.log();
  }
}

function renderSchemaJUnit(diff) {
  const totalChanges = diff.summary.totalChanges;
  const tests = totalChanges > 0 ? totalChanges : 1;
  const failures = totalChanges;

  if (totalChanges === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="schema-diff" tests="1" failures="0" time="0">
  <testsuite name="schema-diff" tests="1" failures="0" time="0">
    <testcase name="schema-diff"></testcase>
  </testsuite>
</testsuites>`;
  }

  const cases = [];
  diff.added.forEach(tool => {
    cases.push(`<testcase name="added: ${tool.serverName}__${tool.name}">
      <failure message="Tool added"></failure>
    </testcase>`);
  });
  diff.removed.forEach(tool => {
    cases.push(`<testcase name="removed: ${tool.serverName}__${tool.name}">
      <failure message="Tool removed"></failure>
    </testcase>`);
  });
  diff.changed.forEach(change => {
    cases.push(`<testcase name="changed: ${change.key}">
      <failure message="Tool schema changed"></failure>
    </testcase>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="schema-diff" tests="${tests}" failures="${failures}" time="0">
  <testsuite name="schema-diff" tests="${tests}" failures="${failures}" time="0">
${cases.join('\n')}
  </testsuite>
</testsuites>`;
}

/**
 * Validate collection structure
 */
function validateCollection(collection) {
  const errors = [];

  if (!collection.name) {
    errors.push('Missing required field: name');
  }

  if (!collection.scenarios || !Array.isArray(collection.scenarios)) {
    errors.push('Missing or invalid field: scenarios (must be array)');
  }

  if (collection.scenarios) {
    collection.scenarios.forEach((scenario, index) => {
      if (!scenario.name) {
        errors.push(`Scenario ${index}: missing name`);
      }
    });
  }

  return errors;
}

/**
 * Report results
 */
async function reportResults(results, reporter, exportPath) {
  if (reporter === 'cli') {
    reportCLI(results);
  } else if (reporter === 'json') {
    reportJSON(results, exportPath);
  } else if (reporter === 'junit') {
    reportJUnit(results, exportPath);
  }
}

/**
 * CLI Reporter
 */
function reportCLI(results) {
  console.log(chalk.blue.bold('📊 Results\n'));

  results.scenarios.forEach((scenario, _index) => {
    const icon =
      scenario.status === 'passed'
        ? chalk.green('✓')
        : scenario.status === 'failed'
          ? chalk.red('✗')
          : chalk.yellow('○');

    console.log(`${icon} ${scenario.name}`);

    if (scenario.error) {
      console.log(chalk.red(`  Error: ${scenario.error}`));
    }

    if (scenario.duration) {
      console.log(chalk.gray(`  ${Math.round(scenario.duration)}ms`));
    }
  });

  console.log();
  console.log(chalk.blue.bold('Summary\n'));
  console.log(chalk.cyan(`  Total:    ${results.total}`));
  console.log(chalk.green(`  Passed:   ${results.passed}`));
  console.log(chalk.red(`  Failed:   ${results.failed}`));
  console.log(chalk.yellow(`  Skipped:  ${results.skipped}`));
  console.log(chalk.gray(`  Duration: ${results.duration}ms`));
  console.log();
}

/**
 * JSON Reporter
 */
function reportJSON(results, exportPath) {
  const json = JSON.stringify(results, null, 2);

  if (exportPath) {
    writeFileSync(exportPath, json);
    console.log(chalk.green(`\n✓ Results exported to ${exportPath}\n`));
  } else {
    console.log(json);
  }
}

/**
 * JUnit Reporter
 */
function reportJUnit(results, exportPath) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${results.collectionName}" tests="${results.total}" failures="${results.failed}" time="${results.duration / 1000}">
  <testsuite name="${results.collectionName}" tests="${results.total}" failures="${results.failed}" time="${results.duration / 1000}">
${results.scenarios
  .map(
    scenario => `    <testcase name="${scenario.name}" time="${(scenario.duration || 0) / 1000}">
${scenario.status === 'failed' ? `      <failure message="${scenario.error || 'Test failed'}"></failure>` : ''}
    </testcase>`
  )
  .join('\n')}
  </testsuite>
</testsuites>`;

  if (exportPath) {
    writeFileSync(exportPath, xml);
    console.log(chalk.green(`\n✓ JUnit report exported to ${exportPath}\n`));
  } else {
    console.log(xml);
  }
}

program.parse();
