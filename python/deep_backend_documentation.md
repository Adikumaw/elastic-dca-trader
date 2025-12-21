# 📡 Grid Trading System - Complete API Documentation

## 🎯 Overview

**Server Version:** `3.4.0` (Loss Hedge Feature)  
**Base URL:** `http://127.0.0.1:8000`  
**Protocol:** HTTP/JSON  
**Authentication:** None (Local deployment)  
**CORS:** Enabled for all origins

> **⭐ Key Updates (v3.4.0):**  
> 1. **Loss Hedge Logic:** You can now set a "Hedge Value" ($). If a side loses that amount, it freezes, and a counter-trade equal to the total volume is immediately executed on the opposite side.
> 2. **Dynamic Gap Calculation:** When hedging into an active grid, the system calculates the gap dynamically based on the current market price.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Data Flow & Lifecycle](#data-flow--lifecycle)
3. [Core Endpoints](#core-endpoints)
4. [UI Integration Guide](#ui-integration-guide)
5. [System Logic & Error Handling](#system-logic--error-handling)

---

## 🚀 Quick Start

### Polling Pattern (UI -> Server)

```javascript
// Poll server every 1 second for live updates
setInterval(async () => {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/ui-data");
    const data = await response.json();
    updateUI(data); // Render settings, price, and errors
  } catch (e) {
    showDisconnectedState();
  }
}, 1000);
```

---

## 🔄 Data Flow & Lifecycle

The lifecycle now includes a high-priority "Hedge Monitor" step.

1.  **Waiting for Limit (Optional):**
    - If `buy_limit_price > 0`, trades will not start until `Ask <= buy_limit_price`.
2.  **Grid Execution:**
    - Standard grid logic fills orders based on the `dollar` gap.
3.  **Hedge Monitor (Priority High):**
    - The system checks the floating profit of the Buy or Sell side.
    - **Trigger:** If `Profit <= -1 * hedge_value` (e.g., Loss reaches $50):
        - **Lock:** The losing side is locked (`hedge_triggered = True`). No new grids for this side.
        - **Counter-Attack:** A trade is instantly fired on the **opposite** side.
            - If opposite is OFF: It forces it ON and starts fresh.
            - If opposite is ON: It appends a new row and executes immediately.
4.  **TP Hit:**
    - Take Profit logic runs independently for Buy and Sell.
5.  **Closing Phase:**
    - When TP is hit or manually stopped, the system waits for MT5 trades to reach 0 before resetting.

---

## 🔌 Core Endpoints

### 1. GET `/api/ui-data`

**Purpose:** Get complete system state including new Hedge flags.  
**Frequency:** Poll every 1 second.

**Response Example:**

```json
{
  "settings": {
    "buy_limit_price": 0.0,
    "buy_tp_type": "equity_pct",
    "buy_tp_value": 1.5,
    "buy_hedge_value": 50.0,        // NEW: 0.0 = Disabled. >0 = Active ($)
    
    "sell_limit_price": 0.0,
    "sell_tp_type": "fixed_money",
    "sell_tp_value": 50.0,
    "sell_hedge_value": 0.0,        // NEW
    
    "rows_buy": [...],
    "rows_sell": [...]
  },
  "runtime": {
    "buy_on": true,
    "sell_on": true,

    // --- NEW: Hedge Flags ---
    "buy_hedge_triggered": true,    // UI: Show "HEDGED / FROZEN" status
    "sell_hedge_triggered": false,

    // --- Limit & Reference States ---
    "buy_waiting_limit": false,
    "sell_waiting_limit": false,
    "buy_start_ref": 1.0500,
    "sell_start_ref": 1.0550,

    // --- Closing States ---
    "buy_is_closing": false,
    "sell_is_closing": false,

    "error_status": "", 
    "buy_exec_map": { ... },
    "sell_exec_map": { ... }
  },
  "market": { ... },
  "last_update": "..."
}
```

---

### 2. POST `/api/update-settings`

**Purpose:** Update configuration including Hedge values.

**Request:**

```json
{
  # --- Buy Settings ---
  "buy_limit_price": 0.0,
  "buy_tp_type": "equity_pct",
  "buy_tp_value": 1.0,
  "buy_hedge_value": 50.0,      # NEW: Input 50.0 to hedge at -$50.00 loss
  
  # --- Sell Settings ---
  "sell_limit_price": 0.0,
  "sell_tp_type": "fixed_money",
  "sell_tp_value": 100.0,
  "sell_hedge_value": 0.0,      # NEW

  # --- Grid Rows ---
  "rows_buy": [...],
  "rows_sell": [...]
}
```

---

## 🎨 UI Integration Guide

### 1. New Inputs
Add a numeric input field to both the Buy and Sell panels:
*   **Label:** "Hedge at Loss ($)"
*   **Field:** `settings.buy_hedge_value` / `settings.sell_hedge_value`
*   **Behavior:** User enters a positive number (e.g., 100). Send this to the server. Send `0` to disable.

### 2. Visualizing Hedge Status
You need to show if a side has been "Hedged" (Frozen due to loss).

**Logic:**
```javascript
if (runtime.buy_hedge_triggered) {
  // Show RED border around Buy Panel
  // Disable "Add Row" buttons for Buy side
  // Show Badge: "🛑 HEDGE TRIGGERED"
}
```
*   **Note:** When `buy_hedge_triggered` is true, the server will stop executing new Buy rows (standard grid). It effectively freezes that side until the user manually resets or the session closes.

### 3. Hedge Trade Visualization
When a hedge triggers, the server injects a new row into the **Opposite** grid.
*   **Example:** Buy side loses $50 -> Server injects a row into **Sell** grid.
*   **UI Effect:** You will see a new row appear in the Sell table automatically with `"alert": true`. The UI should handle this normally (play sound/show alert).

---

## ⚙️ System Logic & Error Handling

### 1. The Hedge Mechanism (v3.4.0) 🛡️

**A. Trigger Condition**
The server sums the profit of all active trades for a specific Session ID.
`if (Total Profit <= -1 * hedge_value)` -> **TRIGGER**.

**B. Action 1: Lock the Loser**
The losing side (e.g., Buy) sets `buy_hedge_triggered = True`.
*   This prevents any further grid levels from executing on the Buy side.
*   The Buy side is now "Paused" waiting for the user or the hedge to resolve the equity.

**C. Action 2: Attack with the Winner**
The system calculates the `Total Volume` of the losing side (e.g., 0.15 lots). It immediately executes a **Sell** trade of 0.15 lots.

*   **Scenario A: Sell Side was OFF.**
    *   Server turns Sell ON.
    *   Clears old Sell rows.
    *   Creates a single Row 0 with 0.15 lots.
    *   Executes immediately.
*   **Scenario B: Sell Side was ON.**
    *   Server calculates the gap between the *last Sell trade* and *current Bid*.
    *   Appends a new row with that specific dollar gap.
    *   Executes immediately.

### 2. Limit Price Logic (The "Trap")
*   If `buy_limit_price > 0`, the bot waits. `buy_waiting_limit` = True.
*   Once price hits, it executes and sets the `buy_start_ref`.

### 3. Conflict Detection 🛑
*   If the server sees a trade in MT5 with a `buy_HASH...` comment that matches a different hash than the current memory, it throws a **CRITICAL ERROR**.
*   **UI Action:** Block the screen. User must close the "Alien" trade in MT5 or use "Emergency Close" in the app.