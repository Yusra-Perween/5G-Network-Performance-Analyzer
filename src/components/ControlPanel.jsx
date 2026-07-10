import React from 'react';
import { Sliders, Zap, ShieldAlert, WifiOff, Activity } from 'lucide-react';

export default function ControlPanel({ 
  mobilitySpeed, 
  setMobilitySpeed, 
  environment, 
  setEnvironment, 
  loadLevel, 
  setLoadLevel,
  anomalies,
  toggleAnomaly
}) {
  return (
    <div className="glass-card">
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div className="card-title">
          <Sliders size={18} />
          <span>Simulation Controller</span>
        </div>
      </div>

      <div className="control-section">
        {/* 1. Mobility Speed */}
        <div className="control-group">
          <label className="control-label">User Mobility Speed</label>
          <div className="btn-grid">
            <button 
              className={`btn-pill ${mobilitySpeed === 'stationary' ? 'active' : ''}`}
              onClick={() => setMobilitySpeed('stationary')}
            >
              Stationary
            </button>
            <button 
              className={`btn-pill ${mobilitySpeed === 'walking' ? 'active' : ''}`}
              onClick={() => setMobilitySpeed('walking')}
            >
              Walking (5km/h)
            </button>
            <button 
              className={`btn-pill ${mobilitySpeed === 'driving' ? 'active' : ''}`}
              onClick={() => setMobilitySpeed('driving')}
            >
              Driving (60km/h)
            </button>
            <button 
              className={`btn-pill ${mobilitySpeed === 'train' ? 'active' : ''}`}
              onClick={() => setMobilitySpeed('train')}
              style={{ gridColumn: 'span 3', marginTop: '0.25rem' }}
            >
              High-Speed Train (250 km/h)
            </button>
          </div>
        </div>

        {/* 2. RF Environment */}
        <div className="control-group">
          <label className="control-label">RF Propagation Environment</label>
          <div className="btn-grid">
            <button 
              className={`btn-pill ${environment === 'urban' ? 'active' : ''}`}
              onClick={() => setEnvironment('urban')}
            >
              Dense Urban
            </button>
            <button 
              className={`btn-pill ${environment === 'suburban' ? 'active' : ''}`}
              onClick={() => setEnvironment('suburban')}
            >
              Suburban
            </button>
            <button 
              className={`btn-pill ${environment === 'rural' ? 'active' : ''}`}
              onClick={() => setEnvironment('rural')}
            >
              Rural Open
            </button>
          </div>
        </div>

        {/* 3. Cell Traffic Load */}
        <div className="control-group">
          <label className="control-label">Cell Traffic Load</label>
          <div className="btn-grid">
            <button 
              className={`btn-pill ${loadLevel === 'low' ? 'active' : ''}`}
              onClick={() => setLoadLevel('low')}
            >
              Low (10-30%)
            </button>
            <button 
              className={`btn-pill ${loadLevel === 'medium' ? 'active' : ''}`}
              onClick={() => setLoadLevel('medium')}
            >
              Medium (50%)
            </button>
            <button 
              className={`btn-pill ${loadLevel === 'high' ? 'active' : ''}`}
              onClick={() => setLoadLevel('high')}
            >
              High (90%)
            </button>
          </div>
        </div>

        <hr style={{ border: '0', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '0.25rem 0' }} />

        {/* 4. Network Anomaly Injectors */}
        <div className="control-group">
          <label className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-danger)' }}>
            <Zap size={14} />
            <span>Inject Network Anomalies</span>
          </label>
          
          <div className="anomaly-grid">
            <button 
              className={`btn-anomaly ${anomalies.jamming ? 'active' : ''}`}
              onClick={() => toggleAnomaly('jamming')}
            >
              <ShieldAlert size={14} />
              RF Jamming (SINR)
            </button>
            
            <button 
              className={`btn-anomaly ${anomalies.handoverFailure ? 'active' : ''}`}
              onClick={() => toggleAnomaly('handoverFailure')}
            >
              <WifiOff size={14} />
              Handover Failure
            </button>
            
            <button 
              className={`btn-anomaly ${anomalies.congestion ? 'active' : ''}`}
              onClick={() => toggleAnomaly('congestion')}
            >
              <Activity size={14} />
              Congestion Spike
            </button>
            
            <button 
              className={`btn-anomaly ${anomalies.outage ? 'active' : ''}`}
              onClick={() => toggleAnomaly('outage')}
            >
              <WifiOff size={14} />
              Cell Outage (T1)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
