import { useState } from 'react';
import { Activity, DatabaseZap, Lock, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SimulationConsole() {
  const [missionId, setMissionId] = useState('1');
  const [parameterName, setParameterName] = useState('signal_strength');
  const [parameterValue, setParameterValue] = useState('98.7');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const streamTelemetry = async (event) => {
    event.preventDefault();
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_URL}/telemetry/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          mission_id: Number(missionId),
          parameter_name: parameterName,
          parameter_value: Number(parameterValue),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Telemetry stream failed.');

      setLastResult(data);
      toast.success('Telemetry buffered in Redis');
    } catch (error) {
      toast.error(error.message);
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
      if (!response.ok) throw new Error(data.detail || 'Telemetry flush failed.');

      setLastResult(data);
      toast.success(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsFlushing(false);
    }
  };

  return (
    <div className="w-full h-full bg-black p-6 md:p-12 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-widest text-white mb-2 text-glow">
            TELEMETRY CONSOLE
          </h1>
          <p className="text-zinc-500 font-mono text-sm">
            Stream sample readings into Redis, then flush the buffer into Postgres.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <form onSubmit={streamTelemetry} className="panel-glass p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <Activity className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-bold tracking-widest text-purple-400 font-mono">
                STREAM PAYLOAD
              </h2>
            </div>

            <label className="block">
              <span className="block text-xs font-mono text-zinc-500 mb-2">MISSION ID</span>
              <input
                type="number"
                min="1"
                value={missionId}
                onChange={(event) => setMissionId(event.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                required
              />
            </label>

            <label className="block">
              <span className="block text-xs font-mono text-zinc-500 mb-2">PARAMETER</span>
              <input
                type="text"
                value={parameterName}
                onChange={(event) => setParameterName(event.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                required
              />
            </label>

            <label className="block">
              <span className="block text-xs font-mono text-zinc-500 mb-2">VALUE</span>
              <input
                type="number"
                step="0.01"
                value={parameterValue}
                onChange={(event) => setParameterValue(event.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                required
              />
            </label>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={isStreaming}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white font-bold font-mono text-xs rounded tracking-widest transition-colors"
              >
                <Send className="w-4 h-4" />
                {isStreaming ? 'BUFFERING...' : 'STREAM TO REDIS'}
              </button>

              <button
                type="button"
                onClick={flushTelemetry}
                disabled={isFlushing}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-950 text-zinc-200 font-bold font-mono text-xs rounded tracking-widest border border-zinc-800 transition-colors"
              >
                <DatabaseZap className="w-4 h-4" />
                {isFlushing ? 'FLUSHING...' : 'FLUSH TO POSTGRES'}
              </button>
            </div>
          </form>

          <aside className="panel-glass p-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 mb-4">
              <Lock className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-bold tracking-widest text-purple-400 font-mono">
                ADMIN STATUS
              </h2>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              These endpoints require a commander token. Log in first, then use this console to prove the Redis-to-Postgres pipeline.
            </p>

            <div className="bg-zinc-950 border border-zinc-800 rounded p-3 min-h-28">
              <div className="text-xs font-mono text-zinc-500 mb-2">LAST RESPONSE</div>
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words">
                {lastResult ? JSON.stringify(lastResult, null, 2) : 'No telemetry operation yet.'}
              </pre>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
