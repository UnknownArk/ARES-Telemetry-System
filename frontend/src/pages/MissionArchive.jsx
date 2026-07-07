import { Search, Filter, Rocket } from 'lucide-react';

export default function MissionArchive() {
  const dummyMissions = [
    { id: 1, name: 'Apollo 11', agency: 'NASA', year: 1969, status: 'TERMINATED' },
    { id: 2, name: 'Voyager 1', agency: 'NASA', year: 1977, status: 'ACTIVE' },
    { id: 3, name: 'James Webb Space Telescope', agency: 'NASA/ESA', year: 2021, status: 'ACTIVE' },
    { id: 4, name: 'Artemis I', agency: 'NASA', year: 2022, status: 'TERMINATED' },
    { id: 5, name: 'Sputnik 1', agency: 'Soviet Space Program', year: 1957, status: 'TERMINATED' },
  ];

  return (
    <div className="w-full h-full bg-black p-6 md:p-12 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-widest text-white mb-2 text-glow">
            MISSION ARCHIVE
          </h1>
          <p className="text-zinc-500 font-mono text-sm">
            Historical and active mission database.
          </p>
        </header>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search missions, agencies, spacecraft..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono text-sm"
            />
          </div>
          <button className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-800 hover:text-purple-400 transition-colors font-mono text-sm text-zinc-400">
            <Filter className="w-4 h-4" />
            FILTER
          </button>
        </div>

        {/* DATA GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {dummyMissions.map((mission) => (
            <div 
              key={mission.id} 
              className="group panel-glass p-6 hover:border-purple-500/50 transition-colors cursor-pointer relative overflow-hidden"
            >
              {/* Subtle hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-10 flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-purple-500/30 transition-colors">
                  <Rocket className="w-6 h-6 text-zinc-400 group-hover:text-purple-400 transition-colors" />
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold font-mono rounded ${
                  mission.status === 'ACTIVE' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {mission.status}
                </span>
              </div>
              
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                  {mission.name}
                </h3>
                <div className="font-mono text-xs text-zinc-500 space-y-1">
                  <p>AGENCY: <span className="text-zinc-300">{mission.agency}</span></p>
                  <p>LAUNCH: <span className="text-zinc-300">{mission.year}</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
