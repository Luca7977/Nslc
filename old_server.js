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

  // 1. Kiểm block IP
  if (isBlocked(ip)) {
    return res.status(429).json({ error: `Bạn đã thử quá nhiều lần. Thử lại sau ${process.env.BLOCK_DURATION_MIN} phút.` });
  }

  // 2. Truy vấn Supabase: lấy tất cả record có code khớp group hoặc personal
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, birthday, class, group_access_code, personal_access_code')
    .or(`group_access_code.eq.${access_code},personal_access_code.eq.${access_code}`);

  if (error) {
    // Log DB error
    await logAccess({ ip, code: access_code, mode: null, result: 'error_db' });
    return res.status(500).json({ error: 'Lỗi truy vấn database.' });
  }

  // 3. Xác định mode và record student
  let studentList = [];
  let studentRecord = null;

  if (data.some(r => r.group_access_code === access_code)) {
    studentList = data.filter(r => r.group_access_code === access_code);
    modeChosen = 'group';
  } else if (data.some(r => r.personal_access_code === access_code)) {
    studentRecord = data.find(r => r.personal_access_code === access_code);
    modeChosen = 'personal';
  } else {
    modeChosen = null;
  }

  // 4. Nếu không tìm thấy → record fail và log
  if (!modeChosen) {
    recordFail(ip);
    await logAccess({ ip, code: access_code, mode: null, result: 'invalid_code' });
    return res.status(403).json({ error: 'Mã truy cập không hợp lệ.' });
  }

  // 5. Clear block nếu thành công
  clear(ip);

  // 6. Chuẩn bị dữ liệu trả về
  const showBirthday = extra_code === process.env.BIRTHDAY_VIEW_CODE;
  let resultData = [];

  if (modeChosen === 'group') {
    resultData = studentList.map(s => ({
      full_name: s.full_name,
      class: s.class,
      ...(showBirthday ? { birthday: s.birthday } : {})
    }));
  } else {
    resultData = [{
      full_name: studentRecord.full_name,
      class: studentRecord.class,
      ...(showBirthday ? { birthday: studentRecord.birthday } : {})
    }];
  }

  // 7. Log success
  await logAccess({ ip, code: access_code, mode: modeChosen, result: 'success' });

  // 8. Trả về
  return res.json({ mode: modeChosen, students: resultData });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
