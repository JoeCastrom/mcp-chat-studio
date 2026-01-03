#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const target = process.argv[2] || 'collection-run-gate.json';
const filePath = path.resolve(process.cwd(), target);

if (!fs.existsSync(filePath)) {
  console.error(`Gate file not found: ${filePath}`);
  process.exit(2);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (error) {
  console.error(`Failed to parse gate file: ${error.message}`);
  process.exit(2);
}

const gate = payload?.status ? payload : payload?.gate;
if (!gate) {
  console.error('Gate summary not found in file.');
  process.exit(2);
}

const status = String(gate.status || '').toLowerCase();
const reasons = Array.isArray(gate.reasons) ? gate.reasons.join(', ') : '';

if (status === 'fail') {
  console.error(`Gate failed: ${reasons || 'regressions detected'}`);
  process.exit(1);
}

console.log('Gate passed.');
process.exit(0);
