import { statSync } from 'fs';
import { join } from 'path';

const budgets = {
  'public/app.js': 950 * 1024,
  'public/advanced-features.js': 550 * 1024,
  'public/workflow.js': 450 * 1024
};

let failed = false;

Object.entries(budgets).forEach(([file, maxBytes]) => {
  try {
    const size = statSync(join(process.cwd(), file)).size;
    const percent = ((size / maxBytes) * 100).toFixed(1);
    if (size > maxBytes) {
      console.error(`[perf-budget] ${file} is ${size} bytes (${percent}% of budget) > ${maxBytes}`);
      failed = true;
    } else {
      console.log(`[perf-budget] ${file} OK: ${size} bytes (${percent}% of budget)`);
    }
  } catch (error) {
    console.error(`[perf-budget] Failed to read ${file}: ${error.message}`);
    failed = true;
  }
});

if (failed) process.exit(1);
