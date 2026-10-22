<h1 align="center">📒 Kontakt-Notizbuch</h1>

<p align="center">
  <b>Open source · Quelloffen · Açık kaynak</b><br>
  <sub>Cloudflare Workers · D1 · R2 · PWA</sub>
</p>

<p align="center">
  <a href="#english">🇬🇧 English</a> &nbsp;·&nbsp;
  <a href="#türkçe">🇹🇷 Türkçe</a> &nbsp;·&nbsp;
  <a href="#deutsch">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <a href="https://kontakt-notizbuch.halilgercek023.workers.dev"><img alt="Live demo" src="https://img.shields.io/website?url=https%3A%2F%2Fkontakt-notizbuch.halilgercek023.workers.dev&up_message=online&down_message=offline&up_color=22c55e&down_color=ef4444&label=Live%20demo&logo=cloudflare&logoColor=white&labelColor=24292f&style=flat-square"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/actions/workflows/tests.yml"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/Higer23/kontakt-notizbuch/tests.yml?branch=main&label=Tests&logo=githubactions&logoColor=white&labelColor=24292f&style=flat-square"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/actions/workflows/deploy.yml"><img alt="Deploy" src="https://img.shields.io/github/actions/workflow/status/Higer23/kontakt-notizbuch/deploy.yml?branch=main&label=Deploy&logo=cloudflare&logoColor=white&labelColor=24292f&style=flat-square"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/Higer23/kontakt-notizbuch?label=Stars&color=f59e0b&labelColor=24292f&style=flat-square&logo=github&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/issues"><img alt="Issues" src="https://img.shields.io/github/issues/Higer23/kontakt-notizbuch?label=Issues&color=ef4444&labelColor=24292f&style=flat-square&logo=githubissues&logoColor=white"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-eab308?label=License&color=eab308&labelColor=24292f&style=flat-square&logo=opensourceinitiative&logoColor=white"></a>
</p>

---

<a id="english"></a>
## 🇬🇧 English

**Kontakt-Notizbuch** is an open-source personal contact notebook built with Cloudflare Workers, D1, and R2. It helps you organize contact details and notes, with access control and sensitive-data handling in focus.

> [!WARNING]
> **Project status:** active development, no independent security certification. Do not use real personal data in tests and review code and configuration before any production use.

<sub>Jump to: <a href="#en-features">Features</a> · <a href="#en-start">Quick start</a> · <a href="#en-contribute">Contributing</a> · <a href="CONTRIBUTING.md">Guide</a> · <a href="SECURITY.md">Security</a></sub>

<a id="en-features"></a>
### ✨ Features
- 🔐 Session-protected sign-in and server-side access checks
- 🔎 Contact search, tags, dates, and age calculation
- 🖼️ Social profile links and photo storage on Cloudflare R2
- ⚡ Cloudflare Worker API with D1 database
- 🗝️ Passkey/WebAuthn and encrypted vault (depending on configuration)
- 🛡️ Security headers and GitHub Actions test/deploy workflows

### 🧰 Tech stack
| | |
|---|---|
| **Frontend** | ![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-e34f26?style=flat-square&logoColor=white&logo=html5) ![CSS3](https://img.shields.io/badge/CSS3-1572b6?style=flat-square&logoColor=white&logo=css3) |
| **Backend** | ![Workers](https://img.shields.io/badge/Workers-f38020?style=flat-square&logoColor=white&logo=cloudflare) ![D1](https://img.shields.io/badge/D1-f38020?style=flat-square&logoColor=white&logo=cloudflare) ![R2](https://img.shields.io/badge/R2-f38020?style=flat-square&logoColor=white&logo=cloudflare) |
| **Tooling** | ![Wrangler](https://img.shields.io/badge/Wrangler-f38020?style=flat-square&logoColor=white&logo=cloudflare) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logoColor=white&logo=nodedotjs) ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088ff?style=flat-square&logoColor=white&logo=githubactions) |

<details>
<summary><b>🗂️ Project structure</b></summary>

```text
public/    Frontend (app.js, crypto.js, passkey.js, i18n.js, PWA assets)
src/       Cloudflare Worker (worker.js)
schema.sql D1 database schema
tests/     Node.js test scripts
docs/      Setup, security and smoke-test guides
stable/    Frozen snapshots of earlier versions
.github/   Workflows, issue templates, funding
```
</details>

<a id="en-start"></a>
### 🚀 Quick start
**Requirements:** a current supported Node.js release with npm. A Cloudflare account is only needed for Cloudflare resources and remote deployment.

1. Fork the repository and clone your fork, or clone it to explore:
   ```bash
   git clone https://github.com/Higer23/kontakt-notizbuch.git
   cd kontakt-notizbuch
   ```
2. Run the existing tests:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
3. Authenticate Wrangler with your own Cloudflare account:
   ```bash
   npx wrangler login
   ```
4. Review `wrangler.toml` and configure your own D1/R2 resources and bindings. Do not copy production secrets or modify production resources for experiments.
5. Start the local Worker dev server:
   ```bash
   npx wrangler dev
   ```

> [!CAUTION]
> Applying `schema.sql`, changing D1 bindings, or deploying can affect data and infrastructure. Use isolated development resources and fake data.

<a id="en-contribute"></a>
### 🤝 Contributing
Contributions are welcome! Read the **[Contribution Guide](CONTRIBUTING.md)** first. Browse issues labelled [good first issue](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) or [help wanted](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted), comment on an issue to coordinate, then open a pull request. Please do not push directly to `main`.

- [Issue #25 — Mobile and desktop browser smoke-test checklist](https://github.com/Higer23/kontakt-notizbuch/issues/25)
- [Issue #26 — Account recovery regression tests](https://github.com/Higer23/kontakt-notizbuch/issues/26)
- [Manual browser smoke-test checklist](docs/manual-smoke-test.md)

> [!IMPORTANT]
> Report potential vulnerabilities via [SECURITY.md](SECURITY.md), not in public issues.

### 🔒 Security and privacy
- Never commit passwords, API tokens, Cloudflare secrets, or real personal data.
- Use synthetic test data only.
- Protect D1/R2 resources and backups; explain the impact of changes that touch stored data.

### 📄 License & 💖 Support
Released under the [MIT License](LICENSE). You can support the project via [Open Collective](https://opencollective.com/kontakt-notizbuch); support does not change the license.

<p align="right"><a href="#top">⬆️ back to top</a></p>

---

<a id="türkçe"></a>
## 🇹🇷 Türkçe

**Kontakt-Notizbuch**, Cloudflare Workers, D1 ve R2 üzerinde geliştirilen açık kaynaklı bir kişisel rehber ve not defteridir. İletişim bilgilerini ve notları düzenlemeye yardım eder; erişim denetimi ve hassas verilerin korunması odak noktasıdır.

> [!WARNING]
> **Proje durumu:** aktif geliştirme aşamasında, bağımsız güvenlik sertifikası yok. Testlerde gerçek kişisel veri kullanmayın; üretimde kullanmadan önce kodu ve yapılandırmayı inceleyin.

<sub>Git: <a href="#tr-ozellikler">Özellikler</a> · <a href="#tr-kurulum">Hızlı kurulum</a> · <a href="#tr-katki">Katkı</a> · <a href="CONTRIBUTING.md#türkçe">Rehber</a> · <a href="SECURITY.md#türkçe">Güvenlik</a></sub>

<a id="tr-ozellikler"></a>
### ✨ Özellikler
- 🔐 Oturum korumalı giriş ve sunucu tarafında erişim denetimi
- 🔎 Kişi arama, etiketler, tarihler ve yaş hesaplama
- 🖼️ Sosyal profil bağlantıları ve Cloudflare R2'de fotoğraf saklama
- ⚡ D1 veritabanlı Cloudflare Worker API'si
- 🗝️ Passkey/WebAuthn ve şifreli kasa (yapılandırmaya bağlı)
- 🛡️ Güvenlik başlıkları ve GitHub Actions test/dağıtım iş akışları

### 🧰 Teknoloji yığını
| | |
|---|---|
| **Ön yüz** | ![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-e34f26?style=flat-square&logoColor=white&logo=html5) ![CSS3](https://img.shields.io/badge/CSS3-1572b6?style=flat-square&logoColor=white&logo=css3) |
| **Arka uç** | ![Workers](https://img.shields.io/badge/Workers-f38020?style=flat-square&logoColor=white&logo=cloudflare) ![D1](https://img.shields.io/badge/D1-f38020?style=flat-square&logoColor=white&logo=cloudflare) ![R2](https://img.shields.io/badge/R2-f38020?style=flat-square&logoColor=white&logo=cloudflare) |
| **Araçlar** | ![Wrangler](https://img.shields.io/badge/Wrangler-f38020?style=flat-square&logoColor=white&logo=cloudflare) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logoColor=white&logo=nodedotjs) ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088ff?style=flat-square&logoColor=white&logo=githubactions) |

<details>
<summary><b>🗂️ Proje yapısı</b></summary>

```text
public/    Ön yüz (app.js, crypto.js, passkey.js, i18n.js, PWA dosyaları)
src/       Cloudflare Worker (worker.js)
schema.sql D1 veritabanı şeması
tests/     Node.js test betikleri
docs/      Kurulum, güvenlik ve manuel test rehberleri
stable/    Önceki sürümlerin dondurulmuş kopyaları
.github/   İş akışları, issue şablonları, destek bilgisi
```
</details>

<a id="tr-kurulum"></a>
### 🚀 Hızlı kurulum
**Gereksinimler:** npm içeren güncel ve desteklenen bir Node.js sürümü. Cloudflare hesabı yalnızca Cloudflare kaynakları ve uzak dağıtım için gerekir.

1. Depoyu fork edin ve klonlayın, ya da incelemek için doğrudan klonlayın:
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
3. Wrangler'ı kendi Cloudflare hesabınıza bağlayın:
   ```bash
   npx wrangler login
   ```
4. `wrangler.toml` dosyasını inceleyin ve kendi D1/R2 kaynaklarınızı yapılandırın. Üretim sırlarını kopyalamayın, deneme için üretim kaynaklarını değiştirmeyin.
5. Yerel geliştirme sunucusunu başlatın:
   ```bash
   npx wrangler dev
   ```

> [!CAUTION]
> `schema.sql` uygulamak, D1 bağlantılarını değiştirmek veya dağıtım yapmak verileri ve altyapıyı etkileyebilir. Ayrı geliştirme kaynakları ve sahte veriler kullanın.

<a id="tr-katki"></a>
### 🤝 Katkıda bulunma
Katkılar memnuniyetle karşılanır! Önce **[Katkı Rehberi'ni](CONTRIBUTING.md#türkçe)** okuyun. [good first issue](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) ve [help wanted](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted) etiketli görevlere göz atın, koordinasyon için issue'ya yorum bırakın, sonra pull request açın. `main` dalına doğrudan push yapmayın.

- [Issue #25 — Mobil ve masaüstü tarayıcı test listesi](https://github.com/Higer23/kontakt-notizbuch/issues/25)
- [Issue #26 — Hesap kurtarma regresyon testleri](https://github.com/Higer23/kontakt-notizbuch/issues/26)
- [Manuel tarayıcı test listesi](docs/manual-smoke-test.md)

> [!IMPORTANT]
> Olası güvenlik açıklarını herkese açık issue yerine [SECURITY.md](SECURITY.md#türkçe) yönergelerine göre bildirin.

### 🔒 Güvenlik ve gizlilik
- Parola, API token'ı, Cloudflare sırrı veya gerçek kişisel veri commit etmeyin.
- Yalnızca sentetik test verileri kullanın.
- D1/R2 kaynaklarını ve yedekleri koruyun; saklanan verilere dokunan değişikliklerin etkisini açıklayın.

### 📄 Lisans ve 💖 destek
Proje [MIT Lisansı](LICENSE) ile sunulur. [Open Collective](https://opencollective.com/kontakt-notizbuch) üzerinden destek olabilirsiniz; destek lisansı değiştirmez.

<p align="right"><a href="#top">⬆️ başa dön</a></p>

---

<a id="deutsch"></a>
## 🇩🇪 Deutsch

**Kontakt-Notizbuch** ist ein quelloffenes persönliches Kontakt- und Notizbuch auf Basis von Cloudflare Workers, D1 und R2. Es hilft, Kontaktdaten und Notizen zu organisieren – mit Fokus auf Zugriffskontrolle und den Schutz sensibler Daten.

> [!WARNING]
> **Projektstatus:** aktive Entwicklung, keine unabhängige Sicherheitszertifizierung. Verwenden Sie in Tests keine echten personenbezogenen Daten und prüfen Sie Code und Konfiguration vor einem produktiven Einsatz.

<sub>Springe zu: <a href="#de-funktionen">Funktionen</a> · <a href="#de-start">Schnellstart</a> · <a href="#de-mitwirken">Mitwirken</a> · <a href="CONTRIBUTING.md#deutsch">Leitfaden</a> · <a href="SECURITY.md#deutsch">Sicherheit</a></sub>

<a id="de-funktionen"></a>
### ✨ Funktionen
- 🔐 Anmeldung mit sitzungsgeschütztem Zugriff und serverseitigen Berechtigungsprüfungen
- 🔎 Kontaktsuche, Tags, Datumsangaben und Altersberechnung
- 🖼️ Links zu sozialen Profilen und Fotospeicherung über Cloudflare R2
- ⚡ Cloudflare-Worker-API mit D1-Datenbank
- 🗝️ Passkey/WebAuthn und verschlüsselter Tresor (abhängig von der Konfiguration)
- 🛡️ Sicherheits-Header sowie Test- und Deployment-Workflows mit GitHub Actions

### 🧰 Technologie-Stack
| | |
|---|---|
| **Frontend** | ![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-e34f26?style=flat-square&logoColor=white&logo=html5) ![CSS3](https://img.shields.io/badge/CSS3-1572b6?style=flat-square&logoColor=white&logo=css3) |
| **Backend** | ![Workers](https://img.shields.io/badge/Workers-f38020?style=flat-square&logoColor=white&logo=cloudflare) ![D1](https://img.shields.io/badge/D1-f38020?style=flat-square&logoColor=white&logo=cloudflare) ![R2](https://img.shields.io/badge/R2-f38020?style=flat-square&logoColor=white&logo=cloudflare) |
| **Werkzeuge** | ![Wrangler](https://img.shields.io/badge/Wrangler-f38020?style=flat-square&logoColor=white&logo=cloudflare) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logoColor=white&logo=nodedotjs) ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088ff?style=flat-square&logoColor=white&logo=githubactions) |

<details>
<summary><b>🗂️ Projektstruktur</b></summary>

```text
public/    Frontend (app.js, crypto.js, passkey.js, i18n.js, PWA-Dateien)
src/       Cloudflare Worker (worker.js)
schema.sql D1-Datenbankschema
tests/     Node.js-Testskripte
docs/      Anleitungen zu Einrichtung, Sicherheit und Smoke-Tests
stable/    Eingefrorene Stände früherer Versionen
.github/   Workflows, Issue-Vorlagen, Förderinformationen
```
</details>

<a id="de-start"></a>
### 🚀 Schnellstart
**Voraussetzungen:** eine aktuelle unterstützte Node.js-Version mit npm. Ein Cloudflare-Konto ist nur für Cloudflare-Ressourcen und Remote-Deployments nötig.

1. Repository forken und klonen – oder direkt zum Ausprobieren klonen:
   ```bash
   git clone https://github.com/Higer23/kontakt-notizbuch.git
   cd kontakt-notizbuch
   ```
2. Vorhandene Tests ausführen:
   ```bash
   node tests/crypto.test.mjs
   node tests/csv.test.mjs
   node tests/run-tests.mjs
   ```
3. Wrangler mit dem eigenen Cloudflare-Konto verbinden:
   ```bash
   npx wrangler login
   ```
4. `wrangler.toml` prüfen und eigene D1-/R2-Ressourcen und Bindings konfigurieren. Keine Produktionsgeheimnisse übernehmen und keine Produktionsressourcen für Experimente verändern.
5. Lokalen Entwicklungsserver starten:
   ```bash
   npx wrangler dev
   ```

> [!CAUTION]
> Das Anwenden von `schema.sql`, Änderungen an D1-Bindings oder ein Deployment können Daten und Infrastruktur beeinflussen. Verwenden Sie getrennte Entwicklungsressourcen und Testdaten.

<a id="de-mitwirken"></a>
### 🤝 Mitwirken
Beiträge sind willkommen! Lesen Sie zuerst den **[Leitfaden für Beiträge](CONTRIBUTING.md#deutsch)**. Suchen Sie Issues mit den Labels [good first issue](https://github.com/Higer23/kontakt-notizbuch/labels/good%20first%20issue) oder [help wanted](https://github.com/Higer23/kontakt-notizbuch/labels/help%20wanted), kommentieren Sie zur Abstimmung das Issue und reichen Sie dann einen Pull Request ein. Bitte nicht direkt in `main` pushen.

- [Issue #25 — Checkliste für Browser-Tests auf Mobilgeräten und Desktop](https://github.com/Higer23/kontakt-notizbuch/issues/25)
- [Issue #26 — Regressionstests für die Kontowiederherstellung](https://github.com/Higer23/kontakt-notizbuch/issues/26)
- [Checkliste für manuelle Browser-Smoke-Tests](docs/manual-smoke-test.md)

> [!IMPORTANT]
> Melden Sie mögliche Sicherheitslücken gemäß [SECURITY.md](SECURITY.md#deutsch), nicht in öffentlichen Issues.

### 🔒 Sicherheit und Datenschutz
- Committen Sie niemals Passwörter, API-Tokens, Cloudflare-Geheimnisse oder echte personenbezogene Daten.
- Verwenden Sie ausschließlich künstliche Testdaten.
- Schützen Sie D1-/R2-Ressourcen und Backups; erläutern Sie die Auswirkungen von Änderungen an gespeicherten Daten.

### 📄 Lizenz & 💖 Unterstützung
Das Projekt steht unter der [MIT-Lizenz](LICENSE). Unterstützung ist über [Open Collective](https://opencollective.com/kontakt-notizbuch) möglich; sie ändert die Lizenz nicht.

<p align="right"><a href="#top">⬆️ nach oben</a></p>

---

## 📊 Live · Canlı · Live
<sub>Updated automatically from the GitHub API / GitHub API'den otomatik güncellenir / Automatisch über die GitHub-API aktualisiert</sub>

<p align="center">
  <a href="https://github.com/Higer23/kontakt-notizbuch/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/Higer23/kontakt-notizbuch?label=Last%20commit&color=22c55e&labelColor=24292f&style=flat-square&logo=git&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/graphs/commit-activity"><img alt="Commits / month" src="https://img.shields.io/github/commit-activity/m/Higer23/kontakt-notizbuch?label=Commits%20/%20month&color=06b6d4&labelColor=24292f&style=flat-square&logo=github&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch"><img alt="Top language" src="https://img.shields.io/github/languages/top/Higer23/kontakt-notizbuch?label=Top%20language&color=f7df1e&labelColor=24292f&style=flat-square&logo=javascript&logoColor=black"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch"><img alt="Repo size" src="https://img.shields.io/github/repo-size/Higer23/kontakt-notizbuch?label=Repo%20size&color=ec4899&labelColor=24292f&style=flat-square&logo=files&logoColor=white"></a>
  <br>
  <a href="https://github.com/Higer23/kontakt-notizbuch/issues?q=is%3Aissue+is%3Aclosed"><img alt="Issues closed" src="https://img.shields.io/github/issues-closed/Higer23/kontakt-notizbuch?label=Issues%20closed&color=8b5cf6&labelColor=24292f&style=flat-square&logo=githubissues&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/pulls"><img alt="Open PRs" src="https://img.shields.io/github/issues-pr/Higer23/kontakt-notizbuch?label=Open%20PRs&color=3b82f6&labelColor=24292f&style=flat-square&logo=git&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/Higer23/kontakt-notizbuch?label=Forks&color=14b8a6&labelColor=24292f&style=flat-square&logo=git&logoColor=white"></a>
  <a href="https://github.com/Higer23/kontakt-notizbuch/graphs/contributors"><img alt="Contributors" src="https://img.shields.io/github/contributors/Higer23/kontakt-notizbuch?label=Contributors&color=f97316&labelColor=24292f&style=flat-square&logo=github&logoColor=white"></a>
  <a href="https://opencollective.com/kontakt-notizbuch"><img alt="Open Collective" src="https://img.shields.io/badge/Open%20Collective-Support-7fadf2?label=Open%20Collective&color=7fadf2&labelColor=24292f&style=flat-square&logo=opencollective&logoColor=white"></a>
</p>

### 🧭 Architecture · Mimari · Architektur
```mermaid
flowchart LR
    A["📱 PWA / Browser<br/>public/"] -->|HTTPS| B["⚡ Cloudflare Worker<br/>src/worker.js"]
    B --> C[("🗄️ D1<br/>contacts · notes")]
    B --> D[("🖼️ R2<br/>photos")]
    A -.-> E["🗝️ Passkey · 🔐 Vault<br/>WebAuthn / crypto.js"]
    classDef cf fill:#f38020,stroke:#c2410c,color:#fff;
    classDef ui fill:#3b82f6,stroke:#1d4ed8,color:#fff;
    classDef sec fill:#8b5cf6,stroke:#6d28d9,color:#fff;
    class B,C,D cf;
    class A ui;
    class E sec;
```

<p align="center">
  <img alt="Tech stack" src="https://skillicons.dev/icons?i=js,html,css,cloudflare,nodejs,githubactions,git&theme=dark">
</p>

<details>
<summary><b>👥 Contributors · Mitwirkende · Katkıda bulunanlar</b> &nbsp;|&nbsp; <b>⭐ Star history</b></summary>

<p align="center">
  <a href="https://github.com/Higer23/kontakt-notizbuch/graphs/contributors"><img alt="Contributors" src="https://contrib.rocks/image?repo=Higer23/kontakt-notizbuch"></a>
</p>
<p align="center">
  <a href="https://star-history.com/#Higer23/kontakt-notizbuch&Date"><img alt="Star history" src="https://api.star-history.com/svg?repos=Higer23/kontakt-notizbuch&type=Date" width="560"></a>
</p>
</details>

<p align="center"><sub>Made for contributors everywhere · English · Türkçe · Deutsch</sub></p>
