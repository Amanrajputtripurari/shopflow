# AGENTS.md — ShopFlow

Quick reference for AI assistants and contributors.

## Project

ShopFlow — Electron desktop app for one company: orders (retail + delivery), products, customers, credit, optional stock, expenses, WhatsApp billing (Phase 4).

## Hard constraints

1. **No separate HTTP backend** — MongoDB only in Electron `main/` via connection URL
2. **MVC** — View (renderer) → IPC → Controller → Service → Repository → MongoDB
3. **Phase gates** — See `docs/PHASES.md`; Phase 0 has no business logic
4. **Renderer never imports `mongodb`** — use preload bridge only
5. **IPC channel names** — only in `shared/ipc-channels.ts`

## Stack

Electron + electron-vite + React + TypeScript + shadcn/ui + Tailwind + MongoDB

Future: Flutter client (same DB schema; optional API later)

## Key docs

- `docs/ARCHITECTURE.md` — system design
- `docs/PROJECT-STRUCTURE.md` — folders and naming
- `docs/PHASES.md` — what to build when
- `docs/DATABASE.md` — collections
- `docs/WHATSAPP.md` — Phase 4 messaging
- `docs/BUSINESS-RULES.md` — domain rules

## Cursor rules

`.cursor/rules/*.mdc` — follow always-applied and file-specific rules when editing.

## Current status

Phase 4 implemented — full stack through WhatsApp inbox, menu, billing send, anti-ban queue.
