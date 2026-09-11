// KYBERA — /api/admin/login
// Autentica al admin contra una variable de entorno (NUNCA viaja al navegador)
// y emite un token firmado con HMAC-SHA256 de corta duración.

const crypto = require('crypto');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || '';

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ADMIN_PASSWORD || !SESSION_SECRET) {
    return res.status(500).json({ error: 'Configuración de servidor incompleta' });
  }

  const password = req.body && req.body.password;
  if (typeof password !== 'string') {
    return res.status(400).json({ error: 'Falta la contraseña' });
  }

  if (!safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = signToken({ role: 'admin', exp: Date.now() + 1000 * 60 * 60 * 8 });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, token });
};