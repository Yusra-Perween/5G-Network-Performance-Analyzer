import React from 'react';

// A lightweight, highly performant SVG-based real-time line chart component
function SVGLineChart({ data, minVal, maxVal, strokeColor, label, unit }) {
  const width = 500;
  const height = 110;
  const paddingLeft = 32;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 15;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Safeguard empty data
  const points = data && data.length > 0 ? data : [0];
  
  // Find local min and max if not strictly defined
  const actualMin = minVal !== undefined ? minVal : Math.min(...points);
  const actualMax = maxVal !== undefined ? maxVal : Math.max(...points);
  
  // Prevent division by zero
  const range = actualMax - actualMin === 0 ? 1 : actualMax - actualMin;

  // Convert data points to SVG coordinates
  const svgPoints = points.map((val, idx) => {
    const x = paddingLeft + (idx / Math.max(1, points.length - 1)) * chartWidth;
    // Invert Y axis: higher value is closer to the top (0)
    const y = paddingTop + chartHeight - ((val - actualMin) / range) * chartHeight;
    return { x, y, val };
  });

  // Create path string
  let pathD = "";
  let areaD = "";
  
  if (svgPoints.length > 0) {
    pathD = `M ${svgPoints[0].x} ${svgPoints[0].y} ` + svgPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
    
    // Closed path for the colored area under the curve
    areaD = `${pathD} L ${svgPoints[svgPoints.length - 1].x} ${paddingTop + chartHeight} L ${svgPoints[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Create horizontal grid lines (3 levels)
  const gridLevels = [0, 0.5, 1];
  const gridLines = gridLevels.map((lvl, index) => {
    const y = paddingTop + lvl * chartHeight;
    const val = actualMax - lvl * range;
    return {
      y,
      val: Math.round(val * 10) / 10
    };
  });

  return (
    <div className="chart-container">
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        <defs>
          {/* Neon Glow Filter */}
          <filter id={`glow-${strokeColor.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Under-curve Area Gradient */}
          <linearGradient id={`grad-${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line 
              x1={paddingLeft} 
              y1={line.y} 
              x2={width - paddingRight} 
              y2={line.y} 
              className="chart-grid-line" 
            />
            <text 
              x={paddingLeft - 6} 
              y={line.y + 3} 
              textAnchor="end" 
              className="chart-text"
            >
              {line.val}
            </text>
          </g>
        ))}

        {/* X and Y Axes */}
        <line 
          x1={paddingLeft} 
          y1={paddingTop} 
          x2={paddingLeft} 
          y2={paddingTop + chartHeight} 
          className="chart-axis-line" 
        />
        <line 
          x1={paddingLeft} 
          y1={paddingTop + chartHeight} 
          x2={width - paddingRight} 
          y2={paddingTop + chartHeight} 
          className="chart-axis-line" 
        />

        {/* Chart Path and Area */}
        {svgPoints.length > 1 && (
          <>
            <path 
              d={areaD} 
              fill={`url(#grad-${strokeColor.replace('#', '')})`} 
              className="chart-area"
            />
            <path 
              d={pathD} 
              stroke={strokeColor} 
              filter={`url(#glow-${strokeColor.replace('#', '')})`} 
              className="chart-path" 
            />
            {/* Pulsing cursor on the latest point */}
            <circle 
              cx={svgPoints[svgPoints.length - 1].x} 
              cy={svgPoints[svgPoints.length - 1].y} 
              r="4" 
              fill={strokeColor} 
              stroke="#fff" 
              strokeWidth="1.5" 
            />
          </>
        )}
      </svg>
    </div>
  );
}

export default function TelemetryCharts({ history }) {
  // Extract historical lists (maximum 30 points)
  const limit = 30;
  const cleanHistory = history.slice(-limit);
  
  const throughputData = cleanHistory.map(h => h.downlinkThroughput);
  const latencyData = cleanHistory.map(h => h.latency);
  const rsrpData = cleanHistory.map(h => h.rsrp);
  const rbData = cleanHistory.map(h => h.resourceBlocksUsed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-card">
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
          <div className="card-title">
            <span>Downlink Throughput</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: '600' }}>
            {throughputData[throughputData.length - 1] || 0} Mbps
          </span>
        </div>
        <SVGLineChart 
          data={throughputData} 
          minVal={0} 
          maxVal={Math.max(400, ...throughputData)} 
          strokeColor="var(--color-primary)" 
        />
      </div>

      <div className="glass-card">
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
          <div className="card-title">
            <span>Latency</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: '600' }}>
            {latencyData[latencyData.length - 1] || 0} ms
          </span>
        </div>
        <SVGLineChart 
          data={latencyData} 
          minVal={0} 
          maxVal={Math.max(60, ...latencyData)} 
          strokeColor="var(--color-secondary)" 
        />
      </div>

      <div className="glass-card">
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
          <div className="card-title">
            <span>Signal Strength (RSRP)</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: '600' }}>
            {rsrpData[rsrpData.length - 1] || 0} dBm
          </span>
        </div>
        <SVGLineChart 
          data={rsrpData} 
          minVal={-135} 
          maxVal={-45} 
          strokeColor="var(--color-success)" 
        />
      </div>

      <div className="glass-card">
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
          <div className="card-title">
            <span>Resource Block (RB) Usage</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: '600' }}>
            {rbData[rbData.length - 1] || 0}%
          </span>
        </div>
        <SVGLineChart 
          data={rbData} 
          minVal={0} 
          maxVal={100} 
          strokeColor="var(--color-warning)" 
        />
      </div>
    </div>
  );
}
