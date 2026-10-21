# Katkı Rehberi

Katkılarınızı memnuniyetle karşılıyoruz. Küçük, odaklı ve test edilebilir PR'lar incelemeyi kolaylaştırır.

## Başlamadan önce
- Önce README ve [SECURITY.md](SECURITY.md) dosyalarını okuyun.
- Açık issue'ları kontrol edin. `good first issue` yeni katkı verenler için; `help wanted` ise topluluk yardımı aranan işler içindir.
- Bir issue üzerinde çalışmadan önce yorum yapıp görevi üstlenmek istediğinizi belirtin. Aynı iş üzerinde çakışmayı önlemek için yanıt bekleyin.
- Güvenlik açığı olabilecek ayrıntıları herkese açık issue/PR içinde yayımlamayın.

## Geliştirme akışı
1. Depoyu fork edin ve kendi fork'unuzu klonlayın.
2. `main` yerine konuya özel dal açın: `docs/...`, `fix/...` veya `test/...`.
3. Değişikliği mümkün olduğunca küçük tutun; ilgisiz biçimlendirme veya yeniden düzenleme eklemeyin.
4. İlgili testleri çalıştırın:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
5. Güvenlik veya veri işleme davranışı değişiyorsa test ekleyin ve risk/geri dönüş planını PR açıklamasına yazın.
6. Fork'unuza push edip `Higer23/kontakt-notizbuch:main` hedefine pull request açın.

## PR kontrol listesi
- [ ] Değişiklik tek bir amaca odaklanıyor.
- [ ] Testler çalıştırıldı; sonuçlar PR açıklamasında belirtildi.
- [ ] Hassas bilgi, gerçek kullanıcı verisi veya sır eklenmedi.
- [ ] API/şema değişiklikleri ve dağıtım etkileri açıklandı.
- [ ] README veya diğer dokümantasyon gerektiğinde güncellendi.
- [ ] Geriye dönük uyumluluk ve hata durumları düşünüldü.

## Kod ve güvenlik ilkeleri
- İstemciden gelen veriye güvenmeyin; yetki ve sahiplik kontrolleri sunucuda yapılmalıdır.
- Şifreleme, kimlik doğrulama, kurtarma, oturum ve veritabanı şeması değişikliklerinde önce ilgili testleri ve etki alanını açıklayın.
- Üretim D1/R2 kaynaklarında deneme yapmayın. Kendi geliştirme kaynaklarınızı kullanın.
- Yeni bağımlılık ekliyorsanız gerekçesini ve bakım/güvenlik etkisini belirtin.

## Issue türleri
- Hata: yeniden üretme adımları, beklenen/gerçek davranış ve ortam bilgisi.
- İyileştirme: çözülecek kullanıcı ihtiyacı ve önerilen kapsam.
- Dokümantasyon/test: hangi adımın belirsiz veya eksik olduğu ve tamamlanma ölçütü.

Teşekkürler — her katkı önce incelenir; PR'ların birleştirilmesi testlerin ve bakımcı incelemesinin sonucuna bağlıdır.
