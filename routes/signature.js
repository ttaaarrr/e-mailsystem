const express = require('express');
const router = express.Router();
const db = require('../services/db');

router.get('/', async (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const [[row]] = await db.query('SELECT signature FROM users WHERE id = ?', [userId]);
  res.json({ signature: row?.signature || '' });
});

router.post('/', async (req, res) => {
  const userId = req.session.user?.id;
  const { signatureData } = req.body;

  if (!userId || !signatureData) return res.status(400).json({ error: 'Missing data' });

 const html = `
<div style="font-family: 'Segoe UI', Tahoma, sans-serif; font-size:14px; color:#0d47a1;">
  <p style="margin: 0; font-weight: bold;">Best regards,</p><br>
  <p style="margin: 4px 0 0 0; line-height: 1.6;">
    <strong>${signatureData.thaiName} (${signatureData.thaiNickname})</strong><br />
    ${signatureData.engName} (${signatureData.engNickname})<br />
     <strong>${signatureData.department}</strong><br />
    <strong>Email:</strong> <a href="mailto:${signatureData.email}" style="color: #0d47a1; text-decoration: none;">${signatureData.email}</a><br />
   <strong> Mobile:</strong> <span style="color:#0d47a1;">${signatureData.mobile}</span>
  </p>
  <div style="margin-top:10px;">
    <img src="cid:signaturelogo" alt="Logo" style="width:300px; height:auto;" />
  </div>
</div>`;

  await db.query('UPDATE users SET signature = ? WHERE id = ?', [html, userId]);
  res.json({ success: true });
});

module.exports = router;
