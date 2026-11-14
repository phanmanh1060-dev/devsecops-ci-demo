/**
 * DEMO API - PHIEN BAN DA SUA LOI (vong 2)
 * Da khac phuc: hardcoded secret, SQL Injection (2 cho), JWT khong het han.
 * Con ton tai co chu dich: BOLA (/api/users/:id), Excessive Data Exposure (/api/users),
 * va cac thu vien dependency cu (de SCA van phat hien).
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const _ = require("lodash");

const app = express();
app.use(express.json());

// [DA SUA] Khoa bi mat lay tu bien moi truong, khong gan cung trong ma nguon
const JWT_SECRET = process.env.JWT_SECRET || process.env.FALLBACK_SECRET;

const db = new sqlite3.Database(":memory:");
db.serialize(() => {
  db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)");
  db.run("INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')");
  db.run("INSERT INTO users (username, password, role) VALUES ('user1', 'password1', 'user')");
});

// [DA SUA] Dung truy van tham so hoa (parameterized query) thay vi noi chuoi
app.get("/api/users/search", (req, res) => {
  const username = req.query.username || "";
  const query = "SELECT id, username, role FROM users WHERE username = ?";
  db.all(query, [username], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// [DA SUA] Truy van tham so hoa cho dang nhap
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.get(query, [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: "Sai tai khoan hoac mat khau" });
    // [DA SUA] Token co thoi han 1 gio
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  });
});

// [CON TON TAI] Broken Object Level Authorization
app.get("/api/users/:id", (req, res) => {
  db.get("SELECT id, username, role FROM users WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// [CON TON TAI] Excessive Data Exposure
app.get("/api/users", (req, res) => {
  db.all("SELECT * FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Demo API dang chay", version: "1.0.1" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Demo API dang chay tai http://localhost:${PORT}`);
});

module.exports = app;
