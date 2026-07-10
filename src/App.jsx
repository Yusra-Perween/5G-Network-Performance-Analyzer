import React, { useState, useEffect, useRef } from 'react';
import { Network, ShieldAlert, Cpu, Sparkles, Sliders, Activity } from 'lucide-react';
import { calculateTelemetry, GNODEB_LIST } from './utils/5GDataEngine';
import MetricCard from './components/MetricCard';
import MapViewer from './components/MapViewer';
import TelemetryCharts from './components/TelemetryCharts';
import DiagnosticLog from './components/DiagnosticLog';
import ControlPanel from './components/ControlPanel';
import LogImporter from './components/LogImporter';

import { 
  Wifi, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Clock, 
  Database,
  Grid
} from 'lucide-react';

export default function App() {
  // --- Simulation State ---
  const [time, setTime] = useState(0);
  const [mobilitySpeed, setMobilitySpeed] = useState('driving'); // stationary, walking, driving, train
  const [mobilityProgress, setMobilityProgress] = useState(0);
  
  const [environment, setEnvironment] = useState('urban'); // urban, suburban, rural
  const [loadLevel, setLoadLevel] = useState('medium'); // low, medium, high
  
  const [anomalies, setAnomalies] = useState({
    jamming: false,
    handoverFailure: false,
    congestion: false,
    outage: false,
    outageCellId: 1, // defaults to gNodeB-Alpha
  });

  const [ue, setUe] = useState({
    x: 300,
    y: 300,
    servingCellId: null,
    pathHistory: []
  });

  const [telemetry, setTelemetry] = useState({
    servingCellId: null,
    servingCellName: "SEARCHING FOR CELL (RLF)",
    rsrp: -140,
    sinr: -10,
    rsrq: -20,
    downlinkThroughput: 0,
    uplinkThroughput: 0,
    latency: 120,
    jitter: 0,
    resourceBlocksUsed: 0,
    towerStats: []
  });

  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Handover counters
  const [handoverStats, setHandoverStats] = useState({
    attempts: 0,
    successes: 0,
    failures: 0
  });

  const [isReplayMode, setIsReplayMode] = useState(false);
  
  // Prevents stale state references in callback
  const prevServingCellIdRef = useRef(null);

  // Helper to add logs
  const addLog = (message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev, 
      { time: timestamp, message, level }
    ]);
  };

  // --- Initialize App Logs ---
  useEffect(() => {
    addLog("Initializing 5G Network Performance Analyzer...", "info");
    addLog("Base Station nodes configured: C-Band n78 & mmWave n258.", "success");
    addLog("System standing by. Simulating UE movement...", "info");
  }, []);

  // --- Real-Time Simulation Interval ---
  useEffect(() => {
    if (isReplayMode) return; // Freeze simulation logic during log replaying

    const interval = setInterval(() => {
      setTime(t => t + 1);

      // 1. Increment progress based on speed
      let stepSize = 0;
      if (mobilitySpeed === 'walking') stepSize = 0.015;
      else if (mobilitySpeed === 'driving') stepSize = 0.05;
      else if (mobilitySpeed === 'train') stepSize = 0.15;
      
      let nextProgress = mobilityProgress;
      let nextX = ue.x;
      let nextY = ue.y;

      if (mobilitySpeed !== 'stationary') {
        nextProgress = mobilityProgress + stepSize;
        setMobilityProgress(nextProgress);
        
        // Parametric infinity loop / Lissajous curve
        nextX = 300 + 220 * Math.sin(nextProgress);
        nextY = 300 + 200 * Math.cos(nextProgress * 0.85);
      }

      // Update UE position and history trace
      setUe(prev => {
        const pathHistory = [...prev.pathHistory, { x: nextX, y: nextY }];
        if (pathHistory.length > 50) pathHistory.shift();
        return {
          ...prev,
          x: nextX,
          y: nextY,
          pathHistory
        };
      });

      // 2. Compute Telemetry based on new coordinates and settings
      const currentUeState = { ...ue, x: nextX, y: nextY };
      const latestTelemetry = calculateTelemetry(currentUeState, environment, loadLevel, anomalies, time);

      // 3. Process Handovers and logs
      const prevServingId = prevServingCellIdRef.current;
      const currentServingId = latestTelemetry.servingCellId;

      if (currentServingId !== prevServingId) {
        if (latestTelemetry.handoverTriggered) {
          setHandoverStats(prev => {
            const attempts = prev.attempts + 1;
            if (latestTelemetry.handoverStatus === "SUCCESS") {
              const prevName = GNODEB_LIST.find(t => t.id === prevServingId)?.name.split(" ")[0] || "Unknown";
              const newName = GNODEB_LIST.find(t => t.id === currentServingId)?.name.split(" ")[0];
              
              addLog(`Handover triggered: ${prevName} ➔ ${newName}. RSRP check passed.`, "info");
              addLog(`Handover SUCCESS: Connected to serving cell ${newName}.`, "success");
              return { attempts, successes: prev.successes + 1, failures: prev.failures };
            } else {
              addLog("Handover FAILURE: Radio Link Failure triggered. Lost connection.", "critical");
              return { attempts, successes: prev.successes, failures: prev.failures + 1 };
            }
          });
        } else if (currentServingId === null) {
          addLog("Radio Link Failure (RLF) detected. No tower within coverage parameters.", "critical");
        } else if (prevServingId === null && currentServingId !== null) {
          const newName = GNODEB_LIST.find(t => t.id === currentServingId)?.name.split(" ")[0];
          addLog(`Signal Restored: Connected to serving cell ${newName}.`, "success");
        }
        
        // Update UE serving cell and reference ref
        setUe(prev => ({ ...prev, servingCellId: currentServingId }));
        prevServingCellIdRef.current = currentServingId;
      }

      // Handle critical RF issues warning logs (throttled output)
      if (latestTelemetry.rsrp < -115 && currentServingId && time % 6 === 0) {
        addLog(`Coverage warning: Low signal level (RSRP ${latestTelemetry.rsrp} dBm) on serving node.`, "warning");
      }
      if (latestTelemetry.sinr < 0 && currentServingId && time % 6 === 0) {
        addLog(`Interference warning: SINR dropped to ${latestTelemetry.sinr} dB. Signal degraded.`, "warning");
      }

      // 4. Update states
      setTelemetry(latestTelemetry);
      
      // Append metrics history
      setHistory(prev => {
        const nextHist = [...prev, { ...latestTelemetry, time }];
        if (nextHist.length > 100) nextHist.shift();
        return nextHist;
      });

    }, 850); // Tick rate slightly under 1 second

    return () => clearInterval(interval);
  }, [mobilitySpeed, mobilityProgress, environment, loadLevel, anomalies, ue, time, isReplayMode]);

  // --- Interactions ---
  
  // Clicking a tower triggers outage on it, or boots it back up
  const handleTowerClick = (towerId) => {
    if (isReplayMode) return;
    
    const tower = GNODEB_LIST.find(t => t.id === towerId);
    const towerName = tower ? tower.name.split(" ")[0] : "Cell";
    
    setAnomalies(prev => {
      const isOutage = prev.outage && prev.outageCellId === towerId;
      if (isOutage) {
        // Recover tower
        addLog(`Maintenance Complete: ${towerName} powered back on. Broadcaster restored.`, "success");
        return { ...prev, outage: false };
      } else {
        // Fail tower
        addLog(`CRITICAL outage injected: ${towerName} went offline!`, "critical");
        return { ...prev, outage: true, outageCellId: towerId };
      }
    });
  };

  // Toggle other anomalies
  const handleToggleAnomaly = (key) => {
    if (isReplayMode) return;

    setAnomalies(prev => {
      const nextVal = !prev[key];
      if (key === 'jamming') {
        addLog(nextVal ? "RF Jammer active! Background noise floor elevated." : "Jammer deactivated. Noise floor restored.", nextVal ? "critical" : "info");
      } else if (key === 'handoverFailure') {
        addLog(nextVal ? "Handover restrictions active: Handovers will fail." : "Handover boundaries restored to normal.", nextVal ? "warning" : "info");
      } else if (key === 'congestion') {
        addLog(nextVal ? "Resource Block congestion spike: Cells saturated." : "Resource blocks returned to normal schedule.", nextVal ? "warning" : "info");
      } else if (key === 'outage') {
        const towerName = GNODEB_LIST.find(t => t.id === prev.outageCellId)?.name.split(" ")[0] || "Alpha";
        addLog(nextVal ? `CRITICAL outage injected: ${towerName} offline!` : `Restored ${towerName} online.`, nextVal ? "critical" : "success");
      }
      return { ...prev, [key]: nextVal };
    });
  };

  // Replaying imported logs
  const handleImportLogs = (importedData) => {
    setIsReplayMode(true);
    addLog(`Log import completed: loaded ${importedData.length} records. Replaying data...`, "info");
    
    // Set history and current telemetry to the last point of import
    setHistory(importedData);
    if (importedData.length > 0) {
      const lastPoint = importedData[importedData.length - 1];
      setTelemetry({
        ...lastPoint,
        towerStats: telemetry.towerStats // preserve towers map layout
      });
      // Mock coordinates to center
      setUe(prev => ({
        ...prev,
        x: 300,
        y: 300,
        servingCellId: lastPoint.servingCellId || null
      }));
    }
  };

  // Reset session and return to live simulation
  const handleResetLogs = () => {
    setIsReplayMode(false);
    setHistory([]);
    setLogs([]);
    setHandoverStats({ attempts: 0, successes: 0, failures: 0 });
    setTime(0);
    setMobilityProgress(0);
    setUe({ x: 300, y: 300, servingCellId: null, pathHistory: [] });
    prevServingCellIdRef.current = null;
    
    setAnomalies({
      jamming: false,
      handoverFailure: false,
      congestion: false,
      outage: false,
      outageCellId: 1
    });

    addLog("Session reset. Connected to Live 5G Simulator.", "success");
  };

  // Determine indicator status light
  let activeStatus = "ONLINE";
  let statusClass = "status-dot";
  if (!telemetry.servingCellId) {
    activeStatus = "RLF (DISCONNECTED)";
    statusClass = "status-dot disconnected";
  } else if (anomalies.jamming || anomalies.handoverFailure || anomalies.congestion || anomalies.outage) {
    activeStatus = "ANOMALY DETECTED";
    statusClass = "status-dot anomaly";
  }

  return (
    <div className="app-container">
      {/* 1. Header Navigation */}
      <header className="app-header">
        <div className="logo-section">
          <Network className="logo-icon" size={28} />
          <div>
            <h1>5G NR Network Analyzer</h1>
            <div className="logo-subtitle">Real-Time Performance Operations Center</div>
          </div>
        </div>

        <div className="header-status">
          <div className="status-indicator">
            <span className={statusClass} />
            <span>SYSTEM STATE: {activeStatus}</span>
          </div>
          {isReplayMode && (
            <div className="status-indicator" style={{ borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)' }}>
              <span>HISTORICAL REPLAY MODE</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Dashboard Columns */}
      <main className="dashboard-grid">
        {/* Left Column: Metrics and Controls */}
        <section className="left-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Key Statistics */}
          <div className="glass-card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <div className="card-title">
                <Activity size={18} />
                <span>Live RF Telemetry</span>
              </div>
            </div>

            <div className="metric-row">
              <MetricCard 
                label="Downlink" 
                value={telemetry.downlinkThroughput} 
                unit="Mbps" 
                icon={ArrowDownCircle} 
                trend={telemetry.downlinkThroughput > 150 ? "Excellent" : telemetry.downlinkThroughput > 20 ? "Fair" : "Degraded"}
                trendClass={telemetry.downlinkThroughput > 150 ? "good" : telemetry.downlinkThroughput > 20 ? "warning" : "bad"}
                alertState={telemetry.downlinkThroughput < 10 && telemetry.servingCellId ? "danger" : ""}
              />
              <MetricCard 
                label="Uplink" 
                value={telemetry.uplinkThroughput} 
                unit="Mbps" 
                icon={ArrowUpCircle} 
                trend={telemetry.uplinkThroughput > 20 ? "Excellent" : telemetry.uplinkThroughput > 5 ? "Fair" : "Degraded"}
                trendClass={telemetry.uplinkThroughput > 20 ? "good" : telemetry.uplinkThroughput > 5 ? "warning" : "bad"}
              />
              <MetricCard 
                label="RSRP (Signal)" 
                value={telemetry.rsrp} 
                unit="dBm" 
                icon={Wifi} 
                trend={telemetry.rsrp > -85 ? "Excellent" : telemetry.rsrp > -105 ? "Good" : telemetry.rsrp > -115 ? "Fair" : "Poor"}
                trendClass={telemetry.rsrp > -100 ? "good" : telemetry.rsrp > -115 ? "warning" : "bad"}
                alertState={telemetry.rsrp < -115 && telemetry.servingCellId ? "danger" : ""}
              />
              <MetricCard 
                label="SINR (Noise)" 
                value={telemetry.sinr} 
                unit="dB" 
                icon={Grid} 
                trend={telemetry.sinr > 13 ? "Excellent" : telemetry.sinr > 5 ? "Good" : telemetry.sinr > 0 ? "Fair" : "Poor"}
                trendClass={telemetry.sinr > 5 ? "good" : telemetry.sinr > 0 ? "warning" : "bad"}
                alertState={telemetry.sinr < 0 && telemetry.servingCellId ? "danger" : ""}
              />
              <MetricCard 
                label="Ping / Latency" 
                value={telemetry.latency} 
                unit="ms" 
                icon={Clock} 
                trend={`Jitter: ${telemetry.jitter}ms`}
                trendClass={telemetry.latency < 15 ? "good" : telemetry.latency < 45 ? "warning" : "bad"}
                alertState={telemetry.latency > 50 && telemetry.servingCellId ? "warning" : ""}
              />
              <MetricCard 
                label="RB Allocation" 
                value={telemetry.resourceBlocksUsed} 
                unit="%" 
                icon={Database} 
                trend={telemetry.resourceBlocksUsed > 90 ? "Saturated" : telemetry.resourceBlocksUsed > 60 ? "Heavy Load" : "Optimized"}
                trendClass={telemetry.resourceBlocksUsed < 60 ? "good" : telemetry.resourceBlocksUsed < 90 ? "warning" : "bad"}
                alertState={telemetry.resourceBlocksUsed > 90 ? "warning" : ""}
              />
            </div>

            {/* Handover Counters */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Handover Tracking</div>
              <div className="handover-stat-panel">
                <div className="ho-stat-box">
                  <div className="ho-stat-title">Attempts</div>
                  <div className="ho-stat-num">{handoverStats.attempts}</div>
                </div>
                <div className="ho-stat-box">
                  <div className="ho-stat-title">Successes</div>
                  <div className="ho-stat-num success">{handoverStats.successes}</div>
                </div>
                <div className="ho-stat-box">
                  <div className="ho-stat-title">Failures</div>
                  <div className="ho-stat-num failure">{handoverStats.failures}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Simulator Controllers */}
          <ControlPanel 
            mobilitySpeed={mobilitySpeed} 
            setMobilitySpeed={setMobilitySpeed} 
            environment={environment} 
            setEnvironment={setEnvironment} 
            loadLevel={loadLevel} 
            setLoadLevel={setLoadLevel}
            anomalies={anomalies}
            toggleAnomaly={handleToggleAnomaly}
          />
        </section>

        {/* Center Column: Map and Data hub */}
        <section className="center-column" style={{ display: 'flex', flexDirection: 'column' }}>
          <MapViewer 
            telemetry={telemetry} 
            ue={ue} 
            onTowerClick={handleTowerClick}
            anomalies={anomalies}
          />

          <LogImporter 
            history={history}
            onImportLogs={handleImportLogs}
            onResetLogs={handleResetLogs}
          />
        </section>

        {/* Right Column: Diagnostic Alert Feed and Charts */}
        <section className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <DiagnosticLog 
            logs={logs} 
            telemetry={telemetry}
            anomalies={anomalies}
          />

          <TelemetryCharts history={history} />
        </section>
      </main>
    </div>
  );
}
