// api/bookings.js — Vercel Serverless Function
// Stores bookings in global memory (no file writes)
// No fs.writeFile — safe for Vercel

if (!global.__lxc_bookings) {
  global.__lxc_bookings = [];
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

function makeId() {
  var n  = Math.floor(1000 + Math.random() * 9000);
  var ch = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  var d  = Math.floor(Math.random() * 10);
  return 'LXC-' + n + '-' + ch + d;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  // GET /api/bookings
  if (req.method === 'GET') {
    return json(res, global.__lxc_bookings);
  }

  // POST /api/bookings
  if (req.method === 'POST') {
    try {
      var raw  = await readBody(req);
      var body = JSON.parse(raw);

      if (!body || !body.services || !body.barberId || !body.date || !body.time || !body.clientDetails) {
        return json(res, { ok: false, message: 'Missing required booking fields.' }, 400);
      }

      var bookingId  = makeId();
      var newBooking = Object.assign({ bookingId: bookingId, createdAt: new Date().toISOString() }, body);
      global.__lxc_bookings.push(newBooking);

      // Increment barber haircut count (in-memory)
      if (global.__lxc_barbers) {
        var idx = global.__lxc_barbers.findIndex(function (b) { return b.id === body.barberId; });
        if (idx > -1) {
          global.__lxc_barbers[idx].haircutCount =
            (global.__lxc_barbers[idx].haircutCount || 0) + (body.services.length || 1);
        }
      }

      return json(res, { ok: true, bookingId: bookingId });
    } catch (e) {
      return json(res, { ok: false, message: 'Invalid JSON body.' }, 400);
    }
  }

  return json(res, { ok: false, message: 'Method not allowed.' }, 405);
};
