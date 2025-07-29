// routes/emailhistory.js
const express = require('express');
const router = express.Router();
const pool = require('../services/db');           // MySQL connection pool
const authMiddleware = require('../middleware/authMiddleware');  // เช็ค session, user login

// ทุก route ในไฟล์นี้จะผ่านการตรวจสอบ session ก่อน
router.use(authMiddleware);

router.get('/', async (req, res) => {
  console.log('req.user:', req.user);
  console.log('req.session:', req.session);

  try {
    // ดึง query params พร้อมตั้งค่า default
    let { limit = 10, offset = 0, search = '', startDate = '', endDate = '' } = req.query;

    limit = parseInt(limit);
    offset = parseInt(offset);
    search = `%${search}%`;

    let whereClauses = [];
    let params = [];

   const allowedDepartments = ['ฝ่ายขายและการตลาด'];

if (!allowedDepartments.includes(req.user.department)) {
  // คนที่ไม่ใช่ฝ่ายขาย/ฝ่ายการตลาด เห็นแค่ของตัวเอง
  whereClauses.push('sender_email = ?');
  params.push(req.user.email);
}

    // เงื่อนไขค้นหาแบบข้อความ
    if (search && search !== '%%') {
      whereClauses.push('(subject LIKE ? OR sender_email LIKE ? OR recipient_email LIKE ?)');
      params.push(search, search, search);
    }

    // กรองตามวันที่เริ่มต้น
    if (startDate) {
      whereClauses.push('sent_at >= ?');
      params.push(startDate);
    }

    // กรองตามวันที่สิ้นสุด
    if (endDate) {
      whereClauses.push('sent_at <= ?');
      params.push(endDate);
    }

    // สร้าง SQL เงื่อนไข WHERE
    let whereSQL = '';
    if (whereClauses.length > 0) {
      whereSQL = 'WHERE ' + whereClauses.join(' AND ');
    }

    // Query นับจำนวนทั้งหมดที่ตรงเงื่อนไข
    const countQuery = `SELECT COUNT(*) AS total FROM sent_emails ${whereSQL}`;
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0].total;

    // Query ดึงข้อมูลอีเมลพร้อม limit offset
    const dataQuery = `
      SELECT id, sender_email, recipient_email, subject, message, attachments, note, sent_at, html_message
      FROM sent_emails
      ${whereSQL}
      ORDER BY sent_at DESC
      LIMIT ? OFFSET ?
    `;

    // เพิ่ม limit กับ offset ลง params
    params.push(limit, offset);

    const [rows] = await pool.query(dataQuery, params);

    // แปลงข้อมูล attachments จาก JSON string เป็น object
    const emails = rows.map(row => {
      let attachments = [];
      if (row.attachments) {
        try {
          attachments = typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments;
        } catch {
          attachments = [];
        }
      }
      return {
        id: row.id,
        sender_email: row.sender_email,
        recipient_email: row.recipient_email,
        subject: row.subject,
        message: row.message,
        html_message: row.html_message,
        attachments,
        note: row.note,
        sent_at: row.sent_at
      };
    });

    // ส่งข้อมูลกลับในรูปแบบ JSON
    res.json({ emails, total });

  } catch (error) {
    console.error('Error fetching email history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
