import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="glass animate-fade-slide-up p-8 rounded-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold mb-2 text-center text-green-600 drop-shadow-sm">WhatsApp</h2>
        <h3 className="text-lg mb-6 text-center text-gray-500 font-light">Sign in to continue</h3>
        {error && <p className="text-red-500 text-center mb-4 text-sm animate-pop-in">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow duration-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 text-white rounded-lg p-3 font-semibold hover:bg-green-600 hover:shadow-lg transform transition-all duration-200 active:scale-95"
          >
            Log In
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="text-blue-600 font-medium hover:underline transition-all">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
