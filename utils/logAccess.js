/**
 * Ghi log truy cập vào bảng `access_logs` trên Supabase
 */
const supabase = require('../supabaseClient');

module.exports = async function logAccess({ ip, code, mode, result }) {
  await supabase
    .from('access_logs')
    .insert([{ ip_address: ip, access_code: code, mode, result }]);
};
