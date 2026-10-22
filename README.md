<p align="center">
  <img alt="Kontakt-Notizbuch banner" src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=210&section=header&text=Kontakt-Notizbuch&fontSize=56&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Cloudflare%20Workers%20%C2%B7%20D1%20%C2%B7%20R2&descAlignY=60&descSize=20">
</p>

<p align="center">
  <img alt="Typing animation" src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1200&color=F7931E&center=true&vCenter=true&width=720&lines=Open-source+personal+contact+notebook;Quelloffenes+Kontakt-+und+Notizbuch;A%C3%A7%C4%B1k+kaynakl%C4%B1+ki%C5%9Fisel+ki%C5%9Fi+ve+not+defteri">
</p>

<p align="center">
  <strong>🌍 Language / Sprache / Dil:</strong>
  <a href="#english">🇬🇧 English</a> · <a href="#türkçe">🇹🇷 Türkçe</a> · <a href="#deutsch">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/Higer23/kontakt-notizbuch/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/Higer23/kontakt-notizbuch?style=for-the-badge&labelColor=1f2937&color=f59e0b&label=Stars&logo=github&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/Higer23/kontakt-notizbuch?style=for-the-badge&labelColor=1f2937&color=06b6d4&label=Forks&logo=git&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/issues"><img alt="Issues" src="https://img.shields.io/github/issues/Higer23/kontakt-notizbuch?style=for-the-badge&labelColor=1f2937&color=ef4444&label=Issues&logo=githubissues&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/pulls"><img alt="Pull requests" src="https://img.shields.io/github/issues-pr/Higer23/kontakt-notizbuch?style=for-the-badge&labelColor=1f2937&color=8b5cf6&label=PRs&logo=git&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/Higer23/kontakt-notizbuch?style=for-the-badge&labelColor=1f2937&color=22c55e&label=Last commit&logo=github&logoColor=white"></a>
</p>
<p align="center">
  <a href="https://github.com/Higer23/kontakt-notizbuch/actions/workflows/tests.yml"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/Higer23/kontakt-notizbuch/tests.yml?branch=main&style=for-the-badge&label=Tests&logo=githubactions&logoColor=white&labelColor=1f2937"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/actions/workflows/deploy.yml"><img alt="Deploy" src="https://img.shields.io/github/actions/workflow/status/Higer23/kontakt-notizbuch/deploy.yml?branch=main&style=for-the-badge&label=Deploy&logo=cloudflare&logoColor=white&labelColor=1f2937"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/Higer23/kontakt-notizbuch?style=for-the-badge&labelColor=1f2937&color=eab308&label=License&logo=opensourceinitiative&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch"><img alt="Top language" src="https://img.shields.io/github/languages/top/Higer23/kontakt-notizbuch?style=for-the-badge&labelColor=1f2937&color=f7df1e&label=Top language&logo=javascript&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch"><img alt="Repo size" src="https://img.shields.io/github/repo-size/Higer23/kontakt-notizbuch?style=for-the-badge&labelColor=1f2937&color=ec4899&label=Size&logo=files&logoColor=white"></a>
  <a href="https://opencollective.com/kontakt-notizbuch"><img alt="Open Collective" src="https://img.shields.io/badge/Open%20Collective-Support-7fadf2?style=for-the-badge&logo=opencollective&logoColor=white&labelColor=1f2937"></a>
</p>

<p align="center">
  <img alt="Tech stack" src="https://skillicons.dev/icons?i=js,html,css,cloudflare,nodejs,githubactions,git&theme=dark">
</p>

> **📚 Project guide / Proje rehberi / Projektübersicht**
> - 🇬🇧 [Features](#features) · [Quick start](#quick-start) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [License](LICENSE)
> - 🇹🇷 [Özellikler](#özellikler) · [Hızlı kurulum](#hızlı-kurulum) · [Katkı rehberi](CONTRIBUTING.md#türkçe) · [Güvenlik](SECURITY.md#türkçe) · [Lisans açıklaması](LICENSE)
> - 🇩🇪 [Funktionen](#funktionen) · [Schnellstart](#schnellstart) · [Mitwirken](CONTRIBUTING.md#deutsch) · [Sicherheit](SECURITY.md#deutsch) · [Lizenzerläuterung](LICENSE)

# 📒 Kontakt-Notizbuch

<a id="english"></a>
## 🇬🇧 English

**Kontakt-Notizbuch** is an open-source personal contact notebook built with Cloudflare Workers, D1, and R2. It aims to help people organize contact details and notes while keeping access control and sensitive-data handling in focus.

> ⚠️ **Project status:** Active development. It has not been independently security-certified. Do not use real personal data in tests, and review the code and configuration before any production use.

### ✨ Features
- 🔐 Session-protected sign-in and server-side access checks.
- 🔎 Contact search, tags, dates, and age calculation.
- 🖼️ Social profile links and photo storage using Cloudflare R2.
- ⚡ Cloudflare Worker API with D1 database integration.
- 🗝️ Passkey/WebAuthn and encrypted-vault features, depending on configuration and supported flows.
- 🛡️ Security headers and GitHub Actions test/deployment workflows.

### 🧰 Technology stack
| Area | Technology |
|---|---|
| Frontend | ![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-e34f26?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572b6?style=flat-square&logo=css3&logoColor=white) |
| Backend | ![Cloudflare Workers](https://img.shields.io/badge/Workers-f38020?style=flat-square&logo=cloudflare&logoColor=white) ![D1](https://img.shields.io/badge/D1-f38020?style=flat-square&logo=cloudflare&logoColor=white) ![R2](https://img.shields.io/badge/R2-f38020?style=flat-square&logo=cloudflare&logoColor=white) |
| Tooling | ![Wrangler](https://img.shields.io/badge/Wrangler-f38020?style=flat-square&logo=cloudflare&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088ff?style=flat-square&logo=githubactions&logoColor=white) |

### 🗂️ Project structure
```text
public/    Frontend (app.js, crypto.js, passkey.js, i18n.js, PWA assets)
src/       Cloudflare Worker (worker.js)
schema.sql D1 database schema
tests/     Node.js test scripts
docs/      Setup, security and smoke-test guides
stable/    Frozen snapshots of earlier versions
.github/   Workflows, issue templates, funding
```

### 🚀 Quick start
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

> 🚨 **Caution:** Applying `schema.sql`, changing D1 bindings, or deploying may affect data and infrastructure. Use isolated development resources and fake data.

### 🤝 Contributing
Contributions are welcome! Read the **[Contribution Guide](CONTRIBUTING.md)** before starting. Browse issues labelled [good first issue](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) or [help wanted](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted). Please comment on an issue first so work can be coordinated, then submit changes as a pull request (PR). Do not push directly to `main`.

Suggested first tasks:
- [Issue #25 — Mobile and desktop browser smoke-test checklist](https://github.com/Higer23/kontakt-notizbuch/issues/25)
- [Issue #26 — Account recovery regression tests](https://github.com/Higer23/kontakt-notizbuch/issues/26)

For manual browser coverage, use the [manual browser smoke-test checklist](docs/manual-smoke-test.md).

Please report potential vulnerabilities according to [SECURITY.md](SECURITY.md), not in public issues.

### 🔒 Security and privacy
- Never commit passwords, API tokens, Cloudflare secrets, or real personal data.
- Use synthetic test data only.
- Protect D1/R2 resources and backups; explain the impact of changes that touch stored data.
- Read the [security policy](SECURITY.md).

### 📄 License
Released under the [MIT License](LICENSE).

### 💖 Support
You can support the project through [Open Collective](https://opencollective.com/kontakt-notizbuch). Support does not change the MIT license.

---

<a id="türkçe"></a>
## 🇹🇷 Türkçe

**Kontakt-Notizbuch**, Cloudflare Workers, D1 ve R2 üzerinde geliştirilen açık kaynaklı bir kişisel kişi ve not defteridir. İletişim bilgilerini ve notları düzenlemeyi, erişim denetimini ve hassas verilerin korunmasını amaçlar.

> ⚠️ **Proje durumu:** Aktif geliştirme aşamasındadır; bağımsız bir güvenlik sertifikasına sahip değildir. Testlerde gerçek kişisel veri kullanmayın ve üretimde kullanmadan önce kodu ve yapılandırmayı inceleyin.

### ✨ Özellikler
- 🔐 Oturum korumalı giriş ve sunucu tarafında erişim denetimi.
- 🔎 Kişi arama, etiketler, tarihler ve yaş hesaplama.
- 🖼️ Cloudflare R2 üzerinde sosyal profil bağlantıları ve fotoğraf saklama.
- ⚡ D1 veritabanıyla entegre Cloudflare Worker API'si.
- 🗝️ Yapılandırmaya ve desteklenen akışlara bağlı Passkey/WebAuthn ve şifreli kasa özellikleri.
- 🛡️ Güvenlik başlıkları ve GitHub Actions test/dağıtım iş akışları.

### 🧰 Teknoloji yığını
| Alan | Teknoloji |
|---|---|
| Ön yüz | ![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-e34f26?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572b6?style=flat-square&logo=css3&logoColor=white) |
| Arka uç | ![Cloudflare Workers](https://img.shields.io/badge/Workers-f38020?style=flat-square&logo=cloudflare&logoColor=white) ![D1](https://img.shields.io/badge/D1-f38020?style=flat-square&logo=cloudflare&logoColor=white) ![R2](https://img.shields.io/badge/R2-f38020?style=flat-square&logo=cloudflare&logoColor=white) |
| Araçlar | ![Wrangler](https://img.shields.io/badge/Wrangler-f38020?style=flat-square&logo=cloudflare&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088ff?style=flat-square&logo=githubactions&logoColor=white) |

### 🗂️ Proje yapısı
```text
public/    Ön yüz (app.js, crypto.js, passkey.js, i18n.js, PWA dosyaları)
src/       Cloudflare Worker (worker.js)
schema.sql D1 veritabanı şeması
tests/     Node.js test betikleri
docs/      Kurulum, güvenlik ve manuel test rehberleri
stable/    Önceki sürümlerin dondurulmuş kopyaları
.github/   İş akışları, issue şablonları, destek bilgisi
```

### 🚀 Hızlı kurulum
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

> 🚨 **Dikkat:** `schema.sql` uygulamak, D1 bağlantılarını değiştirmek veya dağıtım yapmak verileri ve altyapıyı etkileyebilir. Ayrı geliştirme kaynakları ve sahte veriler kullanın.

### 🤝 Katkıda bulunma
Katkılar memnuniyetle karşılanır! Başlamadan önce **[Katkı Rehberi'ni](CONTRIBUTING.md)** okuyun. [good first issue](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) ve [help wanted](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted) etiketli görevlere bakın. Çalışmayı koordine etmek için önce issue'ya yorum bırakın; ardından değişikliklerinizi pull request (PR) olarak gönderin. `main` dalına doğrudan push yapmayın.

Başlangıç için:
- [Issue #25 — Mobil ve masaüstü tarayıcı test listesi](https://github.com/Higer23/kontakt-notizbuch/issues/25)
- [Issue #26 — Hesap kurtarma regresyon testleri](https://github.com/Higer23/kontakt-notizbuch/issues/26)

Manuel tarayıcı kontrolleri için [manuel tarayıcı test listesini](docs/manual-smoke-test.md) kullanın.

Olası güvenlik açıklarını herkese açık issue yerine [SECURITY.md](SECURITY.md) yönergelerine göre bildirin.

### 🔒 Güvenlik ve gizlilik
- Parola, API token'ı, Cloudflare sırrı veya gerçek kişisel veri commit etmeyin.
- Yalnızca sentetik test verileri kullanın.
- D1/R2 kaynaklarını ve yedekleri koruyun; saklanan verilere dokunan değişikliklerin etkisini açıklayın.
- [Güvenlik politikasını](SECURITY.md) okuyun.

### 📄 Lisans ve 💖 destek
Proje [MIT Lisansı](LICENSE) ile sunulur. Projeyi [Open Collective](https://opencollective.com/kontakt-notizbuch) üzerinden destekleyebilirsiniz; destek MIT lisansını değiştirmez.

---

<a id="deutsch"></a>
## 🇩🇪 Deutsch

**Kontakt-Notizbuch** ist ein quelloffenes persönliches Kontakt- und Notizbuch auf Basis von Cloudflare Workers, D1 und R2. Es soll helfen, Kontaktdaten und Notizen zu organisieren und dabei Zugriffskontrollen sowie den Schutz sensibler Daten zu berücksichtigen.

> ⚠️ **Projektstatus:** Aktive Entwicklung; keine unabhängige Sicherheitszertifizierung. Verwenden Sie in Tests keine echten personenbezogenen Daten und prüfen Sie Code und Konfiguration vor einem produktiven Einsatz.

### ✨ Funktionen
- 🔐 Anmeldung mit sitzungsgeschütztem Zugriff und serverseitigen Berechtigungsprüfungen.
- 🔎 Kontaktsuche, Tags, Datumsangaben und Altersberechnung.
- 🖼️ Links zu sozialen Profilen und Fotospeicherung über Cloudflare R2.
- ⚡ Cloudflare-Worker-API mit D1-Datenbankintegration.
- 🗝️ Passkey/WebAuthn und verschlüsselter Tresor, abhängig von Konfiguration und unterstützten Abläufen.
- 🛡️ Sicherheits-Header sowie Test- und Deployment-Workflows mit GitHub Actions.

### 🧰 Technologie-Stack
| Bereich | Technologie |
|---|---|
| Frontend | ![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-e34f26?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572b6?style=flat-square&logo=css3&logoColor=white) |
| Backend | ![Cloudflare Workers](https://img.shields.io/badge/Workers-f38020?style=flat-square&logo=cloudflare&logoColor=white) ![D1](https://img.shields.io/badge/D1-f38020?style=flat-square&logo=cloudflare&logoColor=white) ![R2](https://img.shields.io/badge/R2-f38020?style=flat-square&logo=cloudflare&logoColor=white) |
| Werkzeuge | ![Wrangler](https://img.shields.io/badge/Wrangler-f38020?style=flat-square&logo=cloudflare&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088ff?style=flat-square&logo=githubactions&logoColor=white) |

### 🗂️ Projektstruktur
```text
public/    Frontend (app.js, crypto.js, passkey.js, i18n.js, PWA-Dateien)
src/       Cloudflare Worker (worker.js)
schema.sql D1-Datenbankschema
tests/     Node.js-Testskripte
docs/      Anleitungen zu Einrichtung, Sicherheit und Smoke-Tests
stable/    Eingefrorene Stände früherer Versionen
.github/   Workflows, Issue-Vorlagen, Förderinformationen
```

### 🚀 Schnellstart
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

> 🚨 **Achtung:** Das Anwenden von `schema.sql`, Änderungen an D1-Bindings oder ein Deployment können Daten und Infrastruktur beeinflussen. Verwenden Sie getrennte Entwicklungsressourcen und Testdaten.

### 🤝 Mitwirken
Beiträge sind willkommen! Lesen Sie vor dem Start den **[Leitfaden für Beiträge](CONTRIBUTING.md)**. Suchen Sie nach Issues mit den Labels [good first issue](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) oder [help wanted](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted). Kommentieren Sie zuerst das Issue, damit die Arbeit abgestimmt werden kann, und reichen Sie Ihre Änderungen anschließend als Pull Request (PR) ein. Bitte nicht direkt in `main` pushen.

Geeignete Einstiegsaufgaben:
- [Issue #25 — Checkliste für Browser-Tests auf Mobilgeräten und Desktop](https://github.com/Higer23/kontakt-notizbuch/issues/25)
- [Issue #26 — Regressionstests für die Kontowiederherstellung](https://github.com/Higer23/kontakt-notizbuch/issues/26)

Für manuelle Browserprüfungen verwenden Sie die [Checkliste für manuelle Browser-Smoke-Tests](docs/manual-smoke-test.md).

Melden Sie mögliche Sicherheitslücken gemäß [SECURITY.md](SECURITY.md), nicht in öffentlichen Issues.

### 🔒 Sicherheit und Datenschutz
- Committen Sie niemals Passwörter, API-Tokens, Cloudflare-Geheimnisse oder echte personenbezogene Daten.
- Verwenden Sie ausschließlich künstliche Testdaten.
- Schützen Sie D1-/R2-Ressourcen und Backups; erläutern Sie die Auswirkungen von Änderungen an gespeicherten Daten.
- Lesen Sie die [Sicherheitsrichtlinie](SECURITY.md).

### 📄 Lizenz und 💖 Unterstützung
Das Projekt steht unter der [MIT-Lizenz](LICENSE). Sie können das Projekt über [Open Collective](https://opencollective.com/kontakt-notizbuch) unterstützen; die Unterstützung ändert die MIT-Lizenz nicht.

---

## 👥 Contributors · Mitwirkende · Katkıda bulunanlar
<p align="center">
  <a href="https://github.com/Higer23/kontakt-notizbuch/graphs/contributors"><img alt="Contributors" src="https://contrib.rocks/image?repo=Higer23/kontakt-notizbuch"></a>
</p>

## ⭐ Star history
<p align="center">
  <a href="https://star-history.com/#Higer23/kontakt-notizbuch&Date"><img alt="Star history" src="https://api.star-history.com/svg?repos=Higer23/kontakt-notizbuch&type=Date" width="600"></a>
</p>

<p align="center">
  <img alt="Footer" src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=110&section=footer">
</p>

<p align="center">Made for contributors everywhere · English · Türkçe · Deutsch</p>

<!-- AUTOMATIC-SYNC-TEST: 2026-10-22; harmless marker to verify Higer23 -> Higer023 synchronization. Remove after verification. -->
