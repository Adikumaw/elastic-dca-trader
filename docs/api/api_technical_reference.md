# 📘 Quick Reference - API Field Mappings (v3.4.2)

## 1. UserSettings Object
**Endpoint:** `POST /api/update-settings`  
**Updates:** Defines the Elastic Grid (Strata) and IronClad Risk limits.

```typescript
interface UserSettings {
  // --- BUY VECTOR SETTINGS ---
  buy_limit_price: number;       // 0 = Market Entry, >0 = Pending Anchor
  buy_tp_type: "equity_pct" | "balance_pct" | "fixed_money";
  buy_tp_value: number;          // Snap-Back Target (e.g. 1.5% or $50)
  buy_hedge_value: number;       // 🛡️ IRONCLAD: 0.0 = Off. Positive value = Lock at -$X loss

  // --- SELL VECTOR SETTINGS ---
  sell_limit_price: number;
  sell_tp_type: "equity_pct" | "balance_pct" | "fixed_money";
  sell_tp_value: number;
  sell_hedge_value: number;      // 🛡️ IRONCLAD

  // --- ELASTIC STRATA (Rows) ---
  rows_buy: GridRow[];           // Array of Strata levels
  rows_sell: GridRow[];          // Array of Strata levels
}

interface GridRow {
  index: number;
  dollar: number;                // Gap distance from previous level
  lots: number;                  // Volume for this strata
  alert: boolean;                // UI Audio Alert flag
}
```

## 2. RuntimeState Object
**Endpoint:** `GET /api/ui-data` (Inside the `runtime` key)  
**Updates:** Added `hedge_triggered` flags.

```typescript
interface RuntimeState {
  // --- CONTROLS ---
  buy_on: boolean;
  sell_on: boolean;
  cyclic_on: boolean;

  // --- VECTOR IDENTIFICATION ---
  buy_id: string;                // Current Session Hash (e.g., "buy_a1b2...")
  sell_id: string;

  // --- PHASES ---
  buy_waiting_limit: boolean;    // True if waiting for Anchor Price
  sell_waiting_limit: boolean;
  
  buy_is_closing: boolean;       // True if Snap-Back TP hit, closing vector
  sell_is_closing: boolean;

  // --- IRONCLAD STATES ---
  buy_hedge_triggered: boolean;  // 🛑 True = Drawdown limit hit. Vector LOCKED.
  sell_hedge_triggered: boolean;

  // --- SYNC-SHIELD (LATENCY) ---
  buy_last_order_sent_ts: number; // Timestamp of last API command sent
  sell_last_order_sent_ts: number;

  // --- EXECUTION MAP ---
  // Maps Strata Index (string) to Statistics. 
  buy_exec_map: Record<string, RowExecStats>; 
  sell_exec_map: Record<string, RowExecStats>; 

  // --- ANCHOR PRICES ---
  buy_start_ref: number;         // The price where Strata 0 began
  sell_start_ref: number;

  // --- CRITICAL ---
  error_status: string;          // If not empty, DISABLE CONTROLS. Conflict detected.
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
// Toggle BUY Vector
{ "buy_switch": true }  // or false

// Toggle SELL Vector
{ "sell_switch": true } // or false

// Toggle CYCLIC ORBIT (Auto-Restart)
{ "cyclic": true }      // or false

// ⚠️ PANIC BUTTON (Closes EVERYTHING immediately)
{ "emergency_close": true }
```

## 4. Snap-Back TP Values (Enums)

| Frontend Label | Server Value (String) | Meaning |
| :--- | :--- | :--- |
| EQUITY % | `"equity_pct"` | % of Floating Equity |
| BALANCE % | `"balance_pct"` | % of Fixed Balance |
| FIXED $ | `"fixed_money"` | Specific Currency Amount |
| *OFF* | *N/A* | Send `value: 0` to disable TP |

## 5. UI Logic: States & Visuals

### A. Calculating "Next Strata" (Blue Highlight)
The "next" level to be executed is the count of currently executed levels.
```typescript
const buyNextIndex = Object.keys(runtime.buy_exec_map).length;
const sellNextIndex = Object.keys(runtime.sell_exec_map).length;
```

### B. Triggering Alerts (Strata Expansion)
Iterate through executed rows in `runtime`. If `settings.rows[index].alert === true`:
*   **UI:** Play Sound & Show "Acknowledge" Modal.
*   **Action:** Clicking Acknowledge sends `{ alert: false }` for that row index via `update-settings`.

### C. Anchor Pending (Yellow Status)
If `runtime.buy_waiting_limit === true`:
*   **Status:** "⏳ Waiting for Anchor < [limit_price]"
*   **Input:** Allow user to adjust Limit Price in real-time.

### D. IronClad Lock (Red/Frozen Status)
If `runtime.buy_hedge_triggered === true`:
*   **Status:** "🛑 IRONCLAD LOCK ENGAGED"
*   **Visual:** Red border/overlay on the Buy panel.
*   **Logic:** Input fields for that side should be disabled. The system has deployed a counter-measure and manual intervention is now required to unlock.