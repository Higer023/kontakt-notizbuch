<p align="center">
  <strong>Language / Sprache / Dil:</strong>
  <a href="#english">English</a> · <a href="#türkçe">Türkçe</a> · <a href="#deutsch">Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/Higer23/kontakt-notizbuch"><img alt="GitHub repository" src="https://img.shields.io/badge/GitHub-Repository-181717?logo=github"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
</p>

# Kontakt-Notizbuch

<a id="english"></a>
## English

**Kontakt-Notizbuch** is an open-source personal contact notebook built with Cloudflare Workers, D1, and R2. It aims to help people organize contact details and notes while keeping access control and sensitive-data handling in focus.

> **Project status:** Active development. It has not been independently security-certified. Do not use real personal data in tests, and review the code and configuration before any production use.

### Features
- Session-protected sign-in and server-side access checks.
- Contact search, tags, dates, and age calculation.
- Social profile links and photo storage using Cloudflare R2.
- Cloudflare Worker API with D1 database integration.
- Passkey/WebAuthn and encrypted-vault features, depending on configuration and supported flows.
- Security headers and GitHub Actions test/deployment workflows.

### Technology stack
- JavaScript, HTML, and CSS
- Cloudflare Workers, D1, and R2
- Wrangler CLI
- Node.js tests and GitHub Actions

### Quick start
**Requirements:** a current supported Node.js release with npm. A Cloudflare account is needed only for Cloudflare account resources and remote deployment.

1. Fork this repository and clone your fork, or clone it to explore:
   ```bash
   git clone https://github.com/Higer23/kontakt-notizbuch.git
   cd kontakt-notizbuch
   ```
2. Run the existing test scripts:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
3. If you need to authenticate Wrangler with your own Cloudflare account:
   ```bash
   npx wrangler login
   ```
4. Review `wrangler.toml` and configure your own D1/R2 resources and bindings for local or remote development. Do not copy production secrets or modify production resources for experiments.
5. Start the local Worker development server:
   ```bash
   npx wrangler dev
   ```

> **Caution:** Applying `schema.sql`, changing D1 bindings, or deploying may affect data and infrastructure. Use isolated development resources and fake data.

### Contributing
Contributions are welcome! Read the **[Contribution Guide](CONTRIBUTING.md)** before starting. Browse issues labelled [good first issue](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) or [help wanted](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted). Please comment on an issue first so work can be coordinated, then submit changes as a pull request (PR). Do not push directly to `main`.

Suggested first tasks:
- [Issue #25 — Mobile and desktop browser smoke-test checklist](https://github.com/Higer23/kontakt-notizbuch/issues/25)
- [Issue #26 — Account recovery regression tests](https://github.com/Higer23/kontakt-notizbuch/issues/26)

Please report potential vulnerabilities according to [SECURITY.md](SECURITY.md), not in public issues.

### Security and privacy
- Never commit passwords, API tokens, Cloudflare secrets, or real personal data.
- Use synthetic test data only.
- Protect D1/R2 resources and backups; explain the impact of changes that touch stored data.
- Read the [security policy](SECURITY.md).

### License
Released under the [MIT License](LICENSE).

### Support
You can support the project through [Open Collective](https://opencollective.com/kontakt-notizbuch). Support does not change the MIT license.

---

<a id="türkçe"></a>
## Türkçe

**Kontakt-Notizbuch**, Cloudflare Workers, D1 ve R2 üzerinde geliştirilen açık kaynaklı bir kişisel kişi ve not defteridir. İletişim bilgilerini ve notları düzenlemeyi, erişim denetimini ve hassas verilerin korunmasını amaçlar.

> **Proje durumu:** Aktif geliştirme aşamasındadır; bağımsız bir güvenlik sertifikasına sahip değildir. Testlerde gerçek kişisel veri kullanmayın ve üretimde kullanmadan önce kodu ve yapılandırmayı inceleyin.

### Özellikler
- Oturum korumalı giriş ve sunucu tarafında erişim denetimi.
- Kişi arama, etiketler, tarihler ve yaş hesaplama.
- Cloudflare R2 üzerinde sosyal profil bağlantıları ve fotoğraf saklama.
- D1 veritabanıyla entegre Cloudflare Worker API'si.
- Yapılandırmaya ve desteklenen akışlara bağlı Passkey/WebAuthn ve şifreli kasa özellikleri.
- Güvenlik başlıkları ve GitHub Actions test/dağıtım iş akışları.

### Hızlı kurulum
**Gereksinimler:** npm içeren güncel ve desteklenen bir Node.js sürümü. Cloudflare hesabı yalnızca Cloudflare kaynakları ve uzak dağıtım için gereklidir.

1. Depoyu fork edin veya incelemek için klonlayın:
   ```bash
   git clone https://github.com/Higer23/kontakt-notizbuch.git
   cd kontakt-notizbuch
   ```
2. Mevcut testleri çalıştırın:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
3. Wrangler'ı kendi Cloudflare hesabınıza bağlamak için:
   ```bash
   npx wrangler login
   ```
4. Yerel/uzak geliştirme için `wrangler.toml` dosyasını inceleyin ve kendi D1/R2 kaynaklarınızı yapılandırın. Üretim sırlarını kopyalamayın ve deneme için üretim kaynaklarını değiştirmeyin.
5. Yerel geliştirme sunucusunu başlatın:
   ```bash
   npx wrangler dev
   ```

> **Dikkat:** `schema.sql` uygulamak, D1 bağlantılarını değiştirmek veya dağıtım yapmak verileri ve altyapıyı etkileyebilir. Ayrı geliştirme kaynakları ve sahte veriler kullanın.

### Katkıda bulunma
Katkılar memnuniyetle karşılanır! Başlamadan önce **[Katkı Rehberi'ni](CONTRIBUTING.md)** okuyun. [good first issue](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) ve [help wanted](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted) etiketli görevlere bakın. Çalışmayı koordine etmek için önce issue'ya yorum bırakın; ardından değişikliklerinizi pull request (PR) olarak gönderin. `main` dalına doğrudan push yapmayın.

Başlangıç için:
- [Issue #25 — Mobil ve masaüstü tarayıcı test listesi](https://github.com/Higer23/kontakt-notizbuch/issues/25)
- [Issue #26 — Hesap kurtarma regresyon testleri](https://github.com/Higer23/kontakt-notizbuch/issues/26)

Olası güvenlik açıklarını herkese açık issue yerine [SECURITY.md](SECURITY.md) yönergelerine göre bildirin.

### Güvenlik ve gizlilik
- Parola, API token'ı, Cloudflare sırrı veya gerçek kişisel veri commit etmeyin.
- Yalnızca sentetik test verileri kullanın.
- D1/R2 kaynaklarını ve yedekleri koruyun; saklanan verilere dokunan değişikliklerin etkisini açıklayın.
- [Güvenlik politikasını](SECURITY.md) okuyun.

### Lisans ve destek
Proje [MIT Lisansı](LICENSE) ile sunulur. Projeyi [Open Collective](https://opencollective.com/kontakt-notizbuch) üzerinden destekleyebilirsiniz; destek MIT lisansını değiştirmez.

---

<a id="deutsch"></a>
## Deutsch

**Kontakt-Notizbuch** ist ein quelloffenes persönliches Kontakt- und Notizbuch auf Basis von Cloudflare Workers, D1 und R2. Es soll helfen, Kontaktdaten und Notizen zu organisieren und dabei Zugriffskontrollen sowie den Schutz sensibler Daten zu berücksichtigen.

> **Projektstatus:** Aktive Entwicklung; keine unabhängige Sicherheitszertifizierung. Verwenden Sie in Tests keine echten personenbezogenen Daten und prüfen Sie Code und Konfiguration vor einem produktiven Einsatz.

### Funktionen
- Anmeldung mit sitzungsgeschütztem Zugriff und serverseitigen Berechtigungsprüfungen.
- Kontaktsuche, Tags, Datumsangaben und Altersberechnung.
- Links zu sozialen Profilen und Fotospeicherung über Cloudflare R2.
- Cloudflare-Worker-API mit D1-Datenbankintegration.
- Passkey/WebAuthn und verschlüsselter Tresor, abhängig von Konfiguration und unterstützten Abläufen.
- Sicherheits-Header sowie Test- und Deployment-Workflows mit GitHub Actions.

### Schnellstart
**Voraussetzungen:** eine aktuelle unterstützte Node.js-Version mit npm. Ein Cloudflare-Konto ist nur für Cloudflare-Ressourcen und Remote-Deployments erforderlich.

1. Forken Sie das Repository oder klonen Sie es zum Ausprobieren:
   ```bash
   git clone https://github.com/Higer23/kontakt-notizbuch.git
   cd kontakt-notizbuch
   ```
2. Führen Sie die vorhandenen Tests aus:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
3. Um Wrangler mit Ihrem Cloudflare-Konto zu verbinden:
   ```bash
   npx wrangler login
   ```
4. Prüfen Sie `wrangler.toml` und konfigurieren Sie eigene D1-/R2-Ressourcen und Bindings für die lokale oder entfernte Entwicklung. Übernehmen Sie keine Produktionsgeheimnisse und verändern Sie keine Produktionsressourcen für Experimente.
5. Starten Sie den lokalen Entwicklungsserver:
   ```bash
   npx wrangler dev
   ```

> **Achtung:** Das Anwenden von `schema.sql`, Änderungen an D1-Bindings oder ein Deployment können Daten und Infrastruktur beeinflussen. Verwenden Sie getrennte Entwicklungsressourcen und Testdaten.

### Mitwirken
Beiträge sind willkommen! Lesen Sie vor dem Start den **[Leitfaden für Beiträge](CONTRIBUTING.md)**. Suchen Sie nach Issues mit den Labels [good first issue](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) oder [help wanted](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted). Kommentieren Sie zuerst das Issue, damit die Arbeit abgestimmt werden kann, und reichen Sie Ihre Änderungen anschließend als Pull Request (PR) ein. Bitte nicht direkt in `main` pushen.

Geeignete Einstiegsaufgaben:
- [Issue #25 — Checkliste für Browser-Tests auf Mobilgeräten und Desktop](https://github.com/Higer23/kontakt-notizbuch/issues/25)
- [Issue #26 — Regressionstests für die Kontowiederherstellung](https://github.com/Higer23/kontakt-notizbuch/issues/26)

Melden Sie mögliche Sicherheitslücken gemäß [SECURITY.md](SECURITY.md), nicht in öffentlichen Issues.

### Sicherheit und Datenschutz
- Committen Sie niemals Passwörter, API-Tokens, Cloudflare-Geheimnisse oder echte personenbezogene Daten.
- Verwenden Sie ausschließlich künstliche Testdaten.
- Schützen Sie D1-/R2-Ressourcen und Backups; erläutern Sie die Auswirkungen von Änderungen an gespeicherten Daten.
- Lesen Sie die [Sicherheitsrichtlinie](SECURITY.md).

### Lizenz und Unterstützung
Das Projekt steht unter der [MIT-Lizenz](LICENSE). Sie können das Projekt über [Open Collective](https://opencollective.com/kontakt-notizbuch) unterstützen; die Unterstützung ändert die MIT-Lizenz nicht.

---

<p align="center">Made for contributors everywhere · English · Türkçe · Deutsch</p>
