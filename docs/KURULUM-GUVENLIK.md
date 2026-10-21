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

`main` dalina her push'ta `.github/workflows/deploy.yml` calisir. Once `test` isi (statik kontroller ve davranissal testler) calisir; basarisiz olursa dagitim yapilmaz. Pull request'lerde ise `.github/workflows/tests.yml` yalnizca testleri calistirir, dagitim yapmaz. GitHub CodeQL varsayilan analizi JavaScript/TypeScript ve Python icin etkinlestirildi; analiz sonucunu Security > Code scanning alanindan kontrol edin. Dependabot ayarlari `.github/dependabot.yml` dosyasinda tutulur.

## 4. GitHub guvenlik ayarlari

Repo ayarlari kontrol edildiginde Secret scanning, push protection ve Dependabot security updates etkin gorunuyordu. CodeQL varsayilan kurulumu da etkinlestirildi. Bu ayarlar zaman icinde degisebileceginden Settings > Security alanindan tekrar kontrol edin.

`main` dalinda branch protection etkin: PR zorunlu, `test` kontrolu gerekli, force-push ve dal silme kapali, yonetici de kurallara tabi. Ilk CodeQL sonucunu GitHub Security > Code scanning alaninda inceleyin; Dependabot alerts ve dependency graph durumunu da arayuzden dogrulayin.

## 5. Gunluk log temizligi

Worker'in mevcut gunluk Cron Trigger'i (`0 6 * * *`) artik 90 gunden eski `login_logs_v2` kayitlarini da temizler. Temizlik yeni bir giris kaydi olusmasina bagli degildir. Cron calisma hatalari Worker loglarinda kontrol edilmelidir. Bu islem yalnizca giris loglarini temizler; diger tablolara veya kisi verilerine dokunmaz.

## 6. Anahtar yenileme

Bir gizli deger sohbete, ekran goruntusune veya herkese acik bir yere dustuyse:
1. Cloudflare panelinden ilgili token veya secret'i yenile.
2. `wrangler secret put <AD>` ile Worker'a yeni degeri gir.
3. GitHub secret'ini guncelle.
4. Eski degerin artik calismadigini kontrol et.

## 7. Eski veri

Eski `contacts` tablosu yalnizca yonetici tarafindan, `/api/vault/legacy` ve `/api/vault/import` uzerinden tasinabilir. Tasima oncesi D1 yedegi alinmali. Tasima tamamlandiktan sonra eski tablo ayrica silinmeden once yedegi dogrulanmali.
