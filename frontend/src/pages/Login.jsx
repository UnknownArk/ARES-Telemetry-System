import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Lock, User } from 'lucide-react';
import AresLogo from '../components/AresLogo';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Backend expects OAuth2PasswordRequestForm (form-data)
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${API_URL}/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Save token to localStorage
      localStorage.setItem('token', response.data.access_token);
      
      toast.success('Authentication successful');
      
      // Redirect to dashboard
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-black">
      <div className="absolute inset-0 bg-zinc-950 pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 panel-glass">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
             <AresLogo className="w-full h-full text-zinc-100" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest mb-2 uppercase text-zinc-100">A.R.E.S. System</h1>
          <p className="text-zinc-500 font-mono text-sm uppercase border border-zinc-800 px-2 py-1 inline-block bg-black">Restricted Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-zinc-400 font-mono text-xs mb-2 tracking-wider">USERNAME</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/50 border border-zinc-800 focus:border-emerald-500 text-white rounded-none pl-10 pr-4 py-2 outline-none font-mono text-sm transition-colors"
                placeholder="Enter admin username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-mono text-xs mb-2 tracking-wider">PASSWORD</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-zinc-800 focus:border-emerald-500 text-white rounded-none pl-10 pr-4 py-2 outline-none font-mono text-sm transition-colors"
                placeholder="********"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold font-mono text-sm rounded-none tracking-widest transition-colors flex justify-center items-center gap-2 mt-8 cursor-pointer"
          >
            {isLoading ? (
              <span className="animate-pulse">AUTHENTICATING...</span>
            ) : (
              'INITIALIZE LOGIN'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
