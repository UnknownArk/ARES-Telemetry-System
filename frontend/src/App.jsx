import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [missions, setMissions] = useState([]);
  const [error, setError] = useState(null);
  
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [date, setDate] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const [activeTelemetryId, setActiveTelemetryId] = useState(null);
  const [telemetryLogs, setTelemetryLogs] = useState([]);

  const fetchMissions = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/missions');
      setMissions(response.data.missions);
    } catch (err) {
      setError("Network error: Could not reach the API.");
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    try {
      await axios.post('http://127.0.0.1:8000/missions', {
        name: name,
        target_destination: target,
        launch_date: date || null
      });
      setName(''); setTarget(''); setDate('');
      fetchMissions();
    } catch (err) {
      console.error("Error adding mission", err);
    }
  };

  const saveUpdate = async (mission) => {
    try {
      await axios.put(`http://127.0.0.1:8000/missions/${mission.id}`, {
        name: editName,
        target_destination: mission.target_destination,
        launch_date: mission.launch_date
      });
      setEditingId(null);
      fetchMissions();    
    } catch (err) {
      console.error("Error updating mission", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/missions/${id}`);
      fetchMissions();
    } catch (err) {
      console.error("Error deleting mission", err);
    }
  };

  const loadTelemetry = async (id) => {
    try {
      if (activeTelemetryId === id) {
        setActiveTelemetryId(null);
        return;
      }
      const response = await axios.get(`http://127.0.0.1:8000/missions/${id}/telemetry`);
      const dataArray = response.data.telemetry || [];
      setTelemetryLogs(dataArray);
      setActiveTelemetryId(id);
    } catch (err) {
      console.error("Error loading telemetry", err);
    }
  };

  const triggerPing = async (id) => {
    try {
      await axios.post(`http://127.0.0.1:8000/missions/${id}/telemetry/simulate`);
      const response = await axios.get(`http://127.0.0.1:8000/missions/${id}/telemetry`);
      const dataArray = response.data.telemetry || [];
      setTelemetryLogs(dataArray);
    } catch (err) {
      console.error("Error simulating telemetry", err);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Critical') return '#ff4757'; 
    if (status === 'Warning') return '#ffa502'; 
    return '#2ed573'; 
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c3e50' }}>Space Command Dashboard</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#e8f6f3', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, color: '#16a085' }}>Add New Mission</h3>
        <input type="text" placeholder="Mission Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ marginRight: '10px', padding: '8px' }}/>
        <input type="text" placeholder="Target Destination" value={target} onChange={(e) => setTarget(e.target.value)} required style={{ marginRight: '10px', padding: '8px' }}/>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginRight: '10px', padding: '8px' }}/>
        <button type="submit" style={{ padding: '9px 15px', backgroundColor: '#1abc9c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Launch</button>
      </form>

      <hr style={{ marginBottom: '20px' }} />
      {error && <div style={{ color: 'red', fontWeight: 'bold' }}>{error}</div>}

      <div style={{ display: 'grid', gap: '15px' }}>
        {missions.length === 0 && !error ? (
          <p>Awaiting telemetry data...</p>
        ) : (
          missions.map((mission) => (
            <div key={mission.id} style={{ border: '1px solid #bdc3c7', padding: '15px', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
              
              {editingId === mission.id ? (
                <div style={{ marginBottom: '10px' }}>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ padding: '6px', marginRight: '10px', borderRadius: '4px', border: '1px solid #bdc3c7' }}/>
                  <button onClick={() => saveUpdate(mission)} style={{ marginRight: '10px', padding: '6px 12px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <h2 style={{ margin: '0 0 10px 0', color: '#2980b9' }}>{mission.name}</h2>
              )}

              <p style={{ margin: '5px 0' }}><strong>Target:</strong> {mission.target_destination}</p>
              <p style={{ margin: '5px 0' }}><strong>Status:</strong> {mission.status}</p>
              
              <div style={{ marginTop: '15px' }}>
                <button onClick={() => { setEditingId(mission.id); setEditName(mission.name); }} style={{ marginRight: '10px', padding: '6px 12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(mission.id)} style={{ marginRight: '10px', padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                <button onClick={() => loadTelemetry(mission.id)} style={{ padding: '6px 12px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {activeTelemetryId === mission.id ? 'Close Telemetry' : 'View Telemetry'}
                </button>
              </div>

              {activeTelemetryId === mission.id && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1e272e', borderRadius: '6px', color: '#d2dae2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #485460', paddingBottom: '10px', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#0fb9b1' }}>🛰️ Live Sensor Feed</h3>
                    <button onClick={() => triggerPing(mission.id)} style={{ padding: '6px 15px', backgroundColor: '#0fb9b1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                       Ping Ship
                    </button>
                  </div>
                  
                  {(!telemetryLogs || telemetryLogs.length === 0) ? (
                    <p style={{ fontStyle: 'italic', color: '#808e9b' }}>No signal established yet. Ping the ship.</p>
                  ) : (
                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                      {telemetryLogs.map(log => (
                        <li key={log.id} style={{ padding: '8px 0', borderBottom: '1px solid #485460', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'monospace' }}>[{new Date(log.timestamp).toLocaleTimeString()}] {log.parameter_name}</span>
                          <span>
                            <strong style={{ marginRight: '15px' }}>{log.parameter_value}</strong> 
                            <span style={{ color: getStatusColor(log.status_level), fontWeight: 'bold', fontSize: '0.9em' }}>
                              {log.status_level ? log.status_level.toUpperCase() : 'UNKNOWN'}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;