const express = require('express');
const path = require('path');
const router = express.Router();

const { checkSalesAndMarketing } = require('../middleware/Checkrole');

console.log('checkSalesAndMarketing:', checkSalesAndMarketing); // ควรเป็น function ไม่ใช่ undefined

router.get('/', checkSalesAndMarketing, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'createmail.html'));
});

module.exports = router;
