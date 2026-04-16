import React from 'react';
import { X, Clock, Check } from 'lucide-react';

export default function DisappearingMessagesModal({ isOpen, onClose, currentTimer, onSelect }) {
  if (!isOpen) return null;

  const options = [
    { label: 'Off', value: 0 },
    { label: '24 hours', value: 86400 },
    { label: '7 days', value: 604800 },
    { label: '90 days', value: 7776000 },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-[#0a0f1e]/80 backdrop-blur-md flex justify-center items-center z-[100] p-4 transition-all duration-300">
      <div className="theme-glass shadow-2xl rounded-3xl p-6 w-full max-w-[400px] flex flex-col relative animate-fade-slide-up border border-gray-200 dark:border-gray-700/50">
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center transition-all z-10"
        >
          <X size={18} />
        </button>
        
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-inner">
            <Clock size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">Disappearing Messages</h2>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 px-4">
            Make messages in this chat disappear after a certain period of time. Starred messages will be kept.
          </p>
        </div>

        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`w-full flex justify-between items-center p-4 rounded-2xl transition-all duration-200 border ${
                currentTimer === option.value 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500/50 text-blue-700 dark:text-blue-400 shadow-md' 
                  : 'bg-white/50 dark:bg-gray-800/30 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="font-medium">{option.label}</span>
              {currentTimer === option.value && (
                <div className="bg-blue-500 rounded-full p-1 shadow-sm">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="mt-6 w-full py-3.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-500/25 active:scale-95 transition-all duration-200"
        >
          Done
        </button>
      </div>
    </div>
  );
}
