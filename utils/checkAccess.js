/**
 * Kiểm tra access_code với bản ghi student
 * mode: 'group' hoặc 'personal'
 * extraCode: mã phụ để xem birthday
 */
module.exports = function checkAccess(student, mode, code, extraCode) {
    if (!student) {
      return { error: 'Mã không hợp lệ.' };
    }
  
    if (mode === 'group' && student.group_access_code === code) {
      return { success: true, student };
    }
    if (mode === 'personal' && student.personal_access_code === code) {
      return { success: true, student };
    }
  
    return { error: 'Mã không hợp lệ.' };
  };
  