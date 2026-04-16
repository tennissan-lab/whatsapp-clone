const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['dm', 'group'],
    default: 'dm',
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  name: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  disappearingMessages: {
    enabled: { type: Boolean, default: false },
    duration: { type: Number, default: 0 }, // in seconds
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    setAt: { type: Date, default: Date.now }
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
