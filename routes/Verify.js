const express = require("express");
const db = require("../services/db");
const router = express.Router();

router.get("/verify", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Token ไม่ถูกต้อง");

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE verification_token = ?", [token]);
    if (rows.length === 0) {
      return res.status(400).send("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
    }

    await db.query(
      "UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?",
      [rows[0].id]
    );

 // ✅ redirect ด้วย JavaScript
    res.send(`
      <script>
        alert("✅ ยืนยันอีเมลสำเร็จ");
        window.location.href = "/pages/login.html";
      </script>
    `);
  } catch (err) {
    console.error("❌ Error verifying token:", err);
    res.status(500).send("เกิดข้อผิดพลาดขณะยืนยัน");
  }
});

module.exports = router;
