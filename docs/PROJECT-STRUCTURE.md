# Project Structure

Target layout for ShopFlow. Phase 0 creates this skeleton; later phases add modules without restructuring.

```text
shopflow/
├── README.md
├── AGENTS.md                          # AI / contributor quick reference
├── .env.example                       # Dev-only MONGODB_URL placeholder
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── components.json                    # shadcn (renderer)
│
├── scripts/
│   ├── dev.mjs                        # Start dev environment
│   ├── build.mjs                      # Production compile
│   ├── package.mjs                    # electron-builder installers
│   └── postinstall.mjs                # Native deps if needed
│
├── resources/
│   ├── icon.icns
│   ├── icon.ico
│   └── entitlements.mac.plist
│
├── docs/                              # Design docs (this folder)
│
├── .cursor/
│   └── rules/                         # Cursor AI rules (.mdc)
│
└── src/
    ├── shared/                        # Shared by main + renderer
    │   ├── types/
    │   ├── constants/
    │   ├── ipc-channels.ts            # All IPC channel names
    │   └── events.ts                  # Event name constants
    │
    ├── main/                          # Electron main — MVC backend
    │   ├── index.ts                   # App entry
    │   ├── app/
    │   │   ├── lifecycle.ts           # ready, quit, activate
    │   │   └── window-manager.ts      # Window create, state persist
    │   ├── config/
    │   │   └── env.ts                 # Env read (main only)
    │   ├── database/
    │   │   ├── connection.ts          # MongoDB URL connect/reconnect
    │   │   ├── health.ts
    │   │   └── index-manager.ts       # Index creation per phase
    │   ├── models/                    # Document shapes / interfaces
    │   ├── repositories/              # MongoDB CRUD (Model)
    │   │   └── base.repository.ts
    │   ├── services/                  # Business orchestration
    │   ├── controllers/               # IPC handlers (thin)
    │   │   └── register-all.ts
    │   ├── events/
    │   │   ├── event-bus.ts
    │   │   ├── app.events.ts
    │   │   └── db.events.ts
    │   └── helpers/
    │       ├── logger.ts
    │       ├── crypto-store.ts        # Encrypted URL / tokens
    │       ├── error-handler.ts
    │       └── ipc-wrapper.ts
    │
    ├── preload/
    │   ├── index.ts                   # contextBridge entry
    │   └── api/                       # Typed bridge modules
    │       ├── index.ts
    │       ├── database.api.ts
    │       └── settings.api.ts
    │
    └── renderer/                      # React — View
        ├── index.html
        └── src/
            ├── main.tsx
            ├── App.tsx
            ├── routes/
            ├── pages/
            │   ├── setup/             # First-run MongoDB wizard
            │   ├── auth/              # Login shell
            │   ├── dashboard/         # Empty shell Phase 0
            │   └── settings/
            ├── components/
            │   ├── ui/                # shadcn components
            │   └── layout/            # AppShell, Sidebar, Header
            ├── viewmodels/            # UI-side controllers
            ├── hooks/
            ├── lib/
            │   └── utils.ts
            └── styles/
                └── globals.css
```

---

## Naming conventions

| Item | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `order.service.ts` |
| React components | PascalCase file + export | `OrderForm.tsx` |
| IPC channels | `domain:action` | `orders:create` |
| Events | `domain.eventName` | `db.connected` |
| MongoDB collections | snake_case plural | `order_lines` (if split) or embed in `orders` |
| Types/interfaces | PascalCase | `OrderDocument` |

---

## Module addition pattern (Phase 1+)

For each domain (e.g. `orders`):

1. `shared/types/order.ts` — shared types
2. `main/models/order.model.ts` — document shape
3. `main/repositories/order.repository.ts` — DB only
4. `main/services/order.service.ts` — rules
5. `main/controllers/order.controller.ts` — IPC register
6. `shared/ipc-channels.ts` — add channels
7. `preload/api/order.api.ts` — expose to renderer
8. `renderer/viewmodels/use-order.ts` — UI logic
9. `renderer/pages/orders/` — pages

Do not skip layers or call repositories from controllers directly.

---

## Scripts

All npm scripts delegate to `scripts/*.mjs` for consistent CI and local runs:

```json
{
  "dev": "node scripts/dev.mjs",
  "build": "node scripts/build.mjs",
  "package": "node scripts/package.mjs"
}
```

---

## What not to put where

| Wrong | Right |
|-------|-------|
| MongoDB import in renderer | IPC → main repository |
| Business rules in controller | Service |
| Business rules in repository | Service |
| IPC channel strings inline | `shared/ipc-channels.ts` |
| WhatsApp logic in renderer | `main/whatsapp/` (Phase 4) |
| Large docs in code comments | `docs/` folder |

---

## Phase 0 folders only

Phase 0 implements structure + `settings`, `database` health, setup wizard, app shell. Other domain folders may exist as empty stubs or be added when Phase 1 starts — do not implement order/product logic in Phase 0.
