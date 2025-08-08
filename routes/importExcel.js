// routes/importExcel.js
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const db = require('../services/db');
const checkAuth = require('../middleware/checkAuth');

// ตั้งค่า multer ให้บันทึกไฟล์ลงโฟลเดอร์ import
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../import')); // บันทึกที่โฟลเดอร์ import
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// POST /api/customers/upload-excel
router.post('/upload-excel', checkAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'ไม่ได้อัปโหลดไฟล์' });

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    let insertedCount = 0;
    const user_id = req.session.user.id;
    const owner_email = req.session.user.email || 'unknown';  // ดึงอีเมลเจ้าของจาก session

    for (const row of rows) {
      const { email, company_name, province, district } = row;
      if (!email|| !company_name) continue;

      const [existing] = await db.query('SELECT id FROM customers WHERE email = ?', [email]);
      if (existing.length > 0) continue;

      await db.query(`
        INSERT INTO customers (email, company_name, province, district, owner_name, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [email, company_name, province || '', district || '', owner_email, user_id]);

      insertedCount++;
    }

    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: `เพิ่มข้อมูลแล้ว ${insertedCount} รายการ` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์เกิดข้อผิดพลาด' });
  }
});
module.exports = router;
