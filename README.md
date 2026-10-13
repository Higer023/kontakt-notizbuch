# Kisisel Iletisim Rehberi ve Not Defteri

Cloudflare Workers (API + statik dosyalar), D1 (SQL) ve R2 (fotograflar) uzerinde calisan, tek yoneticili, karanlik temali kisi rehberi.

## Ozellikler
- Yonetici girisi: PBKDF2-SHA256 (100k iterasyon). Oturum token'i yalnizca SHA-256 ozeti olarak saklanir. Cookie: HttpOnly; Secure; SameSite=Strict.
- Brute-force korumasi: IP basina 15 dakikada 5 hatali deneme sonrasi 429 kilidi.
- Giris loglari ekrani (basarili/basarisiz, IP, tarayici).
- Esnek dogum tarihi (yil / ay / gun) ve otomatik yas hesabi.
- Sosyal medya: platform secimi + kullanici adindan otomatik profil linki.
- Fotograf yukleme (JPEG/PNG/WebP, en fazla 5 MB), R2'de, yalnizca yetkili oturumla erisilebilir.
- Arama (isim, soyisim, sehir, etiket, e-posta).
- Guvenlik basliklari: CSP, HSTS, X-Frame-Options DENY, nosniff.

## Kurulum

### 1. Cloudflare kaynaklari
```bash
npx wrangler login
npx wrangler d1 create kontakt-db          # database_id'yi wrangler.toml'a yaz
npx wrangler r2 bucket create kontakt-photos
```

### 2. Yonetici sifresi
```bash
node scripts/hash-password.mjs "en-az-12-karakterli-guclu-sifre"
```
Cikan hash ile:
```bash
npx wrangler d1 execute kontakt-db --remote --command \
  "INSERT INTO admin (id, password_hash) VALUES (1, 'HASH') ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash;"
```
Sifreyi repoya yazmayin.

### 3. Sema
```bash
npx wrangler d1 execute kontakt-db --remote --file=schema.sql
```

### 4. GitHub ve otomatik deploy
Repo Settings > Secrets and variables > Actions icine ekleyin:
- `CLOUDFLARE_API_TOKEN` (Workers, D1 ve R2 yetkili)
- `CLOUDFLARE_ACCOUNT_ID`

`main` dalina her push'ta `.github/workflows/deploy.yml` semayi uygular ve deploy eder.

### 5. Yerel gelistirme
```bash
npx wrangler dev --remote
```

## Guvenlik notlari
- Sifreyi duzenli degistirin, ardindan `DELETE FROM sessions;` ile mevcut oturumlari kapatin.
- Cloudflare Access (Zero Trust) ile uygulamanin onune e-posta/OTP katmani koymaniz onerilir.
- Fotograflar R2 URL'si ile degil yalnizca `/api/photos/:id` uzerinden, oturum kontrolu ile sunulur.
- Kisisel veri icerdiginden D1 yedeklerini (`wrangler d1 export`) duzenli alin.
