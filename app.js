/**
 * DEMO VULNERABLE API
 * Ung dung API mau CHUA CAC LO HONG BAO MAT CO CHU DICH,
 * dung de kiem chung quy trinh tu dong danh gia an toan thong tin (SAST/DAST/SCA) trong CI/CD.
 * KHONG dung code nay cho san pham that.
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const _ = require("lodash");

const app = express();
app.use(express.json());

// [VULN-01] Hardcoded secret key (CWE-798) - SAST se phat hien
const JWT_SECRET = "supersecret123";

const db = new sqlite3.Database(":memory:");
db.serialize(() => {
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)");
  db.run("INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')");
  db.run("INSERT INTO users (username, password, role) VALUES ('user1', 'password1', 'user')");
});

// [VULN-02] SQL Injection (CWE-89) - noi chuoi truc tiep vao cau truy van
// SAST (Semgrep) va DAST (OWASP ZAP) deu co the phat hien endpoint nay
app.get("/api/users/search", (req, res) => {
  const username = req.query.username || "";
  const query = "SELECT id, username, role FROM users WHERE username = '" + username + "'";
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// [VULN-03] Broken Authentication - so sanh mat khau dang plaintext, khong hash (CWE-256)
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  db.get(query, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: "Sai tai khoan hoac mat khau" });
    // [VULN-04] JWT khong dat thoi han het han (expiresIn) -> token song vinh vien
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token });
  });
});

// [VULN-05] Broken Object Level Authorization - API1:2023 OWASP API Top 10
// Khong kiem tra nguoi goi co quyen xem thong tin user khac hay khong
app.get("/api/users/:id", (req, res) => {
  db.get("SELECT id, username, role FROM users WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// [VULN-06] Excessive Data Exposure - tra ve toan bo object user, gom ca mat khau
app.get("/api/users", (req, res) => {
  db.all("SELECT * FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows); // ro ri truong "password"
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Demo Vulnerable API dang chay", version: "1.0.0" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Demo vulnerable API dang chay tai http://localhost:${PORT}`);
});

module.exports = app;
