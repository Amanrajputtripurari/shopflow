# Database Design (MongoDB)

Single company (`companyId` fixed or one document in `company` collection) — schema stays multi-branch-ready.

Connection: URL stored encrypted in Electron main; Atlas or `mongodb://localhost:27017`.

---

## Phase 0 collections

| Collection | Purpose |
|------------|---------|
| `app_meta` | `schemaVersion`, migrations, app install id |
| `app_settings` | Theme, setup complete flag, non-secret prefs |
| `users` | Admin/Staff stub for Phase 0; real auth Phase 1 |

### `app_meta` (example)

```json
{
  "_id": "singleton",
  "schemaVersion": 1,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## Phase 1+ collections

| Collection | Purpose |
|------------|---------|
| `company` | Shop name, address, GSTIN, bill defaults, stock toggle |
| `users` | username, role, password hash, active |
| `products` | name, sku, unit, price, tax, optional stock fields |
| `customers` | name, phone, address, gstin, tags, balance cache |
| `orders` | header + embedded lines (or separate `order_lines`) |
| `customer_ledger` | credit debit/credit entries |
| `expenses` | date, amount, category, custom label, receipt ref |
| `expense_categories` | preset categories |

---

## Phase 4 collections

| Collection | Purpose |
|------------|---------|
| `whatsapp_sessions` | encrypted session material |
| `whatsapp_logs` | outbound send audit |
| `conversations` | inbox thread per customer phone |
| `messages` | chat history (or recent embedded in conversation) |
| `menu_config` | WhatsApp menu items and actions |
| `anti_ban_config` | rate limits, pause flags |
| `message_queue` | pending outbound jobs |

---

## Key indexes (create in `index-manager.ts` per phase)

| Collection | Index |
|------------|-------|
| `users` | `{ username: 1 }` unique |
| `products` | `{ sku: 1 }`, `{ name: "text" }` |
| `customers` | `{ phone: 1 }` unique |
| `orders` | `{ orderNo: 1 }` unique, `{ createdAt: -1 }`, `{ customerId: 1 }` |
| `customer_ledger` | `{ customerId: 1, createdAt: -1 }` |
| `expenses` | `{ date: -1 }`, `{ category: 1 }` |
| `conversations` | `{ phone: 1 }` unique, `{ lastMessageAt: -1 }`, `{ assignedTo: 1, status: 1 }` |
| `messages` | `{ conversationId: 1, createdAt: -1 }` |

---

## Order document (reference)

```json
{
  "orderNo": "ORD-2026-0001",
  "type": "retail | delivery",
  "customerId": "ObjectId",
  "status": "draft | confirmed | out_for_delivery | delivered | billed | paid | cancelled",
  "paymentStatus": "unpaid | partial | paid | credit",
  "billType": "simple | gst",
  "lines": [
    {
      "productId": "ObjectId",
      "nameSnapshot": "string",
      "qty": 1,
      "rate": 100,
      "discount": 0,
      "taxPercent": 18,
      "lineTotal": 118
    }
  ],
  "delivery": {
    "address": "string",
    "charge": 0,
    "scheduledAt": null
  },
  "totals": { "subtotal": 0, "tax": 0, "discount": 0, "grandTotal": 0 },
  "creditAmount": 0,
  "createdBy": "userId",
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

Prices and names are **snapshotted** on the order so historical bills stay correct.

---

## Migrations

- Bump `app_meta.schemaVersion` on breaking changes
- Run migration steps in main on app startup before serving IPC
- Migrations live in `main/database/migrations/`

---

## Rules

- Repositories return plain objects or typed documents — no UI concerns
- Never expose MongoDB URL to renderer
- Use transactions only where needed (ledger + order payment in Phase 2)
