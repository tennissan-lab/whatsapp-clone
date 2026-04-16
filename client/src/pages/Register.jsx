import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { username, email, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="glass animate-fade-slide-up p-8 rounded-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold mb-2 text-center text-green-600 drop-shadow-sm">WhatsApp</h2>
        <h3 className="text-lg mb-6 text-center text-gray-500 font-light">Create an account</h3>
        {error && <p className="text-red-500 text-center mb-4 text-sm animate-pop-in">{error}</p>}
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow duration-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Choose a username"
            />
          </div>
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
              placeholder="Create a password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 text-white rounded-lg p-3 font-semibold hover:bg-green-600 hover:shadow-lg transform transition-all duration-200 active:scale-95"
          >
            Sign Up
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline transition-all">Log In</Link>
        </p>
      </div>
    </div>
  );
}
