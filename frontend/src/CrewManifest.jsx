import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CrewManifest({ missionId }) {
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`http://127.0.0.1:8000/missions/${missionId}/crew`)
      .then(response => {
        setCrew(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching crew manifest:", error);
        setLoading(false);
      });
  }, [missionId]);

  if (loading) return <div>Loading Crew Data...</div>;

  return (
    <div style={{ backgroundColor: '#1e1e2f', color: '#fff', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
      <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>👨‍🚀 Crew Manifest</h2>
      
      {crew.length === 0 ? (
        <p>No crew assigned to this mission yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
          {crew.map((scientist) => (
            <div key={scientist.id} style={{ backgroundColor: '#2a2a40', padding: '15px', borderRadius: '6px' }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#4da6ff' }}>{scientist.name}</h3>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{scientist.role} • {scientist.specialty}</p>
              <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#aaa' }}>{scientist.email}</p>
              <p style={{ margin: '0', fontSize: '0.85em', fontStyle: 'italic', color: '#888' }}>"{scientist.bio}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}