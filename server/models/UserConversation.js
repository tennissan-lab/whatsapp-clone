const mongoose = require('mongoose');

const userConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  lastReadMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastReadAt: {
    type: Date,
    default: null
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isFavourite: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Ensure a user has only one record per conversation
userConversationSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

module.exports = mongoose.model('UserConversation', userConversationSchema);
