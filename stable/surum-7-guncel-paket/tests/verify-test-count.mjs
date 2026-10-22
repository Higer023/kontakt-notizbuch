import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const reportDir = process.argv[2];
assert.ok(reportDir, 'Usage: node tests/verify-test-count.mjs <report-directory>');
assert.ok(existsSync(reportDir), `Report directory does not exist: ${reportDir}`);

const expectedSuites = ['static', 'behavior', 'crypto', 'csv', 'schema'];
const statusPath = path.join(reportDir, 'status.txt');
assert.ok(existsSync(statusPath), 'Suite status file is missing; refusing to pass the quality gate.');

const statusLines = readFileSync(statusPath, 'utf8').split(/\r?\n/).filter(Boolean);
const statusBySuite = new Map();
const failures = [];

for (const line of statusLines) {
  const match = line.match(/^([a-z][a-z0-9_-]*)\|(\d+)$/);
  if (!match) {
    failures.push(`Malformed suite status entry: ${line}`);
    continue;
  }
  const [, name, code] = match;
  if (statusBySuite.has(name)) {
    failures.push(`Duplicate suite status entry: ${name}`);
    continue;
  }
  statusBySuite.set(name, Number(code));
  if (Number(code) !== 0) failures.push(`${name} suite exited with code ${code}`);
}

for (const name of expectedSuites) {
  if (!statusBySuite.has(name)) failures.push(`Required suite did not run: ${name}`);
}
for (const name of statusBySuite.keys()) {
  if (!expectedSuites.includes(name)) failures.push(`Unexpected suite status entry: ${name}`);
}

let total = 0;
const breakdown = [];
const logFiles = new Set(readdirSync(reportDir).filter((name) => name.endsWith('.log')));

for (const suite of expectedSuites) {
  const file = `${suite}.log`;
  if (!logFiles.has(file)) {
    failures.push(`Required suite log is missing: ${file}`);
    breakdown.push(`${suite}: MISSING LOG`);
    continue;
  }

  const output = readFileSync(path.join(reportDir, file), 'utf8');
  // Count both the project's custom "ok   description" output and standard TAP "ok N - description".
  const nodeChecks = (output.match(/^(?:ok\s{2,}\S|ok\s+\d+\s+-)/gm) || []).length;
  // Python unittest prefixes its "Ran N tests" summary with a timestamp in CI logs.
  const pythonSummary = output.match(/Ran (\d+) tests?/i);
  const count = nodeChecks + (pythonSummary ? Number(pythonSummary[1]) : 0);

  if (count === 0) failures.push(`${suite} produced no individually countable test results`);
  if (statusBySuite.get(suite) === 0 && /^not ok\s+\d+\s+-/m.test(output)) {
    failures.push(`${suite} log contains a TAP failure despite a successful exit code`);
  }

  total += count;
  breakdown.push(`${suite}: ${count}`);
}

console.log('Detailed test-count breakdown:');
for (const line of breakdown) console.log(`- ${line}`);
console.log(`Total independently reported checks: ${total}`);

if (failures.length) {
  console.error('Quality-gate validation failures:');
  for (const failure of failures) console.error(`- ${failure}`);
}
if (total < 30) {
  failures.push(`Quality gate requires at least 30 independently reported tests; counted ${total}`);
  console.error(failures[failures.length - 1]);
}
if (failures.length) process.exitCode = 1;
