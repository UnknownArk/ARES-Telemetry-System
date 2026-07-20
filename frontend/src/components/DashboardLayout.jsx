import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  Database, 
  Activity, 
  Terminal, 
  Menu, 
  User
} from 'lucide-react';
import AresLogo from './AresLogo';

export default function DashboardLayout() {
  const [missionClock, setMissionClock] = useState(() => new Date().toISOString().slice(11, 19));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMissionClock(new Date().toISOString().slice(11, 19));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden">
      
      {/* LEFT SIDEBAR - Main Navigation */}
      <aside className="w-16 md:w-64 flex-shrink-0 border-r border-zinc-900 bg-black/95 z-50 flex flex-col">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <AresLogo className="w-8 h-8 text-zinc-100" />
            <span className="hidden md:block font-bold tracking-widest text-zinc-100">A.R.E.S.</span>
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-2 px-2 md:px-4">
          <NavLink 
            to="/" 
            className={({isActive}) => 
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
              }`
            }
          >
            <Activity className="w-5 h-5" />
            <span className="hidden md:block text-sm font-medium">Live Tracking</span>
          </NavLink>

          <NavLink 
            to="/archive" 
            className={({isActive}) => 
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
              }`
            }
          >
            <Database className="w-5 h-5" />
            <span className="hidden md:block text-sm font-medium">Mission Archive</span>
          </NavLink>

          <NavLink 
            to="/simulations" 
            className={({isActive}) => 
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
              }`
            }
          >
            <Terminal className="w-5 h-5" />
            <span className="hidden md:block text-sm font-medium">Simulations</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <button className="flex items-center justify-center md:justify-start gap-3 w-full px-3 py-2 text-zinc-400 hover:text-white">
            <User className="w-5 h-5" />
            <span className="hidden md:block text-sm">Commander</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative flex flex-col min-w-0">
        
        {/* TOP NAVBAR (Clock & Status) */}
        <header className="h-16 absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex items-center justify-between px-6">
          <div className="flex items-center gap-2 pointer-events-auto">
            <Menu className="w-5 h-5 text-zinc-500 md:hidden cursor-pointer" />
          </div>
          
          <div className="pointer-events-auto flex items-center gap-4 bg-zinc-950/80 border border-zinc-800 rounded-full px-4 py-1.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-xs tracking-wider text-zinc-300">MISSION CLOCK: {missionClock} UTC</span>
          </div>

          <div className="pointer-events-auto flex gap-3">
          </div>
        </header>

        {/* THE CENTER CANVAS (Where maps/grids render) */}
        <div className="flex-1 relative w-full h-full overflow-hidden">
          <Outlet />
        </div>

      </main>
      
    </div>
  );
}
