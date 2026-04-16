const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Conversation = require('./models/Conversation');
const UserConversation = require('./models/UserConversation');

dotenv.config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/whatsapp-clone');
    console.log('Connected to MongoDB');

    const conversations = await Conversation.find({});
    console.log(`Found ${conversations.length} conversations to migrate.`);

    for (const conv of conversations) {
      if (conv.userMetadata && conv.userMetadata.length > 0) {
        for (const meta of conv.userMetadata) {
          await UserConversation.findOneAndUpdate(
            { userId: meta.userId, conversationId: conv._id },
            {
              isPinned: meta.isPinned,
              isFavourite: meta.isFavourite,
              unreadCount: meta.unreadCount,
              lastReadAt: meta.lastReadAt
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
