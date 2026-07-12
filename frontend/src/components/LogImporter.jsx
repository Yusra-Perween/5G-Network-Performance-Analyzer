import React, { useState } from 'react';
import { Download, Upload, RefreshCw, Database, Trash2, FolderOpen, X } from 'lucide-react';

const API_BASE = "http://localhost:8080/api/sessions";

export default function LogImporter({ history, environment, loadLevel, onImportLogs, onResetLogs }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dbSessions, setDbSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Export telemetry history as CSV
  const handleExportCSV = () => {
    if (history.length === 0) return;

    const headers = [
      "Timestamp", "ServingCell", "RSRP_dBm", "SINR_dB", "RSRQ_dB", 
      "DL_Throughput_Mbps", "UL_Throughput_Mbps", "Latency_ms", "Jitter_ms", "RB_Usage_Percent"
    ];

    const rows = history.map((h, i) => [
      i + 1,
      `"${h.servingCellName}"`,
      h.rsrp,
      h.sinr,
      h.rsrq,
      h.downlinkThroughput,
      h.uplinkThroughput,
      h.latency,
      h.jitter,
      h.resourceBlocksUsed
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `5G_Network_Log_${new Date().toISOString().slice(0,19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export telemetry history as JSON
  const handleExportJSON = () => {
    if (history.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(history, null, 2)
    )}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", `5G_Network_Log_${new Date().toISOString().slice(0,19)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse and import CSV/JSON files
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    if (file.name.endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            onImportLogs(parsed);
          } else {
            alert("Invalid JSON format. Expected an array of telemetry ticks.");
          }
        } catch (err) {
          alert("Error parsing JSON file: " + err.message);
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n').filter(l => l.trim() !== '');
          if (lines.length < 2) {
            alert("CSV is too short or invalid.");
            return;
          }
          
          // Map CSV lines back into telemetry objects
          const parsedData = lines.slice(1).map((line, idx) => {
            const cols = line.split(',');
            return {
              servingCellName: cols[1] ? cols[1].replace(/"/g, '') : "Imported Cell",
              rsrp: parseFloat(cols[2]) || -100,
              sinr: parseFloat(cols[3]) || 10,
              rsrq: parseFloat(cols[4]) || -10,
              downlinkThroughput: parseFloat(cols[5]) || 0,
              uplinkThroughput: parseFloat(cols[6]) || 0,
              latency: parseFloat(cols[7]) || 10,
              jitter: parseFloat(cols[8]) || 1.5,
              resourceBlocksUsed: parseInt(cols[9]) || 50,
            };
          });

          onImportLogs(parsedData);
        } catch (err) {
          alert("Error parsing CSV file: " + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      alert("Unsupported file type. Please upload a .csv or .json file.");
    }
  };

  // --- SQLite API HTTP Integrations ---

  // Save session to SQLite
  const handleSaveToDB = async () => {
    if (history.length === 0) {
      alert("No telemetry data to save. Please run the simulation first.");
      return;
    }

    const sessionName = prompt("Enter a name for this network monitoring session:", `Session ${new Date().toLocaleTimeString()}`);
    if (!sessionName || !sessionName.trim()) return;

    setLoading(true);
    try {
      const payload = {
        name: sessionName.trim(),
        environment,
        loadLevel,
        records: history
      };

      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      alert(`Session '${sessionName}' successfully saved to SQLite database.`);
    } catch (err) {
      console.error("Failed to save session to DB: ", err);
      alert("Database error: Failed to save session. Ensure the Java backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all sessions from DB and open modal
  const handleLoadFromDBList = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error("HTTP error " + response.status);
      
      const data = await response.json();
      setDbSessions(data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to load sessions from DB: ", err);
      alert("Database error: Could not fetch sessions list. Ensure the Java backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific session details and load into parent replay
  const handleSelectSession = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}?id=${id}`);
      if (!response.ok) throw new Error("HTTP error " + response.status);
      
      const data = await response.json();
      if (data && data.records) {
        onImportLogs(data.records);
        setIsModalOpen(false);
      } else {
        alert("Empty or invalid session record returned.");
      }
    } catch (err) {
      console.error("Failed to load session details: ", err);
      alert("Database error: Failed to load session details.");
    } finally {
      setLoading(false);
    }
  };

  // Delete session from DB
  const handleDeleteSession = async (e, id, name) => {
    e.stopPropagation(); // Prevent trigger row click
    if (!confirm(`Are you sure you want to delete session '${name}' from the database?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}?id=${id}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("HTTP error " + response.status);
      
      // Refresh list
      setDbSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to delete session: ", err);
      alert("Database error: Could not delete session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div className="card-title">
          <Database size={18} />
          <span>Data Logging & Database Hub</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Manage network analytics using local file logs or save/retrieve data from the integrated **Java/SQLite** database.
        </div>

        {/* File Export Controls */}
        <div className="file-actions">
          <button className="btn-action" onClick={handleExportCSV} disabled={history.length === 0}>
            <Download size={14} />
            Export CSV
          </button>
          
          <button className="btn-action" onClick={handleExportJSON} disabled={history.length === 0}>
            <Download size={14} />
            Export JSON
          </button>
        </div>

        {/* Database Integration Controls */}
        <div className="file-actions" style={{ marginTop: '0.1rem' }}>
          <button className="btn-action" onClick={handleSaveToDB} disabled={history.length === 0 || loading} style={{ borderColor: 'var(--border-active)', color: 'var(--color-primary)' }}>
            <Database size={14} />
            Save to DB
          </button>
          
          <button className="btn-action" onClick={handleLoadFromDBList} disabled={loading} style={{ borderColor: 'var(--border-active)', color: 'var(--color-primary)' }}>
            <FolderOpen size={14} />
            Load from DB
          </button>
        </div>

        {/* File Import and Reset Controls */}
        <div className="file-actions" style={{ marginTop: '0.1rem' }}>
          <div className="file-input-wrapper">
            <button className="btn-action" style={{ width: '100%' }}>
              <Upload size={14} />
              Import File
            </button>
            <input type="file" accept=".csv,.json" onChange={handleFileUpload} />
          </div>

          <button className="btn-action" onClick={onResetLogs} title="Reset Session and Resume Live Simulation">
            <RefreshCw size={14} />
            Reset Live
          </button>
        </div>
      </div>

      {/* --- DB Sessions Modal overlay --- */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div className="glass-card" style={styles.modalContent}>
            <div className="card-header" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
              <div className="card-title">
                <Database size={18} />
                <span>Saved Database Sessions</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.sessionList}>
              {dbSessions.length === 0 ? (
                <div style={styles.noData}>No sessions found in the database.</div>
              ) : (
                dbSessions.map(session => (
                  <div key={session.id} onClick={() => handleSelectSession(session.id)} style={styles.sessionRow}>
                    <div style={styles.sessionInfo}>
                      <div style={styles.sessionName}>{session.name}</div>
                      <div style={styles.sessionMeta}>
                        Date: {session.createdAt} | Env: <span style={{ textTransform: 'capitalize' }}>{session.environment}</span> | Load: <span style={{ textTransform: 'capitalize' }}>{session.loadLevel}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteSession(e, session.id, session.name)} 
                      style={styles.deleteBtn}
                      title="Delete Session"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline styles for modal
const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 12, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modalContent: {
    width: '90%',
    maxWidth: '550px',
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid var(--border-active)',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 0 25px rgba(0, 229, 255, 0.15)'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer'
  },
  sessionList: {
    maxHeight: '300px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem'
  },
  sessionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  sessionRowHover: {
    background: 'rgba(0, 229, 255, 0.03)',
    borderColor: 'var(--color-primary)'
  },
  sessionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem'
  },
  sessionName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#fff'
  },
  sessionMeta: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)'
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '4px',
    transition: 'color 0.2s ease'
  },
  noData: {
    textAlign: 'center',
    padding: '2rem 0',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem'
  }
};
