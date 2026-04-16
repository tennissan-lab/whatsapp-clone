import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { MessageCircle } from 'lucide-react';
import api from '../api';

export default function Auth() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Sync state with URL if user uses browser history
  useEffect(() => {
    setIsLogin(location.pathname === '/login');
    setError('');
  }, [location.pathname]);

  const toggleMode = () => {
    setError('');
    const newMode = !isLogin;
    navigate(newMode ? '/login' : '/register', { replace: true });
    setIsLogin(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        login(res.data);
        navigate('/');
      } else {
        await api.post('/auth/register', { username, email, password });
        // Auto-login after register
        const res = await api.post('/auth/login', { email, password });
        login(res.data);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Try again.');
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden bg-slate-50 dark:bg-[#0a0f1e] text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="mesh-bg absolute inset-0 opacity-10"></div>
        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-green-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] orb-1 opacity-30 dark:opacity-40"></div>
        <div className="absolute top-[40%] right-[30%] w-80 h-80 bg-[#00d4ff] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] orb-2 opacity-30 dark:opacity-40"></div>
        <div className="absolute bottom-[10%] left-[40%] text-purple-600 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] orb-3 opacity-20 dark:opacity-30"></div>
      </div>

      <div className="theme-glass p-8 rounded-3xl w-full max-w-[420px] relative z-10 animate-fade-slide-up shadow-2xl transition-all duration-500" style={{ height: isLogin ? '430px' : '520px' }}>
        
        {/* Animated Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-green-400 to-[#00d4ff] rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <MessageCircle size={32} className="text-white fill-white/20" />
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-2 text-center tracking-tight text-gray-800 dark:text-white">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          {isLogin ? 'Enter your details to sign in' : 'Join WhatsApp Web Clone'}
        </p>

        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center p-2 rounded-lg mb-4 animate-pop-in">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          
          {/* Register-only Field */}
          <div className={`transition-all duration-500 overflow-hidden ${isLogin ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'}`}>
            <div className="animate-slide-in-left" style={{ animationDelay: '0ms' }}>
              <input
                type="text"
                className="w-full bg-slate-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700/50 p-3 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:border-green-400 transition-all focus:shadow-[0_2px_10px_-2px_rgba(37,211,102,0.4)] rounded-lg"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={!isLogin}
                placeholder="Username"
              />
            </div>
          </div>

          <div className="animate-slide-in-left" style={{ animationDelay: '50ms' }}>
            <input
              type="email"
              className="w-full bg-slate-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700/50 p-3 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:border-green-400 transition-all focus:shadow-[0_2px_10px_-2px_rgba(37,211,102,0.4)] rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address"
            />
          </div>

          <div className="animate-slide-in-left" style={{ animationDelay: '100ms' }}>
            <input
              type="password"
              className="w-full bg-slate-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700/50 p-3 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:border-green-400 transition-all focus:shadow-[0_2px_10px_-2px_rgba(37,211,102,0.4)] rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            className="w-full btn-shimmer text-white rounded-xl p-3.5 font-semibold text-[15px] transform transition-all duration-200 active:scale-95 shadow-[0_4px_15px_rgba(37,211,102,0.2)] mt-2"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={toggleMode} type="button" className="text-[#00d4ff] font-medium hover:text-green-500 transition-colors">
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
