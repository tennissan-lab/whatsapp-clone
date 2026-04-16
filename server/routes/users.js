const router = require('express').Router();
const User = require('../models/User');

// GET ALL USERS
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET SINGLE USER
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE USER PROFILE
router.put('/:id', async (req, res) => {
  try {
    const { username, about, bio } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { username, about, bio } },
      { new: true }
    ).select('-password');
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET COMMON GROUPS
router.get('/:id/common-groups/:otherId', async (req, res) => {
  try {
    const { id, otherId } = req.params;
    const Conversation = require('../models/Conversation');
    
    const commonGroups = await Conversation.find({
      type: 'group',
      members: { $all: [id, otherId] }
    }).populate('members', 'username email');
    
    res.status(200).json(commonGroups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOGGLE BLOCK USER
router.post('/:id/block', async (req, res) => {
  try {
    const { currentUserId } = req.body; // user who is blocking
    const userToBlockId = req.params.id;
    
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const isBlocked = currentUser.blockedUsers.includes(userToBlockId);
    if (isBlocked) {
      // Unblock
      currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== userToBlockId);
    } else {
      // Block
      currentUser.blockedUsers.push(userToBlockId);
    }
    
    await currentUser.save();
    
    // Optional: Return the updated user so frontend can sync
    const updatedUser = await User.findById(currentUserId).select('-password');
    res.status(200).json({ isBlocked: !isBlocked, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
