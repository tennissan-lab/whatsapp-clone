const router = require('express').Router();
const Report = require('../models/Report');

// CREATE REPORT
router.post('/', async (req, res) => {
  try {
    const { reporterId, reportedUserId, conversationId, reason } = req.body;
    
    if (!reporterId || !reportedUserId) {
      return res.status(400).json({ error: 'Reporter and reported user are required' });
    }

    const newReport = new Report({
      reporterId,
      reportedUserId,
      conversationId,
      reason
    });

    const savedReport = await newReport.save();
    res.status(201).json(savedReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
