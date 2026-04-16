const router = require('express').Router();
const Conversation = require('../models/Conversation');

// CREATE CONVERSATION (DM OR GROUP)
router.post('/', async (req, res) => {
  try {
    const { type, members, name, createdBy } = req.body;
    
    if (!members || members.length < 2) {
      return res.status(400).json({ error: 'Conversation needs at least 2 members' });
    }

    // For DM, check if conversation already exists
    if (type === 'dm') {
      const existing = await Conversation.findOne({
        type: 'dm',
        members: { $all: members, $size: 2 }
      });
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    const newConversation = new Conversation({
      type: type || 'dm',
      members,
      name: type === 'group' ? name : '',
      createdBy,
    });

    const savedConversation = await newConversation.save();
    res.status(201).json(savedConversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET CONVERSATIONS FOR A USER
router.get('/:userId', async (req, res) => {
  try {
    const UserConversation = require('../models/UserConversation');
    const conversations = await Conversation.find({
      members: { $in: [req.params.userId] },
    })
    .populate('members', 'username email about bio')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    const results = await Promise.all(conversations.map(async (conv) => {
      const userMeta = await UserConversation.findOne({
        userId: req.params.userId,
        conversationId: conv._id
      });
      return {
        ...conv.toObject(),
        userMeta // Attach as optional object
      };
    }));
    
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE USER METADATA IN CONVERSATION (PIN, FAVOURITE)
router.put('/:id/metadata', async (req, res) => {
  try {
    const { userId, isPinned, isFavourite } = req.body;
    const UserConversation = require('../models/UserConversation');
    
    const update = {};
    if (isPinned !== undefined) update.isPinned = isPinned;
    if (isFavourite !== undefined) update.isFavourite = isFavourite;

    const userMeta = await UserConversation.findOneAndUpdate(
      { userId, conversationId: req.params.id },
      update,
      { upsert: true, new: true }
    );

    res.status(200).json(userMeta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE GLOBAL DISAPPEARING MESSAGES
router.put('/:id/disappearing', async (req, res) => {
  try {
    const { enabled, duration, userId } = req.body; // duration in seconds
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    conversation.disappearingMessages = {
      enabled,
      duration: enabled ? duration : 0,
      setBy: userId,
      setAt: new Date()
    };
    
    await conversation.save();
    
    // For visual confirmation, populate setBy
    const updatedConversation = await Conversation.findById(req.params.id).populate('disappearingMessages.setBy', 'username');
    
    res.status(200).json(updatedConversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MUTE CONVERSATION
router.put('/:id/mute', async (req, res) => {
  try {
    const { userId, duration } = req.body; // duration: '8h', '1w', 'always'
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let mutedUntil = null;
    const now = new Date();
    if (duration === '8h') {
      mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    } else if (duration === '1w') {
      mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    // 'always' remains null

    if (!user.mutedConversations) user.mutedConversations = [];
    const existingIdx = user.mutedConversations.findIndex(m => m.conversationId && m.conversationId.toString() === req.params.id);
    if (existingIdx > -1) {
      user.mutedConversations[existingIdx].mutedUntil = mutedUntil;
    } else {
      user.mutedConversations.push({ conversationId: req.params.id, mutedUntil });
    }

    await user.save();
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UNMUTE CONVERSATION
router.put('/:id/unmute', async (req, res) => {
  try {
    const { userId } = req.body;
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.mutedConversations = user.mutedConversations.filter(m => m.conversationId && m.conversationId.toString() !== req.params.id);
    await user.save();
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE CONVERSATION
router.delete('/:id', async (req, res) => {
  try {
    const Message = require('../models/Message');
    await Message.deleteMany({ conversationId: req.params.id });
    await Conversation.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
