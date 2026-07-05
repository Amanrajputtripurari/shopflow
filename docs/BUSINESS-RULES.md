# Business Rules

Single-company shop management. Reference for Phase 1+ implementation.

---

## Roles

| Action | Admin | Staff |
|--------|:-----:|:-----:|
| Products / customers | Full CRUD | Create/edit; delete policy TBD |
| Orders | Full | Create/edit; cancel restricted |
| Send WhatsApp bill | Yes | Configurable |
| Expenses | Full | Add only |
| Credit settlement | Yes | No |
| Stock settings | Yes | No |
| WhatsApp menu / anti-ban | Yes | No |
| Inbox assign | Yes | Yes (assigned + pool) |
| Staff user management | Yes | No |
| GST / company settings | Yes | No |

---

## Order types

### Retail (counter)

Flow: `Draft → Confirmed → Billed → Paid` (or Partial / Credit)

- Fast product search entry
- Walk-in customer may have no phone (TBD at implementation)

### Delivery

Flow: `Draft → Confirmed → OutForDelivery → Delivered → Billed → Paid`

Extra fields: address, delivery charge, schedule, delivery status

---

## Billing

Two modes per order or company default:

| Mode | Use |
|------|-----|
| **Simple** | Informal bill — shop header, lines, total |
| **GST** | Tax invoice — HSN, CGST/SGST or IGST, GSTIN, invoice series |

- Snapshot line prices/tax at confirm time
- Separate invoice number series for GST (Admin config)

---

## Credit (udhaar)

- Order may record `creditAmount` (partial or full udhaar)
- `customer_ledger`: DEBIT on credit sale, CREDIT on payment received
- Running balance per customer
- **Settlement only Admin**
- Optional WhatsApp balance reminder (Phase 4, anti-ban queue)

---

## Stock (optional)

Company setting: `stockTrackingEnabled`

| Setting | Behavior |
|---------|----------|
| Off | Orders work; stock ignored |
| On | Deduct on confirm or deliver (config) |
| Per-product `trackStock: false` | Skip that SKU |

If user never updates stock, orders still proceed; show non-blocking warnings only.

---

## Expenses

- Preset categories (Admin manages)
- Custom free-text category on any entry
- Optional "save custom as preset"
- Fields: date, amount, category, payment mode, note, receipt file ref
- Dashboard: period revenue minus expenses (rough P&L)

---

## Customers

- Phone required for WhatsApp; optional for walk-in retail
- GSTIN for B2B GST invoices
- Tags: retail, wholesale, VIP (inbox priority optional)

---

## Decisions pending (confirm before Phase 1 code)

1. Walk-in orders without phone — allowed?
2. Delivery charge — fixed, manual line, or distance-based?
3. IGST vs CGST/SGST — auto from customer/company state?
4. Staff delete on products/customers — allowed?
5. Inbox visibility — all chats vs assigned + unassigned pool only?

Document answers here when confirmed.
