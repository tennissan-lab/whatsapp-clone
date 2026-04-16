import React, { useState, useEffect } from 'react';
import { X, CheckCheck, Headphones, ArrowLeft } from 'lucide-react';
import { format, isSameDay, isYesterday, isWithinInterval, subDays } from 'date-fns';
import MessageBubble from './MessageBubble';

export default function MessageInfoPanel({ message, onClose, currentUser, conversationType, socket }) {
  const [liveMessage, setLiveMessage] = useState(message);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (updatedMsg) => {
      if (updatedMsg._id === message._id) {
        setLiveMessage(updatedMsg);
      }
    };

    socket.on('messageStatusUpdate', handleStatusUpdate);
    return () => socket.off('messageStatusUpdate', handleStatusUpdate);
  }, [socket, message._id]);

  const getEffectiveReadAt = () => {
    if (liveMessage.readAt) return liveMessage.readAt;
    if (liveMessage.status === 'read' && liveMessage.readBy?.length > 0) {
      // Find the latest readAt among recipients (not sender)
      const others = liveMessage.readBy.filter(r => (r.userId?._id || r.userId) !== message.sender?._id);
      if (others.length > 0) return others[others.length - 1].readAt;
    }
    return null;
  };

  const getEffectiveDeliveredAt = () => {
    if (liveMessage.deliveredAt) return liveMessage.deliveredAt;
    if (liveMessage.deliveredTo?.length > 0) {
      const others = liveMessage.deliveredTo.filter(d => (d.userId?._id || d.userId) !== message.sender?._id);
      if (others.length > 0) return others[others.length - 1].deliveredAt;
    }
    return null;
  };

  const formatDateTime = (date, fallbackText = 'Not read yet') => {
    if (!date) return fallbackText;
    const d = new Date(date);
    const now = new Date();
    
    if (isSameDay(d, now)) {
      return `Today at ${format(d, 'h:mm a')}`;
    }
    if (isYesterday(d)) {
      return `Yesterday at ${format(d, 'h:mm a')}`;
    }
    if (isWithinInterval(d, { start: subDays(now, 7), end: now })) {
      return `${format(d, 'EEEE')} at ${format(d, 'h:mm a')}`;
    }
    return format(d, 'd MMMM at h:mm a');
  };

  const isAudio = liveMessage.mediaType === 'audio' || liveMessage.mediaType === 'video';

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a] animate-slide-in-right overflow-hidden shadow-2xl border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="h-[60px] flex items-center px-4 bg-white dark:bg-[#202c33] border-b border-gray-100 dark:border-gray-800/50">
        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h2 className="ml-4 text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Message info</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Message Preview Section */}
        <div className="p-6 bg-[#e5ddd5] dark:bg-[#0d141b] relative overflow-hidden min-h-[160px] flex items-center justify-end">
          {/* Subtle patterned background */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-[0.05] pointer-events-none"></div>
          
          <div className="relative z-10 w-full animate-pop-in">
            <MessageBubble 
              message={liveMessage} 
              currentUser={currentUser} 
              conversationType={conversationType}
              isMine={true}
              hideActions={true}
            />
          </div>
        </div>

        {/* Status Sections */}
        <div className="p-4 space-y-1">
          {conversationType === 'dm' ? (
            <>
              {/* Read Section */}
              <div className="bg-white dark:bg-[#111b21] p-4 rounded-xl shadow-sm space-y-3 animate-fade-in delay-75">
                <div className="flex items-start gap-4">
                  <div className="text-[#53bdeb]">
                    <CheckCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Read</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatDateTime(getEffectiveReadAt(), 'Not read yet')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivered Section */}
              <div className="bg-white dark:bg-[#111b21] p-4 rounded-xl shadow-sm space-y-3 animate-fade-in delay-150">
                <div className="flex items-start gap-4">
                  <div className="text-gray-400">
                    <CheckCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Delivered</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatDateTime(getEffectiveDeliveredAt(), 'Not delivered yet')}
                    </p>
                  </div>
                </div>
              </div>

              {isAudio && (
                 <div className="bg-white dark:bg-[#111b21] p-4 rounded-xl shadow-sm space-y-3 animate-fade-in delay-200">
                  <div className="flex items-start gap-4">
                    <div className="text-gray-400">
                      <Headphones size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Played</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDateTime(getEffectiveReadAt(), 'Not played yet')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Group Chat Status Lists */
            <div className="space-y-4">
              {/* Read By List */}
              <div className="bg-white dark:bg-[#111b21] rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 text-[#53bdeb]">
                   <CheckCheck size={18} />
                   <h3 className="text-xs font-semibold uppercase tracking-wider">Read by</h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {liveMessage.readBy?.length > 0 ? (
                    liveMessage.readBy.map((r, i) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
                            {r.userId?.username?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm dark:text-gray-200">{r.userId?.username}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">{formatDateTime(r.readAt)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-xs text-gray-500 italic text-center">No reads yet</div>
                  )}
                </div>
              </div>

              {/* Delivered To List */}
              <div className="bg-white dark:bg-[#111b21] rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 text-gray-500">
                   <CheckCheck size={18} />
                   <h3 className="text-xs font-semibold uppercase tracking-wider">Delivered to</h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {liveMessage.deliveredTo?.length > 0 ? (
                    liveMessage.deliveredTo.map((d, i) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-[10px] font-bold">
                            {d.userId?.username?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm dark:text-gray-200">{d.userId?.username}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">{formatDateTime(d.deliveredAt)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-xs text-gray-500 italic text-center">Not delivered yet</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
