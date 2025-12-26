# 📡 Grid Trading System - Complete API Documentation

## 🎯 Overview

**Server Version:** `3.4.2` (Sync-Shield & Loss Hedge Edition)  
**Base URL:** `http://YOUR_SERVER_IP:8000`  
**Protocol:** HTTP/JSON  
**CORS:** Enabled for all origins

> **⭐ Key Updates (v3.4.2):**
>
> 1. **Sync-Shield (Latency Protection):** Resolved race conditions where the server would "forget" a session ID before the broker confirmed the trade. Added a 5-second grace period for all external close detections.
> 2. **Loss Hedge Logic:** Integrated safety-lock mechanism. If a side reaches a specific loss threshold, it freezes and executes a counter-volume trade on the opposite side.
> 3. **Side-Independent Timestamps:** Improved tracking of order execution times to ensure high-frequency stability.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Data Flow & Lifecycle](#data-flow--lifecycle)
3. [Core Endpoints](#core-endpoints)
4. [Latency Protection (Sync-Shield)](#latency-protection-sync-shield)
5. [UI Integration Guide](#ui-integration-guide)
6. [System Logic & Error Handling](#system-logic--error-handling)

---

## 🚀 Quick Start

### Polling Pattern (UI -> Server)

```javascript
// Poll server every 1 second for live updates
setInterval(async () => {
  try {
    const response = await fetch("http://YOUR_SERVER_IP:8000/api/ui-data");
    const data = await response.json();
    updateUI(data); // Render settings, price, and sync-status
  } catch (e) {
    showDisconnectedState();
  }
}, 1000);
```

---

## 🔄 Data Flow & Lifecycle

The lifecycle now includes a **Latency Guard** to ensure trade association.

1.  **Grid Entry Trigger:**
    - Server detects price hit -> Sends `BUY` or `SELL` action to MT5.
    - **Sync-Shield Start:** Server records `last_order_sent_ts` for that side.
2.  **In-Flight Phase (0-5 seconds):**
    - MT5 processes order with Broker.
    - Server ignores "Empty Trade" reports from MT5 during this window to prevent accidental session resets.
3.  **Hedge Monitor:**
    - If floating loss exceeds `hedge_value`, the side locks and "attacks" on the opposite grid.
4.  **Closing Phase:**
    - Confirms MT5 trades are 0 **only after** the grace period has passed, ensuring a manual close is actually manual.

---

## 🔌 Core Endpoints

### 1. GET `/api/ui-data`

**Purpose:** Get complete system state.

**Response Example (v3.4.2):**

```json
{
  "settings": {
    "buy_hedge_value": 50.0,
    "sell_hedge_value": 0.0,
    "rows_buy": [...],
    "rows_sell": [...]
  },
  "runtime": {
    "buy_id": "buy_f4e7f3b4",
    "buy_hedge_triggered": false,
    "buy_is_closing": false,

    // --- NEW: Sync-Shield Fields ---
    "buy_last_order_sent_ts": 1703501234.56,
    "sell_last_order_sent_ts": 0.0,

    "error_status": "" // Non-empty string indicates a Critical Conflict
  }
}
```

---

## 🛡️ Latency Protection (Sync-Shield)

In high-frequency environments, there is a delay between sending an order and seeing it in the MT5 position list.

- **The Problem:** Old versions assumed that if MT5 reported "0 trades" while a session was active, the user had manually closed them. This caused "Orphan Trades."
- **The Solution:** The server now enforces an `EXTERNAL_CLOSE_GRACE_PERIOD` of 5 seconds.
- **Behavior:** The server will **not** reset a session ID or declare an "External Close" if an order was sent to that side in the last 5 seconds.

---

## 🎨 UI Integration Guide

### 1. Visualizing Sync State (Optional but Helpful)

You can show a "Processing..." or "Synchronizing..." spinner if:
`Math.abs(Date.now()/1000 - runtime.buy_last_order_sent_ts) < 5`

### 2. Hedge Status

When `runtime.buy_hedge_triggered` is **True**:

- UI should visually "lock" the Buy grid (e.g., grey out the inputs).
- Display a status: **"SIDE HEDGED: Grid Frozen"**.

---

## ⚙️ System Logic & Error Handling

### 1. The Hedge Mechanism 🛡️

**Action:** The system calculates the `Total Volume` of the losing side.

- If the opposite side is **OFF**: It forces it **ON**, clears rows, and injects the hedge volume into Row 0.
- If the opposite side is **ON**: It calculates the gap between the last trade and current price, appends a new row, and executes immediately.

### 2. Conflict Detection 🛑

If a trade appears in MT5 with a `buy_HASH` that doesn't match the server's memory, `error_status` will trigger.

- **Cause:** This usually happens if the server was restarted without its `state.json` file.
- **Fix:** Use the **Emergency Close** button on the UI to wipe both the server memory and the MT5 trades simultaneously.
