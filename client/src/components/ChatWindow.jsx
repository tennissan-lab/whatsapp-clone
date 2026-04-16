import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { 
  X, Search as SearchIcon, Phone, Video, MoreVertical, Shield, Bell, History, Star, List, 
  Ban, Flag, Trash2, PhoneIncoming, MessageSquare, ChevronDown, UserPlus, Heart, ArrowLeft, 
  Image as ImageIcon, Clock 
} from 'lucide-react';
import api from '../api';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

export default function ChatWindow({ 
  conversation, currentUser, socket, onMessageSent, onOpenContactInfo,
  onClearChat, onDeleteChat, onCloseChat, onBlockUser, onReportUser, 
  onToggleMute, onDisappearingMessages, onToggleFavourite, onOpenMessageInfo, onlineUsers = []
}) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [callStatus, setCallStatus] = useState(null); // 'calling', 'incoming', 'connected', null
  const [callType, setCallType] = useState(null); // 'voice', 'video'
  const [viewMode, setViewMode] = useState('all'); // 'all', 'starred', 'media'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const formatDuration = (seconds) => {
    if (seconds === 86400) return '24h';
    if (seconds === 604800) return '7 days';
    if (seconds === 7776000) return '90 days';
    return '';
  };
  
  const scrollRef = useRef();
  const containerRef = useRef();

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

  // Fetch initial messages when conversation changes
  useEffect(() => {
    const fetchInitialMessages = async () => {
      try {
        setPage(1);
        setHasMore(true);
        const res = await api.get(`/conversations/${conversation?._id}/messages?page=1&limit=30`);
        setMessages(res.data);
        if (res.data.length < 30) setHasMore(false);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };
    fetchInitialMessages();

    // Mark conversation as read
    const markAsRead = async () => {
      try {
        if (!conversation?._id || !currentUser?._id) return;
        await api.post(`/conversations/${conversation._id}/read`, { userId: currentUser._id });
        if (socket) {
          socket.emit('messageRead', { conversationId: conversation._id, readerId: currentUser._id });
        }
        // Refresh sidebar unread count
        if (onMessageSent) onMessageSent();
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    };
    markAsRead();
  }, [conversation?._id, currentUser?._id, socket]);

  // Handle Socket events
  useEffect(() => {
    if (!socket) return;
    
    socket.emit('joinRoom', conversation._id);

    const handleReceiveMessage = (msg) => {
      if (msg.conversationId === conversation?._id) {
        setMessages((prev) => {
          // Prevent duplicates (e.g. from optimistic update + socket)
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (msg.sender) {
            newSet.delete(msg.sender._id || msg.sender);
          }
          return newSet;
        });
      }
    };

    const handleTyping = ({ conversationId, senderId }) => {
      if (conversationId === conversation?._id && senderId !== currentUser?._id) {
        setTypingUsers((prev) => new Set(prev).add(senderId));
      }
    };

    const handleStopTyping = ({ conversationId, senderId }) => {
      if (conversationId === conversation?._id) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(senderId);
          return newSet;
        });
      }
    };

    const handleChatCleared = (clearedId) => {
      if (clearedId === conversation._id) {
        setMessages([]);
      }
    };

    const handleMessageStarred = ({ messageId, starredBy }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, starredBy } : m));
    };

    const handleReceiptUpdate = ({ conversationId, readerId }) => {
      if (conversationId === conversation?._id && readerId !== currentUser?._id) {
        setMessages(prev => prev.map(m => {
          if (!m.readBy?.some(r => r.userId === readerId)) {
            const newReadBy = [...(m.readBy || []), { userId: readerId, readAt: new Date() }];
            return { ...m, readBy: newReadBy };
          }
          return m;
        }));
      }
    };

    const handleReactionUpdate = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };

    const handleMessageEdited = (editedMsg) => {
      setMessages(prev => prev.map(m => m._id === editedMsg._id ? editedMsg : m));
    };

    const handleMessageDeleted = ({ messageId, type, userId }) => {
      setMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          if (type === 'everyone') {
            return { ...m, deleted: true, text: 'This message was deleted', mediaType: 'none', fileUrl: null };
          } else if (type === 'me' && userId === currentUser._id) {
            return { ...m, deletedFor: [...(m.deletedFor || []), userId] };
          }
        }
        return m;
      }));
    };

    const handleMessagesExpired = ({ conversationId: expiredId }) => {
      if (expiredId === conversation._id) {
        // Remove messages that should have expired
        const now = new Date();
        setMessages(prev => prev.filter(m => !m.expiresAt || new Date(m.expiresAt) > now));
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('chatCleared', handleChatCleared);
    socket.on('messageStarred', handleMessageStarred);
    socket.on('receiptUpdate', handleReceiptUpdate);
    socket.on('reactionUpdate', handleReactionUpdate);
    socket.on('messageEdited', handleMessageEdited);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('messagesExpired', handleMessagesExpired);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('chatCleared', handleChatCleared);
      socket.off('messageStarred', handleMessageStarred);
      socket.off('receiptUpdate', handleReceiptUpdate);
      socket.off('reactionUpdate', handleReactionUpdate);
      socket.off('messageEdited', handleMessageEdited);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('messagesExpired', handleMessagesExpired);
    };
  }, [socket, conversation?._id, currentUser?._id]);




  // Handle scroll detection for the scroll-to-bottom button and pagination
  const handleScroll = async (e) => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Show button if scrolled up more than 100px from bottom
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);

    // Infinite scroll trigger at the top
    if (scrollTop === 0 && hasMore && !isLoadingMore && viewMode === 'all') {
      setIsLoadingMore(true);
      const prevScrollHeight = scrollHeight;
      try {
        const nextPage = page + 1;
        const res = await api.get(`/conversations/${conversation._id}/messages?page=${nextPage}&limit=30`);
        if (res.data.length > 0) {
          setMessages(prev => [...res.data, ...prev]);
          setPage(nextPage);
          if (res.data.length < 30) setHasMore(false);
          
          // Maintain scroll position after prepend
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight - prevScrollHeight;
            }
          }, 0);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to fetch older messages', err);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  const unreadCount = conversation.userMeta?.unreadCount || 0;
  const unreadRef = useRef(null);

  // Auto-scroll logic
  const scrollToBottom = (smooth = true) => {
    scrollRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (unreadCount > 0 && messages.length > 0) {
      // Find the first unread message DOM element and scroll to it
      // For simplicity, we'll use a timeout to let React render the divider first
      setTimeout(() => {
        if (unreadRef.current) {
          unreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    } else {
      scrollToBottom();
    }
  }, [conversation?._id, messages.length === 0]); // Trigger on conversation change or first load

  useEffect(() => {
    // Only scroll to bottom on new messages IF we are already near the bottom
    // or if the message is from the current user
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      const isMine = lastMsg.sender && (lastMsg.sender._id === currentUser._id || lastMsg.sender === currentUser._id);
      if (isMine) {
        scrollToBottom();
      } else {
        // If received message, only scroll if near bottom
        if (!showScrollDown) {
          scrollToBottom();
        }
      }
    }
  }, [messages.length, typingUsers]);

  const handleSendMessage = async (text, mediaType = 'none', fileUrl = null, replyData = null) => {
    try {
      if (editingMessage) {
        // Handle Edit
        const res = await api.put(`/conversations/messages/${editingMessage._id}/edit`, { text });
        setMessages(prev => prev.map(m => m._id === editingMessage._id ? res.data : m));
        if (socket) {
          socket.emit('editMessage', { conversationId: conversation?._id, message: res.data });
        }
        setEditingMessage(null);
      } else {
        // Handle New Message
        const tempId = 'temp-' + Date.now();
        const optimisticMsg = {
          _id: tempId,
          sender: currentUser, // Use full object for immediate rendering
          text,
          mediaType,
          fileUrl,
          replyTo: replyData,
          createdAt: new Date().toISOString(),
          isOptimistic: true // Flag for "pending" UI
        };

        // Add to UI immediately
        setMessages(prev => [...prev, optimisticMsg]);
        setReplyingTo(null);

        const res = await api.post(`/conversations/${conversation?._id}/messages`, {
          sender: currentUser?._id,
          text,
          mediaType,
          fileUrl,
          replyTo: replyData
        });

        // Replace optimistic message with real message from server
        setMessages(prev => prev.map(m => m._id === tempId ? res.data : m));

        if (socket) {
          socket.emit('sendMessage', {
            ...res.data,
            conversationId: conversation?._id
          });
        }
      }
      onMessageSent();
    } catch (err) {
      console.error('Failed to send/edit message', err);
      // Remove optimistic message if it failed
      // setMessages(prev => prev.filter(m => !m.isOptimistic)); 
    }
  };

  const getChatName = () => {
    if (!conversation) return 'Chat';
    if (conversation.type === 'group') return conversation.name || 'Group Chat';
    const other = conversation.members?.find((m) => m._id !== currentUser?._id);
    return other ? other.username : 'Unknown User';
  };

  const getOtherUser = () => {
    if (!conversation) return null;
    return conversation.members?.find((m) => m._id !== currentUser?._id);
  };

  const filteredMessages = messages.filter(m => 
    (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
    !m.deletedFor?.includes(currentUser._id)
  );

  const getDateLabel = (dateString) => {
    if (!dateString) return '...';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '...';
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // reset incoming date to midnight for pure day comparison
    const compareDate = new Date(date);
    compareDate.setHours(0,0,0,0);
    
    if (compareDate.getTime() === today.getTime()) return 'Today';
    if (compareDate.getTime() === yesterday.getTime()) return 'Yesterday';
    
    const diffDays = Math.floor((today - compareDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return format(date, 'EEEE');
    
    return format(date, 'MMMM d, yyyy');
  };

  let lastDateLabel = null;

  const handleToggleStar = async (msg) => {
    try {
      const res = await api.put(`/conversations/messages/${msg._id}/star`, {
        userId: currentUser?._id
      });
      const updatedStarredBy = res.data.starredBy;
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, starredBy: updatedStarredBy } : m));
      
      if (socket) {
        socket.emit('starMessage', {
          conversationId: conversation?._id,
          messageId: msg._id,
          starredBy: updatedStarredBy
        });
      }
    } catch (err) {
      console.error('Failed to toggle star', err);
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const res = await api.put(`/conversations/messages/${messageId}/react`, {
        userId: currentUser._id,
        emoji
      });
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions: res.data.reactions } : m));
      
      if (socket) {
        socket.emit('reactMessage', {
          conversationId: conversation._id,
          messageId,
          reactions: res.data.reactions
        });
      }
    } catch (err) {
      console.error('Failed to react', err);
    }
  };

  const handleDeleteMessage = async (messageId, type) => {
    try {
      const res = await api.put(`/conversations/messages/${messageId}/delete`, { type, userId: currentUser._id });
      setMessages(prev => prev.map(m => m._id === messageId ? res.data : m));
      if (socket) {
        socket.emit('deleteMessage', { 
          conversationId: conversation._id, 
          messageId, 
          type, 
          userId: currentUser._id 
        });
      }
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const handleCall = (type) => {
    setCallType(type);
    setCallStatus('calling');
    if (socket) {
      socket.emit('callUser', {
        to: getOtherUser()?._id,
        from: currentUser._id,
        type
      });
    }
    // Auto-end calling after 10s for demo
    setTimeout(() => setCallStatus(null), 10000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0f1e] relative shadow-inner overflow-hidden transition-colors duration-300">
      {/* Background noise and textures */}
      <div className="noise-bg mix-blend-overlay"></div>
      
      {/* Header */}
      <div className="frosted-header px-6 py-3 flex justify-between items-center z-20">
        {viewMode !== 'all' ? (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewMode('all')}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex flex-col">
              <h2 className="font-semibold text-gray-800 dark:text-white capitalize">
                {viewMode} messages
              </h2>
            </div>
          </div>
        ) : (
          <div 
            className="flex items-center gap-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-colors flex-1"
            onClick={() => onOpenContactInfo(getOtherUser(), {
              onShowStarred: () => setViewMode('starred'),
              onShowMedia: () => setViewMode('media'),
              onSearch: () => setIsSearching(true),
              onVideoCall: () => handleCall('video'),
              onVoiceCall: () => handleCall('voice')
            })}
          >
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm bg-gradient-to-br ${getAvatarColor(getChatName())}`}>
                {getChatName()[0]?.toUpperCase()}
              </div>
              {conversation.type !== 'group' && onlineUsers.includes(getOtherUser()?._id) && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#111827]"></div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="font-semibold text-gray-800 dark:text-gray-100 text-lg tracking-wide flex items-center gap-2">
                {getChatName()}
                {conversation.disappearingMessages?.enabled && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 font-normal bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                    <Clock size={10} /> {formatDuration(conversation.disappearingMessages.duration)}
                  </span>
                )}
              </div>
              <div className={`text-xs font-medium transition-colors ${
                typingUsers.size > 0 || (conversation?.type !== 'group' && onlineUsers.includes(getOtherUser()?._id))
                  ? 'text-green-500 dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400'
              } ${conversation?.type === 'group' ? 'truncate max-w-[300px]' : ''}`}>
                {(() => {
                  if (typingUsers.size > 0) return 'typing...';
                  if (conversation?.type === 'group') return conversation.members?.map(m => m.username).join(', ');
                  const otherUser = getOtherUser();
                  if (!otherUser) return '';
                  if (onlineUsers.includes(otherUser._id)) return 'Online';
                  if (otherUser.lastSeen) {
                    const date = new Date(otherUser.lastSeen);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    let prefix = '';
                    if (date >= today) prefix = 'today at';
                    else if (date >= yesterday) prefix = 'yesterday at';
                    else prefix = format(date, 'MMM d, yyyy');
                    
                    return `last seen ${prefix} ${format(date, 'h:mm a')}`;
                  }
                  return 'offline';
                })()}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
          <button onClick={() => handleCall('video')} className="hover:text-green-500 dark:hover:text-green-400 transition-colors hidden sm:block"><Video size={20} /></button>
          <button onClick={() => handleCall('voice')} className="hover:text-green-500 dark:hover:text-green-400 transition-colors hidden sm:block"><Phone size={19} /></button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1 hidden sm:block"></div>
          
          <div className="relative flex items-center">
            {isSearching && (
              <input 
                 type="text" 
                 placeholder="Search message..."
                 autoFocus
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="bg-gray-100 dark:bg-[#1f2937] border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1 text-sm outline-none focus:border-green-500 mr-2 animate-slide-in-right"
              />
            )}
            <button 
              onClick={() => setIsSearching(!isSearching)} 
              className={`hover:text-gray-800 dark:hover:text-gray-200 transition-colors ${isSearching ? 'text-green-500' : ''}`}
            >
              {isSearching ? <X size={19} /> : <SearchIcon size={19} />}
            </button>
          </div>

          <div className="relative">
             <button onClick={() => setShowMenu(!showMenu)} className={`hover:text-gray-800 dark:hover:text-gray-200 transition-colors ${showMenu ? 'text-gray-900 dark:text-white' : ''}`}><MoreVertical size={20} /></button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1f2937] rounded-xl shadow-2xl py-2 z-50 border border-gray-100 dark:border-gray-800 animate-pop-in overflow-hidden">
                 <MenuItem icon={<UserPlus size={16} />} text="Contact info" onClick={() => {onOpenContactInfo(getOtherUser()); setShowMenu(false)}} />
                 <MenuItem icon={<Bell size={16} />} text="Mute notifications" onClick={() => {onToggleMute(); setShowMenu(false)}} />
                 <MenuItem icon={<History size={16} />} text="Disappearing messages" onClick={() => {onDisappearingMessages(); setShowMenu(false)}} />
                 <MenuItem icon={<Heart size={16} />} text="Add to favourites" onClick={() => {onToggleFavourite(); setShowMenu(false)}} />
                 <MenuItem icon={<Trash2 size={16} />} text="Close chat" onClick={() => {onCloseChat(); setShowMenu(false)}} />
                 <div className="my-1 border-t border-gray-100 dark:border-gray-800"></div>
                 <MenuItem icon={<Flag size={16} />} text="Report" danger onClick={() => {onReportUser(getOtherUser()?._id); setShowMenu(false)}} />
                 <MenuItem 
                   icon={<Ban size={16} />} 
                   text={currentUser?._id && currentUser?.blockedUsers?.some(userId => (userId._id || userId) === getOtherUser()?._id) ? "Unblock" : "Block"} 
                   danger 
                   onClick={() => {onBlockUser(getOtherUser()?._id); setShowMenu(false)}} 
                 />
                 <MenuItem icon={<Trash2 size={16} />} text="Clear chat" danger onClick={() => {onClearChat(); setShowMenu(false)}} />
                 <MenuItem icon={<Trash2 size={16} />} text="Delete chat" danger onClick={() => {onDeleteChat(); setShowMenu(false)}} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 z-10 scroll-smooth relative"
        onScroll={handleScroll}
        ref={containerRef}
      >
        {/* Subtle Chat background pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-[0.03] pointer-events-none"></div>

        {/* Loading Spinner for Infinite Scroll */}
        {isLoadingMore && (
          <div className="flex justify-center my-2">
            <div className="w-6 h-6 border-2 border-green-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
        )}

        {/* Security Notification */}
        <div className="flex justify-center mb-6 mt-2">
          <div className="bg-white/70 dark:bg-[#1f2937]/70 backdrop-blur-sm border border-yellow-500/20 px-4 py-2 rounded-lg text-xs text-yellow-600 dark:text-yellow-500/80 font-medium text-center max-w-sm shadow-sm flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500/20 flex items-center justify-center shrink-0">🔒</div>
            Messages are end-to-end encrypted. Nobody outside of this chat can read them.
          </div>
        </div>

        {/* Message Rendering */}
        {(viewMode === 'all' ? filteredMessages : (
          viewMode === 'starred' 
            ? messages.filter(m => m.starredBy?.includes(currentUser._id))
            : messages.filter(m => m.mediaType !== 'none' || m.text.includes('http'))
        )).map((m, index) => {
          const isMine = m.sender && (m.sender._id === currentUser._id || m.sender === currentUser._id);
          const currentLabel = getDateLabel(m.createdAt || new Date());
          const showDatePill = viewMode === 'all' && currentLabel !== lastDateLabel;
          
          // Unread divider logic
          const isFirstUnread = unreadCount > 0 && index === messages.length - unreadCount;

          // Grouping logic: check if same sender as previous message on SAME day
          const prevM = index > 0 ? filteredMessages[index - 1] : null;
          const isSameSender = prevM && (
            (prevM.sender?._id || prevM.sender) === (m.sender?._id || m.sender)
          ) && !showDatePill && !isFirstUnread;

          if (viewMode === 'all') {
            lastDateLabel = currentLabel;
          }

          return (
            <React.Fragment key={m._id || index}>
              {showDatePill && (
                <div className="flex justify-center my-6">
                  <div className="theme-glass px-4 py-1.5 rounded-full text-xs text-gray-500 dark:text-gray-300 font-medium tracking-wider shadow-sm">
                    {currentLabel}
                  </div>
                </div>
              )}

              {isFirstUnread && (
                <div ref={unreadRef} className="flex justify-center my-8 sticky top-2 z-20">
                  <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-green-600 dark:text-green-500 text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg border border-green-100 dark:border-green-900/30 uppercase tracking-widest animate-bounce-subtle">
                    {unreadCount} Unread Messages
                  </div>
                </div>
              )}

              <div className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} ${isMine ? 'animate-slide-in-right' : 'animate-slide-in-left'} ${isSameSender ? '-mt-3' : 'mt-1'}`}>
                <MessageBubble 
                  message={m} 
                  currentUser={currentUser} 
                  conversationType={conversation?.type} 
                  onToggleStar={handleToggleStar}
                  isReceiverOnline={conversation?.type !== 'group' && onlineUsers.includes(getOtherUser()?._id)}
                  isSameSender={isSameSender}
                  onReply={(msg) => setReplyingTo({ 
                    messageId: msg._id, 
                    text: msg.text, 
                    senderName: msg.sender?.username || 'User',
                    mediaType: msg.mediaType
                  })}
                  onReact={(emoji) => handleReact(m._id, emoji)}
                  onEdit={() => setEditingMessage(m)}
                  onDelete={(type) => handleDeleteMessage(m._id, type)}
                  onOpenMessageInfo={() => onOpenMessageInfo(m)}
                />
              </div>
            </React.Fragment>
          );
        })}
        
        {/* Typing Indicator Bubble */}
        {typingUsers.size > 0 && (
          <div className="flex justify-start animate-spring-pop w-full mb-2">
            <div className="theme-glass rounded-2xl rounded-tl-none px-4 py-3 shadow-md flex space-x-1.5 items-center">
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full typing-dot"></div>
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full typing-dot"></div>
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full typing-dot"></div>
            </div>
          </div>
        )}
        
        {/* Invisible div to scroll to */}
        <div ref={scrollRef} className="h-1"></div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollDown && (
        <button 
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-6 z-30 w-11 h-11 rounded-full theme-glass flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white bg-white/90 dark:bg-gray-800/90 transition-all duration-300 shadow-xl animate-pop-in border border-gray-200 dark:border-gray-700"
        >
          <ChevronDown size={24} />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white dark:border-slate-800 shadow-sm animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </button>
      )}

      {/* Input Area */}
      <div className="z-20">
        {currentUser.blockedUsers?.some(id => (id._id || id) === getOtherUser()?._id) ? (
          <div className="bg-gray-100 dark:bg-gray-800/80 p-6 flex flex-col items-center justify-center border-t border-gray-200 dark:border-gray-700 animate-slide-in-up">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium text-center">
              You blocked {getChatName()}. <br className="sm:hidden" /> Tap to unblock to send a message.
            </p>
            <button 
              onClick={() => onBlockUser(getOtherUser()?._id)}
              className="px-8 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-xs font-extrabold transition-all active:scale-95 shadow-lg shadow-green-500/25 uppercase tracking-wider"
            >
              Unblock
            </button>
          </div>
        ) : (
          <MessageInput 
            onSend={handleSendMessage} 
            socket={socket} 
            conversationId={conversation._id} 
            currentUser={currentUser} 
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
          />
        )}
      </div>

      {/* Call Overlay */}
      {callStatus && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-fade-in">
           <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-[#00d4ff] flex items-center justify-center text-4xl font-bold mb-6 animate-pulse-badge">
             {getChatName()[0]?.toUpperCase()}
           </div>
           <h2 className="text-2xl font-semibold mb-2">{getChatName()}</h2>
           <p className="text-gray-400 mb-12 flex items-center gap-2">
             {callStatus === 'calling' ? 'Calling...' : 'In-call'}
             <span className="flex gap-1">
                <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
                <span className="w-1 h-1 bg-white rounded-full animate-bounce delay-100"></span>
                <span className="w-1 h-1 bg-white rounded-full animate-bounce delay-200"></span>
             </span>
           </p>

           <div className="flex gap-8">
              <button 
                onClick={() => setCallStatus(null)}
                className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
              >
                <X size={32} />
              </button>
              {callType === 'video' && (
                <button className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors">
                  <Video size={28} />
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, text, onClick, danger }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${danger ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
