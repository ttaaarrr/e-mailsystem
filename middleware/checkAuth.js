// middleware/checkAuth.js
function checkAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    next(); // ผ่าน ตรวจแล้วว่า login อยู่
  } else {
    res.redirect('/pages/login.html'); // ใช้ path ที่ client เรียกได้
  }
}

module.exports = checkAuth;
