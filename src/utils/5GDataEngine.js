// 5G Network Simulation Physics and Telemetry Engine

export const GNODEB_LIST = [
  {
    id: 1,
    name: "gNodeB-Alpha (Cell 1)",
    x: 150,
    y: 150,
    freq: 3.5, // GHz (C-Band, n78)
    bandwidth: 100, // MHz
    txPower: 43, // dBm
    color: "#00E5FF", // Neon Cyan
  },
  {
    id: 2,
    name: "gNodeB-Beta (Cell 2)",
    x: 450,
    y: 150,
    freq: 3.5, // GHz (C-Band, n78)
    bandwidth: 100, // MHz
    txPower: 43, // dBm
    color: "#D700FF", // Neon Purple
  },
  {
    id: 3,
    name: "gNodeB-Gamma (Cell 3)",
    x: 150,
    y: 450,
    freq: 2.1, // GHz (Mid-Band, n1)
    bandwidth: 40, // MHz
    txPower: 40, // dBm
    color: "#00E676", // Neon Green
  },
  {
    id: 4,
    name: "gNodeB-Delta (Cell 4)",
    x: 450,
    y: 450,
    freq: 28.0, // GHz (mmWave, n258)
    bandwidth: 400, // MHz
    txPower: 35, // dBm (mmWave has lower Tx power, higher attenuation)
    color: "#FFEA00", // Neon Yellow
  }
];

export const ENVIRONMENTS = {
  urban: {
    name: "Dense Urban",
    pathLossExponent: 3.5,
    noiseFloor: -98, // dBm
    shadowingSigma: 4.0, // Standard deviation in dB
    interferenceFactor: 0.8,
  },
  suburban: {
    name: "Suburban",
    pathLossExponent: 3.0,
    noiseFloor: -100, // dBm
    shadowingSigma: 3.0,
    interferenceFactor: 0.5,
  },
  rural: {
    name: "Rural Open Space",
    pathLossExponent: 2.3,
    noiseFloor: -104, // dBm
    shadowingSigma: 2.0,
    interferenceFactor: 0.2,
  }
};

/**
 * Calculates Log-Distance Path Loss
 * PL = PL_0 + 10 * n * log10(d)
 */
function calculatePathLoss(distance, freqGHz, exponent) {
  // Reference path loss at 1m reference distance using Free Space Path Loss model
  // PL_0 = 20*log10(1m) + 20*log10(freq_hz) - 147.55
  // Simplifying for freq in GHz and distance in meters:
  const freqHz = freqGHz * 1e9;
  const PL_0 = 20 * Math.log10(1) + 20 * Math.log10(freqHz) - 147.55;
  
  // Safe distance limit (minimum 5 meters to prevent log10(0) or infinite gain)
  const d = Math.max(5, distance);
  
  const PL = PL_0 + 10 * exponent * Math.log10(d);
  return PL;
}

/**
 * Update the state of the UE (User Equipment) and simulate 5G RF telemetry.
 */
export function calculateTelemetry(ue, environmentKey, loadLevel, anomalies, time) {
  const env = ENVIRONMENTS[environmentKey];
  const gNodeBs = GNODEB_LIST;
  
  // 1. Calculate RF stats for all towers
  const towerStats = gNodeBs.map(gnb => {
    const dx = ue.x - gnb.x;
    const dy = ue.y - gnb.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Path loss
    const pathLoss = calculatePathLoss(distance, gnb.freq, env.pathLossExponent);
    
    // Log-Normal shadowing (adds variance over time)
    const seed = Math.sin(gnb.id * 1000 + time * 0.1); // Deterministic pseudo-random variation
    const shadowing = seed * env.shadowingSigma;
    
    // Reference Signal Received Power (RSRP)
    let rsrp = gnb.txPower - pathLoss + shadowing;
    
    // Account for anomaly: Base station outage
    if (anomalies.outage && anomalies.outageCellId === gnb.id) {
      rsrp = -150; // Out of service signal
    }
    
    return {
      ...gnb,
      distance,
      pathLoss,
      rsrp,
    };
  });

  // 2. Identify candidate serving cells and calculate SINR
  // Noise power in Watts
  const noisePowerWatts = Math.pow(10, env.noiseFloor / 10);
  
  // Map interference & SINR
  const calculatedTowerStats = towerStats.map(target => {
    // Interference is the sum of powers from all other cells (in linear scale)
    let interferencePowerWatts = 0;
    towerStats.forEach(other => {
      if (other.id !== target.id && other.rsrp > -140) {
        interferencePowerWatts += Math.pow(10, other.rsrp / 10);
      }
    });
    
    // Apply jammer/noise anomaly to SINR calculation if active
    let anomalyNoisePower = 0;
    if (anomalies.jamming) {
      anomalyNoisePower = Math.pow(10, -65 / 10); // Inject strong jamming signal (-65 dBm noise floor)
    }
    
    const targetPowerWatts = Math.pow(10, target.rsrp / 10);
    const totalNoiseInterferenceWatts = (interferencePowerWatts * env.interferenceFactor) + noisePowerWatts + anomalyNoisePower;
    
    // SINR = Signal / (Interference + Noise)
    const sinrLinear = targetPowerWatts / totalNoiseInterferenceWatts;
    const sinr = 10 * Math.log10(sinrLinear);
    
    // RSRQ (Reference Signal Received Quality)
    // RSRQ = N * RSRP / RSSI, standard values: -3dB (excellent) to -20dB (poor)
    // Approximated:
    const rsrq = Math.max(-20, Math.min(-3, -3 - (30 - Math.max(-10, Math.min(30, sinr))) / 3));

    return {
      ...target,
      sinr,
      rsrq,
    };
  });

  // Sort by RSRP to find the best signal
  const sortedBySignal = [...calculatedTowerStats].sort((a, b) => b.rsrp - a.rsrp);
  const strongestCell = sortedBySignal[0];
  
  // 3. Handover Decisions with Hysteresis
  let currentServingId = ue.servingCellId;
  let handoverTriggered = false;
  let handoverStatus = "IDLE"; // IDLE, SUCCESS, FAILED
  let handoverTargetId = null;

  if (!currentServingId) {
    // Initial connection
    currentServingId = strongestCell.rsrp > -115 ? strongestCell.id : null;
  } else {
    // Evaluate handover condition
    // Handover triggers if strongest neighbor is better than serving cell by more than 3.5 dB (Hysteresis margin)
    const servingStat = calculatedTowerStats.find(t => t.id === currentServingId);
    
    if (servingStat && strongestCell.id !== currentServingId && strongestCell.rsrp > servingStat.rsrp + 3.5) {
      handoverTargetId = strongestCell.id;
      
      if (anomalies.handoverFailure) {
        // Trigger Handover Failure
        handoverTriggered = true;
        handoverStatus = "FAILED";
        currentServingId = null; // Enter radio link failure / disconnect state
      } else {
        // Successful handover
        handoverTriggered = true;
        handoverStatus = "SUCCESS";
        currentServingId = strongestCell.id;
      }
    } else if (servingStat && servingStat.rsrp < -125) {
      // Radio Link Failure due to low coverage
      currentServingId = null;
      handoverStatus = "RLF"; // Radio Link Failure
    }
  }

  // 4. Calculate Networking Telemetry (Throughput, Latency, Congestion)
  let servingCell = currentServingId ? calculatedTowerStats.find(t => t.id === currentServingId) : null;
  
  let rsrp = -140;
  let sinr = -10;
  let rsrq = -20;
  let downlinkThroughput = 0;
  let uplinkThroughput = 0;
  let latency = 120; // Default disconnected high latency
  let jitter = 0;
  let resourceBlocksUsed = 0;

  if (servingCell) {
    rsrp = servingCell.rsrp;
    sinr = servingCell.sinr;
    rsrq = servingCell.rsrq;
    
    // Resource Block Utilization
    // Base cell load (0.1 to 0.95 depending on network load settings)
    const loadMultiplier = loadLevel === "low" ? 0.25 : loadLevel === "medium" ? 0.60 : 0.90;
    // User Equipment demands some RBs, load also fluctuates dynamically
    const cellCongestionNoise = Math.sin(time * 0.05) * 0.05;
    resourceBlocksUsed = Math.min(100, Math.max(5, Math.round((loadMultiplier + cellCongestionNoise) * 100)));
    
    // Flash Congestion anomaly overrides RB usage
    if (anomalies.congestion) {
      resourceBlocksUsed = 99; // 99% congestion
    }

    // Shannon capacity formula: Capacity = B * log2(1 + SINR_linear)
    const sinrLinear = Math.pow(10, Math.max(-10, sinr) / 10);
    const capacityPerMHz = Math.log2(1 + sinrLinear); // bits/s/Hz or Mbps/MHz
    
    // Total raw cell capacity in Mbps
    const rawCellCapacityMbps = servingCell.bandwidth * capacityPerMHz * 0.65; // 0.65 modulation/coding efficiency factor
    
    // UE share of bandwidth depends on cell load (higher RB usage means less share for this specific UE)
    // If RB usage is 90%, it means other users occupy the cell. Let's model user throughput:
    const ueShare = 1 / (1 + (resourceBlocksUsed / 100) * 12); // Simulated multiplexing of users
    
    downlinkThroughput = rawCellCapacityMbps * ueShare;
    
    // Uplink is typically 10-15% of downlink in asymmetric 5G TDD configurations
    uplinkThroughput = downlinkThroughput * 0.12 * (1 - (resourceBlocksUsed / 200)); 
    
    // Latency simulation (base latency + congestion delay + RF retransmission delay)
    // mmWave (28GHz) has shorter slot size (120kHz spacing) and lower latency than Sub-6GHz (30kHz/15kHz spacing)
    const baseLatency = servingCell.freq > 10 ? 2.5 : servingCell.freq > 3 ? 5.0 : 8.0;
    
    // Congestion queuing delay
    const queuingDelay = (resourceBlocksUsed / 100) * 35;
    
    // RF retransmissions delay (increases as SINR drops)
    const retransmissionDelay = sinr < 5 ? Math.pow(5 - sinr, 1.4) * 0.8 : 0;
    
    latency = baseLatency + queuingDelay + retransmissionDelay;
    
    // Add jitter
    const jitterFactor = sinr < 0 ? 8 : loadLevel === "high" ? 4 : 1.5;
    jitter = Math.max(0.2, (Math.sin(time * 0.4) + 1) * jitterFactor + Math.random() * 0.5);
    latency += Math.random() * 0.4; // tiny random micro jitter

    // Cap values to clean, realistic bounds
    if (downlinkThroughput < 0.1) downlinkThroughput = 0.1;
    if (uplinkThroughput < 0.05) uplinkThroughput = 0.05;
  } else {
    // Disconnected state
    resourceBlocksUsed = 0;
    latency = 999;
    jitter = 0;
  }

  return {
    servingCellId: currentServingId,
    servingCellName: servingCell ? servingCell.name : "SEARCHING FOR CELL (RLF)",
    rsrp: Math.round(rsrp * 10) / 10,
    sinr: Math.round(sinr * 10) / 10,
    rsrq: Math.round(rsrq * 10) / 10,
    downlinkThroughput: Math.round(downlinkThroughput * 100) / 100, // Mbps
    uplinkThroughput: Math.round(uplinkThroughput * 100) / 100, // Mbps
    latency: Math.round(latency * 10) / 10, // ms
    jitter: Math.round(jitter * 10) / 10, // ms
    resourceBlocksUsed, // %
    towerStats: calculatedTowerStats,
    handoverTriggered,
    handoverStatus,
    handoverTargetId,
  };
}
