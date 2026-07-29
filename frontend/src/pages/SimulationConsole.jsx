import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Lock, Send, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SimulationConsole() {
  const [missionId, setMissionId] = useState('1');
  const missionIdRef = useRef('1');
  const [isStreaming, setIsStreaming] = useState(false);
  const [simulationInterval, setSimulationInterval] = useState(null);
  const [bufferCount, setBufferCount] = useState(0);
  const [bufferStatus, setBufferStatus] = useState('online');
  const [recentTelemetry, setRecentTelemetry] = useState([]);
  const [flushReport, setFlushReport] = useState(null);
  
  // To populate the mission dropdown
  const [missions, setMissions] = useState([]);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch available missions on load
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const res = await axios.get(`${API_URL}/missions?limit=100`);
        setMissions(res.data.missions);
        if (res.data.missions.length > 0) {
          setMissionId(res.data.missions[0].id.toString());
        }
      } catch (err) {
        console.error("Failed to load missions", err);
      }
    };
    fetchMissions();
  }, []);


  // Fetch recent persisted telemetry anomalies
  const fetchRecentTelemetry = useCallback(async () => {
    if (!missionId) return;
    try {
      const res = await axios.get(`${API_URL}/missions/${missionId}/telemetry?limit=10&anomaly_only=true`);
      setRecentTelemetry(res.data.telemetry);
    } catch (err) {
      console.error(err);
    }
  }, [missionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecentTelemetry();
  }, [fetchRecentTelemetry]);

  // Sync ref when state changes so the setInterval closure always has the latest ID
  useEffect(() => {
    missionIdRef.current = missionId;
  }, [missionId]);

  // WebSocket Connection
  useEffect(() => {
    const wsUrl = API_URL.replace('http', 'ws') + '/ws/telemetry';
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.flushed) {
         setFlushReport(data);
         setBufferCount(0); // Reset visual buffer when worker flushes
         fetchRecentTelemetry();
      }
    };

    ws.onopen = () => setBufferStatus('online');
    ws.onclose = () => setBufferStatus('offline');

    return () => ws.close();
  }, [fetchRecentTelemetry]);


  // Realistic telemetry generator
  const generateRealisticTelemetry = (missionId, count) => {
    const parameters = ['altitude_km', 'velocity_kms', 'hull_temp_c', 'oxygen_levels', 'fuel_pressure'];
    const batches = [];
    
    for (let i = 0; i < count; i++) {
      const param = parameters[Math.floor(Math.random() * parameters.length)];
      let val = 0;
      let status = 'Nominal';
      
      switch (param) {
        case 'altitude_km':
          val = 400 + (Math.random() * 50 - 25);
          if (val < 380) status = 'Warning';
          if (val < 350) status = 'Critical';
          break;
        case 'velocity_kms':
          val = 7.66 + (Math.random() * 0.2 - 0.1);
          if (val > 7.8 || val < 7.5) status = 'Warning';
          break;
        case 'hull_temp_c':
          val = 120 + (Math.random() * 80 - 40);
          if (val > 180) status = 'Warning';
          if (val > 220) status = 'Critical';
          break;
        case 'oxygen_levels':
          val = 98 + (Math.random() * 4 - 2);
          if (val < 94) status = 'Warning';
          if (val < 90) status = 'Critical';
          break;
        case 'fuel_pressure':
          val = 101.3 + (Math.random() * 10 - 5);
          if (val < 90 || val > 110) status = 'Critical';
          break;
      }

      batches.push({
        mission_id: Number(missionId),
        parameter_name: param,
        parameter_value: Number(val.toFixed(2)),
        status_level: status
      });
    }
    return batches;
  };

  const toggleSimulation = (event) => {
    event.preventDefault();
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
      setIsStreaming(false);
      toast.success("Simulation Stopped.");
    } else {
      setIsStreaming(true);
      toast.success("Simulation Started! Pumping 50 records/sec...");
      const id = setInterval(async () => {
        // Fire 5 payloads every 100ms = 50 records/sec using the ref to avoid stale closures
        const payloads = generateRealisticTelemetry(missionIdRef.current, 5);
        
        const results = await Promise.all(payloads.map(payload => 
          fetch(`${API_URL}/telemetry/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(payload)
          }).then(res => {
            if (res.status === 401) {
              localStorage.removeItem('token');
              window.location.href = '/login';
              return false;
            }
            return res.ok;
          }).catch(() => false)
        ));
        
        const successCount = results.filter(Boolean).length;
        if (successCount > 0) {
          setBufferCount(prev => prev + successCount);
        }
      }, 100);
      setSimulationInterval(id);
    }
  };

  useEffect(() => {
    return () => {
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [simulationInterval]);

  return (
    <div className="w-full h-full bg-black p-6 md:p-12 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-widest text-zinc-100 mb-2">
            SIMULATION CONSOLE
          </h1>
          <p className="text-zinc-500 font-mono text-sm">
            Architecture demonstration: High-frequency telemetry ingestion handled by Redis, processed by a background worker, and broadcasted via WebSockets.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* GENERATOR */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <form onSubmit={toggleSimulation} className="panel-glass p-6 space-y-5 flex-1">
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                <Activity className="w-5 h-5 text-zinc-100" />
                <h2 className="text-sm font-bold tracking-widest text-zinc-100 font-mono">
                  1. GENERATOR
                </h2>
              </div>

              <label className="block">
                <span className="block text-xs font-mono text-zinc-500 mb-2">ACTIVE MISSION</span>
                <select
                  value={missionId}
                  onChange={(event) => setMissionId(event.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-zinc-500 appearance-none"
                  required
                >
                  {missions.map(m => (
                    <option key={m.id} value={m.id}>[ID:{m.id}] {m.name}</option>
                  ))}
                </select>
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 font-bold font-mono text-xs rounded tracking-widest transition-colors ${
                    isStreaming 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'bg-zinc-100 hover:bg-white text-black'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {isStreaming ? 'STOP SIMULATION' : 'START AUTO-FIRE (50/sec)'}
                </button>
                
                {isStreaming && (
                  <div className="mt-4 flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded">
                    <span className="text-[10px] text-red-400 font-mono tracking-widest">LIVE THROUGHPUT</span>
                    <span className="text-sm font-bold text-red-500 font-mono animate-pulse">50 REQ/SEC</span>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* REDIS BUFFER & HEALTH SUMMARY */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="panel-glass p-6 flex-1 flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-sm font-bold tracking-widest text-zinc-100 font-mono">
                    2. MISSION HEALTH
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">BUFFER</span>
                  <div className={`w-2 h-2 rounded-full ${bufferStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center py-2">
                <span className="text-6xl font-bold font-mono text-zinc-100 mb-2">{bufferCount}</span>
                <span className="text-xs font-mono tracking-widest text-zinc-500">RECORDS IN MEMORY BUFFER</span>
              </div>

              {flushReport && (
                <div className="flex flex-col gap-3 mb-2 pt-4 border-t border-zinc-800/50">
                  <div className="flex justify-between items-end pb-2">
                    <span className="text-xs text-zinc-500 font-mono">LAST BATCH FLUSHED</span>
                    <span className={`text-sm font-bold font-mono ${flushReport.critical > 0 ? 'text-red-500' : flushReport.warning > 0 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                      {flushReport.critical > 0 ? 'CRITICAL' : flushReport.warning > 0 ? 'WARNING' : 'NOMINAL'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <div className="text-[10px] text-zinc-500 font-mono">COUNT</div>
                      <div className="text-sm font-bold text-zinc-100 font-mono">{flushReport.flushed}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 font-mono">NOM</div>
                      <div className="text-sm font-bold text-emerald-500 font-mono">{flushReport.nominal}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 font-mono">WARN</div>
                      <div className="text-sm font-bold text-yellow-500 font-mono">{flushReport.warning}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 font-mono">CRIT</div>
                      <div className="text-sm font-bold text-red-500 font-mono">{flushReport.critical}</div>
                    </div>
                  </div>
                  
                  {flushReport.primary_risk !== 'None' && (
                    <div className="mt-1 bg-red-500/10 border border-red-500/20 p-2 rounded">
                      <span className="text-[10px] text-red-400 font-mono block">PRIMARY RISK (MAP-REDUCE)</span>
                      <span className="text-xs font-bold text-red-500 font-mono">{flushReport.primary_risk}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-zinc-800 mt-auto text-center">
                <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                  Automatic Background Worker Active • WebSockets Connected
                </p>
              </div>
            </div>
          </div>

          {/* ANOMALY TIMELINE */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="panel-glass p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  <h2 className="text-sm font-bold tracking-widest text-zinc-100 font-mono">
                    3. ANOMALY TIMELINE
                  </h2>
                </div>
                <button onClick={fetchRecentTelemetry} className="text-zinc-500 hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] font-mono text-zinc-500 mb-4 tracking-wider">LATEST 10 DETECTED ANOMALIES</p>
              
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                {recentTelemetry.length === 0 ? (
                  <div className="text-xs font-mono text-zinc-600 text-center py-8">NO ANOMALIES DETECTED</div>
                ) : (
                  recentTelemetry.map((log) => (
                    <div key={log.id} className={`bg-zinc-950 border p-3 rounded flex justify-between items-center ${log.status_level === 'Critical' ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-yellow-500/50'}`}>
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs font-mono font-bold ${log.status_level === 'Critical' ? 'text-red-400' : 'text-yellow-400'}`}>{log.parameter_name}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-zinc-100">{log.parameter_value}</span>
                        {log.status_level === 'Warning' && <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Warning"></span>}
                        {log.status_level === 'Critical' && <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" title="Critical" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-zinc-800 text-[10px] text-zinc-600 font-mono flex items-center gap-2">
                <Lock className="w-3 h-3" /> PERSISTED POSTGRES DATA
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
