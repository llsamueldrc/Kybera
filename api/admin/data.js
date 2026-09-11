// KYBERA — /api/admin/data
// Única puerta a las operaciones privilegiadas del panel.
// Exige el token emitido por /api/admin/login y usa la service_role key
// (variable de entorno de Vercel) que JAMÁS se expone al navegador.
// service_role ignora las políticas RLS, así que el admin puede
// leer/actualizar/borrar mientras el público solo inserta y lee lo mínimo.

const crypto = require('crypto');

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function verifyToken(token) {
  if (!token || !SESSION_SECRET) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const a = Buffer.from(String(sig));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (Date.now() > payload.exp || payload.role !== 'admin') return null;
    return payload;
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Sesión no autorizada' });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Configuración de servidor incompleta' });
  }

  const body = req.body || {};
  const { action } = body;
  const q = encodeURIComponent;

  let result;
  try {
    switch (action) {
      case 'load_orders':
        result = await pg('GET', 'orders?select=*&order=created_at.desc');
        break;

      case 'load_profiles':
        result = await pg('GET', 'customer_profiles?select=*&order=total_orders.desc');
        break;

      case 'load_reviews':
        result = await pg('GET', 'reviews?select=*&order=created_at.desc');
        break;

      case 'load_messages':
        result = await pg('GET', 'contact_messages?select=*&order=created_at.desc');
        break;

      case 'load_history': {
        const oid = body.id;
        if (!oid) return res.status(400).json({ error: 'Falta id de pedido' });
        result = await pg('GET', `order_status_history?select=status,changed_at&order_id=eq.${q(oid)}&order=changed_at.asc`);
        break;
      }

      case 'update_order_status': {
        const oid = body.id;
        const status = body.status;
        if (!oid || !status) return res.status(400).json({ error: 'Faltan datos' });
        const patch = await pg('PATCH', `orders?id=eq.${q(oid)}`, {
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
        });
        if (patch.status >= 400) return res.status(patch.status).json({ error: 'No se pudo actualizar el estado' });
        await pg('POST', 'order_status_history', {
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ order_id: oid, status, note: 'Actualizado desde panel', changed_at: new Date().toISOString() }),
        });
        result = { status: 200, data: { ok: true } };
        break;
      }

      case 'delete_order': {
        const oid = body.id;
        if (!oid) return res.status(400).json({ error: 'Falta id de pedido' });
        const del = await pg('DELETE', `orders?id=eq.${q(oid)}`, { headers: { Prefer: 'return=minimal' } });
        if (del.status >= 400) return res.status(del.status).json({ error: 'No se pudo eliminar el pedido' });
        result = { status: 200, data: { ok: true } };
        break;
      }

      case 'toggle_review': {
        const rid = body.id;
        const approved = body.approved;
        if (!rid || typeof approved !== 'boolean') return res.status(400).json({ error: 'Faltan datos' });
        const upd = await pg('PATCH', `reviews?id=eq.${q(rid)}`, {
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ approved }),
        });
        if (upd.status >= 400) return res.status(upd.status).json({ error: 'No se pudo actualizar la reseña' });
        result = { status: 200, data: { ok: true } };
        break;
      }

      case 'delete_review': {
        const rid = body.id;
        if (!rid) return res.status(400).json({ error: 'Falta id de reseña' });
        const del = await pg('DELETE', `reviews?id=eq.${q(rid)}`, { headers: { Prefer: 'return=minimal' } });
        if (del.status >= 400) return res.status(del.status).json({ error: 'No se pudo eliminar la reseña' });
        result = { status: 200, data: { ok: true } };
        break;
      }

      default:
        return res.status(400).json({ error: 'Acción desconocida: ' + String(action) });
    }
  } catch (e) {
    console.error('Admin API error:', e);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }

  if (result.status >= 400) {
    return res.status(result.status).json({ error: 'Error del proveedor de base de datos' });
  }

  return res.status(200).json({ ok: true, data: result.data });
};

async function pg(method, path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    ...(opts.body ? { body: opts.body } : {}),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { status: res.status, data };
}