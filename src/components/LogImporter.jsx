import React from 'react';
import { Download, Upload, RefreshCw } from 'lucide-react';

export default function LogImporter({ history, onImportLogs, onResetLogs }) {
  
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
            // Schema order: Timestamp, ServingCell, RSRP_dBm, SINR_dB, RSRQ_dB, DL_Throughput_Mbps, UL_Throughput_Mbps, Latency_ms, Jitter_ms, RB_Usage_Percent
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

  return (
    <div className="glass-card">
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div className="card-title">
          <Download size={18} />
          <span>Data Logging Hub</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Export active simulation telemetry, or import raw historical logs (.csv or .json) to replay network metrics in charts.
        </div>

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

        <div className="file-actions" style={{ marginTop: '0.25rem' }}>
          <div className="file-input-wrapper">
            <button className="btn-action" style={{ width: '100%' }}>
              <Upload size={14} />
              Import CSV/JSON
            </button>
            <input type="file" accept=".csv,.json" onChange={handleFileUpload} />
          </div>

          <button className="btn-action" onClick={onResetLogs} title="Reset Session and Resume Live Simulation">
            <RefreshCw size={14} />
            Reset Live
          </button>
        </div>
      </div>
    </div>
  );
}
