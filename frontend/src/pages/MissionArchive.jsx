import { useState, useEffect, useCallback } from 'react';
import { Search, Rocket, X, Users, Calendar, Target, Activity, Link as LinkIcon, Building2 } from 'lucide-react';
import axios from 'axios';

export default function MissionArchive() {
  const [missions, setMissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);
  const [crew, setCrew] = useState([]);
  const [crewLoading, setCrewLoading] = useState(false);

  // Use the environment variable for API URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchMissions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (agencyFilter) params.append('agency', agencyFilter);
      if (yearFilter) params.append('year', yearFilter);

      const res = await axios.get(`${API_URL}/missions?${params.toString()}`);
      setMissions(res.data.missions);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch missions", err);
      setError("Failed to connect to the central mission database.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, searchQuery, statusFilter, agencyFilter, yearFilter]);

  // Debounce search/filters
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMissions();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchMissions]);

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

  // Clean data-driven status check
  const isActiveMission = (status) => status?.toLowerCase() === 'active' || status?.toLowerCase() === 'go for launch';

  return (
    <div className="w-full h-full bg-black p-6 md:p-12 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-widest text-zinc-100 mb-2">
            MISSION ARCHIVE
          </h1>
          <p className="text-zinc-500 font-mono text-sm">
            Synced sample from public Launch Library API.
          </p>
        </header>

        {/* CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-none py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono text-sm"
            />
          </div>
          
          <div className="relative md:col-span-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-none py-3 px-4 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono text-sm appearance-none"
            >
              <option value="">Any Status</option>
              <option value="Success">Success</option>
              <option value="Failure">Failure</option>
              <option value="TBD">TBD</option>
              <option value="Go for Launch">Go for Launch</option>
            </select>
          </div>

          <div className="relative md:col-span-1">
            <input 
              type="text" 
              placeholder="Filter by Agency..."
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-none py-3 px-4 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono text-sm"
            />
          </div>

          <div className="relative md:col-span-1">
            <input 
              type="number" 
              placeholder="Filter by Year (e.g. 2024)"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-none py-3 px-4 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono text-sm"
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
        ) : missions.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-mono">
            NO MISSIONS FOUND MATCHING FILTERS
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {missions.map((mission) => (
              <div 
                key={mission.id} 
                onClick={() => openMissionDetails(mission)}
                className="group panel-glass p-0 hover:border-zinc-400 transition-colors cursor-pointer relative overflow-hidden flex flex-col h-48 bg-zinc-950"
              >
                {/* Background Image if available */}
                {mission.image_url && (
                   <div 
                     className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity bg-cover bg-center"
                     style={{ backgroundImage: `url(${mission.image_url})` }}
                   />
                )}
                
                <div className="relative z-10 p-6 flex flex-col h-full border-l-4 border-zinc-700 group-hover:border-zinc-400 transition-colors bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent">
                  <div className="flex justify-between items-start mb-auto">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      <span className="text-xs font-mono text-zinc-500 tracking-widest">EXT-ID: {mission.external_id || mission.id}</span>
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
                    <h3 className="text-xl font-bold text-zinc-100 mb-1 group-hover:text-white transition-colors truncate">
                      {mission.name}
                    </h3>
                    <div className="flex flex-col gap-1 font-mono text-xs text-zinc-400 mt-2">
                      <span className="flex items-center gap-2 truncate"><Building2 className="w-3 h-3" /> {mission.agency_name}</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {mission.target_destination}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {mission.launch_date || 'Unknown'}</span>
                      </div>
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
            <div className="relative h-48 border-b border-zinc-800 flex items-end p-8 bg-zinc-900/50">
              {selectedMission.image_url && (
                <div 
                  className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${selectedMission.image_url})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent z-0" />

              <button 
                onClick={closeMissionDetails}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors z-20 bg-zinc-900/80 rounded"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="relative z-10 w-full">
                <div className="mb-2">
                  <span className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-none text-[10px] font-mono text-zinc-400 tracking-widest mr-2">
                    EXT-ID: {selectedMission.external_id || selectedMission.id}
                  </span>
                  {selectedMission.source_url && (
                    <a href={selectedMission.source_url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-none text-[10px] font-mono text-zinc-300 tracking-widest transition-colors inline-flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" /> SOURCE
                    </a>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <h2 className="text-3xl font-bold text-zinc-100 drop-shadow-md">{selectedMission.name}</h2>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 overflow-y-auto flex-1 bg-zinc-950">
              <div className="flex flex-wrap items-center gap-6 mb-8 font-mono text-sm text-zinc-400 border-b border-zinc-800 pb-6">
                 <span className={`px-2 py-1 text-xs font-bold rounded border ${
                    isActiveMission(selectedMission.status)
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}>
                    STATUS: {selectedMission.status || 'UNKNOWN'}
                  </span>
                <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-zinc-500" /> {selectedMission.agency_name}</span>
                <span className="flex items-center gap-2"><Target className="w-4 h-4 text-zinc-500" /> {selectedMission.target_destination}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-zinc-500" /> {selectedMission.launch_date || 'N/A'}</span>
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-bold text-zinc-500 tracking-widest mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  MISSION OVERVIEW
                </h3>
                <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">
                  {selectedMission.objective || `No description available for ${selectedMission.name}.`}
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
