import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';
import api from '../api';

export default function CreateGroupModal({ onClose, currentUser, onGroupCreated }) {
  const [users, setUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data.filter((u) => u._id !== currentUser._id));
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, [currentUser]);

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const getSelectedUserDetails = () => {
    return selectedUsers.map(id => users.find(u => u._id === id)).filter(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (groupName.trim() === '') return setError('Group name is required');
    if (selectedUsers.length === 0) return setError('Select at least one other member');

    try {
      const allMembers = [...selectedUsers, currentUser._id];
      const res = await api.post('/conversations', {
        type: 'group',
        name: groupName,
        members: allMembers,
        createdBy: currentUser._id,
      });
      onGroupCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
    }
  };

  const handleCreateDM = async (userId) => {
    try {
      const res = await api.post('/conversations', {
        type: 'dm',
        members: [userId, currentUser._id],
        createdBy: currentUser._id,
      });
      onGroupCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create DM');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-[#0a0f1e]/80 backdrop-blur-md flex justify-center items-end sm:items-center z-50 p-4 sm:p-0 transition-colors duration-300">
      {/* Container slides up from bottom */}
      <div className="theme-glass shadow-2xl rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-[450px] max-h-[85vh] flex flex-col relative animate-fade-slide-up border border-gray-200 dark:border-gray-700/50">
        
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center transition-all z-10"
        >
          <X size={18} />
        </button>
        
        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white tracking-wide">New Chat</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Start a conversation</p>
        
        {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-2 rounded-lg animate-pop-in">{error}</p>}

        {/* Selected Members Chips Horizontal Scroll */}
        {selectedUsers.length > 0 && (
          <div className="flex overflow-x-auto py-2 mb-4 space-x-2 scrollbar-hide shrink-0 animate-fade-slide-up">
            {getSelectedUserDetails().map(u => (
              <div key={u._id} className="flex items-center bg-white dark:bg-[#1f2937] border border-green-500/30 rounded-full pl-1 pr-3 py-1 shrink-0 animate-pop-in shadow-[0_2px_10px_rgba(37,211,102,0.15)]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-green-500 to-[#00d4ff] flex items-center justify-center text-white text-[10px] font-bold mr-2">
                  {u.username[0].toUpperCase()}
                </div>
                <span className="text-xs text-gray-800 dark:text-gray-200 font-medium mr-2">{u.username.split(' ')[0]}</span>
                <button onClick={() => toggleUser(u._id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full p-0.5">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create Group Form */}
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700/50 shrink-0">
          <input
            type="text"
            placeholder="Group Subject"
            className="w-full bg-slate-50 dark:bg-[#1f2937]/50 border border-gray-300 dark:border-gray-700 rounded-xl p-3.5 focus:outline-none focus:border-green-500 focus:shadow-[0_0_15px_rgba(37,211,102,0.2)] transition-all mb-3 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-500"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button 
            onClick={handleSubmit}
            className="group w-full btn-shimmer text-white rounded-xl p-3.5 font-semibold transition-all flex items-center justify-center shadow-lg active:scale-95 duration-200 disabled:opacity-50 disabled:btn-shimmer-none disabled:active:scale-100 disabled:hover:shadow-none"
            disabled={groupName.trim() === '' || selectedUsers.length === 0}
          >
            Create Group
            <ArrowRight size={18} className="ml-2 group-focus-within:translate-x-1 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* User List */}
        <div className="flex justify-between items-center mb-3 shrink-0">
          <h3 className="font-semibold text-gray-500 dark:text-gray-400 text-xs tracking-wider uppercase">Contacts on WhatsApp</h3>
        </div>

        <div className="overflow-y-auto flex-1 pr-2 -mr-2 space-y-1.5 scroll-smooth custom-scrollbar">
          {users.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">Syncing contacts...</div>
          ) : (
            users.map((u) => {
              const isSelected = selectedUsers.includes(u._id);
              return (
                <div 
                  key={u._id} 
                  className={`flex justify-between items-center p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected ? 'bg-gray-100 dark:bg-[#1f2937] border-green-500/50 shadow-[0_0_15px_rgba(37,211,102,0.1)]' : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-[#1f2937]/50'
                  }`}
                  onClick={() => toggleUser(u._id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-sm transition-transform duration-300 ${isSelected ? 'scale-105 bg-gradient-to-tr from-green-500 to-[#00d4ff]' : 'bg-gradient-to-tr from-gray-400 to-gray-300 dark:from-gray-700 dark:to-gray-600'}`}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-medium transition-colors ${isSelected ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>{u.username}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleCreateDM(u._id)}
                      className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-medium px-3.5 py-1.5 rounded-full hover:bg-green-500 hover:text-white dark:hover:bg-green-500 transition-all shadow-sm active:scale-95 border border-gray-300 dark:border-gray-700 hover:border-transparent"
                    >
                      Message
                    </button>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                      isSelected ? 'bg-green-500 border-green-500 shadow-[0_0_8px_rgba(37,211,102,0.6)] animate-pop-in' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50'
                    }`} onClick={() => toggleUser(u._id)}>
                      {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
