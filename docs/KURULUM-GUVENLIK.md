# Kurulum ve guvenlik rehberi

Bu belge uygulamayi kurmak, gizli degerleri guvenle saklamak ve testleri calistirmak icindir. Hicbir gizli deger (sifre, anahtar, token) bu dosyada yer almaz.

## 1. Gizli degerler nerede tutulur

| Deger | Nerede | Ne icin |
|---|---|---|
| CLOUDFLARE_API_TOKEN | GitHub > Settings > Secrets (Actions) | Dagitim (wrangler) |
| CLOUDFLARE_ACCOUNT_ID | GitHub > Settings > Secrets (Actions) | Dagitim |
| LOG_KEY | Worker secret (wrangler secret put LOG_KEY) | Giris kayitlarini sifrelemek. Yoksa tum API 500 verir |
| TURNSTILE_SECRET | Worker secret | Bot korumasi dogrulamasi |
| RESEND_API_KEY, RECOVERY_EMAIL | Worker secret (opsiyonel) | E-posta ile kurtarma |
| VAPID_PRIVATE_KEY | Worker secret (opsiyonel) | Push bildirimleri |

Kural: Gizli degerler koda, README'ye, commit mesajina veya sohbete yazilmaz. Bir deger sizdiysa hemen yenilenir.

## 2. Yerel test

```
cd tests
npm install
cd ..
node tests/static.test.mjs
node tests/behavior.test.mjs
```

Davranissal testler bellek ici SQLite (sql.js) ile Worker'i calistirir. Gercek bir anahtar kullanmaz; testte sabit bir sahte LOG_KEY kullanilir.

## 3. Dagitim kapisi

`main` dalina her push'ta `.github/workflows/deploy.yml` calisir. Once `test` isi (statik kontroller ve davranissal testler) calisir; basarisiz olursa dagitim yapilmaz. Pull request'lerde ise `.github/workflows/tests.yml` yalnizca testleri calistirir, dagitim yapmaz.

## 4. GitHub guvenlik ayarlari (repo sahibi yapmali)

Bu ayarlar repo ayarlarindan acilir; kod ile degistirilemez:
- Secret scanning: acik olsun.
- Push protection: acik olsun.
- Dependabot alerts ve security updates: acik olsun.
- Branch protection (main): pull request zorunlu olsun, testler basarili olmadan birlesmesin.

## 5. Anahtar yenileme

Bir gizli deger sohbete, ekran goruntusune veya herkese acik bir yere dustuyse:
1. Cloudflare panelinden ilgili token veya secret'i yenile.
2. `wrangler secret put <AD>` ile Worker'a yeni degeri gir.
3. GitHub secret'ini guncelle.
4. Eski degerin artik calismadigini kontrol et.

## 6. Eski veri

Eski `contacts` tablosu yalnizca yonetici tarafindan, `/api/vault/legacy` ve `/api/vault/import` uzerinden tasinabilir. Tasima oncesi D1 yedegi alinmali. Tasima tamamlandiktan sonra eski tablo ayrica silinmeden once yedegi dogrulanmali.
