// Password policy: 8-128 chars, at least one letter and one digit, not a trivially common password.
const COMMON = new Set(['password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'iloveyou1', 'admin123', 'letmein123', 'welcome123', 'pakistan123']);

function validatePassword(pw, { email = '', fullName = '' } = {}) {
  const p = typeof pw === 'string' ? pw : '';
  if (p.length < 8) return 'Password must be at least 8 characters.';
  if (p.length > 128) return 'Password must be at most 128 characters.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Password must contain at least one letter and one number.';
  if (COMMON.has(p.toLowerCase())) return 'That password is too common. Choose a less guessable one.';
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && p.toLowerCase().includes(local)) return 'Password must not contain your email name.';
  return null; // OK
}

module.exports = { validatePassword };
