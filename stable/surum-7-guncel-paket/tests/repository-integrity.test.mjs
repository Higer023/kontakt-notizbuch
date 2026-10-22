import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

for (const relative of [
  'src/worker.js',
  'schema.sql',
  'public/index.html',
  'public/app.js',
  'public/style.css',
  'public/crypto.js',
  'public/passkey.js',
  'public/recovery.js',
  'public/push.js',
  'public/sw.js',
  'public/manifest.json',
  'tests/behavior.test.mjs',
  'tests/crypto.test.mjs',
  'tests/csv.test.mjs',
  'tests/schema.test.py',
]) {
  test(`required project asset exists: ${relative}`, () => {
    assert.ok(existsSync(path.join(root, relative)), `missing required file: ${relative}`);
    assert.ok(read(relative).trim().length > 0, `required file is empty: ${relative}`);
  });
}

test('web app manifest parses as JSON', () => {
  const manifest = JSON.parse(read('public/manifest.json'));
  assert.ok(manifest && typeof manifest === 'object' && !Array.isArray(manifest));
  assert.ok(typeof manifest.name === 'string' && manifest.name.trim().length > 0);
});

test('HTML entry point declares a viewport for mobile browsers', () => {
  assert.match(read('public/index.html'), /<meta[^>]+name=["']viewport["']/i);
});

test('HTML entry point loads the main application script', () => {
  assert.match(read('public/index.html'), /app\.js/);
});

test('HTML entry point loads the stylesheet', () => {
  assert.match(read('public/index.html'), /style\.css/);
});

test('service worker file has an install or fetch lifecycle handler', () => {
  assert.match(read('public/sw.js'), /addEventListener\s*\(\s*['"](install|fetch)['"]/);
});

test('worker contains explicit API routing', () => {
  assert.match(read('src/worker.js'), /\/api\//);
});

test('schema declares primary keys and uniqueness constraints', () => {
  const schema = read('schema.sql');
  assert.match(schema, /PRIMARY KEY/i);
  assert.match(schema, /UNIQUE/i);
});

test('public source does not embed common private-key/token formats', () => {
  const files = ['public/app.js', 'public/crypto.js', 'public/passkey.js', 'public/recovery.js', 'public/push.js', 'public/sw.js'];
  const suspicious = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /gh[pousr]_[A-Za-z0-9]{30,}/,
    /sk_live_[A-Za-z0-9]{16,}/,
  ];
  for (const file of files) {
    const source = read(file);
    for (const pattern of suspicious) assert.doesNotMatch(source, pattern, `possible embedded secret in ${file}`);
  }
});

test('worker source does not contain a hard-coded private key', () => {
  assert.doesNotMatch(read('src/worker.js'), /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
});
