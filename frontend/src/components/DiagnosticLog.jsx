import React, { useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

export default function DiagnosticLog({ logs, telemetry, anomalies }) {
  const terminalEndRef = useRef(null);

  // Auto scroll terminal to the bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Generate real-time actionable structural recommendations based on current telemetry state
  const getRecommendations = () => {
    const recs = [];

    if (!telemetry.servingCellId) {
      recs.push({
        id: "rlf",
        title: "Radio Link Failure (RLF)",
        desc: "UE is disconnected. Verify base station statuses, backhaul integrity, or increase tower density in the area.",
        severity: "danger"
      });
      return recs;
    }

    if (telemetry.rsrp < -110) {
      recs.push({
        id: "rsrp-poor",
        title: "Weak Signal Coverage (RSRP)",
        desc: "RSRP is extremely low. Suggest adjusting antenna downtilt, boosting transmit power, or introducing a mid-band microcell to cover shadow zones.",
        severity: "danger"
      });
    }

    if (telemetry.sinr < 3) {
      recs.push({
        id: "sinr-poor",
        title: "Severe Signal Interference (SINR)",
        desc: "SINR is critical. Suggest optimizing MIMO beamforming angles, deploying guard bands, or rescheduling cell frequency reuse schemes.",
        severity: "danger"
      });
    } else if (telemetry.sinr < 10) {
      recs.push({
        id: "sinr-warn",
        title: "Co-Channel Interference (SINR)",
        desc: "SINR is moderate. Coordinate neighbor cell transmission schedules (ICIC) to decrease interference overlaps.",
        severity: "warning"
      });
    }

    if (telemetry.resourceBlocksUsed > 90) {
      recs.push({
        id: "congestion",
        title: "Cell Congestion (Resource Blocks)",
        desc: "Cell resources are saturated. Suggest triggering Carrier Aggregation, executing traffic load-balancing, or offloading to sub-6GHz bands.",
        severity: "warning"
      });
    }

    if (anomalies.handoverFailure) {
      recs.push({
        id: "handover-fail-rec",
        title: "Handover Parameter Optimizations",
        desc: "Handover failures are active. Adjust handover hysteresis margins (currently 3.5dB) or lower the Time-to-Trigger (TTT) buffer.",
        severity: "warning"
      });
    }

    // Default recommendation if everything is running optimally
    if (recs.length === 0) {
      recs.push({
        id: "optimal",
        title: "Network Optimized",
        desc: "All RF parameters (RSRP, SINR, Latency, and Throughput) meet or exceed the standard 5G 3GPP release requirements.",
        severity: "success"
      });
    }

    return recs;
  };

  const recommendations = getRecommendations();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      {/* 1. Terminal Console Logs */}
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '320px' }}>
        <div className="card-header" style={{ marginBottom: '0.75rem' }}>
          <div className="card-title">
            <Terminal size={18} />
            <span>NOC Terminal Alert Feed</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Live
          </span>
        </div>

        <div className="log-terminal" style={{ flex: 1 }}>
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-time">{log.time}</span>
              <span className={`log-tag ${log.level}`}>
                {log.level}
              </span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* 2. Automated Diagnostic Insights */}
      <div className="glass-card">
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
          <div className="card-title">
            <Sparkles size={18} style={{ color: 'var(--color-warning)' }} />
            <span>Automated 5G Optimizations</span>
          </div>
        </div>

        <div className="recommendation-list">
          {recommendations.map(rec => {
            let itemClass = "rec-item";
            let iconColor = "var(--color-success)";
            if (rec.severity === "danger") {
              itemClass += " danger";
              iconColor = "var(--color-danger)";
            } else if (rec.severity === "warning") {
              itemClass += " warning";
              iconColor = "var(--color-warning)";
            }

            return (
              <div key={rec.id} className={itemClass}>
                <ShieldAlert size={18} className="rec-icon" style={{ color: iconColor }} />
                <div>
                  <div className="rec-title">{rec.title}</div>
                  <div className="rec-desc">{rec.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
