import React from 'react';

export default function MetricCard({ label, value, unit, icon: Icon, trend, trendClass, alertState }) {
  let cardClass = "metric-card";
  if (alertState === "danger") {
    cardClass += " border-danger-active";
  } else if (alertState === "warning") {
    cardClass += " border-warning-active";
  }

  // Define border animations for warning/critical levels
  const customStyle = {};
  if (alertState === "danger") {
    customStyle.border = "1px solid rgba(255, 23, 68, 0.4)";
    customStyle.boxShadow = "0 0 10px rgba(255, 23, 68, 0.15)";
  } else if (alertState === "warning") {
    customStyle.border = "1px solid rgba(255, 234, 0, 0.4)";
    customStyle.boxShadow = "0 0 10px rgba(255, 234, 0, 0.15)";
  }

  return (
    <div className={cardClass} style={customStyle}>
      <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        {Icon && <Icon size={16} style={{ 
          color: alertState === "danger" ? "var(--color-danger)" : 
                 alertState === "warning" ? "var(--color-warning)" : 
                 "var(--text-muted)" 
        }} />}
      </div>
      <div className="metric-val-wrapper">
        <span className="metric-value">{value}</span>
        <span className="metric-unit">{unit}</span>
      </div>
      {trend && (
        <span className={`metric-trend ${trendClass || ''}`}>
          {trend}
        </span>
      )}
    </div>
  );
}
