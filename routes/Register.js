// routes/Register.js
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../services/db"); // ใช้ db ที่เชื่อมกับ MySQL
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

    await db.query(
      "INSERT INTO users (email, password, full_name, nickname, department, branch) VALUES (?, ?, ?, ?, ?, ?)",
      [email, hashedPassword, fullName, nickname, department, branch]
    );

    // ตอบ JSON แทน redirect
    // res.json({ success: true, redirectUrl: '/auth/google' });
    res.json({ success: true, redirectUrl: '/pages/login.html' });
  } catch (err) {
    console.error("❌ Error inserting user:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});


module.exports = router;
