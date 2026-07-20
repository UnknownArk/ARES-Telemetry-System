import { useState, useEffect } from 'react';
import { Search, Rocket, X, Users, Calendar, Target, Activity } from 'lucide-react';
import axios from 'axios';

export default function MissionArchive() {
  const [missions, setMissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);
  const [crew, setCrew] = useState([]);
  const [crewLoading, setCrewLoading] = useState(false);

  // Use the environment variable for API URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/missions`);
        setMissions(res.data.missions);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch missions", err);
        setError("Failed to connect to the central mission database.");
      } finally {
        setLoading(false);
      }
    };
    fetchMissions();
  }, [API_URL]);

  const openMissionDetails = async (mission) => {
    setSelectedMission(mission);
    setCrewLoading(true);
    setCrew([]);
    try {
      const res = await axios.get(`${API_URL}/missions/${mission.id}/crew`);
      setCrew(res.data);
    } catch (err) {
      console.error("Failed to fetch crew", err);
    } finally {
      setCrewLoading(false);
    }
  };

  const closeMissionDetails = () => {
    setSelectedMission(null);
  };

  // Filter missions based on search query
  const filteredMissions = missions.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.target_destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Clean data-driven status check
  const isActiveMission = (status) => status?.toLowerCase() === 'active';

  return (
    <div className="w-full h-full bg-black p-6 md:p-12 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-widest text-zinc-100 mb-2">
            MISSION ARCHIVE
          </h1>
          <p className="text-zinc-500 font-mono text-sm">
            Historical and active mission database. Connected to Live Postgres.
          </p>
        </header>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search missions or destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-none py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono text-sm"
            />
          </div>
        </div>

        {/* DATA GRID */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 font-mono text-sm">
            {error}
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-mono">
            NO MISSIONS FOUND MATCHING "{searchQuery.toUpperCase()}"
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMissions.map((mission) => (
              <div 
                key={mission.id} 
                onClick={() => openMissionDetails(mission)}
                className="group panel-glass p-0 hover:border-zinc-400 transition-colors cursor-pointer relative overflow-hidden flex flex-col h-48 bg-zinc-950"
              >
                <div className="relative z-10 p-6 flex flex-col h-full border-l-4 border-zinc-700 group-hover:border-zinc-400 transition-colors">
                  <div className="flex justify-between items-start mb-auto">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      <span className="text-xs font-mono text-zinc-500 tracking-widest">ID: {mission.id.toString().padStart(4, '0')}</span>
                    </div>
                    <span className={`px-2 py-1 text-[10px] font-bold font-mono rounded border ${
                      isActiveMission(mission.status)
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
                    }`}>
                      {mission.status || 'UNKNOWN'}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                      {mission.name}
                    </h3>
                    <div className="flex items-center gap-4 font-mono text-xs text-zinc-400">
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {mission.target_destination}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {mission.launch_date || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* DETAILED MISSION MODAL */}
      {selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-none w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-black/50 animate-fade-in">
            
            {/* Header Section */}
            <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 relative">
              <button 
                onClick={closeMissionDetails}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="mb-2">
                <span className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-none text-[10px] font-mono text-zinc-400 tracking-widest">
                  DATABASE ID: {selectedMission.id.toString().padStart(4, '0')}
                </span>
              </div>

              <div className="flex items-start gap-3 mb-4 pr-8">
                <h2 className="text-3xl font-bold text-zinc-100">{selectedMission.name}</h2>
                <span className={`mt-1 px-2 py-1 text-[10px] font-bold font-mono rounded border ${
                  isActiveMission(selectedMission.status)
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}>
                  {selectedMission.status || 'UNKNOWN'}
                </span>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 overflow-y-auto flex-1 bg-zinc-950">
              <div className="flex flex-wrap gap-4 mb-8 font-mono text-sm text-zinc-400 border-b border-zinc-800 pb-4">
                <span className="flex items-center gap-2"><Target className="w-4 h-4 text-zinc-500" /> {selectedMission.target_destination}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-zinc-500" /> {selectedMission.launch_date || 'N/A'}</span>
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-bold text-zinc-500 tracking-widest mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  MISSION OVERVIEW
                </h3>
                <p className="text-zinc-300 leading-relaxed text-sm">
                  {selectedMission.objective || `The ${selectedMission.name} mission was launched to explore ${selectedMission.target_destination}.`}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-zinc-500 tracking-widest mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  CREW MANIFEST
                </h3>
                {crewLoading ? (
                  <p className="text-sm font-mono text-zinc-600 animate-pulse">Decrypting crew manifest...</p>
                ) : crew.length === 0 ? (
                  <p className="text-sm font-mono text-zinc-600">No crew records found for this mission.</p>
                ) : (
                  <div className="space-y-3">
                    {crew.map(member => (
                      <div key={member.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded flex justify-between items-center">
                        <div>
                          <p className="text-zinc-100 font-bold text-sm">{member.name}</p>
                          <p className="text-zinc-500 text-xs font-mono">{member.role} | {member.specialty}</p>
                        </div>
                        <span className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-1 rounded-none">
                          {member.email}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
