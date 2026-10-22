# Surum 7 — Guncel tam paket

Bu klasor, `Higer23/kontakt-notizbuch` deposunun `main` dalindaki asagidaki kaynak revizyonunun geri donus kopyasidir. Paket icerisindeki dosya yollarini repo kokune gore korur; geri yuklemek icin bu klasorun icerigini depo kokune ayni goreli yollarla kopyalayin.

- **Kaynak commit:** `8ddee4be4dc8a8a9e779e6c3da4eab5e2e172334`
- **Kaynak commit:** [GitHub commit](https://github.com/Higer23/kontakt-notizbuch/commit/8ddee4be4dc8a8a9e779e6c3da4eab5e2e172334)
- **Paket kapsami:** Uygulama frontend'i, Cloudflare Worker, D1 semasi, Wrangler ayarlari, public ikonlar, GitHub Actions otomasyonlari, testler, belgeler ve proje metadata dosyalari. Onceki `stable/` arsivleri bu paketin icine tekrar kopyalanmamistir.
- **Dagitim:** Bu arsiv klasoru kendi basina deploy edilmez.

## Test durumu

Kaynak commit icin GitHub Actions test workflow'u basarili: [test workflow run](https://github.com/Higer23/kontakt-notizbuch/actions/runs/39698063182). Paket hazirlanirken yerel dogrulama da yapildi:

- Statik testler: 6 gecti
- Worker davranis testleri: 19 gecti
- Kriptografi testleri: 5 gecti
- CSV enjeksiyon testleri: 8 gecti
- Depo butunlugu testleri: 24 gecti
- SQLite sema testleri: 6 gecti
- `npm audit --audit-level=high`: 0 guvenlik acigi bildirildi

**Bilinen test siniri:** `tests/run-tests.mjs` eski bir entegrasyon calistiricisi olarak yerel ortamda basarisiz oldu; `tests/d1.py` mevcut sema ile uyumsuz `user_id` hatasi veriyor. Depo test belgeleri de bu eski calistiricinin bilinen uyumluluk sorunlari oldugunu belirtiyor. Bu nedenle yukaridaki bagimsiz testlerin gecmesi, D1 canli ortaminin, e-posta/push tesliminin, passkey kurtarma akislarinin veya mobil tarayicilarin canli ortamda dogrulandigi anlamina gelmez.

## Geri yukleme

1. Bu klasordeki dosyalari secin.
2. Dosyalari repo kokune **ayni goreli yollarla** kopyalayin (`src/worker.js`, `public/*`, `schema.sql`, `.github/workflows/*` gibi).
3. Mevcut dosyalarin uzerine yazmadan once karsilastirma yapin.
4. Testleri calistirin ve Cloudflare D1 / Worker staging kontrolunu yapmadan production deploy etmeyin.
