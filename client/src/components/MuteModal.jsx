import React from 'react';
import { X, BellOff, Check } from 'lucide-react';

export default function MuteModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  const options = [
    { label: 'Mute for 8 hours', value: '8h' },
    { label: 'Mute for 1 week', value: '1w' },
    { label: 'Always', value: 'always' },
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
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4 shadow-inner">
            <BellOff size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">Mute Notifications</h2>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 px-4">
            Other participants will not see that you muted this chat. You will still be notified if you are mentioned.
          </p>
        </div>

        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className="w-full flex justify-between items-center p-4 rounded-2xl transition-all duration-200 bg-white/50 dark:bg-gray-800/30 border border-transparent hover:border-red-500/30 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 group"
            >
              <span className="font-medium group-hover:text-red-500 transition-colors">{option.label}</span>
              <div className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center group-hover:border-red-500 transition-colors">
                 {/* No check by default here since it's a "Select one to perform action" modal */}
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="mt-6 w-full py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold shadow-sm active:scale-95 transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
