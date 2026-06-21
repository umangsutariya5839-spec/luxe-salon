// api/barbers.js — Vercel Serverless Function
// Reads seed data from public/data/barbers.json
// Stores added barbers in global memory
// No fs.writeFile — safe for Vercel

const path = require('path');
const fs   = require('fs');

if (!global.__lxc_barbers) {
  try {
    const seedPath = path.join(process.cwd(), 'public', 'data', 'barbers.json');
    global.__lxc_barbers = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  } catch (_) {
    global.__lxc_barbers = [];
  }
}

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

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  var urlObj = new URL(req.url, 'https://placeholder.vercel.app');
  var parts  = urlObj.pathname.replace(/^\/api\/barbers\/?/, '');
  var id     = parts ? decodeURIComponent(parts) : null;

  // GET /api/barbers
  if (req.method === 'GET' && !id) {
    return json(res, global.__lxc_barbers);
  }

  // POST /api/barbers
  if (req.method === 'POST' && !id) {
    try {
      var raw  = await readBody(req);
      var body = JSON.parse(raw);
      if (!body || !body.name) {
        return json(res, { ok: false, message: 'name is required.' }, 400);
      }
      if (!body.id)           body.id           = 'brb-' + Date.now();
      if (!body.haircutCount) body.haircutCount  = 0;
      global.__lxc_barbers.push(body);
      return json(res, { ok: true, barber: body });
    } catch (e) {
      return json(res, { ok: false, message: 'Invalid JSON body.' }, 400);
    }
  }

  // DELETE /api/barbers/:id
  if (req.method === 'DELETE' && id) {
    var before = global.__lxc_barbers.length;
    global.__lxc_barbers = global.__lxc_barbers.filter(function (b) { return b.id !== id; });
    return json(res, { ok: true, deleted: id, removed: before - global.__lxc_barbers.length });
  }

  return json(res, { ok: false, message: 'Method not allowed.' }, 405);
};
