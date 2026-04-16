import React, { useState } from 'react';
import { Users, User, Search, Pin, PinOff, MoreVertical, BellOff, Clock, Ban } from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';

export default function ChatList({ conversations, activeConversation, setActiveConversation, currentUser, onUpdateConversation, onlineUsers = [], loading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  const getOtherUser = (conv) => {
    return conv.members?.find((m) => m._id !== currentUser?._id);
  };

  const getConversationName = (conv) => {
    if (conv.type === 'group') return conv.name;
    const otherMember = getOtherUser(conv);
    return otherMember ? otherMember.username : 'Unknown User';
  };

  const formatSmartTimestamp = (dateString, referenceTime) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffMs = referenceTime - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const today = new Date(referenceTime);
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) return format(date, 'hh:mm a'); // 10:32 AM
    if (date >= yesterday) return 'Yesterday';
    
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return format(date, 'EEE'); // Mon, Tue
    
    return format(date, 'dd/MM/yy');
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-emerald-400 to-teal-500',
      'from-blue-400 to-indigo-500',
      'from-purple-400 to-fuchsia-500',
      'from-rose-400 to-red-500',
      'from-amber-400 to-orange-500',
      'from-cyan-400 to-blue-500'
    ];
    let hash = 0;
    if (!name) return colors[0];
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const isPinned = (conv) => {
    return conv.userMeta?.isPinned || false;
  };

  const isMuted = (conv) => {
    const conversationId = conv._id;
    return currentUser.mutedConversations?.some(m => 
      (m.conversationId?._id || m.conversationId) === conversationId && 
      (!m.mutedUntil || new Date(m.mutedUntil) > new Date())
    );
  };

  const isBlocked = (conv) => {
    if (conv.type === 'group') return false;
    const other = getOtherUser(conv);
    if (!other) return false;
    return currentUser.blockedUsers?.some(id => (id._id || id) === other._id);
  };

  const handleTogglePin = async (e, conv) => {
    e.stopPropagation();
    try {
      const currentPinned = isPinned(conv);
      const res = await api.put(`/conversations/${conv._id}/metadata`, {
        userId: currentUser?._id,
        isPinned: !currentPinned
      });
      // The backend now returns userMeta. We need to merge it back.
      onUpdateConversation({ ...conv, userMeta: res.data });
    } catch (err) {
      console.error('Failed to toggle pin', err);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = getConversationName(conv).toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    if (pinnedOnly) return matchesSearch && isPinned(conv);
    return matchesSearch;
  });

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    // 1. Pinned conversations first
    const aPinned = isPinned(a);
    const bPinned = isPinned(b);
    if (aPinned !== bPinned) return bPinned ? 1 : -1;

    // 2. Unread messages next
    const aUnread = (a.userMeta?.unreadCount || 0) > 0;
    const bUnread = (b.userMeta?.unreadCount || 0) > 0;
    if (aUnread !== bUnread) return bUnread ? 1 : -1;

    // 3. Most recent message
    const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt).getTime();
    const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt).getTime();
    return bTime - aTime;
  });

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      
      {/* Search Bar */}
      <div className="p-3 bg-white/80 dark:bg-[#111827]/80 border-b border-gray-200/50 dark:border-gray-800/50 shrink-0 transition-colors duration-300">
        <div className="relative flex items-center bg-gray-100 dark:bg-[#1f2937] rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-700 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all duration-300">
          <Search size={18} className={`text-gray-500 dark:text-gray-400 transition-colors ${searchQuery ? 'text-green-500 dark:text-green-500 animate-pulse' : ''}`} />
          <input 
            type="text" 
            placeholder="Search or start new chat" 
            className="bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-200 ml-3 w-full placeholder-gray-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center h-full text-gray-400">Loading...</div>
        ) : sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
            <p className="mb-2">No conversations found</p>
            <p className="text-sm opacity-70 italic">Click the + icon to start a new chat!</p>
          </div>
        ) : (
          sortedConversations.map((conv, index) => {
            const otherUser = getOtherUser(conv);
            const isActive = activeConversation?._id === conv._id;
            const meta = conv.userMeta || {};
            const unreadCount = meta.unreadCount || 0;
            const isPinnedStatus = meta.isPinned || false;
            const isFavouriteStatus = meta.isFavourite || false;
            
            const isMutedConv = isMuted(conv);
            
            return (
              <div
                key={conv._id}
                onClick={() => setActiveConversation(conv)}
                className={`group flex items-center p-3 cursor-pointer transition-all duration-300 relative border-b border-gray-200/50 dark:border-gray-800/30 hover:bg-gray-50 dark:hover:bg-[#1f2937] hover:-translate-y-[2px] hover:shadow-lg animate-slide-in-left ${isActive ? 'bg-gray-100/80 dark:bg-[#1f2937]/80' : 'bg-transparent'}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Animated Left Border for active or hover */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-green-500 transition-all duration-300 ${isActive ? 'scale-y-100 opacity-100 shadow-[2px_0_10px_rgba(37,211,102,0.5)]' : 'scale-y-0 opacity-0 group-hover:scale-y-50 group-hover:opacity-50'}`}></div>
                
                <div className="relative shrink-0 mr-3">
                  <div className={`w-12 h-12 rounded-full overflow-hidden shadow-sm flex items-center justify-center text-white font-bold text-xl bg-gradient-to-tr ${getAvatarColor(getConversationName(conv))} transition-transform duration-300 group-hover:scale-110 group-hover:ring-2 ring-white/50 dark:ring-[#1f2937]/50`}>
                    {getConversationName(conv).charAt(0).toUpperCase()}
                  </div>
                  {/* Pinned Icon Overlay */}
                  {isPinnedStatus && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-[#111827] shadow-sm z-10">
                       <Pin size={10} fill="currentColor" />
                    </div>
                  )}
                  {/* Real Online pulsing ring */}
                  {conv.type !== 'group' && onlineUsers.includes(getOtherUser(conv)?._id) && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#111827] shadow-[0_0_8px_rgba(37,211,102,0.8)]"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-medium truncate transition-colors duration-200 text-[15px] flex items-center gap-1.5 ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200 group-hover:text-green-600 dark:group-hover:text-green-400'}`}>
                      <span className="truncate">{getConversationName(conv)}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isMutedConv && <BellOff size={12} className="text-gray-400" />}
                        {conv.disappearingMessages?.enabled && <Clock size={12} className="text-gray-400" />}
                        {isBlocked(conv) && <Ban size={12} className="text-red-500" />}
                      </div>
                    </h3>
                    <span className={`text-[11px] ml-2 shrink-0 ${isActive ? 'text-green-600 dark:text-green-500 font-medium' : 'text-gray-500'}`}>
                      {formatSmartTimestamp(conv.lastMessage?.createdAt || conv.updatedAt, now)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[13px] text-gray-500 truncate pr-2">
                      {conv.lastMessage ? (
                        conv.lastMessage.mediaType !== 'none' ? (
                          <span className="flex items-center gap-1 italic">
                            {conv.lastMessage.mediaType === 'image' && '📷 Image'}
                            {conv.lastMessage.mediaType === 'video' && '🎥 Video'}
                            {conv.lastMessage.mediaType === 'document' && '📄 Document'}
                            {conv.lastMessage.mediaType === 'link' && '🔗 Link'}
                            {conv.lastMessage.text && ` ${conv.lastMessage.text}`}
                          </span>
                        ) : conv.lastMessage.text
                      ) : (conv.type === 'group' ? 'You joined this group.' : 'Say hello!')}
                    </p>
                    
                    <div className="flex items-center gap-2">
                        {/* Unread badge */}
                        {unreadCount > 0 && (
                          <div className={`animate-scale-pop min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-bold px-1.5 shadow-sm transition-colors duration-300 ${isMutedConv ? 'bg-gray-400 dark:bg-gray-600' : 'bg-[#25D366]'} text-white`}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}

                        <button 
                          onClick={(e) => handleTogglePin(e, conv)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full ${isPinnedStatus ? 'text-green-500 opacity-100' : 'text-gray-400 hover:text-green-500'}`}
                          title={isPinnedStatus ? "Unpin Chat" : "Pin Chat"}
                        >
                          {isPinnedStatus ? <PinOff size={16} className="rotate-45" /> : <Pin size={16} />}
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
