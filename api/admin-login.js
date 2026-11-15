// Vercel serverless function: admin login checked on the server.
// Only the admin names + passcodes stored in Vercel Environment Variables can sign in.
//   ADMIN_1_NAME, ADMIN_1_PASSCODE   (first admin)
//   ADMIN_2_NAME, ADMIN_2_PASSCODE   (optional second admin)
//   ADMIN_SESSION_SECRET             (optional, any long random text)
// Nobody can create a new admin from the website.
import crypto from 'node:crypto';

const norm = (v) => String(v || '').trim().toLowerCase();

function admins() {
  const list = [];
  for (const n of ['1', '2', '3']) {
    const name = process.env[`ADMIN_${n}_NAME`];
    const pass = process.env[`ADMIN_${n}_PASSCODE`];
    if (name && pass) list.push({ name: String(name).trim(), pass: String(pass) });
  }
  // Single-admin shortcut names also accepted.
  if (process.env.ADMIN_NAME && process.env.ADMIN_PASSCODE) {
    list.push({ name: String(process.env.ADMIN_NAME).trim(), pass: String(process.env.ADMIN_PASSCODE) });
  }
  return list;
}

function sameText(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function secret(list) {
  return process.env.ADMIN_SESSION_SECRET || crypto.createHash('sha256').update(list.map((a) => a.name + ':' + a.pass).join('|')).digest('hex');
}

function sign(payload, key) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', key).update(body).digest('base64url');
  return body + '.' + sig;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }

  const list = admins();
  if (!list.length) { res.status(503).json({ ok: false, error: 'not_configured' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const name = norm(body?.name);
  const pass = String(body?.passcode || '');

  let match = null;
  for (const a of list) {
    const nameOk = sameText(norm(a.name), name);
    const passOk = sameText(a.pass, pass);
    if (nameOk && passOk) match = a;
  }

  if (!match) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    res.status(401).json({ ok: false, error: 'wrong' });
    return;
  }

  const exp = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
  const token = sign({ name: match.name, exp }, secret(list));
  res.status(200).json({ ok: true, name: match.name, exp, token });
}
