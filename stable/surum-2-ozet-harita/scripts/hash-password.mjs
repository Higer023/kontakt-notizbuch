// Kullanim: node scripts/hash-password.mjs "en-az-12-karakterli-sifre"
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Kullanim: node scripts/hash-password.mjs "en-az-12-karakterli-sifre"');
  process.exit(1);
}

const ITER = 100000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey(
  'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, key, 256
);

const b64 = (bytes) => Buffer.from(bytes).toString('base64');
console.log(`pbkdf2$${ITER}$${b64(salt)}$${b64(new Uint8Array(bits))}`);
