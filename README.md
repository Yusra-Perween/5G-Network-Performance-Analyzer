# Full-Stack 5G Network Performance Analyzer

A full-stack, real-time **5G NR (New Radio) Network Operations Center (NOC) Dashboard** and database logger. This project simulates 5G Key Performance Indicators (KPIs) based on mobility physics and stores historical monitoring logs in a local SQL database.

---

## 🛠️ Full-Stack Technology Stack

*   **Frontend**: React (Vite-driven SPA), HTML5, CSS3 (Vanilla glassmorphism style), and custom SVG-based map/chart renderers.
*   **Backend**: Core Java (`com.sun.net.httpserver.HttpServer`) built-in HTTP server exposing CORS-compliant REST API endpoints on port `8080`.
*   **Database**: SQLite (`sqlite-jdbc` JDBC driver) file-based SQL database auto-created locally as `network_analyzer.db`.

---

## 📂 Project Directory Structure

```text
├── frontend/             # React Single-Page Application
│   ├── src/              # Telemetry simulation, map views, SVG charts, and logs
│   ├── public/           # Static icons and assets
│   ├── package.json      # React project dependencies
│   └── index.html        # Main HTML viewport
│
├── backend/              # Core Java HTTP server & JDBC database layer
│   ├── Server.java       # HTTP endpoint router and CORS pre-flight handler
│   ├── Database.java     # SQLite JDBC connector, table schemas, and transactions
│   ├── JSONParser.java   # Custom payload parser (no heavy external dependencies)
│   └── sqlite-jdbc-*.jar # Embedded SQLite JDBC driver jar
│
└── network_analyzer.db   # File-based SQLite relational database (gitignored)
```

---

## 📊 Database Schemas

The database contains two relational tables structured with a one-to-many relationship:

### 1. `sessions` Table
Stores high-level metadata for each monitoring run:
*   `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
*   `name` (TEXT): Custom label entered by the user.
*   `environment` (TEXT): Propagation profile (Urban, Suburban, Rural).
*   `load_level` (TEXT): Traffic capacity load (Low, Medium, High).
*   `created_at` (TIMESTAMP): Date and time of session creation.

### 2. `telemetry_records` Table
Stores detailed time-series telemetry data logged for each simulation second:
*   `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
*   `session_id` (INTEGER): Foreign key referencing `sessions(id)`.
*   `time` (INTEGER): Elapsed simulation tick.
*   `serving_cell` (TEXT): Serving tower name.
*   `rsrp` (REAL): Signal strength (dBm).
*   `sinr` (REAL): Signal quality ratio (dB).
*   `rsrq` (REAL): Signal quality quality (dB).
*   `dl_throughput` (REAL): Downlink Speed (Mbps).
*   `ul_throughput` (REAL): Uplink Speed (Mbps).
*   `latency` (REAL): RTT Ping (ms).
*   `jitter` (REAL): Latency fluctuation (ms).
*   `rb_usage` (INTEGER): Active Resource Blocks allocated (%).

---

## ⚙️ Core Engineering Principles

1.  **RF Propagation (Path Loss)**:
    $$PL = PL_0 + 10 \cdot n \cdot \log_{10}(d) + X_\sigma$$
    Calculates RSRP and SINR decay across Urban ($n=3.5$), Suburban ($n=3.0$), and Rural ($n=2.3$) path-loss factors.
2.  **Capacity (Throughput)**:
    $$\text{Capacity} = \text{Bandwidth} \cdot \log_2(1 + \text{SINR}) \cdot \eta_{\text{modulation}}$$
    Applies the Shannon-Hartley theorem, scaling user throughput based on network load and resource block scheduling shares.
3.  **A3 Handover Trigger**:
    $$\text{RSRP}_{\text{target}} > \text{RSRP}_{\text{serving}} + 3.5\text{dB}$$

---

## 🚀 Running the Project Locally

### 1. Start the Java Backend
Navigate to the `backend/` directory, compile the Java files, and start the server:
```powershell
# Compile the Java classes
javac -cp sqlite-jdbc-3.27.2.1.jar *.java

# Start the server
java -cp ".;sqlite-jdbc-3.27.2.1.jar" Server
```
*You should see a message: `SQLite Database initialized. Tables verified.` and `Java HTTP Server started on http://localhost:8080/api/sessions`.*

### 2. Start the React Frontend
Navigate to the `frontend/` directory, install packages, and start the development server:
```bash
# Install node packages
npm install

# Start Vite server
npm run dev
```
*Open `http://localhost:5173` in your browser. Record a session, hit "Save to DB", and check that it creates/stores the session locally!*
