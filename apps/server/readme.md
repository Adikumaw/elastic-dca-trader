# 🧠 Elastic DCA Engine (Server)

**Version:** `3.4.2`  
**Architecture:** Python 3.9+ / FastAPI / Uvicorn  
**Role:** Central State Machine & Decision Engine

## 🎯 System Overview

The **Elastic DCA Server** acts as the "Brain" of the trading operation. Unlike standard MT5 EAs that run logic inside the terminal, this system offloads all state management, risk calculations, and decision-making to this Python engine.

This ensures:
1.  **State Persistence:** If MT5 crashes, the trading session state is safe in `state.json`.
2.  **Complex Calculation:** Python handles the "Elastic" grid logic and "IronClad" hedge protections more efficiently.
3.  **Isolation:** Buy and Sell vectors run on completely separate logic tracks.

---

## ⭐ Core Protocols

### 1. The Elastic Vector (Accumulation)
Instead of static grids, the system uses dynamic **"Strata"** (Rows).
- **Expansion:** As price moves against the anchor, the server instructs MT5 to place orders at specific `gap` intervals defined in the settings.
- **Anchor:** The starting reference price (`buy_start_ref`).
- **Logic:** `Current Price` vs `Next Strata Target`.

### 2. Snap-Back Take Profit (The Exit)
The system ignores individual trade profit. It calculates the **Net Aggregate Profit** of the specific side (Buy or Sell vector).
- **Trigger:** When `Sum(Profits) >= Target`, the server sends a `CLOSE_ALL` command.
- **Result:** The elastic band "snaps back," clearing the board for a new session.

### 3. IronClad Protection (The Shield) 🛡️
A dedicated monitor checks the floating drawdown of every heartbeat.
- **Trigger:** If `Drawdown <= Hedge Limit` (e.g., -$50).
- **Action:**
    1.  **Lock:** The losing vector is flagged as `hedge_triggered`. No new accumulation orders are allowed.
    2.  **Counter-Measure:** The server calculates the *exact* volume of the losing side and forces a trade on the **opposite** side.
    3.  **Stasis:** The account equity is now "frozen" regarding this pair, allowing manual intervention.

### 4. Sync-Shield (Latency Guard) 📡
*Added in v3.4.2*
Prevents "Orphan Trades" caused by network lag.
- **Mechanism:** When the server orders a trade, it records a timestamp (`last_order_sent_ts`).
- **Grace Period:** For 5 seconds after ordering, the server **ignores** reports from MT5 saying "No trades exist."
- **Benefit:** Prevents the server from thinking a session ended just because the broker hasn't confirmed the trade execution yet.

---

## 🔄 The Decision Loop (Lifecycle)

The server processes data in **1000ms intervals** (Heartbeats).

1.  **Ingest:** Receive JSON payload from MT5 (Prices, Equity, Open Positions).
2.  **Sanitize:** Validate all open trades against the known `Session Hash` (UUID). Detect "Alien" trades.
3.  **Update Stats:** Update the internal execution map (`buy_exec_map`) with real-time profit/loss data.
4.  **IronClad Check:** Is the drawdown too high? -> **Trigger Hedge**.
5.  **Snap-Back Check:** Is the profit target hit? -> **Trigger Close**.
6.  **External Close Check:** Did the user manually close trades in MT5? (Subject to Sync-Shield grace period).
7.  **Elastic Expansion:** If the price reached the next `Strata` level -> **Trigger New Order**.
8.  **Response:** Send JSON command back to MT5 (`BUY`, `SELL`, `CLOSE_ALL`, or `WAIT`).

---

## 🔌 API Reference

### 📡 Endpoint: MQL5 Heartbeat
**`POST /api/tick`**
*The Metatrader 5 client hits this endpoint every second.*

**Request (Incoming from MT5):**
```json
{
  "account_id": "8829102",
  "equity": 5000.0,
  "balance": 4950.0,
  "symbol": "XAUUSD",
  "ask": 2030.50,
  "bid": 2030.10,
  "positions": [
    { 
      "ticket": 1001, 
      "type": "BUY", 
      "volume": 0.01, 
      "price": 2035.00, 
      "profit": -5.00, 
      "comment": "buy_a1b2c3d4_idx0" 
    }
  ]
}
```

**Response (Outgoing to MT5):**
```json
{
  "action": "BUY", 
  "volume": 0.02,
  "comment": "buy_a1b2c3d4_idx1",
  "alert": true
}
```
*Possible Actions: `WAIT`, `BUY`, `SELL`, `CLOSE_ALL`.*

---

### 🖥️ Endpoint: Frontend Data
**`GET /api/ui-data`**
*Used by the React Dashboard to visualize the engine.*

**Response Structure:**
```json
{
  "settings": {
    "buy_limit_price": 0.0,
    "buy_tp_value": 1.5,
    "buy_hedge_value": 50.0,
    "rows_buy": [ {"index": 0, "dollar": 0, "lots": 0.01} ]
  },
  "runtime": {
    "buy_on": true,
    "buy_id": "buy_a1b2c3d4",
    "buy_hedge_triggered": false,
    "current_price": 2030.30
  },
  "market": { ... }
}
```

---

### ⚙️ Endpoint: Controls
**`POST /api/control`**
*Toggle switches and emergency overrides.*

```json
{ 
  "buy_switch": true,      // Turn Buy Vector ON/OFF
  "sell_switch": false,    // Turn Sell Vector ON/OFF
  "cyclic": true,          // Auto-restart after TP?
  "emergency_close": false // PANIC BUTTON
}
```

---

### 🛠️ Endpoint: Configuration
**`POST /api/update-settings`**
*Updates the grid strata and risk parameters.*

**Payload:** Expects a full `UserSettings` object matching the schema in `ui-data`.

---

## 🚀 Running the Server

### Requirements
*   Python 3.9+
*   `pip install fastapi uvicorn pydantic`

### Start Command
```bash
# Navigate to folder
cd server

# Run Uvicorn (Host 0.0.0.0 allows access from other devices/VMs)
python main.py
```
*Server runs on port **8000** by default.*

## ⚠️ Troubleshooting

**"CRITICAL: Identity Conflict"**
*   **Cause:** The server sees a trade in MT5 with a comment (e.g., `buy_X...`) that does not match its current internal Session ID.
*   **Fix:**
    1.  Turn off the bot logic via UI.
    2.  Manually close the specific trade in MT5.
    3.  Hit **Emergency Close** in the UI to reset the server state.

**"Orphan Trades"**
*   **Cause:** Network lag caused MT5 to report 0 positions right after opening one.
*   **Fix:** The **Sync-Shield** (v3.4.2) automatically handles this. If persistent, check your VPS network connection.