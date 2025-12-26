# 📡 Grid Trading System - Strategy & Logic

## 🎯 Overview
**Server Version:** `3.4.2` (Sync-Shield & Loss Hedge Edition)  
**Base URL:** `http://YOUR_SERVER_IP:8000`

## ⭐ Key Features

### 1. Sync-Shield (Latency Protection) 🛡️
Added in v3.4.2 to resolve "Orphan Trades." The server now tracks exactly when an order was sent to MT5.
- **5-Second Grace Period:** The server ignores "empty account" reports for 5 seconds after a trade is fired.
- **Why?** It prevents the server from wiping a session ID while the broker is still processing the trade.

### 2. Loss Hedge Logic 🛡️
If a side reaches a specific floating loss (e.g., -$50):
- **Lock:** The losing side freezes. No new grid levels will open.
- **Counter-Attack:** A new trade is fired on the **opposite** side with volume equal to the total losing volume.

### 3. High-Frequency Polling
The system is designed for a **1-second heartbeat**. Both the Web UI and the MQL5 client must poll every 1000ms for perfect synchronization.

---

## 🔄 Lifecycle Logic
1.  **Market Tick:** MQL5 sends prices and current open positions.
2.  **Validation:** Server checks if any "Alien Trades" (wrong Hash IDs) exist.
3.  **Sync-Shield Check:** If an order was just sent, the server skips the "External Close" check.
4.  **Hedge Check:** Checks if floating loss on any side triggers the Hedge event.
5.  **Grid Check:** Compares price vs. the `dollar` gap for the next index.
6.  **Action:** Server returns `BUY`, `SELL`, or `CLOSE_ALL` to MT5.

---

### **2. Updated `README_API_TECHNICAL.md`**
*This file is the technical manual for developers/integrators.*

# 🔌 Trading Server API Reference (v3.4.2)

## 1. Data Models (JSON)

### **`UserSettings`** (Separate side controls)
```json
{
  "buy_limit_price": 0.0,
  "sell_limit_price": 0.0,
  "buy_tp_type": "equity_pct",
  "buy_tp_value": 1.5,
  "buy_hedge_value": 50.0, // Loss in $ to trigger hedge
  "rows_buy": [ ... ],
  "rows_sell": [ ... ]
}
```

### **`RuntimeState`** (Live status)
```json
{
  "buy_id": "buy_f4e7f3b4",
  "buy_on": true,
  "buy_hedge_triggered": false,
  "buy_is_closing": false,
  "buy_last_order_sent_ts": 1703501234.5, // Sync-Shield Timestamp
  "error_status": "" // If not empty, system is locked due to conflict
}
```

---

## 2. Frontend Endpoints (UI -> Server)

### **GET `/api/ui-data`**
Retrieve settings, live runtime status, and price history for the charts.
- **Interval:** 1000ms.

### **POST `/api/update-settings`**
Update the grid rows, TP values, and Hedge thresholds.
- **Body:** Full `UserSettings` object.

### **POST `/api/control`**
Toggle switches or trigger emergency stops.
```json
{ 
  "buy_switch": true, 
  "sell_switch": false, 
  "cyclic": true, 
  "emergency_close": false 
}
```

---

## 3. MQL5 Endpoint (MT5 -> Server)

### **POST `/api/tick`**
The primary heartbeat. MT5 sends this every second.

**Request:**
```json
{
  "account_id": "12345",
  "equity": 5000.0,
  "ask": 2045.50,
  "bid": 2045.45,
  "positions": [
    { "ticket": 123, "type": "BUY", "comment": "buy_f4e7f3b4_idx0", "profit": 5.0 }
  ]
}
```

**Response:**
```json
{
  "action": "BUY", // or "WAIT", "CLOSE_ALL"
  "volume": 0.02,
  "comment": "buy_f4e7f3b4_idx1",
  "alert": true
}
```

---

## 🛑 Error Handling
- **Conflict Detected:** If `error_status` appears in the UI, it means there is a trade in MT5 that the server doesn't recognize (Comment mismatch). 
- **Solution:** Stop the EA, close manual trades, and use the **Emergency Close** button to reset the Server ID.