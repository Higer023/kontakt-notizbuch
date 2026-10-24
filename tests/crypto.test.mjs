// Node-WebCrypto-basierte Regressionstests für die clientseitige Browser-Verschlüsselung.
// Tarayici istemci sifrelemesi icin Node WebCrypto tabanli regresyon testleri.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../public/crypto.js', import.meta.url), 'utf8');
const window = {};
runInNewContext(source, {
  window, crypto: webcrypto, btoa, atob, TextEncoder, TextDecoder, Uint8Array, JSON, Error,
});
const Vault = window.Vault;
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (err) { console.error('FAIL', name, '\n  ', err.message); process.exitCode = 1; }
}

await test('AES-GCM kasa sifrele/ac dongusu', async () => {
  const salt = Vault.newSalt();
  await Vault.unlock('test-password-long-enough', salt);
  const input = { name: 'Synthetic Test', nested: ['one', 2], note: 'sensitive fixture' };
  const payload = await Vault.seal(input);
  assert.deepEqual(JSON.parse(JSON.stringify(await Vault.open(payload))), input);
});

await test('ayni icerik icin her sifreleme yeni IV kullanir', async () => {
  await Vault.unlock('test-password-long-enough', Vault.newSalt());
  const a = JSON.parse(await Vault.seal({ value: 'same' }));
  const b = JSON.parse(await Vault.seal({ value: 'same' }));
  assert.notEqual(a.iv, b.iv, 'IV tekrar kullanildi');
  assert.notEqual(a.ct, b.ct, 'ciphertext beklenmedik sekilde ayni');
});

await test('yanlis parola sifreli veriyi acamaz', async () => {
  const salt = Vault.newSalt();
  await Vault.unlock('correct-test-password', salt);
  const payload = await Vault.seal({ value: 'private' });
  await Vault.unlock('wrong-test-password', salt);
  await assert.rejects(() => Vault.open(payload));
});

await test('ciphertext degisikligi dogrulama hatasi verir', async () => {
  await Vault.unlock('test-password-long-enough', Vault.newSalt());
  const payload = JSON.parse(await Vault.seal({ value: 'private' }));
  const bytes = Uint8Array.from(atob(payload.ct), (ch) => ch.charCodeAt(0));
  bytes[0] ^= 1;
  payload.ct = btoa(String.fromCharCode(...bytes));
  await assert.rejects(() => Vault.open(JSON.stringify(payload)));
});

await test('kilitlenen kasa sifreleme ve acmayi reddeder', async () => {
  await Vault.unlock('test-password-long-enough', Vault.newSalt());
  Vault.lock();
  assert.equal(Vault.isUnlocked(), false);
  await assert.rejects(() => Vault.seal({ value: 1 }), /Kasa kilitli/);
  await assert.rejects(() => Vault.open('{}'), /Kasa kilitli/);
});

console.log(`\n${passed} istemci sifreleme testi gecti`);
