import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const start = app.indexOf('function csvCell(value) {');
const end = app.indexOf('function exportCsv()', start);
assert.ok(start >= 0 && end > start, 'csvCell helper must exist before exportCsv');
const context = {};
vm.runInNewContext(app.slice(start, end) + '\nglobalThis.csvCell = csvCell;', context);
const csvCell = context.csvCell;

test('prefix equals formula is neutralized', () => assert.equal(csvCell('=1+1'), "'=1+1"));
test('plus-prefixed formula is neutralized', () => assert.equal(csvCell('+SUM(A1:A2)'), "'+SUM(A1:A2)"));
test('minus-prefixed formula is neutralized', () => assert.equal(csvCell('-10+cmd'), "'-10+cmd"));
test('at-prefixed formula is neutralized', () => assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)"));
test('leading whitespace before formula is neutralized', () => assert.equal(csvCell('  =1+1'), "'  =1+1"));
test('comma-containing text is quoted correctly', () => assert.equal(csvCell('normal, value'), '"normal, value"'));
test('quotes inside CSV values are escaped', () => assert.equal(csvCell('say "hello"'), '"say ""hello"""'));
test('empty values remain empty', () => assert.equal(csvCell(''), ''));
