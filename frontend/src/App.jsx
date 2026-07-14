import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './components/DashboardLayout';
import LiveTracking from './pages/LiveTracking';
import MissionArchive from './pages/MissionArchive';
import SimulationConsole from './pages/SimulationConsole';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#18181b',
          color: '#fff',
          border: '1px solid #a855f7',
        }
      }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<LiveTracking />} />
          <Route path="archive" element={<MissionArchive />} />
          <Route path="simulations" element={<SimulationConsole />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
