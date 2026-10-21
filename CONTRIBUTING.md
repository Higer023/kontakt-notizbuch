<p align="center"><strong>Language / Dil / Sprache:</strong> <a href="#english">English</a> · <a href="#türkçe">Türkçe</a> · <a href="#deutsch">Deutsch</a></p>

<a id="english"></a>
# Contributing

Thank you for considering a contribution to Kontakt-Notizbuch! Contributions may include code, tests, documentation, accessibility improvements, bug reports, and careful reviews. This project handles personal contact data, so correctness and privacy matter more than rushing a change.

## Before you start
- Read [README.md](README.md) and [SECURITY.md](SECURITY.md).
- Browse issues labelled [`good first issue`](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) or [`help wanted`](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted). Comment on an issue before starting substantial work to coordinate with maintainers.
- Never disclose a suspected vulnerability in a public issue; follow the private reporting guidance in SECURITY.md.

## Development workflow
1. Fork the repository and clone your fork.
2. Create a focused branch such as `docs/...`, `fix/...`, or `test/...`; do not work directly on `main`.
3. Install a supported Node.js release with npm. Review `wrangler.toml`; use your own isolated Cloudflare D1/R2 resources only if needed.
4. Run the existing tests:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
5. Add or update tests for behavior changes, especially authentication, authorization, encryption, recovery, data migration, and user-data handling.
6. Open a pull request against `Higer23/kontakt-notizbuch:main`. Explain the problem, solution, tests run, risks, and any deployment or schema impact.

## Pull request checklist
- [ ] The change has one clear purpose and a useful description.
- [ ] Relevant tests pass; any unrun tests are explained.
- [ ] No passwords, tokens, secrets, recovery codes, encryption keys, or real personal data are included.
- [ ] Authorization is enforced server-side; client input is treated as untrusted.
- [ ] Database/schema, compatibility, deployment, and rollback effects are documented.
- [ ] Documentation and tests are updated where appropriate.

## Safe development principles
Use synthetic data only. Never experiment against production databases or object storage. Avoid adding dependencies without explaining their maintenance and security impact. A green CI run is not a security certification; changes remain subject to review.

## Issue reports
For bugs, include reproducible steps, expected and actual behavior, and environment details without secrets or personal data. For feature requests, describe the user problem and a focused outcome.

---
<a id="türkçe"></a>
# Katkı Rehberi

Katkıda bulunmayı düşündüğünüz için teşekkürler! Kod, test, dokümantasyon, erişilebilirlik iyileştirmeleri, hata bildirimi ve inceleme katkıları memnuniyetle karşılanır. Proje kişisel iletişim bilgileriyle çalıştığı için doğruluk ve gizlilik önceliklidir.

## Başlamadan önce
- [README.md](README.md) ve [SECURITY.md](SECURITY.md) dosyalarını okuyun.
- [`good first issue`](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) ve [`help wanted`](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted) etiketli konulara bakın. Büyük bir işe başlamadan önce issue üzerinde yorum yaparak bakımcılarla koordinasyon kurun.
- Olası güvenlik açıklarını herkese açık issue'larda paylaşmayın; SECURITY.md içindeki özel bildirim yöntemini kullanın.

## Geliştirme akışı
1. Depoyu fork edin ve kendi kopyanızı klonlayın.
2. `docs/...`, `fix/...` veya `test/...` gibi amaca özel bir dal açın; doğrudan `main` üzerinde çalışmayın.
3. Desteklenen bir Node.js sürümü ve npm kullanın. `wrangler.toml` dosyasını inceleyin; gerekirse yalnızca size ait, izole Cloudflare D1/R2 kaynaklarını kullanın.
4. Mevcut testleri çalıştırın:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
5. Davranış değişiklikleri için test ekleyin veya testleri güncelleyin; özellikle kimlik doğrulama, yetkilendirme, şifreleme, hesap kurtarma, veri taşıma ve kişisel veri işleme konularına dikkat edin.
6. `Higer23/kontakt-notizbuch:main` hedefine Pull Request açın. Sorunu, çözümü, çalıştırılan testleri, riskleri ve dağıtım/şema etkilerini açıklayın.

## Pull Request kontrol listesi
- [ ] Değişikliğin amacı açık ve kapsamı sınırlı.
- [ ] İlgili testler geçti; çalıştırılmayan testler açıklandı.
- [ ] Parola, token, sır, kurtarma kodu, şifreleme anahtarı veya gerçek kişisel veri eklenmedi.
- [ ] Yetkilendirme sunucuda yapılıyor; istemci girdileri güvenilmeyen veri kabul ediliyor.
- [ ] Veritabanı/şema, uyumluluk, dağıtım ve geri alma etkileri belgelendi.
- [ ] Gereken dokümantasyon ve testler güncellendi.

## Güvenli geliştirme ilkeleri
Yalnızca sentetik test verisi kullanın. Üretim veritabanı veya nesne depolama alanında deneme yapmayın. Yeni bağımlılıkların bakım ve güvenlik etkisini açıklayın. CI testlerinin geçmesi güvenlik sertifikası anlamına gelmez; değişiklikler incelemeye tabidir.

## Issue bildirimleri
Hatalarda yeniden üretme adımlarını, beklenen/gerçek davranışı ve ortamı sır veya kişisel veri paylaşmadan belirtin. Özellik önerilerinde kullanıcı sorununu ve hedeflenen sonucu açıklayın.

---
<a id="deutsch"></a>
# Mitwirken

Vielen Dank für Ihr Interesse an Kontakt-Notizbuch! Willkommen sind Beiträge zu Code, Tests, Dokumentation, Barrierefreiheit, Fehlerberichten und Reviews. Da das Projekt persönliche Kontaktdaten verarbeitet, haben Korrektheit und Datenschutz Vorrang.

## Vor dem Start
- Lesen Sie [README.md](README.md) und [SECURITY.md](SECURITY.md).
- Suchen Sie Issues mit den Labels [`good first issue`](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) oder [`help wanted`](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted). Stimmen Sie größere Arbeiten zunächst in einem Issue mit den Maintainer:innen ab.
- Veröffentlichen Sie vermutete Sicherheitslücken nicht in öffentlichen Issues. Nutzen Sie den vertraulichen Meldeweg aus SECURITY.md.

## Entwicklungsablauf
1. Forken Sie das Repository und klonen Sie Ihren Fork.
2. Erstellen Sie einen thematischen Branch wie `docs/...`, `fix/...` oder `test/...`; arbeiten Sie nicht direkt auf `main`.
3. Verwenden Sie eine unterstützte Node.js-Version mit npm. Prüfen Sie `wrangler.toml`; falls nötig, verwenden Sie ausschließlich eigene, isolierte Cloudflare-D1-/R2-Ressourcen.
4. Führen Sie die vorhandenen Tests aus:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
5. Ergänzen oder aktualisieren Sie Tests bei Verhaltensänderungen, besonders für Authentifizierung, Autorisierung, Verschlüsselung, Kontowiederherstellung, Datenmigration und den Umgang mit Nutzerdaten.
6. Erstellen Sie einen Pull Request gegen `Higer23/kontakt-notizbuch:main`. Beschreiben Sie Problem, Lösung, Tests, Risiken sowie Auswirkungen auf Deployment und Schema.

## Checkliste für Pull Requests
- [ ] Zweck und Umfang der Änderung sind klar.
- [ ] Relevante Tests bestehen; nicht ausgeführte Tests werden erläutert.
- [ ] Keine Passwörter, Tokens, Geheimnisse, Wiederherstellungscodes, Verschlüsselungsschlüssel oder echten personenbezogenen Daten enthalten.
- [ ] Berechtigungen werden serverseitig geprüft; Client-Eingaben gelten als nicht vertrauenswürdig.
- [ ] Auswirkungen auf Datenbank/Schema, Kompatibilität, Deployment und Rollback sind dokumentiert.
- [ ] Erforderliche Dokumentation und Tests sind aktualisiert.

## Sichere Entwicklungsgrundsätze
Verwenden Sie ausschließlich synthetische Testdaten und testen Sie niemals gegen Produktionsdatenbanken oder produktiven Objektspeicher. Begründen Sie neue Abhängigkeiten einschließlich Wartungs- und Sicherheitsauswirkungen. Erfolgreiche CI-Tests sind keine Sicherheitszertifizierung; Änderungen werden geprüft.

## Issues melden
Beschreiben Sie bei Fehlern reproduzierbare Schritte, erwartetes und tatsächliches Verhalten sowie die Umgebung – ohne Geheimnisse oder personenbezogene Daten. Feature-Wünsche sollten das Nutzerproblem und das gewünschte Ergebnis erklären.
