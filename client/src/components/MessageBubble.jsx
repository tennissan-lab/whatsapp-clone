import React from 'react';
import { format } from 'date-fns';
import { 
  Star, FileText, Reply, Smile, Edit2, Trash2, Ban, Clock, AlertCircle, Play, Pause, Info, MoreVertical, Check, CheckCheck, Pencil
} from 'lucide-react';

export default function MessageBubble({ message, currentUser, conversationType, onToggleStar, isReceiverOnline, onReply, onReact, onEdit, onDelete, onOpenMessageInfo, isSameSender }) {
  const isMine = message.sender && (message.sender._id === currentUser._id || message.sender === currentUser._id);
  const isStarred = message.starredBy?.includes(currentUser._id);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef(null);

  const API_BASE_URL = (import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const getTicks = () => {
    if (!isMine) return null;
    
    if (message.isOptimistic) {
      return <Clock size={12} className="text-gray-400 dark:text-gray-500 animate-pulse" />;
    }

    if (message.status === 'failed') {
       return <Ban size={12} className="text-red-500" title="Failed to send. Click to retry." />;
    }

    const status = message.status || 'sent';
    
    // Status colors for ticks
    const readColor = "text-[#53bdeb]"; // Bright WhatsApp blue
    const deliveredColor = isMine ? "text-gray-500 dark:text-white/60" : "text-gray-400 dark:text-gray-500";
    const sentColor = isMine ? "text-gray-400 dark:text-white/50" : "text-gray-400 dark:text-gray-500";

    if (status === 'read') {
      return (
        <svg className={`w-3.5 h-3.5 ${readColor} transition-colors duration-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7 M5 17l4 4L19 11" />
        </svg>
      );
    }
    
    if (status === 'delivered') {
      return (
        <svg className={`w-3.5 h-3.5 ${deliveredColor} transition-colors duration-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7 M5 17l4 4L19 11" />
        </svg>
      );
    }
    
    return (
      <svg className={`w-3.5 h-3.5 ${sentColor} transition-colors duration-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  return (
    <div className={`flex flex-col mb-4 max-w-[75%] message-bubble-container animate-spring-pop transform transition-transform duration-200 ${isMine ? 'items-end' : 'items-start'}`}>

      
      {/* Sender name for group chats if not mine and not same sender */}
      {!isMine && conversationType === 'group' && message.sender?.username && !isSameSender && (
        <span className="text-xs text-green-600 dark:text-green-400 font-medium ml-2 mb-1">
          {message.sender.username}
        </span>
      )}

      {/* Bubble Container */}
      <div className="relative group/bubble">
        {/* Hover Actions */}
        {/* Hover Actions */}
        <div className={`absolute -top-3 ${isMine ? 'right-full mr-2' : 'left-full ml-2'} flex gap-1 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 opacity-0 group-hover/bubble:opacity-100 transition-all z-20 p-0.5`}>
          {/* Reaction Button */}
          {onReact && !message.deleted && (
            <div className="relative group/react">
              <button className="p-1.5 hover:scale-110 text-gray-500 dark:text-gray-400 hover:text-green-500 transition-transform">
                <Smile size={14} />
              </button>
              <div className={`absolute bottom-full mb-1 hidden group-hover/react:flex bg-white dark:bg-slate-800 rounded-full shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 px-2 gap-1 z-30 animate-pop-in ${isMine ? 'right-0' : 'left-0'}`}>
                {['👍', '❤️', '😂', '😮', '😢', '👏'].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => {
                      setTimeout(() => onReact(emoji), 10);
                    }}
                    className="text-lg hover:scale-125 transition-transform px-1 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Reply Button */}
          {onReply && !message.deleted && (
            <button 
              onClick={() => onReply(message)}
              className="p-1.5 hover:scale-110 text-gray-500 dark:text-gray-400 hover:text-green-500 transition-transform"
            >
              <Reply size={14} />
            </button>
          )}
          {/* Star Button */}
          <button 
            onClick={() => onToggleStar(message)}
            className="p-1.5 hover:scale-110 text-yellow-500 transition-transform"
          >
            <Star size={14} fill={isStarred ? "currentColor" : "none"} />
          </button>
          {/* Edit Button */}
          {isMine && !message.deleted && onEdit && message.mediaType === 'none' && (
            <button 
              onClick={() => onEdit()}
              className="p-1.5 hover:scale-110 text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-transform"
            >
              <Edit2 size={14} />
            </button>
          )}
          {/* Info Button */}
          {isMine && !message.deleted && (
            <button 
              onClick={() => onOpenMessageInfo()}
              className="p-1.5 hover:scale-110 text-gray-500 dark:text-gray-400 hover:text-green-500 transition-transform"
              title="Message info"
            >
              <Info size={14} />
            </button>
          )}
          {/* Delete Button */}
          {isMine && onDelete && !message.deleted && (
            <div className="relative group/delete">
              <button className="p-1.5 hover:scale-110 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-transform">
                <Trash2 size={14} />
              </button>
              <div className={`absolute bottom-full mb-1 hidden group-hover/delete:flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 min-w-max z-30 animate-pop-in ${isMine ? 'right-0' : 'left-0'}`}>
                <button 
                  onClick={() => onDelete('everyone')}
                  className="px-4 py-2 text-xs font-semibold text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left rounded-lg transition-colors"
                >
                  Delete for Everyone
                </button>
                <button 
                  onClick={() => onDelete('me')}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left rounded-lg transition-colors border-t border-gray-100 dark:border-gray-700"
                >
                  Delete for Me
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bubble */}
        <div 
          className={`px-4 py-2 text-[14.5px] leading-relaxed relative ${
            isMine 
              ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-white rounded-2xl rounded-tr-none shadow-sm border border-black/5 dark:border-white/5' 
              : 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-white rounded-2xl rounded-tl-none shadow-sm border border-black/5 dark:border-white/5'
          } ${message.deleted ? 'opacity-70 italic shadow-none border-none bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400' : ''}`}
        >
          {message.deleted ? (
            <div className="flex items-center gap-2 text-black/60 dark:text-white/60 text-sm font-medium">
              <Ban size={16} /> <span>This message was deleted</span>
            </div>
          ) : (
            <>
              {/* Quoted Message (Reply) */}
          {message.replyTo && (
            <div className={`mb-2 p-2 rounded-lg flex flex-col border-l-4 border-green-500 cursor-pointer hover:opacity-90 transition-opacity ${isMine ? 'bg-black/10 dark:bg-black/20 text-white' : 'bg-green-50 dark:bg-green-900/20 text-gray-800 dark:text-gray-200'}`}>
              <span className="font-bold text-[11px] text-green-600 dark:text-green-400 mb-0.5">
                {message.replyTo.senderName || 'User'}
              </span>
              <span className="text-xs opacity-90 truncate max-w-[200px]">
                {message.replyTo.text || (message.replyTo.mediaType && message.replyTo.mediaType !== 'none' ? `${message.replyTo.mediaType} attachment` : 'Message')}
              </span>
            </div>
          )}

        {/* Media Content */}
        {message.mediaType === 'image' && message.fileUrl && (
          <div className="mb-2 rounded-lg overflow-hidden cursor-pointer" onClick={() => window.open(getFullUrl(message.fileUrl))}>
            <img src={getFullUrl(message.fileUrl)} alt="attachment" className="max-w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        )}

        {message.mediaType === 'video' && message.fileUrl && (
          <div className="mb-2 rounded-lg overflow-hidden">
            <video src={getFullUrl(message.fileUrl)} controls className="max-w-full h-auto" />
          </div>
        )}

        {message.mediaType === 'audio' && message.fileUrl && (
          <div className={`mb-2 p-3 rounded-xl flex items-center gap-4 min-w-[240px] max-w-full ${isMine ? 'bg-green-600/10 dark:bg-green-500/10' : 'bg-gray-100 dark:bg-slate-700/50'} border border-black/5 dark:border-white/5 shadow-inner`}>
            <button 
              onClick={() => {
                if (audioRef.current.paused) {
                  audioRef.current.play();
                  setIsPlaying(true);
                } else {
                  audioRef.current.pause();
                  setIsPlaying(false);
                }
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${isMine ? 'bg-green-500 text-white' : 'bg-[#00d4ff] text-white'} shadow-lg`}
            >
               {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
            </button>
            <div className="flex-1 flex flex-col gap-1.5">
               <div className="h-4 flex items-end gap-[2px]">
                  {[...Array(24)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-[3px] rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''} ${isMine ? (isPlaying ? 'bg-green-500' : 'bg-green-500/40') : (isPlaying ? 'bg-[#00d4ff]' : 'bg-gray-400/40')}`} 
                      style={{ height: `${Math.random() * 80 + 20}%` }}
                    ></div>
                  ))}
               </div>
               <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                  <span>{isPlaying ? 'Playing...' : 'Voice Message'}</span>
                  <div className="flex items-center gap-1.5">
                    <Clock size={10} />
                    <span>Audio</span>
                  </div>
               </div>
            </div>
            <audio 
              ref={audioRef}
              src={getFullUrl(message.fileUrl)} 
              className="hidden" 
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
          </div>
        )}

        {message.mediaType === 'document' && message.fileUrl && (
          <a href={getFullUrl(message.fileUrl)} target="_blank" rel="noopener noreferrer" className={`mb-2 p-3 rounded-xl flex items-center gap-3 ${isMine ? 'bg-green-600/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-gray-200'} border border-black/5 dark:border-white/5 transition-all hover:bg-opacity-30`}>
              <div className="w-10 h-10 bg-green-500/20 rounded-md flex items-center justify-center text-green-600 dark:text-green-400">
                <FileText size={20} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">File Attachment</span>
                <span className="text-[10px] opacity-70">Click to view/download</span>
              </div>
            </a>
          )}
              {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
            </>
          )}
          
          <div className="flex items-center justify-end gap-1.5 mt-1">
            {message.isEdited && !message.deleted && (
              <span className={`text-[10px] ${isMine ? 'text-gray-500 dark:text-white/60' : 'text-gray-400 dark:text-gray-500'} italic font-bold tracking-wide mr-1`}>edited</span>
            )}
            {message.expiresAt && !message.deleted && (
              <Clock size={10} className={`${isMine ? 'text-white/40' : 'text-black/30 dark:text-white/30'} mr-0.5`} />
            )}
            {getTicks()}
            {conversationType === 'group' && isMine && !message.deleted && (
              <div className="absolute bottom-full right-0 mb-2 invisible group-hover/bubble:visible opacity-0 group-hover/bubble:opacity-100 transition-all flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-3 text-[11px] min-w-[150px] z-50 border border-gray-100 dark:border-gray-700 animate-pop-in">
                <p className="font-bold text-green-500 mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">Message Status</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-blue-500 font-semibold mb-0.5">Read by:</p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {message.readBy?.filter(r => (r.userId?._id || r.userId) !== currentUser._id).map(r => r.userId?.username || 'User').join(', ') || 'Nobody yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-semibold mb-0.5">Delivered to:</p>
                    <p className="text-gray-400 dark:text-gray-400">
                      {message.deliveredTo?.filter(d => (d.userId?._id || d.userId) !== currentUser._id).map(d => d.userId?.username || 'User').join(', ') || 'Nobody yet'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {isStarred && <Star size={10} className="text-yellow-400 fill-current" />}
          </div>
        </div>
        
        {/* Reactions Pill */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`absolute -bottom-3 ${isMine ? 'right-4' : 'left-4'} bg-white dark:bg-[#1f2937] rounded-full px-1.5 py-0.5 shadow-md border border-gray-200 dark:border-gray-700 flex items-center gap-0.5 z-10 text-[11px] cursor-pointer hover:scale-105 active:scale-95 transition-all`}
               onClick={(e) => {
                 e.stopPropagation();
                 // Find the user's reaction emoji and toggle it
                 const myReaction = message.reactions.find(r => (r.userId?._id || r.userId) === currentUser._id);
                 if (myReaction) {
                   onReact(myReaction.emoji);
                 }
               }}
          >
            {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => (
              <span key={emoji}>{emoji}</span>
            ))}
            {message.reactions.length > 1 && (
              <span className="text-gray-500 font-medium ml-1 mr-0.5">{message.reactions.length}</span>
            )}
          </div>
        )}
        
        {/* Timestamp on hover below bubble */}
        <div className={`absolute -bottom-5 ${isMine ? 'right-1' : 'left-1'} text-[11px] text-gray-500 dark:text-gray-400 font-medium tracking-wide opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10`}>
          {message.createdAt ? format(new Date(message.createdAt), 'hh:mm a') : '...'}
        </div>
      </div>
    </div>
  );
}
