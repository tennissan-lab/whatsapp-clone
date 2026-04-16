import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  hasInput = false,
  inputPlaceholder = 'Enter reason...',
  inputLabel = 'Reason'
}) {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger': return <AlertTriangle size={32} className="text-red-500" />;
      case 'warning': return <AlertCircle size={32} className="text-yellow-500" />;
      default: return <Info size={32} className="text-blue-500" />;
    }
  };

  const getColorClass = () => {
    switch (type) {
      case 'danger': return 'bg-red-500 hover:bg-red-600 shadow-red-500/25';
      case 'warning': return 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/25 text-black';
      default: return 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25';
    }
  };

  const handleConfirm = () => {
    if (hasInput) {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
    setInputValue('');
  };

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
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner ${
            type === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 
            type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 
            'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            {getIcon()}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide text-center">{title}</h2>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 px-2">
            {message}
          </p>
        </div>

        {hasInput && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">
              {inputLabel}
            </label>
            <textarea
              autoFocus
              className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
              rows={3}
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold shadow-sm active:scale-95 transition-all duration-200"
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm}
            className={`flex-1 py-3 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all duration-200 ${getColorClass()}`}
            disabled={hasInput && !inputValue.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
