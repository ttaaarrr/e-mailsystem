//service/emailservice.js
const mysql = require('mysql2/promise');
const nodemailer = require("nodemailer");
const db = require("./db");
const path = require("path");

async function sendEmail({ user, to_email, cc_email, bcc_email, subject, message, note, attachments }) {
  const [rows] = await db.query(
    `SELECT email, password, host, port, tls FROM email_accounts WHERE user_id = ? AND protocol = 'smtp' LIMIT 1`,
    [user.id]
  );

  if (!rows.length) {
    throw new Error("ไม่พบการตั้งค่า SMTP สำหรับผู้ใช้นี้");
  }

  const smtp = rows[0];

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: parseInt(smtp.port),
    secure: smtp.port === 465,
    auth: {
      user: smtp.email,
      pass: smtp.password,
    },
    tls: { rejectUnauthorized: false },
  });

  // ✅ ลายเซ็น HTML พร้อมโลโก้
const [[userRow]] = await db.query(`SELECT signature FROM users WHERE id = ?`, [user.id]);
const signatureHtml = userRow?.signature || "";

const fullHtml = `
  <div style="font-family:sans-serif; font-size:14px;">
    ${message.replace(/\n/g, "<br>")}
    <br><br>
    ${signatureHtml}
  </div>
`;

  // 📎 Attachments
  const processedAttachments = (attachments || []).map(att => {
    if (att.base64) {
      return {
        filename: att.filename,
        content: Buffer.from(att.base64, 'base64'),
        contentType: att.contentType || 'application/octet-stream'
      };
    } else if (att.path) {
      return {
        filename: att.filename,
        path: att.path,
        contentType: att.contentType || 'application/octet-stream'
      };
    }
    return att;
  });

//   // ✅ เพิ่มโลโก้แบบ inline CID
processedAttachments.push({
  filename: "image001.png",
  path: path.join(__dirname, "../public/assets/img/image001.png"),
  cid: "signaturelogo" // ต้องตรงกับ src ใน HTML
});
  // 🔐 Prepare DB-safe attachments (ไม่รวม content)
  const attachmentsForDb = processedAttachments.map(att => {
    let savedFilename = null;
    if (att.path) savedFilename = path.basename(att.path);
    const url = savedFilename ? `/uploads/${savedFilename}` : null;
    return {
      filename: att.filename,
      contentType: att.contentType,
      savedFilename,
      url
    };
  });

  const mailOptions = {
    from: `"${user.email}" <${smtp.email}>`,
    to: to_email,
     cc: cc_email && cc_email.trim() !== "" ? cc_email : undefined,
  bcc: bcc_email && bcc_email.trim() !== "" ? bcc_email : undefined,
    subject,
    text: message,
    html: fullHtml,
    attachments: processedAttachments
  };

  // 📤 ส่งอีเมล
  await transporter.sendMail(mailOptions);

  // 🗃️ บันทึกลง DB
await db.query(
  `INSERT INTO sent_emails (sender_email, recipient_email, cc_email, bcc_email, subject, message, attachments, note, sent_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
  [
    smtp.email,
    to_email,
    cc_email ? cc_email.split(",").map(e => e.trim()).join(",") : null,
    bcc_email ? bcc_email.split(",").map(e => e.trim()).join(",") : null,
    subject,
    message,
    JSON.stringify(attachmentsForDb),
    note
  ]
);


  return { success: true, message: "ส่งอีเมลสำเร็จ" };
}

module.exports = { sendEmail };
 