/**
 * Quản lý số lần thử sai trên từng IP
 */
const maxWrong = parseInt(process.env.MAX_WRONG_ATTEMPTS, 10) || 5;
const blockMs = (parseInt(process.env.BLOCK_DURATION_MIN, 10) || 30) * 60 * 1000;

const ipMap = new Map();

function isBlocked(ip) {
  const rec = ipMap.get(ip);
  if (!rec) return false;
  const { count, firstTime } = rec;
  if (count >= maxWrong && Date.now() - firstTime < blockMs) {
    return true;
  }
  if (Date.now() - firstTime >= blockMs) {
    ipMap.delete(ip);
    return false;
  }
  return false;
}

function recordFail(ip) {
  const now = Date.now();
  const rec = ipMap.get(ip);
  if (!rec) {
    ipMap.set(ip, { count: 1, firstTime: now });
  } else {
    rec.count += 1;
  }
}

function clear(ip) {
  ipMap.delete(ip);
}

module.exports = { isBlocked, recordFail, clear };
