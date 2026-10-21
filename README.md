# Kontakt-Notizbuch — Kişisel İletişim Rehberi ve Not Defteri

[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-yellow.svg)](LICENSE)

Cloudflare Workers, D1 ve R2 üzerinde çalışan, yönetici oturumuyla korunan, karanlık temalı bir kişi ve iletişim defteri. Proje; kişileri, notları ve ilgili verileri düzenlemeyi, erişimi sunucu tarafında denetlemeyi ve hassas verileri korumayı amaçlar.

> **Durum:** Aktif geliştirme sürümüdür. Güvenlik açısından kritik bir uygulama olarak değerlendirin; üretimde kullanmadan önce kendi gereksinimlerinize göre denetleyin. Gerçek kişisel verilerle test yapmayın.

## Özellikler
- Yönetici girişi ve güvenli oturum çerezi.
- Giriş denemeleri için hız sınırı ve giriş kayıtları.
- Kişi arama, etiketler, doğum tarihi ve yaş hesaplama.
- Sosyal profil bağlantıları ve fotoğraf yükleme (Cloudflare R2).
- Cloudflare Worker API'si ve D1 veritabanı.
- Passkey/WebAuthn ve şifreli kasa özellikleri (ilgili yapılandırma ve akışlara bağlıdır).
- Güvenlik başlıkları ve GitHub Actions test/deploy iş akışları.

## Teknoloji yığını
- JavaScript, HTML ve CSS
- Cloudflare Workers, D1 ve R2
- Wrangler CLI
- Node.js testleri ve GitHub Actions

## Yerel geliştirme

### Gereksinimler
- Desteklenen güncel bir Node.js sürümü ve npm
- Cloudflare hesabı (yalnızca uzak D1/R2 veya gerçek dağıtım için)
- Wrangler CLI, `npx` üzerinden çalıştırılabilir

### Kurulum
1. Depoyu çatallayın (Fork) ve klonlayın:
   ```bash
   git clone https://github.com/Higer23/kontakt-notizbuch.git
   cd kontakt-notizbuch
   ```
2. Yerel testleri çalıştırın:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
3. Wrangler'ı Cloudflare hesabınıza bağlamak gerekiyorsa:
   ```bash
   npx wrangler login
   ```
4. `wrangler.toml` içindeki D1/R2 binding ve kaynak adlarını kontrol edin. Gerçek kaynaklar oluşturacaksanız kendi Cloudflare hesabınızda oluşturun ve ilgili kimlikleri yerel yapılandırmanıza girin.
5. Yerel geliştirme sunucusunu başlatın:
   ```bash
   npx wrangler dev
   ```

> **Dikkat:** Uzak ortamı değiştiren komutları çalıştırmadan önce yapılandırmayı kontrol edin. `schema.sql` uygulamak veya üretime dağıtım yapmak mevcut verileri etkileyebilir. Üretim veritabanına karşı deneme yapmayın.

## Katkıda bulunma
Katkılar memnuniyetle karşılanır. Kod yazmadan önce [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun ve açık issue'ları inceleyin. Başlamak için [`good first issue`](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) ve [`help wanted`](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted) etiketlerini kullanın.

1. Bir issue üzerinde çalışmak istediğinizi yorumla belirtin; bakım ekibinden onay/atanma bekleyin.
2. Değişiklik için ayrı bir dal açın.
3. İlgili testleri çalıştırın ve yeni davranış için test ekleyin.
4. Açıklayıcı bir pull request (PR) gönderin; neyin değiştiğini, nedenini ve test sonuçlarını yazın.
5. PR'daki geri bildirimleri ele alın. Değişiklikler `main` dalına doğrudan gönderilmemelidir.

Güvenlik açığı bildirimlerini herkese açık issue olarak yayımlamayın; yönergeler için [SECURITY.md](SECURITY.md) dosyasına bakın.

## Güvenlik ve kişisel veriler
- Gerçek parola, API token'ı, Cloudflare sırrı veya kişisel veri commit etmeyin.
- Testlerde sahte veriler kullanın.
- D1/R2 kaynaklarını ve yedekleri koruyun; üretim verilerine dokunan değişiklikleri ayrıca belirtin.
- Güvenlik politikası: [SECURITY.md](SECURITY.md).

## Lisans
Bu proje [MIT Lisansı](LICENSE) ile sunulur.

## Destek
Projeyi [Open Collective](https://opencollective.com/kontakt-notizbuch) üzerinden destekleyebilirsiniz. Destek, MIT lisansını değiştirmez.

---

### English summary
Kontakt-Notizbuch is a dark-themed personal contact notebook built on Cloudflare Workers, D1 and R2. Contributions are welcome: read [CONTRIBUTING.md](CONTRIBUTING.md), choose an issue labelled [`good first issue`](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) or [`help wanted`](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted), and submit your work as a pull request. Do not use real personal data in tests; this project is under active development and has not been certified as secure.
