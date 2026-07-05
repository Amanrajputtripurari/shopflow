# ShopFlow

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**ShopFlow** is a desktop business management app for a **single company**: daily orders (retail + delivery), products, customers, billing, credit ledger, expenses, reports, and WhatsApp messaging with anti-ban safeguards.

Built with **Electron + React + MongoDB**. There is **no separate HTTP backend** — the app connects to MongoDB directly from the Electron main process.

---

## Features

| Area | What you get |
|------|----------------|
| **Orders** | Retail and delivery orders, line items, status workflow, quick order |
| **Products** | CRUD, GST fields, optional extra charges (max 3 per product) |
| **Customers** | Phone, address, GSTIN, credit balance and ledger |
| **Billing** | Simple + GST PDF invoices, invoice numbering, payment / partial / credit |
| **Invoice layouts** | Visual editor for PDF bill templates (canvas, layers, preview) |
| **Stock** | Optional company-wide toggle and per-product tracking |
| **Expenses** | Categories, daily feed, custom entries |
| **Reports & dashboard** | Sales summary, expenses, rough net, KPI cards |
| **WhatsApp** | QR connect, bill PDF delivery queue, templates, menu auto-reply, staff inbox |
| **Settings** | Company profile, users (Admin / Staff), MongoDB backup/restore, themes |
| **Security** | MongoDB URL stored encrypted in main process; renderer uses IPC only |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Desktop | [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/) |
| UI | React 19, TypeScript, [shadcn/ui](https://ui.shadcn.com/), Tailwind CSS |
| Data | MongoDB (Node driver in main process only) |
| WhatsApp | [Baileys](https://github.com/WhiskeySockets/Baileys) |
| PDF | PDFKit + custom layout renderer |
| Tests | Vitest + TypeScript typecheck |

### Architecture

MongoDB runs in the **main process** only. The React renderer never imports `mongodb` — it uses a typed **preload IPC bridge**.

```
Renderer (View) → Preload → Controller → Service → Repository → MongoDB
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full design.

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- **MongoDB** 6+ — local install or [MongoDB Atlas](https://www.mongodb.com/atlas) connection string

Optional for packaging:

- **macOS** — Xcode command line tools (for DMG builds)
- **Windows** — build on Windows for NSIS installer (or use CI)

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/shopflow.git
cd shopflow
npm install
```

### 2. Environment (development only)

Copy the example env file if you want a dev MongoDB override:

```bash
cp .env.example .env
```

Edit `.env` if needed (default: `mongodb://localhost:27017/shopflow`).

> Production builds use the **Setup Wizard** inside the app. The connection URL is saved **encrypted** under Electron `userData` — never commit `.env` with real credentials.

### 3. Run in development

```bash
npm run dev
```

### 4. First-time setup in the app

1. **Setup wizard** — company name + MongoDB URL → test connection → save.
2. **Login** — default admin: `admin` / `admin` (change immediately in **Settings → Users**).
3. **Company** — add GSTIN, address, invoice settings in **Settings**.
4. **WhatsApp** (optional) — **Settings → WhatsApp → Connections** → scan QR code.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Electron app in development mode |
| `npm run build` | Compile main, preload, and renderer to `out/` |
| `npm run package` | Build + generate icons + create installers in `release/` |
| `npm run typecheck` | TypeScript check (main + renderer) |
| `npm test` | Stability check: typecheck + unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run icons` | Regenerate app icons from `build/icon.svg` |
| `npm run seed:migrate` | Run database migrations |
| `npm run seed:demo` | Seed demo products/customers (dev) |
| `npm run seed:admin` | Reset admin password (dev) |

---

## Project structure

```
shopflow/
├── src/
│   ├── main/           # Electron main: controllers, services, repositories, WhatsApp, PDF
│   ├── preload/        # IPC bridge exposed as window.api
│   ├── renderer/       # React UI (pages, components)
│   └── shared/         # Types, IPC channel names, constants (main + renderer)
├── docs/               # Architecture, phases, database, WhatsApp, business rules
├── build/              # App icons (SVG source + generated .ico / .png)
├── scripts/            # dev, build, package, test, seed, icons
└── release/            # Installers output (gitignored)
```

Details: [docs/PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md)

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, MVC, IPC, events |
| [docs/PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md) | Folders and naming |
| [docs/PHASES.md](./docs/PHASES.md) | Development phases and scope |
| [docs/DATABASE.md](./docs/DATABASE.md) | MongoDB collections and indexes |
| [docs/WHATSAPP.md](./docs/WHATSAPP.md) | Baileys, anti-ban, menu, inbox |
| [docs/BUSINESS-RULES.md](./docs/BUSINESS-RULES.md) | Orders, billing, credit, roles |
| [AGENTS.md](./AGENTS.md) | Quick reference for AI assistants / contributors |

---

## WhatsApp notes

- Connect via **Settings → WhatsApp → Connections** (QR scan).
- **Delivery queue** — **Settings → WhatsApp → Delivery queue** (paginated, auto-refresh on page 1).
- **Disconnect** clears the local session so you can link a new device with a fresh QR.
- Outbound messages respect **anti-ban** rate limits (Settings → WhatsApp → Settings).
- Use WhatsApp responsibly; bulk or automated messaging may violate Meta’s terms.

---

## Building installers

```bash
npm run package
```

Outputs land in `release/`:

- **Windows** — NSIS installer (`.exe`), uses `build/icon.ico`
- **macOS** — DMG, uses `build/icon.png`

Regenerate icons after changing `build/icon.svg`:

```bash
npm run icons
```

---

## Database backup

**Settings → Database** — configure a backup folder, export all collections, or restore from a previous ShopFlow backup.

PDF bill files on disk are **not** included in MongoDB backups (only metadata paths in orders).

---

## Contributing

1. Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [AGENTS.md](./AGENTS.md).
2. Follow existing patterns: **Controller → Service → Repository**, IPC channels only in `src/shared/ipc-channels.ts`.
3. Run `npm test` before opening a PR.
4. Do not commit `.env`, WhatsApp session files, or `node_modules/`.

Cursor rules for this repo live in `.cursor/rules/`.

---

## Security

- Never commit secrets (`.env`, MongoDB URLs with passwords, WhatsApp auth).
- Default admin credentials are for **first login only** — change them in production.
- WhatsApp session files stay in local app data (`whatsapp-auth/`) and are gitignored.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE).

You are free to use, modify, and distribute this software with attribution. The software is provided **as is**, without warranty.

---

## Roadmap / status

All planned phases (0–4) are implemented:

- Phase 0 — Electron shell, MongoDB setup, IPC/MVC foundation  
- Phase 1 — Products, customers, orders  
- Phase 2 — Billing, credit ledger, stock  
- Phase 3 — Expenses, dashboard, reports  
- Phase 4 — WhatsApp (bills, queue, menu, inbox)  

Future ideas (not committed): Flutter mobile client, optional sync API, multi-branch support.

---

## Support

Open a [GitHub Issue](https://github.com/YOUR_USERNAME/shopflow/issues) for bugs or feature requests. For architecture questions, check `docs/` first.
