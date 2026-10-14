import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const COOKIE = '__Host-manal_admin';
const TWELVE_HOURS = 12 * 60 * 60;
const credentialsReady = () => Boolean(
  process.env.MANAL_ADMIN_USERNAME &&
  process.env.MANAL_ADMIN_PASSWORD?.length >= 12 &&
  process.env.MANAL_SESSION_SECRET?.length >= 32
);
const same = (a, b) => {
  const hash = text => createHash('sha256').update(String(text)).digest();
  return timingSafeEqual(hash(a), hash(b));
};
const sign = data => createHmac('sha256', process.env.MANAL_SESSION_SECRET).update(data).digest('base64url');
function isAuthenticated(req) {
  if (!credentialsReady()) return false;
  const cookie = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!cookie) return false;
  const token = cookie.slice(COOKIE.length + 1);
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;
  const data = token.slice(0, dot), signature = token.slice(dot + 1);
  if (!same(signature, sign(data))) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return payload.v === 1 && payload.user === process.env.MANAL_ADMIN_USERNAME && payload.expires > Date.now();
  } catch (_) { return false; }
}
function originMatches(req) {
  try {
    const origin = new URL(String(req.headers.origin || ''));
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    return origin.host === host && (origin.protocol === 'https:' || (origin.protocol === 'http:' && /^(localhost|127\\.0\\.0\\.1)(:\\d+)?$/.test(host)));
  } catch (_) { return false; }
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'GET') {
    return res.status(200).json({ authenticated: isAuthenticated(req) });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ message: 'طريقة الطلب غير مدعومة.' });
  }
  if (!originMatches(req)) return res.status(403).json({ message: 'طلب غير مسموح.' });
  if (req.body?.action === 'logout') {
    res.setHeader('Set-Cookie', COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
    return res.status(200).json({ ok: true });
  }
  if (req.body?.action !== 'login') return res.status(400).json({ message: 'طلب غير صالح.' });
  if (!credentialsReady()) return res.status(503).json({ message: 'لم تُضبط بيانات المدير في إعدادات Vercel بعد.' });
  const user = String(req.body.username || '').trim();
  const pass = String(req.body.password || '');
  if (!same(user, process.env.MANAL_ADMIN_USERNAME) || !same(pass, process.env.MANAL_ADMIN_PASSWORD)) {
    return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
  }
  const payload = Buffer.from(JSON.stringify({ v: 1, user: process.env.MANAL_ADMIN_USERNAME, expires: Date.now() + TWELVE_HOURS * 1000 })).toString('base64url');
  res.setHeader('Set-Cookie', COOKIE + '=' + payload + '.' + sign(payload) + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + TWELVE_HOURS);
  return res.status(200).json({ ok: true });
}
