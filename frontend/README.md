# 5G Network Performance Analyzer (NOC Dashboard)

An interactive, high-fidelity **5G Network Operations Center (NOC)** performance analyzer dashboard. This application provides real-time visualization, simulation, and analysis of 5G NR (New Radio) network Key Performance Indicators (KPIs).

Built with **Vite + React + Vanilla CSS** and custom SVG-based graphics, the application runs entirely in the browser with zero external plotting dependencies (eliminating package version conflicts).

---

## 🚀 Key Features

*   **Live RF Telemetry Dashboard**: Monitors Downlink/Uplink Throughput, RSRP (Signal Strength), SINR (Signal Quality), Latency/Jitter, and Resource Block (RB) Allocation.
*   **Interactive 5G Topology Map**: An interactive SVG map visualizing base stations (gNodeBs), sector coverage wedges, and the User Equipment (UE) traveling along path trajectories. Connection links dynamically change thickness and color to indicate link quality.
*   **Simulation Controller**:
    *   *Mobility Speed*: Stationary, Walking (5 km/h), Driving (60 km/h), and High-Speed Train (250 km/h) affecting handovers.
    *   *RF Environment*: Urban, Suburban, and Rural profiles that scale Path Loss Exponents.
    *   *Cell Load*: Low, Medium, and High load states affecting Resource Block availability.
*   **Anomaly Injection System**: Trigger real-time RF Jamming, Handover Failures, Congestion Spikes, or localized Cell Outages (by clicking individual towers on the map).
*   **NOC Terminal Alert Feed**: Live console reporting network events (successful handovers, coverage warnings, and radio link failures).
*   **Automated 5G Optimizations**: Evaluates RF conditions and recommends 3GPP-aligned structural adjustments (e.g., antenna downtilts, carrier aggregation, hysteresis adjustments).
*   **Data Logging Hub**: Export simulation logs to CSV/JSON or import historical data to replay performance logs.

---

## ⚙️ Mathematical Engineering Models

The simulation engine uses authentic telecommunications formulas to compute performance metrics:

1.  **Log-Distance Path Loss Model**:
    $$PL = PL_0 + 10 \cdot n \cdot \log_{10}(d) + X_\sigma$$
    *Where $n$ represents the path loss exponent (Urban: 3.5, Rural: 2.3), $d$ is the distance to the gNodeB, and $X_\sigma$ is log-normal shadowing.*
2.  **Shannon-Hartley Capacity Equation**:
    $$C = B \cdot \log_2(1 + \text{SINR})$$
    *Where $B$ is channel bandwidth (n78 C-band: 100MHz, mmWave: 400MHz), and throughput is scaled by UE resource block share.*
3.  **Handover Hysteresis Decision**:
    $$\text{RSRP}_{\text{target}} > \text{RSRP}_{\text{serving}} + \text{Hysteresis} \ (3.5\text{dB})$$

---

## 🛠️ Local Setup & Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run development server**:
    ```bash
    npm run dev
    ```
3.  **Build for production**:
    ```bash
    npm run build
    ```

---

## 🐙 Deploying to GitHub

This project is initialized as a Git repository. To push the code to your GitHub repository, execute the following commands in your shell:

```bash
# Verify the remote origin is set
git remote -v

# Stage all files
git add .

# Create the initial commit
git commit -m "feat: initial commit of 5G network performance analyzer dashboard"

# Push to the main branch
git push -u origin main
```

*Note: If you run into authentication errors, ensure your terminal is logged into GitHub CLI (`gh auth login`) or you have configured a Personal Access Token (PAT) in your Git credentials.*
