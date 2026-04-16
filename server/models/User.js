const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  about: {
    type: String,
    default: "Hey there! I am using WhatsApp.",
  },
  bio: {
    type: String,
    default: "",
  },
  pinnedConversations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  favouriteMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  }],
  mutedConversations: [{
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    mutedUntil: { type: Date, default: null } // null means "Always" if isMuted is true, or we can use a separate flag. 
    // Actually, let's follow the user's request: mutedUntil: Date | "always"
    // We'll use a boolean isAlwaysMuted or just null for always.
  }],
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
