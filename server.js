const express = require('express');
const cors = require('cors');
require('dotenv').config();

const supabase = require('./supabaseClient');
const checkAccess = require('./utils/checkAccess');
const logAccess = require('./utils/logAccess');
const { isBlocked, recordFail, clear } = require('./utils/blockIP');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/get-students', async (req, res) => {
  const ip = req.ip;
  const { access_code, mode, extra_code } = req.body;

  // Kiểm tra IP bị chặn
  if (isBlocked(ip)) {
    return res.status(429).json({
      error: `Bạn đã thử quá nhiều lần. Hãy thử lại sau ${process.env.BLOCK_DURATION_MIN || 30} phút.`,
    });
  }

  // Lấy tên bảng từ biến môi trường hoặc mặc định là "students"
  const tableName = process.env.SUPABASE_STUDENT_TABLE || 'students';

  const { data, error } = await supabase
    .from(tableName)
    .select('id, name, class, birth_day, birth_month, group_code, private_code')
    .or(`group_code.eq.${access_code},private_code.eq.${access_code}`);

  if (error) {
    console.error('[SUPABASE ERROR]', error); // ✅ In lỗi chi tiết ra console
    await logAccess({ ip, code: access_code, mode: null, result: 'error_db' });
    return res.status(500).json({ error: 'Lỗi truy vấn Supabase', details: error.message || error });
  }

  let students = [];
  let modeDetected = null;

  if (data.some(r => r.group_code === access_code)) {
    students = data.filter(r => r.group_code === access_code);
    modeDetected = 'group';
  } else if (data.some(r => r.private_code === access_code)) {
    students = data.filter(r => r.private_code === access_code);
    modeDetected = 'personal';
  } else {
    recordFail(ip);
    await logAccess({ ip, code: access_code, mode: null, result: 'invalid_code' });
    return res.status(403).json({ error: 'Mã truy cập không hợp lệ.' });
  }

  clear(ip); // ✅ Đã truy cập đúng, xoá khỏi danh sách chặn

  const showBirthday = extra_code === process.env.BIRTHDAY_VIEW_CODE;

  const result = students.map(s => ({
    full_name: s.name,
    class: s.class,
    ...(showBirthday ? { birthday: `${s.birth_day}/${s.birth_month}` } : {})
  }));

  await logAccess({ ip, code: access_code, mode: modeDetected, result: 'success' });

  return res.json({ mode: modeDetected, students: result });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
