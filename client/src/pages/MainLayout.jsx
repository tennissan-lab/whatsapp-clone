import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, MessageCircle } from 'lucide-react';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import CreateGroupModal from '../components/CreateGroupModal';
import ContactInfoPanel from '../components/ContactInfoPanel';
import MessageInfoPanel from '../components/MessageInfoPanel'; // Added import
import ThemeToggle from '../components/ThemeToggle';
import DisappearingMessagesModal from '../components/DisappearingMessagesModal';
import MuteModal from '../components/MuteModal';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';
import { io } from 'socket.io-client';

export default function MainLayout() {
  const { user, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [rightPanel, setRightPanel] = useState({ type: null, data: null }); // type: 'profile', 'contact'
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: () => {}, hasInput: false });
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [loading, setLoading] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
  };

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_REACT_APP_SOCKET_URL || import.meta.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    setSocket(newSocket);

    // Global listener for background notifications and list updates
    const handleGlobalMessage = () => {
      fetchConversations();
      if (document.hidden) {
        document.title = '(1) New message';
      }
    };

    newSocket.on('receiveMessage', handleGlobalMessage);
    
    newSocket.on('disappearingTimerUpdated', ({ conversationId }) => {
      fetchConversations(conversationId);
    });
    
    if (user?._id) {
      newSocket.emit('userConnected', user._id);
    }
    
    newSocket.on('onlineUsersUpdate', (users) => {
      setOnlineUsers(users);
    });

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        document.title = 'WhatsApp Clone';
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      newSocket.off('receiveMessage', handleGlobalMessage);
      newSocket.off('onlineUsersUpdate');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      newSocket.close();
    };
  }, [user]);

  const fetchConversations = async (updatedActiveConvId = null) => {
    try {
      if (!user?._id) return;
      setLoading(true);
      const res = await api.get(`/conversations/${user._id}`);
      setConversations(res.data);
      
      // If we have an active conversation, update it from the fresh list
      const currentActiveId = updatedActiveConvId || activeConversation?._id;
      if (currentActiveId) {
        const updated = res.data.find(c => c._id === currentActiveId);
        if (updated) setActiveConversation(updated);
      }
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUpdateMetadata = async (metadata) => {
    try {
      if (!activeConversation || !user?._id) return;
      await api.put(`/conversations/${activeConversation._id}/metadata`, {
        userId: user._id,
        ...metadata
      });
      fetchConversations();
    } catch (err) {
      console.error('Failed to update metadata', err);
    }
  };

  const handleUpdateUser = (updatedUser) => {
    // Update the global AuthContext state which triggers re-renders in all components
    updateUser(updatedUser);
    // Refresh conversations because user data might be part of them
    fetchConversations();
  };

  const handleClearChat = async () => {
    if (!activeConversation) return;
    setConfirmState({
      isOpen: true,
      type: 'danger',
      title: 'Clear Chat',
      message: 'Are you sure you want to clear all messages in this chat? This action cannot be undone.',
      confirmText: 'Clear All',
      onConfirm: async () => {
        try {
          await api.delete(`/conversations/${activeConversation._id}/messages`);
          if (socket) {
            socket.emit('clearChat', activeConversation._id);
          }
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error('Failed to clear chat', err);
        }
      }
    });
  };

  const handleDeleteChat = async () => {
    if (!activeConversation) return;
    setConfirmState({
      isOpen: true,
      type: 'danger',
      title: 'Delete Chat',
      message: 'Are you sure you want to delete this chat permanently? You will lose all conversation history.',
      confirmText: 'Delete Permanently',
      onConfirm: async () => {
        try {
          await api.delete(`/conversations/${activeConversation._id}`);
          if (socket) {
            socket.emit('deleteChat', activeConversation._id);
          }
          setActiveConversation(null);
          setRightPanel({ type: null, data: null });
          fetchConversations();
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error('Failed to delete chat', err);
        }
      }
    });
  };

  const handleBlockUser = async (userToBlockId) => {
    const isCurrentlyBlocked = user?.blockedUsers?.includes(userToBlockId);
    
    setConfirmState({
      isOpen: true,
      type: isCurrentlyBlocked ? 'info' : 'danger',
      title: isCurrentlyBlocked ? 'Unblock User' : 'Block User',
      message: isCurrentlyBlocked ? 'Are you sure you want to unblock this user?' : 'Blocked users will no longer be able to call you or send you messages.',
      confirmText: isCurrentlyBlocked ? 'Unblock' : 'Block',
      onConfirm: async () => {
        try {
          if (!user?._id) return;
          const res = await api.post(`/users/${userToBlockId}/block`, { currentUserId: user._id });
          handleUpdateUser(res.data.user);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          showToast(res.data.isBlocked 
            ? `You blocked ${activeConversation?.name || 'User'}` 
            : `You unblocked ${activeConversation?.name || 'User'}. You can now message each other.`,
            res.data.isBlocked ? 'danger' : 'success'
          );
        } catch (err) {
          console.error('Failed to block/unblock user', err);
        }
      }
    });
  };

  const handleReportUser = async (reportedUserId) => {
    setConfirmState({
      isOpen: true,
      type: 'warning',
      title: 'Report User',
      message: 'Is this user bothering you? Report them to our team for review.',
      confirmText: 'Send Report',
      hasInput: true,
      inputPlaceholder: 'Please describe the issue...',
      inputLabel: 'Reason for report',
      onConfirm: async (reason) => {
        try {
          if (!user?._id) return;
          await api.post('/reports', {
            reporterId: user._id,
            reportedUserId,
            conversationId: activeConversation?._id,
            reason
          });
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          alert('User reported successfully.');
        } catch (err) {
          console.error('Failed to report user', err);
        }
      }
    });
  };
  const handleMuteSelect = async (duration) => {
    try {
      if (!activeConversation?._id || !user?._id) return;
      const res = await api.put(`/conversations/${activeConversation._id}/mute`, {
        userId: user._id,
        duration
      });
      // res.data is the updated user
      updateUser(res.data);
      fetchConversations();
      setShowMuteModal(false);
      showToast(`Conversation muted ${duration === 'always' ? 'Always' : 'for ' + duration.replace('h', ' hours').replace('w', ' week')}`);
    } catch (err) {
      console.error('Failed to mute chat', err);
    }
  };

  const handleUnmute = async () => {
    try {
      if (!activeConversation?._id || !user?._id) return;
      const res = await api.put(`/conversations/${activeConversation._id}/unmute`, { userId: user._id });
      updateUser(res.data);
      fetchConversations();
      showToast('Conversation unmuted');
    } catch (err) {
      console.error('Failed to unmute chat', err);
    }
  };

  const handleDisappearingSelect = async (duration) => {
    try {
      const enabled = duration > 0;
      if (!activeConversation?._id || !user?._id) return;
      const res = await api.put(`/conversations/${activeConversation._id}/disappearing`, { 
        enabled, 
        duration,
        userId: user._id
      });
      if (socket) {
        socket.emit('updateDisappearingTimer', { conversationId: activeConversation._id, timer: duration });
      }
      // This is the key: update state immediately by passing the ID to fetchConversations
      fetchConversations(activeConversation._id);
      setShowDisappearingModal(false);
      showToast(enabled 
        ? `Disappearing messages set to ${duration === 86400 ? '24 hours' : duration === 604800 ? '7 days' : '90 days'}. New messages will disappear after ${duration === 86400 ? '24 hours' : duration === 604800 ? '7 days' : '90 days'}.`
        : 'Disappearing messages turned off.');
    } catch (err) {
      console.error('Failed to update disappearing messages', err);
    }
  };

  const handleToggleMute = () => {
    setShowMuteModal(true);
  };

  const handleDisappearingMessages = () => {
    setShowDisappearingModal(true);
  };

  const handleToggleFavourite = () => {
    if (!user?._id) return;
    const currentMeta = activeConversation?.userMetadata?.find(m => m.userId === user._id);
    const isFav = currentMeta ? currentMeta.isFavourite : false;
    handleUpdateMetadata({ isFavourite: !isFav });
  };

  // Socket listener for chat deleted event
  useEffect(() => {
    if (!socket) return;
    const handleChatDeleted = (deletedId) => {
      fetchConversations();
      setActiveConversation(prev => prev?._id === deletedId ? null : prev);
      setRightPanel(prev => prev?.conversation?._id === deletedId ? { type: null, data: null } : prev);
    };
    socket.on('chatDeleted', handleChatDeleted);
    return () => socket.off('chatDeleted', handleChatDeleted);
  }, [socket]);

  return (
    <div className="relative flex h-screen items-center justify-center p-4 lg:p-6 animate-fade-slide-up overflow-hidden bg-slate-100 dark:bg-[#0a0f1e] text-slate-800 dark:text-slate-100 transition-all duration-300">
      
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="mesh-bg absolute inset-0 opacity-10"></div>
        <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-green-500 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] orb-1 opacity-30 dark:opacity-20"></div>
        <div className="absolute top-[60%] right-[10%] w-[400px] h-[400px] bg-[#00d4ff] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] orb-2 opacity-30 dark:opacity-20"></div>
        <div className="absolute bottom-[20%] left-[50%] w-[600px] h-[600px] bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[150px] orb-3 opacity-30 dark:opacity-20"></div>
      </div>

      <div className="flex w-full h-full max-w-[1600px] mx-auto theme-glass rounded-2xl overflow-hidden shadow-2xl relative z-10 border border-gray-300/50 dark:border-gray-700/50">
        
        {/* Left Panel */}
        <div className="w-[380px] min-w-[320px] flex flex-col bg-white/80 dark:bg-[#111827]/80 border-r border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md z-20 transition-all duration-300">
          <div className="p-4 bg-gray-50/60 dark:bg-[#0a0f1e]/60 flex justify-between items-center border-b border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl shrink-0">
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => setRightPanel({ type: 'profile', data: user })}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-[#00d4ff] flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-transparent group-hover:ring-green-400">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#0a0f1e]"></div>
              </div>
              <div className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-green-500 transition-colors">
                {user?.username}
              </div>
            </div>
            <div className="flex space-x-1 text-gray-500 dark:text-gray-400">
              <ThemeToggle />
              <button onClick={() => setIsGroupModalOpen(true)} title="New Chat" className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-green-500 dark:hover:text-green-400 transition-colors duration-200 active:scale-95">
                <Plus size={20} />
              </button>
              <button onClick={handleLogout} title="Logout" className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 active:scale-95">
                <LogOut size={20} />
              </button>
            </div>
          </div>
          
          <ChatList 
            conversations={conversations} 
            activeConversation={activeConversation}
            setActiveConversation={setActiveConversation}
            currentUser={user}
            onUpdateConversation={fetchConversations}
            onlineUsers={onlineUsers}
            loading={loading}
          />
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col bg-slate-50/90 dark:bg-[#0a0f1e]/90 relative transition-opacity duration-300 z-10 overflow-hidden" key={activeConversation ? activeConversation._id : 'empty'}>
          <div className="noise-bg"></div>
          {activeConversation ? (
            <div className="absolute inset-0 animate-fade-slide-up">
              <ChatWindow 
                conversation={activeConversation} 
                currentUser={user} 
                socket={socket} 
                onMessageSent={fetchConversations} 
                onOpenContactInfo={(data, callbacks) => setRightPanel({ type: 'contact', data, ...callbacks })}
                onClearChat={handleClearChat}
                onDeleteChat={handleDeleteChat}
                onBlockUser={handleBlockUser}
                onReportUser={handleReportUser}
                onToggleMute={handleToggleMute}
                onUnmute={handleUnmute}
                onDisappearingMessages={handleDisappearingMessages}
                onToggleFavourite={handleToggleFavourite}
                onCloseChat={() => setActiveConversation(null)}
                onOpenMessageInfo={(msg) => setRightPanel({ type: 'info', data: msg })}
                onlineUsers={onlineUsers}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-transparent animate-pop-in relative z-10 h-full">
              <div className="w-32 h-32 mb-8 rounded-full bg-gradient-to-br from-white to-gray-100 dark:from-[#111827] dark:to-[#1f2937] flex items-center justify-center text-gray-400 dark:text-gray-600 shadow-xl border border-gray-200 dark:border-gray-700/50 animate-pulse-badge">
                <MessageCircle size={64} strokeWidth={1} className="text-gray-300 dark:text-gray-500" />
              </div>
              <h2 className="text-3xl font-light text-gray-500 dark:text-gray-300 mb-3 tracking-wide">WhatsApp Web</h2>
              <p className="text-gray-400 dark:text-gray-500 max-w-md text-center text-[15px] leading-relaxed">
                Send and receive messages seamlessly. Your personal conversations are end-to-end encrypted.
              </p>
              <div className="mt-8 px-4 py-2 bg-gray-100 dark:bg-[#111827] rounded-full border border-gray-300 dark:border-gray-800 text-xs text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                End-to-end Encrypted
              </div>
            </div>
          )}
        </div>

        {/* Right Panel Drawer */}
        {rightPanel.type && (
          <div className="w-[400px] min-w-[350px] z-30 relative h-full">
             {rightPanel.type === 'info' ? (
                <MessageInfoPanel 
                  message={rightPanel.data}
                  currentUser={user}
                  conversationType={activeConversation?.type}
                  socket={socket}
                  onClose={() => setRightPanel({ type: null, data: null })}
                />
             ) : (
                <ContactInfoPanel 
                    user={rightPanel.type === 'profile' ? user : rightPanel.data}
                    isSelf={rightPanel.type === 'profile'}
                    conversation={activeConversation}
                    currentUser={user}
                    onClose={() => setRightPanel({ type: null, data: null })}
                    onUpdateProfile={handleUpdateUser}
                    onUpdateMetadata={handleUpdateMetadata}
                    onShowStarred={rightPanel.onShowStarred}
                    onShowMedia={rightPanel.onShowMedia}
                    onClearChat={handleClearChat}
                    onDeleteChat={handleDeleteChat}
                    onBlockUser={handleBlockUser}
                    onReportUser={handleReportUser}
                    onToggleMute={handleToggleMute}
                    onUnmute={handleUnmute}
                    onDisappearingMessages={handleDisappearingMessages}
                    onToggleFavourite={handleToggleFavourite}
                    onSearch={rightPanel.onSearch}
                    onVideoCall={rightPanel.onVideoCall}
                    onVoiceCall={rightPanel.onVoiceCall}
                    onlineUsers={onlineUsers}
                />
             )}
          </div>
        )}
      </div>

      {isGroupModalOpen && (
        <CreateGroupModal 
          onClose={() => setIsGroupModalOpen(false)} 
          currentUser={user}
          onGroupCreated={(newGroup) => {
            setConversations([newGroup, ...conversations]);
            setIsGroupModalOpen(false);
            setActiveConversation(newGroup);
          }}
        />
      )}

      {/* Disappearing Messages Modal */}
      <DisappearingMessagesModal 
        isOpen={showDisappearingModal}
        onClose={() => setShowDisappearingModal(false)}
        currentTimer={activeConversation?.disappearingMessagesTimer || 0}
        onSelect={handleDisappearingSelect}
      />

      {/* Mute Modal */}
      <MuteModal 
        isOpen={showMuteModal}
        onClose={() => setShowMuteModal(false)}
        onSelect={handleMuteSelect}
      />

      {/* Unified Confirm Modal */}
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        hasInput={confirmState.hasInput}
        inputPlaceholder={confirmState.inputPlaceholder}
        inputLabel={confirmState.inputLabel}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl animate-fade-slide-up border flex items-center gap-3 min-w-[300px] justify-center text-sm font-medium transition-all ${
          toast.type === 'danger' ? 'bg-red-500 text-white border-red-400' : 
          toast.type === 'success' ? 'bg-green-500 text-white border-green-400' :
          'bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-gray-200 dark:border-gray-700'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
