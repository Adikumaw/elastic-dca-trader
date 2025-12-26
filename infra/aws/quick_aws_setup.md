# 🚀 AWS Deployment: Finalizing Your Elastic DCA Setup

### ⚠️ Important: Use HTTP, not HTTPS

Because SSL certificates (green lock) are not yet configured, the server only understands standard HTTP.

- **The Issue:** Browsers often force `https://`. This will cause an "Invalid HTTP request" error.
- **The Fix:** Manually ensure the URL starts with **http://**.
- **URL:** `http://YOUR_SERVER_IP:8000`

---

### 🛠 1. Run Processes in the Background

To keep the Elastic DCA Engine running after you close the terminal, we will use `screen` sessions.

#### A. Deploy the Backend (Server)

1.  **Stop current process:** If running, press `CTRL + C`.
2.  **Navigate to server folder:**
    _(Note: This matches your repo name `elastic-dca-trader`)_
    ```bash
    cd ~/elastic-dca-trader/apps/server
    ```
3.  **Create a backend session:**
    ```bash
    screen -S backend
    ```
4.  **Start the engine:**
    ```bash
    python3 main.py
    ```
5.  **Detach:** Press `CTRL + A`, then `D`.
    _(The backend is now running safely in the background.)_

#### B. Deploy the Frontend (Dashboard)

1.  **Navigate to the web folder:**
    ```bash
    cd ~/elastic-dca-trader/apps/web
    ```
2.  **Build and serve:**
    ```bash
    npm run build
    screen -S frontend
    npx serve -s dist -l 3000
    ```
3.  **Detach:** Press `CTRL + A`, then `D`.

---

### 🖥 2. Access Your Dashboard

Open your browser and navigate to:

👉 **[http://YOUR_SERVER_IP:3000](http://YOUR_SERVER_IP:3000)**

> **Note:** If the page fails to load, double-check that your AWS Security Group allows inbound traffic on port **3000** (Custom TCP) and that your browser hasn't redirected you to `https`.

---

### ⚙️ 3. Maintenance Commands

Use these commands if you need to view logs or restart the bot.

| Action                     | Command                      |
| :------------------------- | :--------------------------- |
| **View running sessions**  | `screen -ls`                 |
| **Re-enter Backend logs**  | `screen -r backend`          |
| **Re-enter Frontend logs** | `screen -r frontend`         |
| **Stop Backend**           | `screen -X -S backend quit`  |
| **Stop Frontend**          | `screen -X -S frontend quit` |
| **Kill all sessions**      | `killall screen`             |

---

**Deployment Complete!** The Elastic DCA System is now running 24/7 on AWS. 🚀
