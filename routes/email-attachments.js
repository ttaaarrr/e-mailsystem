const express = require('express');
const router = express.Router();
const db = require('../services/db');
const path = require('path');
const fs = require('fs');

router.get('/:emailId/:cid', async (req, res) => {
  const { emailId, cid } = req.params;
  try {
    const [[row]] = await db.query(
      'SELECT attachments FROM sent_emails WHERE id = ?',
      [emailId]
    );

    if (!row) {
      return res.status(404).send('Email not found');
    }

    let attachments = [];
    try {
      attachments = JSON.parse(row.attachments);
    } catch (err) {
      console.error('❌ Attachments parse error:', err.message);
      return res.status(500).send('Attachments parse error');
    }

    console.log('🔍 Looking for CID:', cid);
    console.log('🧩 All CIDs:', attachments.map(a => a.cid));

    const match = attachments.find(att =>
      (att.cid || '').trim().toLowerCase() === cid.trim().toLowerCase()
    );

    if (!match || !match.savedFilename) {
      console.error('❌ CID not found or no savedFilename for:', cid);
      return res.status(404).send('CID not found');
    }

    const filePath = path.join(__dirname, '../uploads', match.savedFilename);
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      return res.status(404).send('File not found');
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
