# Web Scrolling Screenshot — مصوّر الصفحات الكاملة والمناطق المحددة

> **العربية أولاً ↓ | [English below ↓](#english-documentation)**

إضافة متصفح سريعة وعالية الدقة (**Chromium Manifest V3**) تعمل **محلياً بنسبة 100%** لالتقاط **الصفحات الطويلة كاملةً بالتمرير التلقائي (Full Page)** أو **تحديد أي منطقة مخصصة بالسحب (Region Capture)** بما في ذلك المناطق الطويلة القابلة للتمرير، بالدقة الأصلية للشاشة (**High-DPI / `devicePixelRatio`**)، مع نافذة معاينة تفاعلية وتصدير مباشر بصيغ **PNG / JPEG / WebP** بدون علامات مائية وبدون أي جمع للبيانات.

## المبادئ والمزايا الأساسية

- **دقة أصلية فائقة (High-DPI):** التقاط ودمج بكسل-ببكسل بدقة `window.devicePixelRatio` دون أي تشويش أو ضغط قسري.
- **خصوصية مطلقة وبدون قيود:** تعمل الإضافة بالكامل على جهازك بصلاحيات محدودة للغاية (`activeTab`, `scripting`, `offscreen`, `downloads`, `storage`)، وبدون خوادم خارجية أو تتبّع أو حد أقصى للالتقاط.
- **الالتقاط الذكي للصفحات المعقدة:** إخفاء العناصر المثبّتة (`fixed` / `sticky`) لمنع تكرارها، وتقسيم الصور الفائقة الطول تلقائياً بأمان، ودعم تطبيقات SPA ذات حاويات التمرير الداخلية.
- **واجهة ثنائية اللغة (عربي RTL / إنجليزي LTR):** إمكانية التبديل الفوري بين العربية والإنجليزية من داخل النافذة المنبثقة وصفحة المعاينة.

## التحميل والتثبيت المباشر (نسخة جاهزة للاستخدام)

لتجربة الإضافة واستخدامها فوراً دون الحاجة لبناء الكود المصدري، حمّل النسخة الجاهزة من صفحة الإصدارات [**GitHub Releases (`v1.0.0`)**](https://github.com/hany-php/web-scrolling-screenshot/releases/latest):

1. حمّل الملف المضغوط `web-scrolling-screenshot-1.0.0-chrome.zip` من آخر إصدار وفك الضغط عنه (**Extract**) في مجلد ثابت على جهازك.
2. افتح صفحة الإضافات في متصفحك:
   - **Chrome:** `chrome://extensions`
   - **Edge:** `edge://extensions`
   - **Brave:** `brave://extensions`
3. فعّل خيار **وضع المطوّر (Developer mode)** من الزر العلوي.
4. اضغط على **تحميل إضافة غير مضغوطة (Load unpacked)** واختر المجلد الذي تم فك الضغط فيه (الذي يحتوي على `manifest.json`).

## الوثائق (العربية)

- [فهرس الوثائق (`docs/README.md`)](docs/README.md)
- [وثيقة متطلبات المنتج (`docs/PRD.md`)](docs/PRD.md)
- [خارطة الطريق والمراحل (`docs/ROADMAP.md`)](docs/ROADMAP.md)
- [الأسئلة المفتوحة والقرارات (`docs/OPEN-QUESTIONS.md`)](docs/OPEN-QUESTIONS.md)
- [سياسة الخصوصية (`PRIVACY.md`)](PRIVACY.md)

## البناء والتشغيل للمطورين

```bash
# يتطلب Node 24.22.1 و pnpm 10.30.0
pnpm install
pnpm dev       # تشغيل الإضافة في وضع التطوير على Chromium
pnpm check     # تشغيل lint و format و typecheck واختبارات الوحدة والبناء
pnpm test:e2e  # تشغيل اختبارات Playwright الشاملة على الإضافة
pnpm zip       # توليد حزمة النشر .output/web-scrolling-screenshot-1.0.0-chrome.zip
```

---

<a id="english-documentation"></a>

## English Documentation

A high-precision, **100% client-side Chromium Manifest V3** browser extension for capturing **full-page scrolling screenshots** and **freeform drag-to-select region screenshots** (including tall scrollable regions) at native **High-DPI (`devicePixelRatio`)** resolution — complete with an interactive preview tab and lossless **PNG / adjustable JPEG & WebP** export.

### Core Principles

- **High-DPI Fidelity:** Captures at native `window.devicePixelRatio` with integer pixel math and zero blurry rescaling.
- **Zero Friction, Zero Telemetry:** Runs completely offline/locally with minimal permissions (`activeTab`, `scripting`, `offscreen`, `downloads`, `storage`), zero watermarks, zero accounts, and zero capture limits.
- **Smart Capture Engine:** Suppresses fixed/sticky elements during scrolling to prevent duplication, handles fixed-shell SPA inner scrollers, and safely splits ultra-tall captures (`> 16384 px`) into seamless parts.
- **Bilingual UI (Arabic RTL / English LTR):** Instant language switching across Popup, Region Selection Overlay, and Preview Tab.

### Download & Install (Ready-to-Use Release)

Want to use the extension right away without building from source? Download the pre-built package from [**GitHub Releases (`v1.0.0`)**](https://github.com/hany-php/web-scrolling-screenshot/releases/latest):

1. Download `web-scrolling-screenshot-1.0.0-chrome.zip` from the latest release and **extract (unzip)** it to a permanent folder on your computer.
2. Open `chrome://extensions` (Chrome), `edge://extensions` (Edge), or `brave://extensions` (Brave).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the extracted folder (containing `manifest.json`).

### Engineering & Product Docs

- **Owner Docs (Arabic):**
  - [Docs Index (`docs/README.md`)](docs/README.md)
  - [Product Requirements (`docs/PRD.md`)](docs/PRD.md)
  - [Phased Roadmap & Test Gates (`docs/ROADMAP.md`)](docs/ROADMAP.md)
  - [Open Questions (`docs/OPEN-QUESTIONS.md`)](docs/OPEN-QUESTIONS.md)
- **Engineering Docs (English):**
  - [Agent & Developer Rules (`AGENTS.md`)](AGENTS.md)
  - [Tech Stack (`docs/STACK.md`)](docs/STACK.md)
  - [Architecture (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)
  - [Coding Standards (`docs/CODING-STANDARDS.md`)](docs/CODING-STANDARDS.md)
  - [Testing Strategy (`docs/TESTING.md`)](docs/TESTING.md)
  - [Security & Privacy (`docs/SECURITY.md`)](docs/SECURITY.md)
  - [Privacy Policy (`PRIVACY.md`)](PRIVACY.md)
  - [Design System (`docs/DESIGN-SYSTEM.md`)](docs/DESIGN-SYSTEM.md)
  - [Deployment & Store Release (`docs/DEPLOYMENT.md`)](docs/DEPLOYMENT.md)
  - [Store Listing Copy (`docs/STORE-LISTING.md`)](docs/STORE-LISTING.md)
  - [Architecture Decision Records (`docs/adr/`)](docs/adr/0001-wxt-and-react-stack.md)

### Quick Start (Build from Source)

```bash
# Requires Node 24.22.1 and pnpm 10.30.0
pnpm install
pnpm dev       # Launches Chromium with the extension loaded in watch mode
pnpm check     # Runs lint, format check, typecheck, unit tests, and build
pnpm test:e2e  # Runs Playwright Chromium extension E2E tests
pnpm zip       # Packages .output/web-scrolling-screenshot-1.0.0-chrome.zip
```
