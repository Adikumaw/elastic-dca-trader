# 📘 Quick Reference - API Field Mappings (v3.4.0)

## 1. UserSettings Object
**Endpoint:** `POST /api/update-settings`  
**Updates:** Added `hedge_value` fields for both sides.

```typescript
interface UserSettings {
  // --- BUY SETTINGS ---
  buy_limit_price: number;       // 0 = Market Price, >0 = Pending Limit
  buy_tp_type: "equity_pct" | "balance_pct" | "fixed_money";
  buy_tp_value: number;          // e.g. 1.5 (%) or 50.0 ($)
  buy_hedge_value: number;       // ⚠️ NEW: 0.0 = Off. Positive value (e.g., 50.0) = Hedge at -$50 loss

  // --- SELL SETTINGS ---
  sell_limit_price: number;
  sell_tp_type: "equity_pct" | "balance_pct" | "fixed_money";
  sell_tp_value: number;
  sell_hedge_value: number;      // ⚠️ NEW

  // --- GRIDS ---
  rows_buy: GridRow[];           // Array of GridRow objects
  rows_sell: GridRow[];          // Array of GridRow objects
}

interface GridRow {
  index: number;
  dollar: number;                // Price gap
  lots: number;                  // Volume
  alert: boolean;                // UI alert flag
}
```

## 2. RuntimeState Object
**Endpoint:** `GET /api/ui-data` (Inside the `runtime` key)  
**Updates:** Added `hedge_triggered` flags.

```typescript
interface RuntimeState {
  // --- SWITCHES ---
  buy_on: boolean;
  sell_on: boolean;
  cyclic_on: boolean;

  // --- STATES ---
  buy_waiting_limit: boolean;    // True if waiting for Limit Price
  sell_waiting_limit: boolean;
  
  buy_is_closing: boolean;       // True if TP hit, cleaning up trades
  sell_is_closing: boolean;

  // --- HEDGE STATES (NEW) ---
  buy_hedge_triggered: boolean;  // ⚠️ True if Buy side hit max loss and is FROZEN
  sell_hedge_triggered: boolean;

  // --- EXECUTION DATA ---
  // Maps index (as string) to stats. 
  // Length of keys = Current Next Index.
  buy_exec_map: Record<string, RowExecStats>; 
  sell_exec_map: Record<string, RowExecStats>; 

  // --- REFERENCE PRICES ---
  buy_start_ref: number;         // Anchor price
  sell_start_ref: number;

  // --- ERRORS ---
  error_status: string;          // If not empty, BLOCK THE UI (Critical)
}

interface RowExecStats {
  index: number;
  entry_price: number;
  lots: number;
  profit: number;
  timestamp: string;
}
```

## 3. Control Commands
**Endpoint:** `POST /api/control`

```typescript
// Toggle BUY
{ "buy_switch": true }  // or false

// Toggle SELL
{ "sell_switch": true } // or false

// Toggle CYCLIC
{ "cyclic": true }      // or false

// ⚠️ EMERGENCY KILL (Closes BOTH sides immediately)
{ "emergency_close": true }
```

## 4. TP Type Values (Enums)

| Frontend Label | Server Value (String) | Meaning |
| :--- | :--- | :--- |
| EQUITY % | `"equity_pct"` | % of Current Equity |
| BALANCE % | `"balance_pct"` | % of Balance |
| FIXED $ | `"fixed_money"` | Specific Currency Amount |
| *OFF* | *N/A* | Send `value: 0` to disable TP |

## 5. UI Logic: States & Visuals

### A. Calculating "Next Row" (Blue Highlight)
The "next" row to be executed is the count of currently executed rows.
```typescript
const buyNextIndex = Object.keys(runtime.buy_exec_map).length;
const sellNextIndex = Object.keys(runtime.sell_exec_map).length;
```

### B. Triggering Alerts (Red Highlight / Sound)
Iterate through executed rows in `runtime`. If `settings.rows[index].alert === true`:
*   **UI:** Play Sound & Show "Acknowledge" button.
*   **Action:** Clicking Acknowledge sends `{ alert: false }` for that row via `update-settings`.

### C. Waiting for Limit (Yellow Status)
If `runtime.buy_waiting_limit === true`:
*   **Status:** "⏳ Waiting for Price < [limit_price]"
*   **Input:** Allow user to adjust Limit Price.

### D. Hedge Triggered (Frozen/Red Status) ⚠️ NEW
If `runtime.buy_hedge_triggered === true`:
*   **Status:** "🛑 HEDGE TRIGGERED / FROZEN"
*   **Visual:** Red border around the Buy panel.
*   **Interaction:** Disable the "Add Row" or "Start" buttons for this side. It is locked until the session ends or is reset.