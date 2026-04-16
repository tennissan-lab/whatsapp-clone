const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: false,
    default: '',
  },
  starredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mediaType: {
    type: String,
    enum: ['image', 'video', 'document', 'audio', 'link', 'none'],
    default: 'none'
  },
  fileUrl: {
    type: String,
    default: null
  },
  readBy: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    readAt: { type: Date, default: Date.now } 
  }],
  deliveredTo: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  deliveredAt: { type: Date, default: null },
  readAt: { type: Date, default: null },
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    text: String,
    senderName: String
  },
  reactions: [{
    emoji: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  deleted: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isEdited: { type: Boolean, default: false },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
