const express = require("express");
const router = express.Router();
const db = require("../services/db");
const authMiddleware = require("../middleware/authMiddleware");

// Add Customer API
router.post("/add-customer", authMiddleware, async (req, res) => {
  const { email, company_name, province, district } = req.body;
  const owner_email = req.session?.user?.email;
  const user_id = req.session?.user?.id 
  
  if (!email || !company_name || !province || !district) {
    return res.status(400).json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  try {
    const [existingCustomer] = await db.query(
      `SELECT c.company_name, c.email, c.created_at,
              u.full_name AS owner_name, u.department, u.branch
       FROM customers c
       LEFT JOIN users u ON c.owner_name = u.email
       WHERE c.email = ?`,
      [email]
    );
    
    if (existingCustomer.length > 0) {
      const customer = existingCustomer[0];
      return res.status(400).json({
        success: false,
        message: `อีเมลนี้ถูกเพิ่มในระบบแล้วโดย ${customer.owner_name} (แผนก ${customer.department}, สาขา ${customer.branch}) เพิ่มเมื่อวันที่ ${customer.created_at ? new Date(customer.created_at).toLocaleDateString("th-TH") : "ไม่ระบุ"}`,
        company_name: customer.company_name,
        email: customer.email,
        owner_name: customer.owner_name,
        department: customer.department,
        branch: customer.branch,
        addedAt: customer.created_at || "ไม่มีข้อมูลวันที่"
      });
    }

    await db.query(
  "INSERT INTO customers (email, company_name, province, district, owner_name, user_id) VALUES (?, ?, ?, ?, ?, ?)",
  [email, company_name, province, district, owner_email, user_id]
);

    res.status(200).json({ success: true, message: "เพิ่มข้อมูลลูกค้าสำเร็จ!" });
  } catch (err) {
    console.error("❌ Database error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, message: "อีเมลนี้ถูกใช้งานแล้ว!" });
    } else {
      return res.status(500).json({ success: false, message: "ข้อผิดพลาดจากฐานข้อมูล", error: err.message });
    }
  }
});

// Fetch Customers API
router.get("/", async (req, res) => {
  try {
    const [customers] = await db.query(
      `SELECT c.company_name, c.email, c.owner_name, c.created_at,
              u.full_name AS owner_full_name,
              u.department AS owner_department,
              u.branch AS owner_branch
       FROM customers c
       LEFT JOIN users u ON c.owner_name = u.email`
    );

    if (customers.length === 0) {
      return res.status(404).json({ message: "ยังไม่มีข้อมูลลูกค้า" });
    }

    res.json(customers);
  } catch (err) {
    console.error("❌ Error fetching customers:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});


// Check email availability API
router.get("/check-email", async (req, res) => {
  const { email } = req.query;

  try {
    const [results] = await db.query(
      `SELECT c.company_name, c.email, c.created_at,
              u.full_name AS owner_name, u.branch
       FROM customers c
       LEFT JOIN users u ON c.owner_name = u.email
       WHERE c.email = ?`,
      [email]
    );
    
    if (results.length > 0) {
      const customer = results[0];
      const addedDate = customer.created_at
        ? new Date(customer.created_at).toLocaleDateString("th-TH")
        : "ไม่ระบุ";
    
      return res.status(400).json({
        message: `อีเมลนี้ถูกเพิ่มมาแล้วโดย ${customer.owner_name} ( ${customer.branch}) เมื่อวันที่ ${addedDate}`,
        company_name: customer.company_name,
        email: customer.email,
        owner_name: customer.owner_name,
        branch: customer.branch,
        addedAt: addedDate
      });
    }
    

    res.status(200).json({ message: "อีเมลสามารถใช้งานได้" });
  } catch (err) {
    console.error("❌ Database error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดจากฐานข้อมูล", error: err.message });
  }
});
//นับจำนวนemail ลูกค้า
router.get('/my/count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // ต้องมาจาก session หรือ token
    const [rows] = await db.query(
      'SELECT COUNT(*) AS count FROM customers WHERE user_id = ?',
      [userId]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ดึงรายการลูกค้าของ user ที่ login อยู่
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.query.email;
    
    if (!userEmail) {
      return res.status(400).json({ message: "กรุณาระบุ email ของ user" });
    }

    const [customers] = await db.query(
      `SELECT c.id, c.company_name, c.email, c.province, c.district, c.created_at
       FROM customers c
       WHERE c.owner_name = ?`,
      [userEmail]
    );

    res.json(customers);
  } catch (err) {
    console.error("❌ Error fetching user customers:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});

// แก้ไขข้อมูลลูกค้า
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, province, district } = req.body;
    const userEmail = req.session?.user?.email;

    // ตรวจสอบว่าเป็นลูกค้าของ user นี้หรือไม่
    const [existingCustomer] = await db.query(
      'SELECT id FROM customers WHERE id = ? AND owner_name = ?',
      [id, userEmail]
    );

    if (existingCustomer.length === 0) {
      return res.status(404).json({ message: "ไม่พบลูกค้าหรือไม่มีสิทธิ์แก้ไข" });
    }

    // อัปเดตข้อมูล
    await db.query(
      'UPDATE customers SET company_name = ?, province = ?, district = ? WHERE id = ?',
      [company_name, province, district, id]
    );

    res.json({ success: true, message: "แก้ไขข้อมูลสำเร็จ" });
  } catch (err) {
    console.error("❌ Error updating customer:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});

// ลบลูกค้า
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.session?.user?.email;

    // ตรวจสอบว่าเป็นลูกค้าของ user นี้หรือไม่
    const [existingCustomer] = await db.query(
      'SELECT id FROM customers WHERE id = ? AND owner_name = ?',
      [id, userEmail]
    );

    if (existingCustomer.length === 0) {
      return res.status(404).json({ message: "ไม่พบลูกค้าหรือไม่มีสิทธิ์ลบ" });
    }

    // ลบลูกค้า
    await db.query('DELETE FROM customers WHERE id = ?', [id]);

    res.json({ success: true, message: "ลบลูกค้าสำเร็จ" });
  } catch (err) {
    console.error("❌ Error deleting customer:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
});
router.get('/count', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS count FROM customers');
    res.json({ count: rows[0].count }); // ✅ แสดงจำนวนทั้งหมด
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
