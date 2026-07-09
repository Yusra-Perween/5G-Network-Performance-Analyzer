import React from 'react';
import { Radio, ShieldAlert } from 'lucide-react';

export default function MapViewer({ telemetry, ue, onTowerClick, anomalies }) {
  const towers = telemetry.towerStats || [];
  const servingId = telemetry.servingCellId;

  // Path history for the User Equipment (UE) trace
  const uePath = ue.pathHistory || [];

  return (
    <div className="glass-card" style={{ padding: '1rem' }}>
      <div className="card-header" style={{ marginBottom: '0.75rem' }}>
        <div className="card-title">
          <Radio size={18} />
          <span>Interactive 5G Topology Map</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Click tower to trigger Cell Outage
        </span>
      </div>

      <div className="map-container">
        <div className="map-grid-overlay" />
        <div className="map-radar-glow" />

        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 600 600" 
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Neon definitions */}
          <defs>
            <radialGradient id="ue-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="var(--color-primary)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </radialGradient>
            
            <linearGradient id="active-link-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* 1. UE Historical Trace Path */}
          {uePath.length > 1 && (
            <path
              d={`M ${uePath[0].x} ${uePath[0].y} ` + uePath.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")}
              fill="none"
              stroke="rgba(0, 229, 255, 0.15)"
              strokeWidth="2.5"
              strokeDasharray="4,4"
            />
          )}

          {/* 2. Connection Line between UE and Serving Cell */}
          {servingId && (
            (() => {
              const servingTower = towers.find(t => t.id === servingId);
              if (servingTower) {
                // Determine connection link color based on SINR/RSRP
                let linkColor = "var(--color-success)"; // Green
                let linkDash = "0";
                if (telemetry.sinr < 0 || telemetry.rsrp < -110) {
                  linkColor = "var(--color-danger)"; // Red
                  linkDash = "4,4";
                } else if (telemetry.sinr < 10 || telemetry.rsrp < -95) {
                  linkColor = "var(--color-warning)"; // Yellow
                  linkDash = "8,4";
                }
                
                return (
                  <g>
                    {/* Glowing outer link line */}
                    <line
                      x1={servingTower.x}
                      y1={servingTower.y}
                      x2={ue.x}
                      y2={ue.y}
                      stroke={linkColor}
                      strokeWidth="4"
                      opacity="0.35"
                      style={{ filter: 'blur(3px)' }}
                    />
                    {/* Core connection line */}
                    <line
                      x1={servingTower.x}
                      y1={servingTower.y}
                      x2={ue.x}
                      y2={ue.y}
                      stroke={linkColor}
                      strokeWidth="1.8"
                      strokeDasharray={linkDash}
                    />
                  </g>
                );
              }
              return null;
            })()
          )}

          {/* 3. Base Station Towers (gNodeBs) */}
          {towers.map(tower => {
            const isServing = tower.id === servingId;
            const isOutage = anomalies.outage && anomalies.outageCellId === tower.id;
            
            // Draw sector coverage beam wedges (3 sectors per tower)
            const sectorAngles = [30, 150, 270];
            const beamRadius = tower.freq > 10 ? 80 : tower.freq > 3 ? 160 : 220; // mmWave shorter beam reach
            
            return (
              <g key={tower.id} className="svg-gnb-tower" onClick={() => onTowerClick(tower.id)}>
                {/* Visual beam sectors */}
                {!isOutage && sectorAngles.map((angle, i) => {
                  const radStart = ((angle - 30) * Math.PI) / 180;
                  const radEnd = ((angle + 30) * Math.PI) / 180;
                  
                  const x1 = tower.x + beamRadius * Math.cos(radStart);
                  const y1 = tower.y + beamRadius * Math.sin(radStart);
                  const x2 = tower.x + beamRadius * Math.cos(radEnd);
                  const y2 = tower.y + beamRadius * Math.sin(radEnd);
                  
                  // Wedge path
                  const d = `M ${tower.x} ${tower.y} L ${x1} ${y1} A ${beamRadius} ${beamRadius} 0 0 1 ${x2} ${y2} Z`;
                  
                  return (
                    <path
                      key={i}
                      d={d}
                      className={`svg-gnb-beam ${isServing ? 'active' : ''}`}
                      fill={tower.color}
                      opacity={isServing ? 0.08 : 0.02}
                    />
                  );
                })}

                {/* Serving Tower Outer Radar Pulse */}
                {isServing && (
                  <circle
                    cx={tower.x}
                    cy={tower.y}
                    r="40"
                    fill="none"
                    stroke={tower.color}
                    strokeWidth="1"
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      values="15;60"
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0"
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Tower Base Shadow */}
                <ellipse
                  cx={tower.x}
                  cy={tower.y + 24}
                  rx="18"
                  ry="5"
                  fill="rgba(0,0,0,0.4)"
                />

                {/* Outage indicator */}
                {isOutage && (
                  <circle
                    cx={tower.x}
                    cy={tower.y}
                    r="30"
                    fill="rgba(255, 23, 68, 0.05)"
                    stroke="var(--color-danger)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                )}

                {/* Mast Tower structure */}
                <g stroke={isOutage ? 'var(--color-danger)' : isServing ? '#ffffff' : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" fill="none">
                  {/* Tower tripod structure */}
                  <line x1={tower.x} y1={tower.y - 15} x2={tower.x - 12} y2={tower.y + 24} />
                  <line x1={tower.x} y1={tower.y - 15} x2={tower.x + 12} y2={tower.y + 24} />
                  <line x1={tower.x - 6} y1={tower.y + 8} x2={tower.x + 6} y2={tower.y + 8} />
                  <line x1={tower.x - 10} y1={tower.y + 16} x2={tower.x + 10} y2={tower.y + 16} />
                  <line x1={tower.x - 4} y1={tower.y} x2={tower.x + 4} y2={tower.y} />
                  
                  {/* Antenna head */}
                  <rect 
                    x={tower.x - 4} 
                    y={tower.y - 22} 
                    width="8" 
                    height="12" 
                    rx="1.5"
                    fill={isOutage ? 'var(--color-danger)' : tower.color} 
                    stroke="none"
                  />
                  {/* Signal antenna rod */}
                  <line x1={tower.x} y1={tower.y - 22} x2={tower.x} y2={tower.y - 30} />
                </g>

                {/* Small indicator dot at top of tower */}
                <circle
                  cx={tower.x}
                  cy={tower.y - 30}
                  r="2.5"
                  fill={isOutage ? 'var(--color-danger)' : '#ffffff'}
                  style={isServing ? { filter: 'drop-shadow(0 0 3px #fff)' } : {}}
                />

                {/* Text Label for Tower */}
                <text
                  x={tower.x}
                  y={tower.y + 38}
                  fill={isOutage ? 'var(--color-danger)' : '#ffffff'}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  opacity={isOutage ? 0.7 : 0.9}
                >
                  {isOutage ? "OUTAGE" : tower.name.split(" ")[0]}
                </text>
                <text
                  x={tower.x}
                  y={tower.y + 48}
                  fill="var(--text-secondary)"
                  fontSize="8.5"
                  textAnchor="middle"
                  opacity="0.7"
                >
                  {tower.freq > 10 ? 'mmWave 28GHz' : `${tower.freq} GHz (n${tower.freq === 3.5 ? '78' : '1'})`}
                </text>
              </g>
            );
          })}

          {/* 4. User Equipment (UE / Client Mobile) */}
          <g>
            {/* Outer glowing halo */}
            <circle
              cx={ue.x}
              cy={ue.y}
              r="18"
              fill="url(#ue-glow)"
              pointerEvents="none"
            />

            {/* Live radar pulse ring around UE */}
            {servingId && (
              <circle
                cx={ue.x}
                cy={ue.y}
                r="10"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="1.2"
                className="ue-pulse-ring"
                pointerEvents="none"
              />
            )}

            {/* Core UE circle dot */}
            <circle
              cx={ue.x}
              cy={ue.y}
              r="6.5"
              fill="#ffffff"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 6px var(--color-primary))' }}
              pointerEvents="none"
            />
            
            {/* Label "User Device" */}
            <rect
              x={ue.x - 30}
              y={ue.y - 25}
              width="60"
              height="14"
              rx="4"
              fill="rgba(10, 14, 23, 0.85)"
              stroke="rgba(0, 229, 255, 0.2)"
              strokeWidth="0.8"
            />
            <text
              x={ue.x}
              y={ue.y - 15}
              fill="#ffffff"
              fontSize="7.5"
              fontWeight="700"
              textAnchor="middle"
            >
              UE (CLIENT)
            </text>
          </g>

          {/* 5. Radio Link Failure Anomaly overlay */}
          {!servingId && (
            <g transform={`translate(${ue.x - 20}, ${ue.y - 50})`}>
              <rect
                x="-10"
                y="-5"
                width="60"
                height="18"
                rx="4"
                fill="rgba(255, 23, 68, 0.95)"
                style={{ filter: 'drop-shadow(0 0 8px rgba(255, 23, 68, 0.4))' }}
              />
              <text
                x="20"
                y="7"
                fill="#ffffff"
                fontSize="8"
                fontWeight="700"
                textAnchor="middle"
              >
                RLF DOWNTIME
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Grid coordinates indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <span>UE Coord: ({Math.round(ue.x)}, {Math.round(ue.y)})</span>
        <span>Serving Cell: <strong style={{ color: servingId ? GNODEB_LIST.find(t=>t.id===servingId)?.color || 'inherit' : 'var(--color-danger)' }}>{telemetry.servingCellName}</strong></span>
      </div>
    </div>
  );
}
