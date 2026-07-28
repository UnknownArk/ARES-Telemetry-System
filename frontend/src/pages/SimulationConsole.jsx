import { useState, useEffect, useCallback } from 'react';
import { Activity, DatabaseZap, Lock, Send, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SimulationConsole() {
  const [missionId, setMissionId] = useState('1');
  const [streamCount, setStreamCount] = useState(50);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [bufferCount, setBufferCount] = useState(0);
  const [bufferStatus, setBufferStatus] = useState('offline');
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

  // Poll Redis Buffer Status
  const checkBufferStatus = useCallback(async () => {
    const headers = authHeaders();
    if (!headers.Authorization) {
      setBufferStatus('offline');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/telemetry/buffer/status`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setBufferCount(data.count);
        setBufferStatus(data.status);
      } else {
        setBufferStatus('offline');
      }
    } catch {
      setBufferStatus('offline');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkBufferStatus();
    const interval = setInterval(checkBufferStatus, 2000);
    return () => clearInterval(interval);
  }, [checkBufferStatus]);

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

  const streamTelemetry = async (event) => {
    event.preventDefault();
    setIsStreaming(true);
    setFlushReport(null);
    
    const count = Number(streamCount) || 50;
    const batch = generateRealisticTelemetry(missionId, count);
    let successCount = 0;

    try {
      // Process in chunks of 50 to avoid network stalling with high batch counts
      const CHUNK_SIZE = 50;
      for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
        const chunk = batch.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (payload) => {
          const response = await fetch(`${API_URL}/telemetry/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders(),
            },
            body: JSON.stringify(payload),
          });
          if (response.ok) {
            successCount++;
          } else if (response.status === 401) {
            throw new Error("Session expired. Please log in again.");
          }
        }));
      }
      
      toast.success(`Buffered ${successCount} telemetry packets in Redis`);
      checkBufferStatus();
    } catch (err) {
      toast.error(err.message || "Stream failed. Check authentication.");
      if (err.message === "Session expired. Please log in again.") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const flushTelemetry = async () => {
    setIsFlushing(true);

    try {
      const response = await fetch(`${API_URL}/telemetry/flush`, {
        method: 'POST',
        headers: authHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) throw new Error("Session expired. Please log in again.");
        throw new Error(data.detail || 'Telemetry flush failed.');
      }

      if (data.flushed !== undefined) {
        setFlushReport(data);
      } else {
        setFlushReport(null);
      }
      toast.success(data.message);
      checkBufferStatus();
      fetchRecentTelemetry();
    } catch (error) {
      toast.error(error.message);
      if (error.message === "Session expired. Please log in again.") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } finally {
      setIsFlushing(false);
    }
  };

  return (
    <div className="w-full h-full bg-black p-6 md:p-12 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-widest text-zinc-100 mb-2">
            SIMULATION CONSOLE
          </h1>
          <p className="text-zinc-500 font-mono text-sm">
            Architecture demonstration: High-frequency data generation -&gt; Redis Buffer -&gt; Batch Flush -&gt; Postgres Database.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* GENERATOR */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <form onSubmit={streamTelemetry} className="panel-glass p-6 space-y-5 flex-1">
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

              <label className="block">
                <span className="block text-xs font-mono text-zinc-500 mb-2">BATCH COUNT</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={streamCount}
                  onChange={(event) => setStreamCount(event.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-zinc-500"
                  required
                />
                <p className="text-[10px] font-mono text-zinc-600 mt-1">Number of records to generate and queue.</p>
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isStreaming}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 text-black font-bold font-mono text-xs rounded tracking-widest transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isStreaming ? 'PUMPING DATA...' : 'STREAM TO REDIS'}
                </button>
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

              {flushReport ? (
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex justify-between items-end border-b border-zinc-800/50 pb-2">
                    <span className="text-xs text-zinc-500 font-mono">STATUS</span>
                    <span className={`text-lg font-bold font-mono ${flushReport.critical > 0 ? 'text-red-500' : flushReport.warning > 0 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                      {flushReport.critical > 0 ? 'CRITICAL' : flushReport.warning > 0 ? 'WARNING' : 'NOMINAL'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-zinc-500 font-mono">FLUSHED</div>
                      <div className="text-xl font-bold text-zinc-100 font-mono">{flushReport.flushed}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 font-mono">NOMINAL</div>
                      <div className="text-xl font-bold text-emerald-500 font-mono">{flushReport.nominal}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 font-mono">WARNING</div>
                      <div className="text-xl font-bold text-yellow-500 font-mono">{flushReport.warning}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 font-mono">CRITICAL</div>
                      <div className="text-xl font-bold text-red-500 font-mono">{flushReport.critical}</div>
                    </div>
                  </div>
                  
                  {flushReport.primary_risk !== 'None' && (
                    <div className="mt-2 bg-red-500/10 border border-red-500/20 p-2 rounded">
                      <span className="text-[10px] text-red-400 font-mono block">PRIMARY RISK DETECTED</span>
                      <span className="text-sm font-bold text-red-500 font-mono">{flushReport.primary_risk}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <span className="text-6xl font-bold font-mono text-zinc-100 mb-2">{bufferCount}</span>
                  <span className="text-xs font-mono tracking-widest text-zinc-500">RECORDS BUFFERED</span>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-800 mt-auto">
                <button
                  type="button"
                  onClick={flushTelemetry}
                  disabled={isFlushing || bufferCount === 0}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-950 text-zinc-200 font-bold font-mono text-xs rounded tracking-widest border border-zinc-800 transition-colors"
                >
                  <DatabaseZap className="w-4 h-4 text-emerald-500" />
                  {isFlushing ? 'EXECUTING BULK INSERT...' : 'FLUSH TO POSTGRES'}
                </button>
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
