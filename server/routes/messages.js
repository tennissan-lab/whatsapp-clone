const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const multer = require('multer');
const path = require('path');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// UPLOAD FILE
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    let mediaType = 'document';
    if (req.file.mimetype.startsWith('image/')) mediaType = 'image';
    else if (req.file.mimetype.startsWith('video/')) mediaType = 'video';
    
    res.status(200).json({ url: fileUrl, mediaType });
  } catch (err) {
    console.error('Error in UPLOAD FILE:', err);
    res.status(500).json({ error: err.message });
  }
});

// SEND MESSAGE (Modified to handle media)
router.post('/:id/messages', async (req, res) => {
  try {
    const { sender, text, mediaType, fileUrl, replyTo } = req.body;
    const conversationId = req.params.id;

    if (!text && !fileUrl) {
      return res.status(400).json({ error: 'Message content or file is required' });
    }

    // Check if sender is blocked
    const User = require('../models/User');
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const receiverIds = conversation.members.filter(m => m.toString() !== sender);
    const receivers = await User.find({ _id: { $in: receiverIds } });
    
    // Rule: If receiver blocked sender, silent drop
    const isBlockedByReceiver = receivers.some(r => r.blockedUsers.includes(sender));
    if (isBlockedByReceiver) {
      return res.status(200).json({ delivered: false, message: 'Message dropped' });
    }

    // Rule: If sender blocked receiver, 403 Forbidden
    const UserSender = await User.findById(sender);
    const hasBlockedReceiver = UserSender?.blockedUsers.some(blockedId => 
      receiverIds.includes(blockedId.toString())
    );
    if (hasBlockedReceiver) {
      return res.status(403).json({ error: 'You have blocked this user. Unblock to send messages.' });
    }

    const onlineUsersMap = req.app.get('onlineUsers');
    const onlineUserIds = Array.from(new Set(onlineUsersMap.values()));

    const isDelivered = receivers.some(r => onlineUserIds.includes(r._id.toString()));
    
    let initialStatus = 'sent';
    let deliveredTo = [];
    if (isDelivered) {
      initialStatus = 'delivered';
      // Add all currently online receivers to deliveredTo
      receivers.forEach(r => {
        if (onlineUserIds.includes(r._id.toString())) {
          deliveredTo.push({ userId: r._id, deliveredAt: new Date() });
        }
      });
    }

    let finalMediaType = mediaType || 'none';
    if (finalMediaType === 'none' && text) {
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      if (urlPattern.test(text)) finalMediaType = 'link';
    }

    let expiresAt = null;
    if (conversation.disappearingMessages?.enabled && conversation.disappearingMessages.duration > 0) {
      expiresAt = new Date(Date.now() + conversation.disappearingMessages.duration * 1000);
    }

    const newMessage = new Message({
      conversationId,
      sender,
      text: text || '',
      mediaType: finalMediaType,
      fileUrl: fileUrl || null,
      expiresAt,
      replyTo,
      status: initialStatus,
      deliveredTo,
      deliveredAt: initialStatus === 'delivered' ? new Date() : null
    });

    const savedMessage = await newMessage.save();
    
    await Conversation.findByIdAndUpdate(conversationId, { 
      updatedAt: new Date(),
      lastMessage: savedMessage._id
    });

    const UserConversation = require('../models/UserConversation');
    for (const memberId of conversation.members) {
      const updateData = {};
      if (memberId.toString() !== sender) {
        updateData.$inc = { unreadCount: 1 };
      }
      
      await UserConversation.findOneAndUpdate(
        { userId: memberId, conversationId },
        updateData,
        { upsert: true }
      );
    }

    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'username email')
      .populate('readBy.userId', 'username')
      .populate('deliveredTo.userId', 'username');

    if (savedMessage.status === 'delivered') {
      const io = req.app.get('io');
      io.to(conversationId).emit('messageStatusUpdate', populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Error in SEND MESSAGE:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET MESSAGES
router.get('/:id/messages', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Disappearing Messages Cleanup (Phase 1 logic)
    const conversation = await Conversation.findById(req.params.id);
    if (conversation && conversation.disappearingMessages?.enabled && conversation.disappearingMessages.duration > 0) {
      const now = new Date();
      await Message.deleteMany({
        conversationId: req.params.id,
        expiresAt: { $lte: now },
        starredBy: { $size: 0 } // Keep starred messages if desired, but user said "disappear after X time"
      });
    }

    const messages = await Message.find({
      conversationId: req.params.id,
    })
    .populate('sender', 'username email')
    .populate('readBy.userId', 'username')
    .populate('deliveredTo.userId', 'username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    // Return chronological order
    res.status(200).json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STAR/UNSTAR MESSAGE
router.put('/messages/:id/star', async (req, res) => {
  try {
    const { userId } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const isStarred = message.starredBy.includes(userId);
    if (isStarred) {
      message.starredBy = message.starredBy.filter(id => id.toString() !== userId);
    } else {
      message.starredBy.push(userId);
    }

    await message.save();
    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REACT TO MESSAGE
router.put('/messages/:id/react', async (req, res) => {
  try {
    const { userId, emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (!message.reactions) message.reactions = [];
    const existingIdx = message.reactions.findIndex(r => r.userId.toString() === userId);
    
    if (existingIdx > -1) {
      if (message.reactions[existingIdx].emoji === emoji) {
        message.reactions.splice(existingIdx, 1); // toggle off
      } else {
        message.reactions[existingIdx].emoji = emoji; // change emoji
      }
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();
    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EDIT MESSAGE
router.put('/messages/:id/edit', async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    message.text = text;
    message.isEdited = true;
    await message.save();
    
    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE MESSAGE
router.put('/messages/:id/delete', async (req, res) => {
  try {
    const { type, userId } = req.body; // type: 'everyone' or 'me'
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (type === 'everyone') {
      message.deleted = true;
      message.text = 'This message was deleted';
      message.mediaType = 'none';
      message.fileUrl = null;
    } else if (type === 'me' && userId) {
      if (!message.deletedFor) message.deletedFor = [];
      message.deletedFor.push(userId);
    }

    await message.save();
    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET STARRED MESSAGES FOR A CONVERSATION
router.get('/conversation/:id/starred', async (req, res) => {
  try {
    const { userId } = req.query;
    const messages = await Message.find({
      conversationId: req.params.id,
      starredBy: userId
    }).populate('sender', 'username email').sort({ createdAt: 1 });
    
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET MEDIA FOR A CONVERSATION
router.get('/conversation/:id/media', async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.id,
      $or: [
        { mediaType: { $ne: 'none' } },
        { text: { $regex: 'https?://', $options: 'i' } }
      ]
    }).populate('sender', 'username email').sort({ createdAt: -1 });
    
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK CONVERSATION AS READ
router.post('/:id/read', async (req, res) => {
  try {
    const { userId } = req.body;
    const conversationId = req.params.id;
    
    const UserConversation = require('../models/UserConversation');
    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    // Find all unread messages
    const unreadMessages = await Message.find({
      conversationId,
      "readBy.userId": { $ne: userId },
      sender: { $ne: userId }
    });

    const now = new Date();
    let lastMsgId = null;

    if (unreadMessages.length > 0) {
      lastMsgId = unreadMessages[unreadMessages.length - 1]._id;

      for (const msg of unreadMessages) {
        msg.readBy.push({ userId, readAt: now });
        
        // Check if all recipients have read (for status: 'read')
        const otherMembers = conversation.members.filter(m => m.toString() !== msg.sender.toString());
        const readByOthers = msg.readBy.filter(r => r.userId.toString() !== msg.sender.toString());
        
        if (readByOthers.length >= otherMembers.length) {
          msg.status = 'read';
          msg.readAt = now;
        }
        await msg.save();
      }
    }

    // Update UserConversation
    await UserConversation.findOneAndUpdate(
      { userId, conversationId },
      { 
        unreadCount: 0, 
        lastReadAt: now,
        lastReadMessageId: lastMsgId || undefined 
      },
      { upsert: true }
    );

    res.status(200).json({ success: true });

    // Emit live status for Info panel
    const io = req.app.get('io');
    for (const msg of unreadMessages) {
       const fullMsg = await Message.findById(msg._id)
         .populate('readBy.userId', 'username email avatar')
         .populate('deliveredTo.userId', 'username email avatar');
       io.to(conversationId).emit('messageStatusUpdate', fullMsg);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET MESSAGE INFO (Delivery/Read details)
router.get('/messages/:id/info', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'username email avatar')
      .populate('readBy.userId', 'username email avatar')
      .populate('deliveredTo.userId', 'username email avatar');
    
    if (!message) return res.status(404).json({ error: 'Message not found' });

    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CLEAR CHAT (Delete all messages in a conversation)
router.delete('/:id/messages', async (req, res) => {
  try {
    await Message.deleteMany({ conversationId: req.params.id });
    // Reset lastMessage when chat is cleared
    await Conversation.findByIdAndUpdate(req.params.id, { lastMessage: null });
    res.status(200).json({ message: 'Chat cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
