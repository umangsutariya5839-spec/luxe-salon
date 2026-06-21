// api/services.js — Vercel Serverless Function
// Reads seed data from public/data/services.json
// Stores added services in global memory (persists per warm instance)
// No fs.writeFile — safe for Vercel

const path = require('path');
const fs   = require('fs');

// ── In-memory store (survives warm lambda restarts) ──────────────────────────
// On cold start, we seed from the bundled JSON file.
if (!global.__lxc_services) {
  try {
    const seedPath = path.join(process.cwd(), 'public', 'data', 'services.json');
    global.__lxc_services = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  } catch (_) {
    global.__lxc_services = [];
  }
}

// ── CORS headers ──────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(res, data, status) {
  res.writeHead(status || 200, Object.assign({ 'Content-Type': 'application/json' }, CORS));
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end',  function ()  { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  var urlObj   = new URL(req.url, 'https://placeholder.vercel.app');
  var parts    = urlObj.pathname.replace(/^\/api\/services\/?/, '');
  var id       = parts ? decodeURIComponent(parts) : null;

  // GET /api/services
  if (req.method === 'GET' && !id) {
    return json(res, global.__lxc_services);
  }

  // POST /api/services
  if (req.method === 'POST' && !id) {
    try {
      var raw  = await readBody(req);
      var body = JSON.parse(raw);
      if (!body || !body.name) {
        return json(res, { ok: false, message: 'name is required.' }, 400);
      }
      if (!body.id) body.id = 'svc-' + Date.now();
      global.__lxc_services.push(body);
      return json(res, { ok: true, service: body });
    } catch (e) {
      return json(res, { ok: false, message: 'Invalid JSON body.' }, 400);
    }
  }

  // DELETE /api/services/:id
  if (req.method === 'DELETE' && id) {
    var before = global.__lxc_services.length;
    global.__lxc_services = global.__lxc_services.filter(function (s) { return s.id !== id; });
    return json(res, { ok: true, deleted: id, removed: before - global.__lxc_services.length });
  }

  return json(res, { ok: false, message: 'Method not allowed.' }, 405);
};
