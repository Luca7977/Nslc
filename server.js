const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const CryptoJS = require("crypto-js");

dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(express.static("public")); // index.html, style.css

const LOG_FILE = path.join(__dirname, "logs/access_log.json");
const ipAttemptMap = {};
const MAX_FAILS = 5;
const BLOCK_TIME = 30 * 60 * 1000; // 30 phút

const CLASS_CONFIG = {
  "LOP9A2024": {
    aesKey: "LOP9A2024".padEnd(16, "0"),
    dataUrl: "https://your-project.supabase.co/storage/v1/object/public/students_9A_encrypted.json"
  }
};

function logAccess(entry) {
  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  }
  logs.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

function isBlocked(ip) {
  const now = Date.now();
  const attempts = ipAttemptMap[ip] || [];
  const recent = attempts.filter(t => now - t < 10 * 60 * 1000);
  ipAttemptMap[ip] = recent;
  return recent.length >= MAX_FAILS;
}

app.post("/api/get-students", async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const code = req.body.access_code?.trim();
  const config = CLASS_CONFIG[code];
  const nowStr = new Date().toISOString();

  const logEntry = {
    timestamp: nowStr,
    ip,
    access_code: code,
    success: false
  };

  if (isBlocked(ip)) {
    logEntry.error = "IP bị chặn";
    logAccess(logEntry);
    return res.json({ success: false, error: "Bạn nhập sai quá nhiều lần. Hãy thử lại sau." });
  }

  if (!config) {
    ipAttemptMap[ip] = [...(ipAttemptMap[ip] || []), Date.now()];
    logEntry.error = "Mã truy cập sai";
    logAccess(logEntry);
    return res.json({ success: false, error: "Mã truy cập không hợp lệ." });
  }

  try {
    const response = await axios.get(config.dataUrl);
    const encrypted = response.data.data;

    const key = CryptoJS.enc.Utf8.parse(config.aesKey);
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });

    const plain = decrypted.toString(CryptoJS.enc.Utf8);
    const parsed = JSON.parse(plain);

    if (parsed.expired_at && new Date().toISOString() > parsed.expired_at) {
      logEntry.error = "Mã hết hạn";
      logAccess(logEntry);
      return res.json({ success: false, error: "Mã truy cập đã hết hạn." });
    }

    logEntry.success = true;
    logAccess(logEntry);
    return res.json({ success: true, students: parsed.students });

  } catch (err) {
    ipAttemptMap[ip] = [...(ipAttemptMap[ip] || []), Date.now()];
    logEntry.error = "Giải mã thất bại";
    logAccess(logEntry);
    return res.json({ success: false, error: "Không thể giải mã dữ liệu." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Server đang chạy tại cổng", PORT));
