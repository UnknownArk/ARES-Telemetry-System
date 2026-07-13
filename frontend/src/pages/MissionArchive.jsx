import { useState, useEffect } from 'react';
import { Search, Filter, Rocket, X, Users, Calendar, Target, Activity } from 'lucide-react';
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

  // Helper to pick an image based on mission name (Apollo vs others)
  const getMissionImage = (name) => {
    if (name.toLowerCase().includes('apollo')) return '/images/apollo_mission_1783949649618.png';
    return '/images/deep_space_1783949667585.png';
  };

  return (
    <div className="w-full h-full bg-black p-6 md:p-12 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-widest text-white mb-2 text-glow">
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono text-sm"
            />
          </div>
          {/* Note: Filter button removed as per review, or kept decorative if explicitly desired. Removed to clear tech debt. */}
        </div>

        {/* DATA GRID */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
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
                className="group panel-glass p-0 hover:border-purple-500/50 transition-colors cursor-pointer relative overflow-hidden flex flex-col h-64"
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                  style={{ backgroundImage: `url(${getMissionImage(mission.name)})` }}
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                
                <div className="relative z-10 p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-auto">
                    <div className="w-12 h-12 rounded bg-black/50 backdrop-blur flex items-center justify-center border border-zinc-700 group-hover:border-purple-500/50 transition-colors">
                      <Rocket className="w-6 h-6 text-zinc-300 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <span className="px-2 py-1 text-[10px] font-bold font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ARCHIVED
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
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
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl shadow-purple-900/20 animate-fade-in">
            
            {/* Left Image Section */}
            <div className="md:w-2/5 h-64 md:h-auto relative">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${getMissionImage(selectedMission.name)})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-950 md:bg-gradient-to-t md:from-zinc-950 md:to-transparent"></div>
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-black/60 backdrop-blur border border-zinc-700 rounded text-xs font-mono text-white tracking-widest">
                  DATABASE ID: {selectedMission.id.toString().padStart(4, '0')}
                </span>
              </div>
            </div>

            {/* Right Content Section */}
            <div className="md:w-3/5 p-8 overflow-y-auto flex flex-col">
              <button 
                onClick={closeMissionDetails}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl font-bold text-white mb-2">{selectedMission.name}</h2>
              <div className="flex gap-4 mb-8 font-mono text-sm text-zinc-400 border-b border-zinc-800 pb-4">
                <span className="flex items-center gap-2"><Target className="w-4 h-4 text-purple-400" /> {selectedMission.target_destination}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400" /> {selectedMission.launch_date || 'N/A'}</span>
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-bold text-zinc-500 tracking-widest mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  MISSION OVERVIEW
                </h3>
                <p className="text-zinc-300 leading-relaxed text-sm">
                  The {selectedMission.name} mission was launched to explore {selectedMission.target_destination}. 
                  All telemetry records and scientific payload logs are securely archived in the A.R.E.S. central database.
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
                          <p className="text-white font-bold text-sm">{member.name}</p>
                          <p className="text-zinc-500 text-xs font-mono">{member.role} | {member.specialty}</p>
                        </div>
                        <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
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
