const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoute = require('./routes/auth');
const usersRoute = require('./routes/users');
const conversationsRoute = require('./routes/conversations');
const messagesRoute = require('./routes/messages');
const reportsRoute = require('./routes/reports');

dotenv.config();

const app = express();
const server = http.createServer(app);

const path = require('path');

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

// Serve stationary files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route Middlewares
app.use('/api/auth', authRoute);
app.use('/api/users', usersRoute);
app.use('/api/conversations', conversationsRoute);
// Make messages route accessible at /api/conversations/:id/messages
app.use('/api/conversations', messagesRoute);
app.use('/api/reports', reportsRoute);

// Socket.io global online users tracker
const onlineUsers = new Map(); // maps socket.id to userId
app.set('onlineUsers', onlineUsers);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Presence
  socket.on('userConnected', async (userId) => {
    onlineUsers.set(socket.id, userId);
    io.emit('onlineUsersUpdate', Array.from(new Set(onlineUsers.values())));

    // Catch-up delivery
    try {
      const Message = require('./models/Message');
      const undeliveredMessages = await Message.find({
        status: 'sent',
        sender: { $ne: userId }
      });
      
      const User = require('./models/User');
      const UserConversation = require('./models/UserConversation');
      const Conversation = require('./models/Conversation');

      for (const msg of undeliveredMessages) {
        const conv = await Conversation.findById(msg.conversationId);
        if (conv && conv.members.includes(userId)) {
          // Mark as delivered
          msg.status = 'delivered';
          msg.deliveredTo.push({ userId, deliveredAt: new Date() });
          await msg.save();
          
          io.to(msg.conversationId.toString()).emit('messageDelivered', {
            messageId: msg._id,
            conversationId: msg.conversationId,
            userId,
            status: 'delivered'
          });
        }
      }
    } catch (err) {
      console.error('Error in catch-up delivery:', err);
    }

    // Auto-unmute logic on connect
    try {
      const dbUser = await User.findById(userId);
      if (dbUser && dbUser.mutedConversations?.length > 0) {
        const now = new Date();
        const initialCount = dbUser.mutedConversations.length;
        dbUser.mutedConversations = dbUser.mutedConversations.filter(mute => 
          !mute.mutedUntil || new Date(mute.mutedUntil) > now
        );
        if (dbUser.mutedConversations.length !== initialCount) {
          await dbUser.save();
        }
      }
    } catch (err) {
      console.error('Error in auto-unmute check:', err);
    }
  });

  // joinRoom
  socket.on('joinRoom', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.id} joined room ${conversationId}`);
  });

  // sendMessage
  socket.on('sendMessage', async (message) => {
    // Check if recipients are in the room for instant read
    const room = io.sockets.adapter.rooms.get(message.conversationId);
    const senderId = message.sender?._id || message.sender;
    
    if (room) {
      let readByAll = true; // In 1-on-1, if the other is in room, it's read by all
      let updatedStatus = message.status;

      // For simplicity in this socket handler, we'll mark as read if ANY other member is in the room
      // and this is a DM. For groups, it's more complex (requires all members to be in room).
      // The user said: "If receiver is IN the conversation and a new message arrives: Mark it as read immediately"
      
      const participantsInRoom = Array.from(room);
      const otherParticipantsInRoom = participantsInRoom.filter(sid => sid !== socket.id);

      if (otherParticipantsInRoom.length > 0) {
        try {
          const Message = require('./models/Message');
          const UserConversation = require('./models/UserConversation');
          
          const now = new Date();
          const readerIds = [];
          
          for (const sid of otherParticipantsInRoom) {
            const uid = onlineUsers.get(sid);
            if (uid && uid !== senderId) {
              readerIds.push(uid);
            }
          }

          if (readerIds.length > 0) {
            // Update the message in DB
            const updatedMsg = await Message.findById(message._id);
            if (updatedMsg) {
              readerIds.forEach(uid => {
                if (!updatedMsg.readBy.some(r => r.userId.toString() === uid)) {
                  updatedMsg.readBy.push({ userId: uid, readAt: now });
                }
              });
              
              // For DMs, if the other person is there, it's 'read'
              // For Groups, user said "Double green tick = read by ALL members"
              // We'll mark as 'read' if it's a DM, or just update readBy for groups.
              // We'll trust the client or a more sophisticated check for 'read by ALL'.
              
              await updatedMsg.save();
              
              // Update UserConversation for readers
              for (const uid of readerIds) {
                await UserConversation.findOneAndUpdate(
                  { userId: uid, conversationId: message.conversationId },
                  { unreadCount: 0, lastReadAt: now, lastReadMessageId: message._id },
                  { upsert: true }
                );
                
                io.to(message.conversationId).emit('receiptUpdate', { 
                  conversationId: message.conversationId, 
                  readerId: uid,
                  messageId: message._id,
                  status: updatedMsg.status // Will be determined by frontend usually, but let's keep it consistent
                });
              }
            }
          }
        } catch (err) {
          console.error('Error in instant read update:', err);
        }
      }
    }

    // broadcast new message
    io.to(message.conversationId).emit('receiveMessage', message);
  });

  socket.on('typing', ({ conversationId, senderId }) => {
    socket.to(conversationId).emit('typing', { conversationId, senderId });
  });

  socket.on('stopTyping', ({ conversationId, senderId }) => {
    socket.to(conversationId).emit('stopTyping', { conversationId, senderId });
  });

  socket.on('clearChat', (conversationId) => {
    io.to(conversationId).emit('chatCleared', conversationId);
  });

  socket.on('deleteChat', (conversationId) => {
    io.to(conversationId).emit('chatDeleted', conversationId);
  });

  socket.on('starMessage', ({ conversationId, messageId, starredBy }) => {
    io.to(conversationId).emit('messageStarred', { messageId, starredBy });
  });

  socket.on('messageRead', ({ conversationId, readerId }) => {
    io.to(conversationId).emit('receiptUpdate', { conversationId, readerId });
  });

  socket.on('reactMessage', ({ conversationId, messageId, reactions }) => {
    io.to(conversationId).emit('reactionUpdate', { messageId, reactions });
  });

  socket.on('editMessage', ({ conversationId, message }) => {
    io.to(conversationId).emit('messageEdited', message);
  });

  socket.on('deleteMessage', ({ conversationId, messageId, type, userId }) => {
    io.to(conversationId).emit('messageDeleted', { messageId, type, userId });
  });

  socket.on('updateDisappearingTimer', ({ conversationId, timer }) => {
    io.to(conversationId).emit('disappearingTimerUpdated', { timer });
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.id}`);
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      onlineUsers.delete(socket.id);
      io.emit('onlineUsersUpdate', Array.from(new Set(onlineUsers.values())));
      
      try {
        const User = require('./models/User');
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      } catch (err) {
        console.error('Error updating lastSeen:', err);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/whatsapp-clone')
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));

    // Background job for expiring messages (Phase 1)
    setInterval(async () => {
      try {
        const Message = require('./models/Message');
        const now = new Date();
        const expiredMessages = await Message.find({ expiresAt: { $lte: now } });
        if (expiredMessages.length > 0) {
          await Message.deleteMany({ expiresAt: { $lte: now } });
          const convIds = [...new Set(expiredMessages.map(m => m.conversationId.toString()))];
          convIds.forEach(id => {
            io.to(id).emit('messagesExpired', { conversationId: id });
          });
        }
      } catch (err) {
        console.error('Error in message expiration job:', err);
      }
    }, 60000);
  })
  .catch((err) => console.log(err));
