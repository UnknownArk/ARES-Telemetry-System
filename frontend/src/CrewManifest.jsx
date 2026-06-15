import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CrewManifest({ missionId }) {
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', role: '', specialty: '', email: '', bio: ''
  });

  const fetchCrew = () => {
    axios.get(`http://127.0.0.1:8000/missions/${missionId}/crew`)
      .then(response => {
        setCrew(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching crew manifest:", error);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCrew();
  }, [missionId]);

  const handleHire = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://127.0.0.1:8000/missions/${missionId}/crew`, formData);
      setFormData({ name: '', role: '', specialty: '', email: '', bio: '' }); 
      setShowForm(false); 
      fetchCrew(); 
    } catch (error) {
      console.error("Error hiring crew member:", error);
      alert("Failed to assign crew. Make sure the email address is completely unique!");
    }
  };

  if (loading) return <div className="text-gray-400 animate-pulse">Loading Crew Data...</div>;

  return (
    <div className="bg-slate-800 text-white p-6 rounded-lg mt-6 shadow-lg border border-slate-700">
      <div className="flex justify-between items-center border-b border-slate-600 pb-4">
        <h2 className="text-2xl font-bold m-0 text-blue-400">👨‍🚀 Crew Manifest</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded transition duration-200"
        >
          {showForm ? 'Cancel' : '+ Hire Crew'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleHire} className="mt-5 p-5 bg-slate-700 rounded-lg shadow-inner">
          <h4 className="text-lg font-semibold mb-4 text-slate-200">Assign New Scientist</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="p-2 rounded bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-blue-500" placeholder="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input className="p-2 rounded bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-blue-500" placeholder="Email Address" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input className="p-2 rounded bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-blue-500" placeholder="Role (e.g. Flight Specialist)" required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
            <input className="p-2 rounded bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-blue-500" placeholder="Specialty (e.g. Astrophysics)" required value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
          </div>
          <input className="w-full mt-4 p-2 rounded bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-blue-500" placeholder="Brief Bio (Optional)" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
          <button type="submit" className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded transition duration-200">
            Confirm Assignment
          </button>
        </form>
      )}
      
      {crew.length === 0 ? (
        <p className="mt-5 text-slate-400 italic">No crew assigned to this mission yet.</p>
      ) : (
        <div className="grid gap-4 mt-5">
          {crew.map((scientist) => (
            <div key={scientist.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700 hover:border-blue-500 transition duration-200">
              <h3 className="text-xl font-bold mb-1 text-blue-300">{scientist.name}</h3>
              <p className="font-semibold text-slate-200 mb-1">{scientist.role} • {scientist.specialty}</p>
              <p className="text-sm text-slate-400 mb-2">{scientist.email}</p>
              <p className="text-sm italic text-slate-500">"{scientist.bio}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}