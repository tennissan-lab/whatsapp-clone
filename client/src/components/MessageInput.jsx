import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, X, Mic, Trash2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import api from '../api';

export default function MessageInput({ onSend, socket, conversationId, currentUser, replyingTo, onCancelReply, editingMessage, onCancelEdit }) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      inputRef.current?.focus();
    } else {
      setText('');
    }
  }, [editingMessage]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/conversations/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        const data = response.data;
        // Determine mediaType more specifically if needed
        let mediaType = 'document';
        if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type.startsWith('video/')) mediaType = 'video';

        onSend('', mediaType, data.url, replyingTo);
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }
    
    // Reset file input
    e.target.value = null;
  };

  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (text.trim() === '') return;
    
    // Close emoji picker on send
    setShowEmojiPicker(false);

    // Clear typing indicator instantly
    if (socket) {
      socket.emit('stopTyping', { conversationId, senderId: currentUser._id });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    onSend(text, 'none', null, replyingTo);
    setText('');
    if (onCancelReply) onCancelReply();
    if (onCancelEdit) onCancelEdit();
    
    // Focus back on input after sending
    inputRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioChunksRef.current.length > 0) {
          await uploadVoiceMessage(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = []; // Clear chunks so it doesn't send on stop
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      setRecordingTime(0);
    }
  };

  const uploadVoiceMessage = async (blob) => {
    const formData = new FormData();
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    formData.append('file', file);

    try {
      const res = await api.post('/conversations/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSend('', 'audio', res.data.url, replyingTo);
      if (onCancelReply) onCancelReply();
    } catch (err) {
      console.error('Voice upload failed', err);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (e) => {
    setText(e.target.value);

    // Typing emit logic
    if (socket && !isRecording) {
      socket.emit('typing', { conversationId, senderId: currentUser._id });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { conversationId, senderId: currentUser._id });
      }, 1500);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 relative transition-colors duration-300">
      {/* Top Border Glow Effect on Focus happens via a focus-within peer class in Tailwind but we'll do an absolute overlay */}
      <div className="absolute top-0 left-0 right-0 h-px bg-transparent transition-colors duration-300 peer-focus-within:bg-green-500 shadow-[0_0_10px_rgba(37,211,102,0.8)] opacity-0 peer-focus-within:opacity-100 hidden"></div>

      {/* Edit Preview Bar */}
      {editingMessage && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/40 px-4 py-2 border-l-4 border-blue-500 animate-slide-in-up mt-1 mx-2 rounded-lg shadow-sm">
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Editing Message
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {editingMessage.text}
            </span>
          </div>
          <button onClick={onCancelEdit} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/80 px-4 py-2 border-l-4 border-green-500 animate-slide-in-up mt-1 mx-2 rounded-lg shadow-sm">
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
              {replyingTo.senderName || 'Unknown'}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {replyingTo.text || (replyingTo.mediaType !== 'none' ? `${replyingTo.mediaType} attachment` : 'Message')}
            </span>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Input Area */}
      <div className="px-4 py-3 flex items-center relative">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mr-2 shrink-0">
        <div className="relative" ref={emojiPickerRef}>
          <button 
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 ${showEmojiPicker ? 'text-green-500 bg-gray-100 dark:bg-gray-800' : 'hover:text-green-500 dark:hover:text-green-400'}`}
          >
            <Smile size={22} className="opacity-90" />
          </button>
          
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-4 z-50 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              <EmojiPicker 
                onEmojiClick={onEmojiClick}
                theme="auto"
                searchPlaceholder="Search emoji..."
                width={320}
                height={400}
              />
            </div>
          )}
        </div>
        
        {/* Attachment Button */}
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="hover:text-green-500 dark:hover:text-green-400 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
        >
          <Paperclip size={20} className="opacity-90" />
        </button>
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
        />
      </div>

      <form 
        onSubmit={handleSend} 
        className="flex-1 flex items-center bg-gray-100/90 dark:bg-[#1f2937]/90 rounded-2xl pr-1.5 pl-4 shadow-inner border border-gray-300 dark:border-gray-700 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500/50 transition-all duration-300 group peer"
      >
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between py-2">
             <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-mono">
                  {formatTime(recordingTime)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-4 animate-in fade-in duration-1000">
                  Recording...
                </span>
             </div>
             <button 
               type="button"
               onClick={cancelRecording}
               className="p-2 text-gray-400 hover:text-red-500 transition-colors"
             >
               <Trash2 size={20} />
             </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message"
            className="flex-1 py-3.5 focus:outline-none bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-500 text-[15px]"
            value={text}
            onChange={handleInputChange}
          />
        )}

        {text.trim() === '' && !isRecording ? (
          <button 
            type="button"
            onClick={startRecording}
            className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full p-2.5 hover:text-green-500 dark:hover:text-green-400 transition-all active:scale-90"
          >
            <Mic size={18} />
          </button>
        ) : (
          <button 
            type={isRecording ? "button" : "submit"}
            onClick={isRecording ? stopRecording : undefined}
            className={`ml-2 btn-shimmer text-white rounded-full p-2.5 disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100 disabled:btn-shimmer-none flex items-center justify-center my-1.5 transform transition-all duration-300 active:scale-90 shadow-md ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'group-focus-within:shadow-[0_0_15px_rgba(37,211,102,0.3)]'}`}
            disabled={!isRecording && text.trim() === ''}
          >
            {isRecording ? <Send size={18} /> : <Send size={18} className="translate-x-[1px] transition-transform duration-300 group-focus-within:-rotate-12" />}
          </button>
        )}
      </form>
      </div>
    </div>
  );
}
