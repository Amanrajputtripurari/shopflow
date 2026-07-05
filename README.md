# ShopFlow

Desktop business management app for a single company: daily orders (retail + delivery), products, customers, credit ledger, expenses, and WhatsApp billing (Baileys) with anti-ban safeguards.

## Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron |
| UI | React + TypeScript + shadcn/ui + Tailwind |
| Database | MongoDB (connection via URL — no separate HTTP backend) |
| Future mobile | Flutter + same MongoDB (optional API layer later) |

## Architecture principle

MongoDB runs in the **Electron main process** only. The React renderer talks to data through **typed IPC** (preload bridge). No Express/server port in Phase 0–3.

```
Renderer (View) → Preload (bridge) → Main Controllers → Services → Repositories → MongoDB
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, MVC, IPC, events |
| [docs/PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md) | Folder layout and naming |
| [docs/PHASES.md](./docs/PHASES.md) | Phase 0–4 rollout and scope boundaries |
| [docs/DATABASE.md](./docs/DATABASE.md) | MongoDB collections and indexes |
| [docs/WHATSAPP.md](./docs/WHATSAPP.md) | Baileys, anti-ban, menu, inbox |
| [docs/BUSINESS-RULES.md](./docs/BUSINESS-RULES.md) | Orders, billing, credit, stock, roles |

## Development phases (summary)

- **Phase 0** — Production Electron + React + shadcn shell, MVC skeleton, MongoDB URL setup (no business logic)
- **Phase 1** — Products, customers, retail + delivery orders
- **Phase 2** — Simple + GST billing, credit ledger, optional stock
- **Phase 3** — Expenses + dashboard
- **Phase 4** — WhatsApp (bills, reminders, menu, multi-staff inbox)

See [docs/PHASES.md](./docs/PHASES.md) for detailed scope.

## Cursor rules

Project conventions for AI and contributors live in `.cursor/rules/`. Read those before adding code.

## Status

**Phase 4 implemented** — WhatsApp (Baileys): connect via QR, outbound bills/templates, anti-ban queue, menu auto-reply, multi-staff inbox.

Phase 3 features remain: expenses, reports, dashboard rough net.

Default login: `admin` / `admin` (change after first sign-in; create staff users in Settings).

### Commands

```bash
npm run dev      # development
npm run build    # compile to out/
npm run package  # build installers (requires build first)
npm run typecheck
```

### First run

1. Start the app — Setup wizard opens if MongoDB is not configured.
2. Enter company name + MongoDB URL (local: `mongodb://localhost:27017/shopflow`).
3. Test connection → Save & continue → Login stub → Dashboard.

MongoDB URL is stored encrypted in Electron main process (`userData/secure/`).
