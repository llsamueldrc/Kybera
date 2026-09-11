// KYBERA — /api/order/submit
// Endpoint PÚBLICO para registrar un pedido. Usa la service_role key
// (solo en el servidor, nunca en el navegador) para el flujo completo:
// crea el pedido, su timeline inicial y actualiza/crea el perfil del
// cliente. Anon ya NO necesita UPDATE en customer_profiles.

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Configuración de servidor incompleta' });
  }

  const order = req.body || {};
  if (!order.order_code || !order.customer_email || !order.customer_name) {
    return res.status(400).json({ error: 'Datos de pedido incompletos' });
  }

  try {
    const created = await pg('POST', 'orders', {
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(order),
    });
    if (created.status >= 400 || !Array.isArray(created.data) || !created.data[0]) {
      console.error('Order insert failed:', created);
      return res.status(500).json({ error: 'No se pudo crear el pedido' });
    }
    const orderRow = created.data[0];

    await pg('POST', 'order_status_history', {
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        order_id: orderRow.id,
        status: 'forging',
        note: 'Pedido creado por el cliente',
        changed_at: new Date().toISOString(),
      }),
    });

    const existing = await pg('GET', `customer_profiles?select=id,total_orders&email=eq.${encodeURIComponent(order.customer_email)}`);
    if (Array.isArray(existing.data) && existing.data[0]) {
      const prof = existing.data[0];
      await pg('PATCH', `customer_profiles?id=eq.${encodeURIComponent(prof.id)}`, {
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          full_name: order.customer_name,
          doc_id: order.customer_id || null,
          country: order.sector_planet || null,
          total_orders: (prof.total_orders || 0) + 1,
          last_order_at: new Date().toISOString(),
        }),
      });
    } else {
      await pg('POST', 'customer_profiles', {
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          email: order.customer_email,
          full_name: order.customer_name,
          doc_id: order.customer_id || null,
          country: order.sector_planet || null,
          total_orders: 1,
          last_order_at: new Date().toISOString(),
        }),
      });
    }

    return res.status(200).json({ ok: true, id: orderRow.id, order_code: orderRow.order_code });
  } catch (e) {
    console.error('Order submit error:', e);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};