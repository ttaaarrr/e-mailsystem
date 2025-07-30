// routes/Register.js
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("../services/db");
const router = express.Router();

router.post("/register", async (req, res) => {
  const { firstName, lastName, nickname, department, email, password, branch } = req.body;

  if (!firstName || !lastName || !nickname || !department || !email || !password || !branch) {
    return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

   // ✅ ตรวจสอบว่า email ต้องเป็นของบริษัท
  const allowedDomain = "@bpit.co.th";
  if (!email.endsWith(allowedDomain)) {
    return res.status(403).json({ message: `อนุญาตเฉพาะอีเมลบริษัท (${allowedDomain}) เท่านั้น` });
  }

  try {
    const [results] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (results.length > 0) {
      return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }
    // 🔐 เพิ่มตรงนี้
if (!email.endsWith("@bpit.co.th")) {
  return res.status(400).json({ message: "อนุญาตเฉพาะอีเมลของบริษัท BPIT Holding เท่านั้น" });
}

    if (password.length < 8) {
      return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = `${firstName} ${lastName}`;
 const token = crypto.randomBytes(32).toString("hex");

    await db.query(
      `INSERT INTO users (email, password, full_name, nickname, department, branch, verification_token) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, fullName, nickname, department, branch, token]
    );

    const verifyLink = `http://localhost:5000/api/verify?token=${token}`;
    const emailHtml = `
      <h3>สวัสดีคุณ ${fullName}</h3>
      <p>กรุณาคลิกลิงก์ด้านล่างเพื่อยืนยันอีเมล:</p>
      <a href="${verifyLink}">${verifyLink}</a>
      <p>หากคุณไม่ได้สมัครสมาชิก กรุณาไม่ต้องสนใจอีเมลฉบับนี้</p>
    `;

    await sendVerificationEmail(email, "ยืนยันอีเมล - ระบบ BPIT", emailHtml);

    res.json({ success: true, message: "สมัครสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน" });
  } catch (err) {
    console.error("❌ Error inserting user:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});

// ✅ ฟังก์ชันส่งอีเมลยืนยัน
async function sendVerificationEmail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: '"BPIT System" <no-reply@bpit.co.th>',
    to,
    subject,
    html,
  });
}

module.exports = router;
