const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 10000);
const siteRoot = path.resolve(__dirname, '..');
const retentionDays = Number(process.env.CONTACT_RETENTION_DAYS || 31);
const ipSalt = process.env.IP_HASH_SALT;
const adminUser = process.env.ADMIN_USER;
const adminPassword = process.env.ADMIN_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!ipSalt) console.warn('IP_HASH_SALT is missing. Set it before production.');
if (!databaseUrl) console.warn('DATABASE_URL is missing. Contact storage will be unavailable.');

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }) : null;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '32kb' }));
app.use(morgan('tiny'));

function hashIp(ip) {
  return crypto.createHash('sha256').update(`${ipSalt || 'development-only'}:${ip}`).digest('hex');
}

function basicAuth(req, res, next) {
  if (!adminUser || !adminPassword) return res.status(503).send('Admin access is not configured.');
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return res.set('WWW-Authenticate', 'Basic realm="Portfolio admin"').status(401).send('Authentication required.');
  const [user, password] = Buffer.from(encoded, 'base64').toString().split(':');
  if (user !== adminUser || password !== adminPassword) return res.set('WWW-Authenticate', 'Basic realm="Portfolio admin"').status(401).send('Invalid credentials.');
  next();
}

async function initDatabase() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS contact_messages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(320) NOT NULL,
    message TEXT NOT NULL,
    ip_hash CHAR(64) NOT NULL,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'new'
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages (created_at DESC)');
}

function validateContact(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  if (name.length < 2 || name.length > 120) return 'Name must be between 2 and 120 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return 'Enter a valid email address.';
  if (message.length < 10 || message.length > 5000) return 'Message must be between 10 and 5,000 characters.';
  return null;
}

app.get('/api/health', async (req, res) => {
  try { if (pool) await pool.query('SELECT 1'); res.json({ ok: true, storage: Boolean(pool) }); }
  catch { res.status(503).json({ ok: false, storage: false }); }
});

app.post('/api/contact', async (req, res) => {
  const error = validateContact(req.body);
  if (error) return res.status(400).json({ ok: false, error });
  if (!pool) return res.status(503).json({ ok: false, error: 'Contact storage is not configured yet.' });
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ipHash = hashIp(ip);
  const recent = await pool.query("SELECT COUNT(*)::int AS count FROM contact_messages WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL '1 hour'", [ipHash]);
  if (recent.rows[0].count >= 5) return res.status(429).json({ ok: false, error: 'Too many messages. Please try again later.' });
  const { name, email, message } = req.body;
  const result = await pool.query('INSERT INTO contact_messages (name, email, message, ip_hash, user_agent, referrer) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at', [String(name).trim(), String(email).trim(), String(message).trim(), ipHash, req.get('user-agent') || null, req.get('referer') || null]);
  if (process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({ from: process.env.CONTACT_FROM_EMAIL || 'Portfolio <onboarding@resend.dev>', to: process.env.CONTACT_TO_EMAIL, replyTo: String(email).trim(), subject: `Portfolio message from ${String(name).trim()}`, text: `${String(message).trim()}\n\nReply to: ${String(email).trim()}` });
    } catch (emailError) { console.error('Notification email failed:', emailError.message); }
  }
  res.status(201).json({ ok: true, id: result.rows[0].id });
});

app.get('/admin', basicAuth, async (req, res) => {
  if (!pool) return res.status(503).send('DATABASE_URL is not configured.');
  const result = await pool.query(`SELECT id, name, email, message, ip_hash, user_agent, referrer, created_at, status FROM contact_messages ORDER BY created_at DESC LIMIT 200`);
  const rows = result.rows.map(row => `<tr><td>${row.id}</td><td>${escapeHtml(row.created_at.toISOString())}</td><td>${escapeHtml(row.name)}</td><td><a href="mailto:${escapeHtml(row.email)}">${escapeHtml(row.email)}</a></td><td>${escapeHtml(row.message)}</td><td class="mono">${escapeHtml(row.ip_hash.slice(0, 12))}…</td><td>${escapeHtml(row.status)}</td></tr>`).join('');
  res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Portfolio messages</title><style>body{margin:0;padding:32px;background:#081015;color:#edf4f4;font:14px system-ui}h1{font-size:28px}p{color:#9aaeb7}.table-wrap{overflow:auto}table{width:100%;min-width:900px;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:12px;border:1px solid #20323a}th{color:#65e6c2}td{white-space:pre-wrap}.mono{font-family:monospace;color:#f2b86b}</style></head><body><h1>Portfolio inbox</h1><p>Messages are retained for ${retentionDays} days. IP values are stored as salted hashes for abuse protection, not raw addresses.</p><div class="table-wrap"><table><thead><tr><th>ID</th><th>Received</th><th>Name</th><th>Email</th><th>Message</th><th>IP hash</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No messages yet.</td></tr>'}</tbody></table></div></body></html>`);
});

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }

app.use(express.static(siteRoot, { index: 'index.html' }));

initDatabase().then(() => app.listen(port, () => console.log(`Portfolio server listening on ${port}`))).catch(error => { console.error('Database initialization failed:', error); process.exit(1); });

setInterval(() => { if (pool) pool.query("DELETE FROM contact_messages WHERE created_at < NOW() - ($1 * INTERVAL '1 day')", [retentionDays]).catch(error => console.error('Retention cleanup failed:', error.message)); }, 24 * 60 * 60 * 1000).unref();
