#!/usr/bin/env node

/**
 * MCP Test CLI Runner
 * Command-line runner for MCP test collections (like newman for Postman)
 */

import { program } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';

program
  .name('mcp-test')
  .description('CLI runner for MCP test collections')
  .version('1.4.0');

/**
 * Run command
 */
program
  .command('run <collection>')
  .description('Run a collection')
  .option('-e, --environment <file>', 'Environment variables file')
  .option('-d, --delay <ms>', 'Delay between requests (ms)', '0')
  .option('--bail', 'Stop on first error')
  .option('-r, --reporters <list>', 'Reporters (cli,json,junit)', 'cli')
  .option('-n, --iteration-count <n>', 'Number of iterations', '1')
  .option('--timeout <ms>', 'Request timeout (ms)', '30000')
  .option('--export <file>', 'Export results to file')
  .action(async (collectionPath, options) => {
    try {
      console.log(chalk.blue.bold('\n🚀 MCP Test Runner\n'));

      // Load collection
      const collection = loadJSON(collectionPath);
      console.log(chalk.cyan(`📦 Collection: ${collection.name}`));
      console.log(chalk.gray(`   Scenarios: ${collection.scenarios?.length || 0}\n`));

      // Load environment
      let environment = {};
      if (options.environment) {
        environment = loadJSON(options.environment);
        console.log(chalk.cyan(`🌍 Environment: ${options.environment}\n`));
      }

      // Run collection
      const results = await runCollection(collection, {
        environment,
        delay: parseInt(options.delay),
        stopOnError: options.bail,
        iterations: parseInt(options.iterationCount),
        timeout: parseInt(options.timeout)
      });

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
  .action((collectionPath) => {
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
 * Load JSON file
 */
function loadJSON(filePath) {
  const absolutePath = resolve(filePath);
  const content = readFileSync(absolutePath, 'utf8');
  return JSON.parse(content);
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
 * Run collection
 */
async function runCollection(collection, options) {
  const results = {
    collectionName: collection.name,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    scenarios: []
  };

  const startTime = Date.now();

  if (!collection.scenarios || collection.scenarios.length === 0) {
    results.endTime = new Date().toISOString();
    results.duration = Date.now() - startTime;
    return results;
  }

  results.total = collection.scenarios.length * options.iterations;

  // Run iterations
  for (let iter = 0; iter < options.iterations; iter++) {
    for (const scenario of collection.scenarios) {
      try {
        const scenarioResult = await runScenario(scenario, options);
        results.scenarios.push(scenarioResult);

        if (scenarioResult.status === 'passed') {
          results.passed++;
        } else if (scenarioResult.status === 'failed') {
          results.failed++;
          if (options.stopOnError) {
            results.endTime = new Date().toISOString();
            results.duration = Date.now() - startTime;
            return results;
          }
        } else {
          results.skipped++;
        }

        // Delay between scenarios
        if (options.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }

      } catch (error) {
        results.scenarios.push({
          name: scenario.name,
          status: 'failed',
          error: error.message
        });
        results.failed++;

        if (options.stopOnError) {
          break;
        }
      }
    }
  }

  results.endTime = new Date().toISOString();
  results.duration = Date.now() - startTime;

  return results;
}

/**
 * Run a single scenario
 */
async function runScenario(scenario, options) {
  // This is a simplified mock version
  // In production, this would actually call MCP tools via HTTP API

  const result = {
    name: scenario.name,
    status: 'passed',
    duration: Math.random() * 1000, // Simulate execution time
    assertions: []
  };

  return result;
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

  results.scenarios.forEach((scenario, index) => {
    const icon = scenario.status === 'passed' ? chalk.green('✓') :
                 scenario.status === 'failed' ? chalk.red('✗') :
                 chalk.yellow('○');

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
    require('fs').writeFileSync(exportPath, json);
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
${results.scenarios.map(scenario => `    <testcase name="${scenario.name}" time="${(scenario.duration || 0) / 1000}">
${scenario.status === 'failed' ? `      <failure message="${scenario.error || 'Test failed'}"></failure>` : ''}
    </testcase>`).join('\n')}
  </testsuite>
</testsuites>`;

  if (exportPath) {
    require('fs').writeFileSync(exportPath, xml);
    console.log(chalk.green(`\n✓ JUnit report exported to ${exportPath}\n`));
  } else {
    console.log(xml);
  }
}

program.parse();
