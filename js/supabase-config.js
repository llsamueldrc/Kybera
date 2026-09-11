// KYBERA — Configuración compartida de Supabase (páginas públicas)
//
// ⚠️ IMPORTANTE: esta es la "anon key" y por diseño es PÚBLICA.
// En un sitio estático el navegador la recibe sí o sí (la usa
// supabase-js para INSERTs y SELECTs públicos). La verdadera
// protección está en las políticas RLS (ver supabase_extra.sql):
// anon NO puede actualizar ni borrar nada.
// La service_role key y la password del admin viven SOLO en las
// variables de entorno de Vercel (/api), nunca aquí.
window.KYBERA_SUPABASE = {
  url: 'https://bmfmckurecmrpfaudaxa.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZm1ja3VyZWNtcnBmYXVkYXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzQzNDcsImV4cCI6MjEwNDU1MDM0N30.iWLNVzHpWf38PU2hak4O6H8PkhnNnzyx5nM9y-wkb0E'
};