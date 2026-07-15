import { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';

export default function LiveTracking() {
  const globeEl = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [telemetry, setTelemetry] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [isCachedReport, setIsCachedReport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle window resize for the globe
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Poll Telemetry every 5 seconds
  useEffect(() => {
    let interval;
    
    const fetchTelemetry = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/live/iss/telemetry`);
        const data = await res.json();
        setTelemetry(data);
        
        // Point the 3D globe camera at the new coordinates
        if (globeEl.current) {
          globeEl.current.pointOfView({ 
            lat: data.latitude, 
            lng: data.longitude, 
            altitude: 2.0 
          }, 1000); // 1-second smooth animation
        }
      } catch (err) {
        console.error("Telemetry fetch failed", err);
      }
    };

    fetchTelemetry(); // Run immediately on mount
    interval = setInterval(fetchTelemetry, 5000); // Then run every 5s
    
    return () => clearInterval(interval);
  }, []);

  // Configure globe on load
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = false; // Turn off auto-rotate so we can track the ISS
    }
  }, []);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/live/iss/analyze`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error("API rejected the request.");
      const data = await res.json();
      
      setAiReport(data.report);
      setIsCachedReport(data.cached);
      if (data.cached) {
         toast.success("Loaded from orbital cache");
      } else {
         toast.success("Gemini Analysis Complete");
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Link Failed. Are you logged in?");
    } finally {
      setIsGenerating(false);
    }
  };

  const markerData = telemetry ? [{
    lat: telemetry.latitude,
    lng: telemetry.longitude,
    size: 20,
    color: 'red'
  }] : [];

  return (
    <div className="relative w-full h-full bg-black">
      {/* 3D GLOBE CENTERPIECE */}
      <div className="absolute inset-0 cursor-move">
        <Globe
          ref={globeEl}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          atmosphereColor="#06b6d4"
          atmosphereAltitude={0.15}
          htmlElementsData={markerData}
          htmlElement={() => {
            const el = document.createElement('div');
            el.innerHTML = `<div class="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>`;
            return el;
          }}
        />
      </div>

      {/* LEFT HUD PANEL - Telemetry */}
      <div className="absolute top-24 left-6 w-80 panel-glass p-4 hidden lg:block pointer-events-auto">
        <h2 className="text-zinc-100 font-bold tracking-widest text-xs uppercase mb-4 border-b border-zinc-800 pb-2">
          Live Telemetry: ISS
        </h2>
        
        <div className="space-y-4 font-mono text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">ALTITUDE</span>
            <span className="text-white">{telemetry ? telemetry.altitude_km : '---'} km</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">VELOCITY</span>
            <span className="text-white">{telemetry ? telemetry.velocity_kmh.toLocaleString() : '---'} km/h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">LATITUDE</span>
            <span className="text-white">{telemetry ? telemetry.latitude : '---'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">LONGITUDE</span>
            <span className="text-white">{telemetry ? telemetry.longitude : '---'}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">STATUS</div>
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {telemetry ? telemetry.status : 'CONNECTING...'}
          </div>
        </div>
      </div>

      {/* RIGHT HUD PANEL - AI Director */}
      <div className="absolute top-24 right-6 w-80 panel-glass p-4 hidden xl:flex pointer-events-auto flex-col max-h-[70vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-zinc-100 font-bold tracking-widest text-xs uppercase">
              AI Flight Director
            </h2>
            {isCachedReport && <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">CACHED</span>}
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Gemini</span>
        </div>
        
        <div className="text-xs text-zinc-300 leading-relaxed font-mono overflow-y-auto flex-grow custom-scrollbar pr-2 mb-4">
          {aiReport ? (
            <div className="space-y-2">
              <ReactMarkdown components={{
                p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
                strong: ({...props}) => <strong className="text-zinc-100 font-bold" {...props} />
              }}>
                {aiReport}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-zinc-500 italic">Waiting for analysis command...</p>
          )}
        </div>

        <button 
          onClick={generateReport}
          disabled={isGenerating}
          className="mt-auto w-full py-2 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold text-xs rounded tracking-wider transition-colors shrink-0"
        >
          {isGenerating ? 'ANALYZING...' : 'GENERATE NEW REPORT'}
        </button>
      </div>

      {/* BOTTOM HUD - Raw Data Stream */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl panel-glass p-3 hidden md:block pointer-events-auto">
        <div className="font-mono text-xs text-zinc-500 flex items-center justify-between overflow-hidden">
          <span className="text-emerald-500 font-bold shrink-0 mr-4">STREAM</span>
          <span className="truncate flex-grow">
            {telemetry ? JSON.stringify(telemetry) : 'WAITING FOR SIGNAL...'}
          </span>
          <span className="animate-pulse shrink-0 ml-4">_</span>
        </div>
      </div>
    </div>
  );
}
