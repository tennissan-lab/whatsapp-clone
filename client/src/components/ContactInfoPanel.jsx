import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Camera, Pencil, ChevronRight, Star, Bell, History, Shield, Lock, Search, Video, Phone, UserPlus, Heart, List, Trash2, Ban, Flag, MessageSquare } from 'lucide-react';
import api from '../api';

export default function ContactInfoPanel({ 
  onClose, 
  user, 
  isSelf, 
  conversation, 
  currentUser,
  onUpdateProfile, 
  onUpdateMetadata,
  onShowStarred,
  onShowMedia,
  onClearChat,
  onDeleteChat,
  onBlockUser,
  onReportUser,
  onToggleMute,
  onUnmute,
  onDisappearingMessages,
  onToggleFavourite,
  onSearch,
  onVideoCall,
  onVoiceCall
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || 'Hey there! I am using WhatsApp.');
  const [bio, setBio] = useState(user?.bio || '');
  const [commonGroups, setCommonGroups] = useState([]);
  const [mediaMessages, setMediaMessages] = useState([]);
  const [starredMessages, setStarredMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id || !currentUser?._id) return;
      setIsLoading(true);
      try {
        // Fetch common groups
        if (!isSelf && user?._id) {
          const groupsRes = await api.get(`/users/${currentUser._id}/common-groups/${user._id}`);
          setCommonGroups(groupsRes.data);
        }

        // Fetch starred messages for this specific conversation
        if (conversation?._id) {
          const starredRes = await api.get(`/conversations/conversation/${conversation._id}/starred?userId=${currentUser._id}`);
          setStarredMessages(starredRes.data);

          // Fetch media messages
          const mediaRes = await api.get(`/conversations/conversation/${conversation._id}/media`);
          setMediaMessages(mediaRes.data);
        }

      } catch (err) {
        console.error('Failed to fetch contact panel data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?._id, conversation?._id, currentUser?._id, isSelf]);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setAbout(user.about || 'Hey there! I am using WhatsApp.');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      const res = await api.put(`/users/${user._id}`, { username, about, bio });
      onUpdateProfile(res.data);
      setIsEditingName(false);
      setIsEditingAbout(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    }
  };

   const getMuteStatus = () => {
    const muteInfo = currentUser.mutedConversations?.find(m => (m.conversationId?._id || m.conversationId) === conversation?._id);
    if (!muteInfo) return null;
    if (!muteInfo.mutedUntil) return 'Always';
    return `Until ${format(new Date(muteInfo.mutedUntil), 'MMM d, h:mm a')}`;
  };

  const isBlocked = currentUser.blockedUsers?.some(id => (id._id || id) === user?._id);

  const getDisappearingLabel = () => {
    if (!conversation?.disappearingMessages?.enabled) return 'Off';
    const dur = conversation.disappearingMessages.duration;
    if (dur === 86400) return '24 hours';
    if (dur === 604800) return '7 days';
    if (dur === 7776000) return '90 days';
    return 'On';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111827] border-l border-gray-200 dark:border-gray-800 animate-slide-in-right overflow-y-auto w-full custom-scrollbar">
      {/* Header */}
      <div className="p-4 flex items-center gap-6 bg-gray-50 dark:bg-[#0a0f1e] border-b border-gray-200 dark:border-gray-800 shrink-0">
        <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
          <X size={24} />
        </button>
        <span className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
          {isSelf ? 'Profile' : 'Contact info'}
        </span>
      </div>

      <div className="flex-1 pb-10">
        {/* Profile Pic Section */}
        <div className="flex flex-col items-center py-8 px-6 text-center bg-white dark:bg-[#111827]">
          <div className="relative group mb-5">
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-6xl font-bold shadow-xl border-4 border-white dark:border-[#111827]">
              {username?.[0]?.toUpperCase()}
            </div>
            {isSelf && (
              <div className="absolute inset-0 bg-black/30 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white mb-2" size={32} />
                <span className="text-white text-xs font-medium uppercase tracking-wider">Change Profile Photo</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            {isEditingName ? (
              <div className="flex items-center gap-2 border-b-2 border-green-500 py-1 w-full max-w-xs">
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-transparent border-none outline-none text-xl font-medium text-gray-800 dark:text-gray-100 w-full"
                  autoFocus
                />
                <button onClick={handleSaveProfile} className="text-green-500 hover:text-green-600"><Pencil size={18} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-medium text-gray-800 dark:text-gray-100 tracking-tight">{username}</h2>
                {isSelf && <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-green-500 transition-colors"><Pencil size={18} /></button>}
              </div>
            )}
            {!isSelf && <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{user?.email}</p>}
          </div>
        </div>

        {!isSelf && (
          <div className="flex justify-center gap-8 py-4 border-b border-gray-100 dark:border-gray-800/50">
             <button 
               onClick={onVideoCall}
               className="flex flex-col items-center gap-2 group"
             >
                <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all shadow-sm">
                   <Video size={22} />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Video</span>
             </button>
             <button 
               onClick={onVoiceCall}
               className="flex flex-col items-center gap-2 group"
             >
                <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all shadow-sm">
                   <Phone size={22} />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Voice</span>
             </button>
             
             {/* Divider to match header style */}
             <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 my-auto"></div>

             <button 
               onClick={onSearch}
               className="flex flex-col items-center gap-2 group"
             >
                <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all shadow-sm">
                   <Search size={22} />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Search</span>
             </button>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-3 p-4">
          {/* About / Bio */}
          <div className="bg-gray-50/50 dark:bg-[#1f2937]/30 rounded-2xl p-5 border border-gray-100/50 dark:border-gray-800/30">
            <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={14} /> About
            </h3>
            {isEditingAbout ? (
              <div className="flex flex-col gap-3">
                <textarea 
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="bg-gray-100 dark:bg-[#0a0f1e] border border-gray-300 dark:border-gray-700 rounded-xl p-3 outline-none text-gray-800 dark:text-gray-100 resize-none h-24 focus:border-green-500"
                />
                <div className="flex justify-end gap-2">
                   <button onClick={() => setIsEditingAbout(false)} className="px-4 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                   <button onClick={handleSaveProfile} className="px-4 py-1.5 rounded-lg text-sm bg-green-500 text-white hover:bg-green-600 transition-colors shadow-md shadow-green-500/20">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{about}</p>
                {isSelf && <button onClick={() => setIsEditingAbout(true)} className="text-gray-400 hover:text-green-500 p-1"><Pencil size={16} /></button>}
              </div>
            )}
            {isSelf && (
              <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-800/50">
                 <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">Email Address</h3>
                 <p className="text-gray-800 dark:text-gray-200 font-medium">{user?.email}</p>
              </div>
            )}
          </div>

          {!isSelf && (
            <>
              {/* Media, links and docs */}
              <div 
                onClick={onShowMedia}
                className="bg-gray-50/50 dark:bg-[#1f2937]/30 rounded-2xl p-4 border border-gray-100/50 dark:border-gray-800/30 cursor-pointer group hover:bg-gray-100 dark:hover:bg-[#1f2937]/50 transition-colors"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Media, links and docs</h3>
                  <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                    <span>{mediaMessages.length}</span> <ChevronRight size={18} />
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {mediaMessages.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No media shared yet</p>
                  ) : (
                    mediaMessages.slice(0, 5).map(msg => (
                      <div key={msg._id} className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center border border-gray-300 dark:border-gray-700 overflow-hidden shrink-0">
                         {msg.mediaType === 'image' ? (
                           <img src={msg.text} alt="Shared media" className="w-full h-full object-cover" />
                         ) : (
                           <div className="flex flex-col items-center gap-1 p-2">
                              <Lock size={20} className="text-gray-400" />
                              <span className="text-[8px] text-gray-500 truncate max-w-full">{msg.text.substring(0, 10)}...</span>
                           </div>
                         )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action List */}
              <div className="bg-gray-50/50 dark:bg-[#1f2937]/30 rounded-2xl border border-gray-100/50 dark:border-gray-800/30 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800/50">
                <OptionItem 
                  icon={<Star size={18} />} 
                  title="Starred messages" 
                  subtitle={starredMessages.length > 0 ? `${starredMessages.length} messages` : 'None'}
                  onClick={onShowStarred}
                />
                <OptionItem 
                  icon={<Bell size={18} />} 
                  title="Mute notifications" 
                  subtitle={getMuteStatus() ? `Muted: ${getMuteStatus()}` : 'Off'} 
                  onClick={onToggleMute}
                  rightElement={getMuteStatus() && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUnmute(); }}
                      className="text-xs text-green-500 font-bold hover:bg-green-50 dark:hover:bg-green-500/10 px-2 py-1 rounded-md transition-colors"
                    >
                      Unmute
                    </button>
                  )}
                />
                <OptionItem 
                  icon={<History size={18} />} 
                  title="Disappearing messages" 
                  subtitle={getDisappearingLabel()} 
                  onClick={onDisappearingMessages} 
                />
              </div>

              {/* Common Groups */}
              <div className="bg-gray-50/50 dark:bg-[#1f2937]/30 rounded-2xl p-4 border border-gray-100/50 dark:border-gray-800/30">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-widest">{commonGroups.length} {commonGroups.length === 1 ? 'group' : 'groups'} in common</h3>
                {commonGroups.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No common groups</p>
                ) : (
                  commonGroups.map(group => (
                    <div key={group._id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-colors">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {group.name[0]?.toUpperCase()}
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{group.name}</h4>
                          <p className="text-xs text-gray-500 truncate">
                             {group.members.map(m => m.username).join(', ')}
                          </p>
                       </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Actions */}
              <div className="space-y-2 mt-4 text-rose-500 dark:text-rose-400/90 font-medium px-2">
                 <button 
                  onClick={onToggleFavourite}
                  className="flex items-center gap-4 w-full p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                 >
                    <Heart size={20} /> Add to favourites
                 </button>
                 <button 
                  onClick={onClearChat}
                  className="flex items-center gap-4 w-full p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                 >
                    <Trash2 size={20} /> Clear chat
                 </button>
                  <button 
                  onClick={() => onBlockUser(user?._id)}
                  className="flex items-center gap-4 w-full p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                 >
                    <Ban size={20} /> {isBlocked ? 'Unblock' : 'Block'} {username}
                 </button>
                 <button 
                  onClick={() => onReportUser(user?._id)}
                  className="flex items-center gap-4 w-full p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                 >
                    <Flag size={20} /> Report {username}
                 </button>
                 <button 
                  onClick={onDeleteChat}
                  className="flex items-center gap-4 w-full p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                 >
                    <Trash2 size={20} /> Delete chat
                 </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionItem({ icon, title, subtitle, onClick, rightElement }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors">{icon}</div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[15px] font-medium text-gray-800 dark:text-gray-100">{title}</span>
          {subtitle && <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightElement}
        <ChevronRight size={18} className="text-gray-400 group-hover:text-green-500 transition-colors" />
      </div>
    </div>
  );
}
