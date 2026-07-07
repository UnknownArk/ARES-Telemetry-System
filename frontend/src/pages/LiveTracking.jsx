import { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

export default function LiveTracking() {
  const globeEl = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle window resize for the globe
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Configure globe on load
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.pointOfView({ lat: 20, lng: -90, altitude: 2.5 });
    }
  }, []);

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
          atmosphereColor="#a855f7" // Purple atmosphere glow
          atmosphereAltitude={0.15}
        />
      </div>

      {/* LEFT HUD PANEL - Telemetry */}
      <div className="absolute top-24 left-6 w-80 panel-glass p-4 hidden lg:block pointer-events-auto">
        <h2 className="text-purple-400 font-bold tracking-widest text-xs uppercase mb-4 border-b border-purple-900/50 pb-2">
          Live Telemetry: ISS
        </h2>
        
        <div className="space-y-4 font-mono text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">ALTITUDE</span>
            <span className="text-white">418.5 km</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">VELOCITY</span>
            <span className="text-white">27,580 km/h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">LATITUDE</span>
            <span className="text-white">28.5721 N</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500">LONGITUDE</span>
            <span className="text-white">-80.6480 W</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">STATUS</div>
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            NOMINAL
          </div>
        </div>
      </div>

      {/* RIGHT HUD PANEL - AI Director */}
      <div className="absolute top-24 right-6 w-80 panel-glass p-4 hidden xl:block pointer-events-auto">
        <div className="flex items-center justify-between mb-4 border-b border-purple-900/50 pb-2">
          <h2 className="text-purple-400 font-bold tracking-widest text-xs uppercase">
            AI Flight Director
          </h2>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">Gemini</span>
        </div>
        
        <div className="text-sm text-zinc-300 leading-relaxed font-mono">
          <p className="mb-3">
            <span className="text-purple-400">&gt;</span> Analysis complete. Orbital parameters are within expected tolerances.
          </p>
          <p>
            <span className="text-purple-400">&gt;</span> Approaching terminator line. Solar array alignment adjusting for eclipse period.
          </p>
        </div>

        <button className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded tracking-wider transition-colors">
          GENERATE NEW REPORT
        </button>
      </div>

      {/* BOTTOM HUD - Raw Data Stream */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl panel-glass p-3 hidden md:block pointer-events-auto">
        <div className="font-mono text-xs text-zinc-500 flex items-center justify-between">
          <span className="text-purple-500 font-bold">STREAM</span>
          <span>{`{ "id": "ISS", "ts": "1783346453210", "v": 27580, "alt": 418.5 }`}</span>
          <span className="animate-pulse">_</span>
        </div>
      </div>
    </div>
  );
}
